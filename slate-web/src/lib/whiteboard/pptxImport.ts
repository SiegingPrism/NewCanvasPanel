import JSZip from "jszip";
import type {
  Page,
  CanvasObject,
  ImageObject,
  TextObject,
  ShapeStroke,
  FrameObject,
  ShapeType,
  TableObject,
} from "./types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getMimeType(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "emf":
    case "wmf":
    case "bin":
    case "tiff":
    case "tif":
      return null; // Unsupported format in browser canvas
    default:
      return null;
  }
}

function isInsideGroup(el: Element): boolean {
  let cur = el.parentElement;
  while (cur) {
    const tag = (cur.localName || cur.tagName).toLowerCase();
    if (tag === "grpsp" || tag === "p:grpsp") return true;
    cur = cur.parentElement;
  }
  return false;
}

function parseEmu(val: string | null | undefined, def = 0): number {
  if (!val) return def;
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : def;
}

function mapShapeType(prst: string | null | undefined): ShapeType {
  switch (prst) {
    case "roundRect":
    case "rect":
      return "rect";
    case "ellipse":
      return "ellipse";
    case "circle":
      return "circle";
    case "triangle":
      return "triangle";
    case "rtTriangle":
      return "right-triangle";
    case "diamond":
      return "diamond";
    case "star5":
    case "star":
      return "star";
    case "line":
      return "line";
    case "rightArrow":
    case "leftArrow":
    case "upArrow":
    case "downArrow":
      return "arrow";
    case "hexagon":
      return "hexagon";
    case "pentagon":
      return "pentagon";
    case "heart":
      return "heart";
    case "cloud":
      return "cloud";
    default:
      return "rect";
  }
}

function parseColor(parent: Element | null | undefined): string | null {
  if (!parent) return null;
  const srgb = parent.getElementsByTagName("a:srgbClr")[0];
  if (srgb) {
    const val = srgb.getAttribute("val");
    if (val && /^[0-9a-fA-F]{6}$/.test(val)) {
      return `#${val.toLowerCase()}`;
    }
  }
  return null;
}

function normalizeZipPath(target: string, baseDir = "ppt/slides"): string {
  let clean = target.replace(/\\/g, "/").trim();
  if (clean.startsWith("/")) {
    clean = clean.slice(1);
  }
  if (clean.startsWith("../")) {
    clean = "ppt/" + clean.slice(3);
  } else if (!clean.startsWith("ppt/")) {
    clean = `${baseDir}/${clean}`;
  }
  // Remove any redundant ./ or ../ inside path
  const parts = clean.split("/");
  const resolved: string[] = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") {
      resolved.pop();
    } else {
      resolved.push(p);
    }
  }
  return resolved.join("/");
}

function findZipEntry(zip: JSZip, targetPath: string): JSZip.JSZipObject | null {
  if (zip.files[targetPath]) return zip.files[targetPath];
  const targetLower = targetPath.toLowerCase();
  for (const name of Object.keys(zip.files)) {
    if (name.toLowerCase() === targetLower) {
      return zip.files[name];
    }
  }
  return null;
}

export type UniversalXmlParser = {
  parseFromString: (str: string, mime: DOMParserSupportedType) => Document;
};

async function getXmlParser(): Promise<UniversalXmlParser> {
  if (typeof globalThis !== "undefined" && typeof globalThis.DOMParser !== "undefined") {
    return new globalThis.DOMParser() as UniversalXmlParser;
  }
  const { DOMParser } = await import("@xmldom/xmldom");
  return new DOMParser() as any;
}

export type PptxImportResult = {
  pages: Page[];
  totalSlides: number;
  totalImages: number;
  totalShapes: number;
  totalTextBlocks: number;
  unsupportedImages: number;
};

