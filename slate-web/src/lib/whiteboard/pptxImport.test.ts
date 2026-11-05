import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parsePptxFile } from "./pptxImport";

describe("PowerPoint (.pptx) Import Engine", () => {
  it("rejects non-zip files with a clear error message", async () => {
    const fakeBuffer = new TextEncoder().encode("This is not a zip file");
    await expect(parsePptxFile(fakeBuffer)).rejects.toThrowError(
      /valid modern \.pptx presentation/
    );
  });

  it("extracts slides, embedded images, shapes, and formatted text", async () => {
    const zip = new JSZip();

    // 1. Presentation XML (16:9 widescreen)
    zip.file(
      "ppt/presentation.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
      </p:presentation>`
    );

    // 2. Slide 1 Relationships (referencing image1.png)
    zip.file(
      "ppt/slides/_rels/slide1.xml.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
      </Relationships>`
    );

    // 3. Embedded sample image
    const samplePngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    zip.file("ppt/media/image1.png", samplePngBase64, { base64: true });

    // 4. Slide 1 XML (with Title, Body, Shape, and Picture)
    zip.file(
      "ppt/slides/slide1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <!-- Title Text Box -->
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1000000" y="500000"/>
                  <a:ext cx="8000000" cy="800000"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr sz="3200" b="1">
                      <a:solidFill><a:srgbClr val="1E293B"/></a:solidFill>
                    </a:rPr>
                    <a:t>Photosynthesis &amp; Plants</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>

            <!-- Picture Element -->
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="4" name="Plant Diagram"/>
              </p:nvPicPr>
              <p:blipFill>
                <a:blip r:embed="rId1"/>
              </p:blipFill>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1500000" y="2000000"/>
                  <a:ext cx="4000000" cy="3000000"/>
                </a:xfrm>
              </p:spPr>
            </p:pic>

            <!-- Colored Card/Shape -->
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="6500000" y="2000000"/>
                  <a:ext cx="4500000" cy="3000000"/>
                </a:xfrm>
                <a:prstGeom prst="roundRect"/>
                <a:solidFill>
                  <a:srgbClr val="FEF08A"/>
                </a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>`
    );

    const pptxBuffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parsePptxFile(pptxBuffer);

    expect(result.totalSlides).toBe(1);
    expect(result.pages.length).toBe(1);

    const page = result.pages[0];
    expect(page.objects.length).toBeGreaterThanOrEqual(4);

    // Frame object exists
    const frame = page.objects.find((o) => o.kind === "frame");
    expect(frame).toBeDefined();
    expect((frame as any).title).toContain("Photosynthesis & Plants");

    // Title text exists
    const textObj = page.objects.find(
      (o) => o.kind === "text" && (o as any).text.includes("Photosynthesis & Plants")
    );
    expect(textObj).toBeDefined();

    // Embedded picture was recovered
    const imgObj = page.objects.find((o) => o.kind === "image");
    expect(imgObj).toBeDefined();
    expect((imgObj as any).src).toContain("data:image/png;base64,");

    // Geometric shape was recovered
    const shapeObj = page.objects.find((o) => o.kind === "shape");
    expect(shapeObj).toBeDefined();
    expect((shapeObj as any).color).toBe("#fef08a");
  });
});