export async function parsePptxFile(
  fileOrBuffer: File | ArrayBuffer | Blob | Uint8Array,
  onProgress?: (current: number, total: number) => void
): Promise<PptxImportResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(fileOrBuffer);
  } catch (err: any) {
    throw new Error(
      "Failed to read presentation file. Ensure this is a valid modern .pptx presentation (Office Open XML)."
    );
  }

  const parser = await getXmlParser();

  // 1. Get slide dimensions and canonical slide order from ppt/presentation.xml and relationships
  let slideW_emu = 12192000; // default 16:9 (10in)
  let slideH_emu = 6858000; // default 16:9 (5.625in)
  const orderedSlidePaths: string[] = [];

  // Read ppt/_rels/presentation.xml.rels to resolve slide relationship IDs
  const presRelsMap: Record<string, string> = {};
  const presRelsEntry = findZipEntry(zip, "ppt/_rels/presentation.xml.rels");
  if (presRelsEntry) {
    try {
      const presRelsXml = await presRelsEntry.async("string");
      const relsDoc = parser.parseFromString(presRelsXml, "application/xml");
      const relEls = relsDoc.getElementsByTagName("Relationship");
      for (let r = 0; r < relEls.length; r++) {
        const id = relEls[r].getAttribute("Id");
        const target = relEls[r].getAttribute("Target");
        if (id && target) {
          presRelsMap[id] = normalizeZipPath(target, "ppt");
        }
      }
    } catch {
      // Fallback: no pres rels
    }
  }

  const presEntry = findZipEntry(zip, "ppt/presentation.xml");
  if (presEntry) {
    try {
      const presXml = await presEntry.async("string");
      const presDoc = parser.parseFromString(presXml, "application/xml");
      const sldSz = presDoc.getElementsByTagName("p:sldSz")[0];
      if (sldSz) {
        const cx = parseEmu(sldSz.getAttribute("cx"), slideW_emu);
        const cy = parseEmu(sldSz.getAttribute("cy"), slideH_emu);
        if (cx > 0 && cy > 0) {
          slideW_emu = cx;
          slideH_emu = cy;
        }
      }

      // Read slides in canonical presentation order from <p:sldIdLst>
      const sldIdLst = presDoc.getElementsByTagName("p:sldIdLst")[0];
      if (sldIdLst) {
        const sldIds = Array.from(sldIdLst.getElementsByTagName("p:sldId"));
        for (const sld of sldIds) {
          const rId = sld.getAttribute("r:id") || sld.getAttribute("id");
          if (rId && presRelsMap[rId]) {
            orderedSlidePaths.push(presRelsMap[rId]);
          }
        }
      }
    } catch {
      // Use defaults
    }
  }

  // Standard whiteboard slide display dimensions (width = 1280px)
  const FRAME_W = 1280;
  const FRAME_H = Math.round((FRAME_W * slideH_emu) / slideW_emu);
  const OFFSET_X = 80;
  const OFFSET_Y = 80;
  const scaleX = FRAME_W / slideW_emu;
  const scaleY = FRAME_H / slideH_emu;

  // 2. Discover and sort slide XML files in presentation order
  const slideEntries: { name: string; num: number; file: JSZip.JSZipObject }[] = [];
  if (orderedSlidePaths.length > 0) {
    for (let i = 0; i < orderedSlidePaths.length; i++) {
      const sPath = orderedSlidePaths[i];
      const zFile = findZipEntry(zip, sPath);
      if (zFile) {
        const match = sPath.match(/slide([0-9]+)\.xml$/i);
        const num = match ? parseInt(match[1], 10) : i + 1;
        slideEntries.push({
          name: sPath,
          num,
          file: zFile,
        });
      }
    }
  }

  // Fallback: if sldIdLst was missing or empty, discover by filename pattern
  if (slideEntries.length === 0) {
    zip.forEach((relativePath, zipEntry) => {
      const match = relativePath.match(/^ppt\/slides\/slide([0-9]+)\.xml$/i);
      if (match && !zipEntry.dir) {
        slideEntries.push({
          name: relativePath,
          num: parseInt(match[1], 10),
          file: zipEntry,
        });
      }
    });
    slideEntries.sort((a, b) => a.num - b.num);
  }

  const totalSlides = slideEntries.length;
  if (totalSlides === 0) {
    throw new Error("No presentation slides found in this PowerPoint file.");
  }

  let totalImagesCount = 0;
  let totalShapesCount = 0;
  let totalTextCount = 0;
  let unsupportedImagesCount = 0;
  const newPages: Page[] = [];

  // 3. Process each slide
  for (let sIdx = 0; sIdx < slideEntries.length; sIdx++) {
    const entry = slideEntries[sIdx];
    onProgress?.(sIdx + 1, totalSlides);

    const xmlStr = await entry.file.async("string");
    const doc = parser.parseFromString(xmlStr, "application/xml");

    // Load relationships for this slide (to resolve pictures, media, layouts, and notes)
    const relsMap: Record<string, string> = {};
    let slideLayoutPath: string | null = null;
    let notesSlidePath: string | null = null;

    const relsEntry = findZipEntry(zip, `ppt/slides/_rels/slide${entry.num}.xml.rels`);
    if (relsEntry) {
      try {
        const relsXml = await relsEntry.async("string");
        const relsDoc = parser.parseFromString(relsXml, "application/xml");
        const relEls = relsDoc.getElementsByTagName("Relationship");
        for (let r = 0; r < relEls.length; r++) {
          const id = relEls[r].getAttribute("Id");
          const target = relEls[r].getAttribute("Target");
          const type = relEls[r].getAttribute("Type") || "";
          if (id && target) {
            const normalized = normalizeZipPath(target, "ppt/slides");
            relsMap[id] = normalized;
            if (type.includes("slideLayout") || target.includes("slideLayout")) {
              slideLayoutPath = normalized;
            } else if (type.includes("notesSlide") || target.includes("notesSlide")) {
              notesSlidePath = normalized;
            }
          }
        }
      } catch {
        // Fallback: no rels
      }
    }

    // Parse slide template layout placeholders (for text boxes whose position is defined in slideLayout)
    const layoutPlaceholders: Record<string, { x: number; y: number; w: number; h: number }> = {};
    if (slideLayoutPath) {
      const layoutEntry = findZipEntry(zip, slideLayoutPath);
      if (layoutEntry) {
        try {
          const layoutXml = await layoutEntry.async("string");
          const layoutDoc = parser.parseFromString(layoutXml, "application/xml");
          const layoutShapes = Array.from(layoutDoc.getElementsByTagName("p:sp"));
          for (const lSp of layoutShapes) {
            const ph = lSp.getElementsByTagName("p:ph")[0];
            const spPr = lSp.getElementsByTagName("p:spPr")[0];
            if (spPr) {
              const xfrm = spPr.getElementsByTagName("a:xfrm")[0];
              const off = xfrm?.getElementsByTagName("a:off")[0];
              const ext = xfrm?.getElementsByTagName("a:ext")[0];
              if (off && ext) {
                const rx = parseEmu(off.getAttribute("x"), 0);
                const ry = parseEmu(off.getAttribute("y"), 0);
                const rw = parseEmu(ext.getAttribute("cx"), 0);
                const rh = parseEmu(ext.getAttribute("cy"), 0);
                const coords = {
                  x: OFFSET_X + rx * scaleX,
                  y: OFFSET_Y + ry * scaleY,
                  w: Math.max(20, rw * scaleX),
                  h: Math.max(20, rh * scaleY),
                };
                const phType = ph?.getAttribute("type") || "body";
                const phIdx = ph?.getAttribute("idx");
                if (phType) layoutPlaceholders[phType] = coords;
                if (phIdx) layoutPlaceholders[`idx_${phIdx}`] = coords;
              }
            }
          }
        } catch {
          // Layout parse fallback
        }
      }
    }

    // Extract speaker notes for this slide if present
    let speakerNotes: string | null = null;
    if (notesSlidePath) {
      const notesEntry = findZipEntry(zip, notesSlidePath);
      if (notesEntry) {
        try {
          const notesXml = await notesEntry.async("string");
          const notesDoc = parser.parseFromString(notesXml, "application/xml");
          const notesShapes = Array.from(notesDoc.getElementsByTagName("p:sp"));
          const notesLines: string[] = [];
          for (const sp of notesShapes) {
            const ph = sp.getElementsByTagName("p:ph")[0];
            const phType = ph ? ph.getAttribute("type") : null;
            if (!phType || phType === "body") {
              const textNodes = Array.from(sp.getElementsByTagName("a:t"));
              const t = textNodes.map((tn) => tn.textContent || "").join("").trim();
              if (t) notesLines.push(t);
            }
          }
          if (notesLines.length > 0) {
            speakerNotes = notesLines.join("\n\n");
          }
        } catch {
          // Notes fallback
        }
      }
    }

    // Check slide background (dark vs white)
    let isDarkBg = false;
    const bgPr = doc.getElementsByTagName("p:bgPr")[0];
    if (bgPr) {
      const bgClr = parseColor(bgPr);
      if (bgClr) {
        const r = parseInt(bgClr.slice(1, 3), 16);
        const g = parseInt(bgClr.slice(3, 5), 16);
        const b = parseInt(bgClr.slice(5, 7), 16);
        const lum = (0.299 * r + 0.587 * g + 0.114 * b);
        if (lum < 100) isDarkBg = true;
      }
    }

    const shapesList: ShapeStroke[] = [];
    const imagesList: ImageObject[] = [];
    const textsList: TextObject[] = [];
    let discoveredTitle = "";

    // Helper to read position and size
    const getXfrmCoords = (
      spPrEl: Element | null,
      parentBounds?: { x: number; y: number; w: number; h: number; chX: number; chY: number; chW: number; chH: number }
    ) => {
      if (!spPrEl) return null;
      let xfrm = spPrEl.getElementsByTagName("a:xfrm")[0] || spPrEl.getElementsByTagName("p:xfrm")[0];
      if (!xfrm && (spPrEl.tagName === "a:xfrm" || spPrEl.tagName === "p:xfrm" || spPrEl.localName === "xfrm")) {
        xfrm = spPrEl;
      }
      if (!xfrm) return null;
      const off = xfrm.getElementsByTagName("a:off")[0];
      const ext = xfrm.getElementsByTagName("a:ext")[0];
      if (!off || !ext) return null;

      const rawX = parseEmu(off.getAttribute("x"), 0);
      const rawY = parseEmu(off.getAttribute("y"), 0);
      const rawW = parseEmu(ext.getAttribute("cx"), 0);
      const rawH = parseEmu(ext.getAttribute("cy"), 0);

      if (parentBounds) {
        const relX = (rawX - parentBounds.chX) / (parentBounds.chW || 1);
        const relY = (rawY - parentBounds.chY) / (parentBounds.chH || 1);
        const relW = rawW / (parentBounds.chW || 1);
        const relH = rawH / (parentBounds.chH || 1);
        return {
          x: parentBounds.x + relX * parentBounds.w,
          y: parentBounds.y + relY * parentBounds.h,
          w: Math.max(20, relW * parentBounds.w),
          h: Math.max(20, relH * parentBounds.h),
        };
      }

      return {
        x: OFFSET_X + rawX * scaleX,
        y: OFFSET_Y + rawY * scaleY,
        w: Math.max(20, rawW * scaleX),
        h: Math.max(20, rawH * scaleY),
      };
    };

    // Helper to extract image from an <a:blip> element
    const processBlip = async (blipEl: Element | null, coords: { x: number; y: number; w: number; h: number }) => {
      if (!blipEl) return;
      const rId = blipEl.getAttribute("r:embed") || blipEl.getAttribute("r:link");
      if (!rId) return;
      const targetPath = relsMap[rId];
      if (!targetPath) return;

      const mime = getMimeType(targetPath);
      if (!mime) {
        unsupportedImagesCount++;
        return;
      }

      const imgEntry = findZipEntry(zip, targetPath);
      if (!imgEntry) return;

      try {
        const base64 = await imgEntry.async("base64");
        imagesList.push({
          id: uid(),
          kind: "image",
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          w: Math.round(coords.w),
          h: Math.round(coords.h),
          src: `data:${mime};base64,${base64}`,
        });
        totalImagesCount++;
      } catch (err) {
        console.warn("Failed to load embedded PPTX image:", targetPath, err);
      }
    };

    // Process all Pictures (<p:pic>) - Skip those inside <p:grpSp>
    const picElements = Array.from(doc.getElementsByTagName("p:pic"));
    for (const picEl of picElements) {
      if (isInsideGroup(picEl)) continue;
      const spPr = picEl.getElementsByTagName("p:spPr")[0];
      const coords = getXfrmCoords(spPr);
      if (!coords) continue;

      const blip = picEl.getElementsByTagName("a:blip")[0];
      await processBlip(blip, coords);
    }

    // Process all Shapes and Text Boxes (<p:sp>) - Skip those inside <p:grpSp>
    const spElements = Array.from(doc.getElementsByTagName("p:sp"));
    for (const spEl of spElements) {
      if (isInsideGroup(spEl)) continue;
      const spPr = spEl.getElementsByTagName("p:spPr")[0];
      let coords = getXfrmCoords(spPr);
      if (!coords) {
        // Fall back to template placeholder coordinates if defined in slideLayout
        const ph = spEl.getElementsByTagName("p:ph")[0];
        if (ph) {
          const phType = ph.getAttribute("type") || "body";
          const phIdx = ph.getAttribute("idx");
          if (phIdx && layoutPlaceholders[`idx_${phIdx}`]) {
            coords = layoutPlaceholders[`idx_${phIdx}`];
          } else if (phType && layoutPlaceholders[phType]) {
            coords = layoutPlaceholders[phType];
          } else if (phType === "title" || phType === "ctrTitle") {
            coords = { x: OFFSET_X + 40, y: OFFSET_Y + 40, w: FRAME_W - 80, h: 80 };
          } else {
            coords = { x: OFFSET_X + 40, y: OFFSET_Y + 140, w: FRAME_W - 80, h: 400 };
          }
        }
      }
      if (!coords) continue;

      // Check if this shape is actually an image fill (<a:blipFill>)
      const blipFill = spPr?.getElementsByTagName("a:blipFill")[0];
      if (blipFill && coords) {
        const blip = blipFill.getElementsByTagName("a:blip")[0];
        if (blip) {
          await processBlip(blip, coords);
          continue; // Image fill processed
        }
      }

      // Check for Text Body (<p:txBody>)
      const txBody = spEl.getElementsByTagName("p:txBody")[0];
      const paragraphs = txBody ? Array.from(txBody.getElementsByTagName("a:p")) : [];
      const textLines: string[] = [];
      let totalFontSize = 0;
      let fontRunsCount = 0;
      let detectedTextColor: string | null = null;

      for (const p of paragraphs) {
        const runs = Array.from(p.getElementsByTagName("a:r"));
        let pText = "";
        for (const r of runs) {
          const tNode = r.getElementsByTagName("a:t")[0];
          if (tNode && tNode.textContent) {
            pText += tNode.textContent;
          }
          const rPr = r.getElementsByTagName("a:rPr")[0];
          if (rPr) {
            const sz = rPr.getAttribute("sz");
            if (sz) {
              const pt = parseInt(sz, 10) / 100;
              if (pt > 0) {
                totalFontSize += pt * 1.333; // convert pt to px
                fontRunsCount++;
              }
            }
            if (!detectedTextColor) {
              detectedTextColor = parseColor(rPr);
            }
          }
        }
        // Also check standalone text without <a:r> (e.g. direct text in paragraph)
        if (!runs.length) {
          const directT = p.getElementsByTagName("a:t")[0];
          if (directT && directT.textContent) {
            pText = directT.textContent;
          }
        }
        if (pText.trim()) {
          textLines.push(pText.trim());
        }
      }

      const fullText = textLines.join("\n");
      const shapeBg = parseColor(spPr);

      if (fullText) {
        // Text is present
        const calculatedFontSize =
          fontRunsCount > 0 ? Math.round(totalFontSize / fontRunsCount) : textLines.length === 1 ? 28 : 20;
        const fontSizePx = Math.min(48, Math.max(14, calculatedFontSize));

        // Detect if this is likely the slide title
        const ph = spEl.getElementsByTagName("p:ph")[0];
        const phType = ph?.getAttribute("type");
        const isTitle = phType === "title" || phType === "ctrTitle" || (!discoveredTitle && textLines.length === 1);
        if (isTitle && !discoveredTitle) {
          discoveredTitle = textLines[0];
        }

        const textColor = detectedTextColor || (isDarkBg ? "#f8fafc" : "#0f172a");

        const targetX = coords ? coords.x : OFFSET_X + 40;
        const targetY = coords ? coords.y : OFFSET_Y + 40 + textsList.length * 70;
        const targetW = coords ? coords.w : FRAME_W - 80;
        const targetH = coords ? coords.h : Math.max(40, textLines.length * (fontSizePx + 10));

        textsList.push({
          id: uid(),
          kind: "text",
          x: Math.round(targetX),
          y: Math.round(targetY),
          w: Math.round(targetW),
          h: Math.round(targetH),
          text: fullText,
          color: textColor,
          fontSize: fontSizePx,
          bg: shapeBg || undefined,
        });
        totalTextCount++;
      } else if (coords && shapeBg) {
        // Geometric Shape without text (e.g. colored card, banner, box, accent line)
        const prstGeom = spPr?.getElementsByTagName("a:prstGeom")[0];
        const prst = prstGeom?.getAttribute("prst");
        const mapped = mapShapeType(prst);

        shapesList.push({
          id: uid(),
          kind: "shape",
          shape: mapped,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          w: Math.round(coords.w),
          h: Math.round(coords.h),
          color: shapeBg,
          size: 3,
        });
        totalShapesCount++;
      }
    }

    // Process Tables (<a:tbl> inside <p:graphicFrame>)
    const tablesList: TableObject[] = [];
    const graphicFrames = Array.from(doc.getElementsByTagName("p:graphicFrame"));
    for (const gf of graphicFrames) {
      if (isInsideGroup(gf)) continue;
      const xfrm = gf.getElementsByTagName("p:xfrm")[0] || gf.getElementsByTagName("a:xfrm")[0];
      const coords = getXfrmCoords(xfrm);
      if (!coords) continue;

      const tbl = gf.getElementsByTagName("a:tbl")[0];
      if (!tbl) continue;

      const trs = Array.from(tbl.getElementsByTagName("a:tr"));
      if (!trs.length) continue;

      const data: string[][] = [];
      for (const tr of trs) {
        const rowCells: string[] = [];
        const tcs = Array.from(tr.getElementsByTagName("a:tc"));
        for (const tc of tcs) {
          const paras = Array.from(tc.getElementsByTagName("a:p"));
          const cellStr = paras
            .map((p) => Array.from(p.getElementsByTagName("a:t")).map((t) => t.textContent || "").join(""))
            .join("\n")
            .trim();
          rowCells.push(cellStr);
        }
        data.push(rowCells);
      }

      if (data.length > 0 && data[0].length > 0) {
        tablesList.push({
          id: uid(),
          kind: "table",
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          w: Math.round(coords.w),
          h: Math.round(coords.h),
          rows: data.length,
          cols: Math.max(...data.map((r) => r.length)),
          data,
          color: "#2563eb",
        });
      }
    }

    // Process Grouped Shapes (<p:grpSp>) hierarchically with compounded coordinate bounds
    type ParentGroupBounds = {
      x: number;
      y: number;
      w: number;
      h: number;
      chX: number;
      chY: number;
      chW: number;
      chH: number;
    };

    const processGroupRecursive = async (grpEl: Element, parentBounds?: ParentGroupBounds) => {
      const grpSpPr = grpEl.getElementsByTagName("p:grpSpPr")[0];
      const xfrm = grpSpPr?.getElementsByTagName("a:xfrm")[0];
      if (!xfrm) return;

      const off = xfrm.getElementsByTagName("a:off")[0];
      const ext = xfrm.getElementsByTagName("a:ext")[0];
      const chOff = xfrm.getElementsByTagName("a:chOff")[0];
      const chExt = xfrm.getElementsByTagName("a:chExt")[0];
      if (!off || !ext || !chOff || !chExt) return;

      const rawOffX = parseEmu(off.getAttribute("x"), 0);
      const rawOffY = parseEmu(off.getAttribute("y"), 0);
      const rawExtW = parseEmu(ext.getAttribute("cx"), 0);
      const rawExtH = parseEmu(ext.getAttribute("cy"), 0);
      const rawChOffX = parseEmu(chOff.getAttribute("x"), 0);
      const rawChOffY = parseEmu(chOff.getAttribute("y"), 0);
      const rawChExtW = parseEmu(chExt.getAttribute("cx"), 1);
      const rawChExtH = parseEmu(chExt.getAttribute("cy"), 1);

      let currentBounds: ParentGroupBounds;
      if (parentBounds) {
        // Compound coordinates: child group is positioned inside parent group's internal coordinate system
        const relX = (rawOffX - parentBounds.chX) / (parentBounds.chW || 1);
        const relY = (rawOffY - parentBounds.chY) / (parentBounds.chH || 1);
        const relW = rawExtW / (parentBounds.chW || 1);
        const relH = rawExtH / (parentBounds.chH || 1);
        currentBounds = {
          x: parentBounds.x + relX * parentBounds.w,
          y: parentBounds.y + relY * parentBounds.h,
          w: relW * parentBounds.w,
          h: relH * parentBounds.h,
          chX: rawChOffX,
          chY: rawChOffY,
          chW: rawChExtW,
          chH: rawChExtH,
        };
      } else {
        // Root group: positioned on the slide
        currentBounds = {
          x: OFFSET_X + rawOffX * scaleX,
          y: OFFSET_Y + rawOffY * scaleY,
          w: rawExtW * scaleX,
          h: rawExtH * scaleY,
          chX: rawChOffX,
          chY: rawChOffY,
          chW: rawChExtW,
          chH: rawChExtH,
        };
      }

      // Direct child pictures in this group (to avoid processing nested groups' pictures with wrong offset)
      const allPics = Array.from(grpEl.getElementsByTagName("p:pic"));
      for (const cPic of allPics) {
        if (cPic.parentElement !== grpEl) continue;
        const cSpPr = cPic.getElementsByTagName("p:spPr")[0];
        const cCoords = getXfrmCoords(cSpPr, currentBounds);
        if (cCoords) {
          const blip = cPic.getElementsByTagName("a:blip")[0];
          await processBlip(blip, cCoords);
        }
      }

      // Direct child shapes and text in this group
      const allShapes = Array.from(grpEl.getElementsByTagName("p:sp"));
      for (const cSp of allShapes) {
        if (cSp.parentElement !== grpEl) continue;
        const cSpPr = cSp.getElementsByTagName("p:spPr")[0];
        const cCoords = getXfrmCoords(cSpPr, currentBounds);
        if (!cCoords) continue;

        const blipFill = cSpPr?.getElementsByTagName("a:blipFill")[0];
        if (blipFill) {
          const blip = blipFill.getElementsByTagName("a:blip")[0];
          if (blip) {
            await processBlip(blip, cCoords);
            continue;
          }
        }

        const txBody = cSp.getElementsByTagName("p:txBody")[0];
        const paragraphs = txBody ? Array.from(txBody.getElementsByTagName("a:p")) : [];
        const textLines: string[] = [];
        let totalFontSize = 0;
        let fontRunsCount = 0;
        let detectedTextColor: string | null = null;

        for (const p of paragraphs) {
          const runs = Array.from(p.getElementsByTagName("a:r"));
          let pText = "";
          for (const r of runs) {
            const tNode = r.getElementsByTagName("a:t")[0];
            if (tNode && tNode.textContent) {
              pText += tNode.textContent;
            }
            const rPr = r.getElementsByTagName("a:rPr")[0];
            if (rPr) {
              const sz = rPr.getAttribute("sz");
              if (sz) {
                const pt = parseInt(sz, 10) / 100;
                if (pt > 0) {
                  totalFontSize += pt * 1.333;
                  fontRunsCount++;
                }
              }
              if (!detectedTextColor) {
                detectedTextColor = parseColor(rPr);
              }
            }
          }
          if (!runs.length) {
            const directT = p.getElementsByTagName("a:t")[0];
            if (directT && directT.textContent) {
              pText = directT.textContent;
            }
          }
          if (pText.trim()) {
            textLines.push(pText.trim());
          }
        }

        const fullText = textLines.join("\n");
        const shapeBg = parseColor(cSpPr);

        if (fullText) {
          const calculatedFontSize =
            fontRunsCount > 0 ? Math.round(totalFontSize / fontRunsCount) : textLines.length === 1 ? 24 : 18;
          const fontSizePx = Math.min(48, Math.max(14, calculatedFontSize));
          const textColor = detectedTextColor || (isDarkBg ? "#f8fafc" : "#0f172a");

          textsList.push({
            id: uid(),
            kind: "text",
            x: Math.round(cCoords.x),
            y: Math.round(cCoords.y),
            w: Math.round(cCoords.w),
            h: Math.round(cCoords.h),
            text: fullText,
            color: textColor,
            fontSize: fontSizePx,
            bg: shapeBg || undefined,
          });
          totalTextCount++;
        } else if (shapeBg) {
          const prstGeom = cSpPr?.getElementsByTagName("a:prstGeom")[0];
          const prst = prstGeom?.getAttribute("prst");
          const mapped = mapShapeType(prst);

          shapesList.push({
            id: uid(),
            kind: "shape",
            shape: mapped,
            x: Math.round(cCoords.x),
            y: Math.round(cCoords.y),
            w: Math.round(cCoords.w),
            h: Math.round(cCoords.h),
            color: shapeBg,
            size: 3,
          });
          totalShapesCount++;
        }
      }

      // Direct child groups processed recursively with compounded bounds
      const nestedGroups = Array.from(grpEl.getElementsByTagName("p:grpSp"));
      for (const childGrp of nestedGroups) {
        if (childGrp.parentElement === grpEl) {
          await processGroupRecursive(childGrp, currentBounds);
        }
      }
    };

    const grpSpElements = Array.from(doc.getElementsByTagName("p:grpSp"));
    for (const grpEl of grpSpElements) {
      if (!isInsideGroup(grpEl)) {
        await processGroupRecursive(grpEl);
      }
    }

    // Safety fallback: if no text objects or images were detected, extract raw text
    if (textsList.length === 0 && imagesList.length === 0 && shapesList.length === 0) {
      const rawTextNodes = Array.from(doc.getElementsByTagName("a:t"));
      const fallbackParas: string[] = [];
      for (const tn of rawTextNodes) {
        const txt = tn.textContent?.trim();
        if (txt) fallbackParas.push(txt);
      }
      if (fallbackParas.length > 0) {
        discoveredTitle = fallbackParas[0];
        textsList.push({
          id: uid(),
          kind: "text",
          x: OFFSET_X + 40,
          y: OFFSET_Y + 40,
          w: FRAME_W - 80,
          h: 60,
          text: fallbackParas[0],
          color: isDarkBg ? "#ffffff" : "#0f172a",
          fontSize: 28,
        });
        if (fallbackParas.length > 1) {
          textsList.push({
            id: uid(),
            kind: "text",
            x: OFFSET_X + 40,
            y: OFFSET_Y + 120,
            w: FRAME_W - 80,
            h: Math.min(480, (fallbackParas.length - 1) * 36),
            text: fallbackParas.slice(1).map((l) => `• ${l}`).join("\n\n"),
            color: isDarkBg ? "#cbd5e1" : "#334155",
            fontSize: 20,
          });
        }
      }
    }

    const slideTitle = discoveredTitle.slice(0, 40) || `Slide ${entry.num}`;

    // Create Slide Boundary Frame
    const frame: FrameObject = {
      id: uid(),
      kind: "frame",
      x: OFFSET_X - 10,
      y: OFFSET_Y - 10,
      w: FRAME_W + 20,
      h: FRAME_H + 20,
      title: `Slide ${entry.num}: ${slideTitle}`,
      order: entry.num,
      color: "#f97316",
    };

    if (speakerNotes) {
      textsList.push({
        id: uid(),
        kind: "text",
        x: OFFSET_X + FRAME_W - 280,
        y: OFFSET_Y + 20,
        w: 260,
        h: 180,
        text: `📝 Speaker Notes:\n${speakerNotes}`,
        color: isDarkBg ? "#fef08a" : "#854d0e",
        fontSize: 14,
        bg: "#fef9c3",
      });
    }

    // Correct z-order: Frame -> Geometric Shapes -> Tables -> Embedded Images -> Text
    const pageObjects: CanvasObject[] = [
      frame,
      ...shapesList,
      ...tablesList,
      ...imagesList,
      ...textsList,
    ];

    newPages.push({
      id: uid(),
      background: isDarkBg ? "dark" : "white",
      objects: pageObjects,
      notes: speakerNotes || undefined,
    });
  }

  return {
    pages: newPages,
    totalSlides,
    totalImages: totalImagesCount,
    totalShapes: totalShapesCount,
    totalTextBlocks: totalTextCount,
    unsupportedImages: unsupportedImagesCount,
  };
}
