import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle2, Presentation, Loader2, FileCheck } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { Page, ImageObject, TextObject, FrameObject } from "@/lib/whiteboard/types";
import { toast } from "sonner";
import JSZip from "jszip";

// Use official pdfjs worker URL
const workerUrl = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface DocumentImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentImportDialog({ open, onOpenChange }: DocumentImportDialogProps) {
  const { pushHistory } = useWhiteboard();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [fileType, setFileType] = useState<"pdf" | "pptx">("pdf");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith(".pdf");
    const isPptx = fileName.endsWith(".pptx") || fileName.endsWith(".ppt");

    if (!isPdf && !isPptx) {
      toast.error("Please select a PDF (.pdf) or PowerPoint (.pptx) file.");
      return;
    }

    setImporting(true);
    setFileType(isPdf ? "pdf" : "pptx");

    try {
      if (isPdf) {
        await importPdfFile(file);
      } else {
        await importPptxFile(file);
      }
      onOpenChange(false);
    } catch (err) {
      console.error("Presentation import failed:", err);
      toast.error("Failed to import document. Please verify file integrity.");
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const importPdfFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;
    setProgress({ current: 0, total: totalPages });

    const newBoardPages: Page[] = [];

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      setProgress({ current: pageNum, total: totalPages });
      const pdfPage = await pdf.getPage(pageNum);
      const viewport = pdfPage.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
        const dataUrl = canvas.toDataURL("image/png");

        const slideImage: ImageObject = {
          id: Math.random().toString(36).slice(2, 10),
          kind: "image",
          x: 60,
          y: 60,
          w: Math.round(viewport.width * 0.8),
          h: Math.round(viewport.height * 0.8),
          src: dataUrl,
        };

        const frame: FrameObject = {
          id: Math.random().toString(36).slice(2, 10),
          kind: "frame",
          x: 40,
          y: 40,
          w: Math.round(viewport.width * 0.8) + 40,
          h: Math.round(viewport.height * 0.8) + 40,
          title: `Slide ${pageNum}`,
          order: pageNum,
          color: "#6366f1",
        };

        newBoardPages.push({
          id: Math.random().toString(36).slice(2, 10),
          background: "white",
          objects: [frame, slideImage],
        });
      }
    }

    if (newBoardPages.length > 0) {
      useWhiteboard.setState((prev) => ({
        ...prev,
        pages: [...prev.pages, ...newBoardPages],
        activePageId: newBoardPages[0].id,
      }));
      pushHistory();
      toast.success(`Imported ${newBoardPages.length} PDF slides as board pages!`);
    }
  };

  const importPptxFile = async (file: File) => {
    const zip = await JSZip.loadAsync(file);

    // Find all slide XML files in ppt/slides/
    const slideEntries: { name: string; num: number; file: JSZip.JSZipObject }[] = [];
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
    const totalSlides = slideEntries.length;
    if (totalSlides === 0) {
      toast.error("No presentation slides found in this PowerPoint file.");
      return;
    }

    setProgress({ current: 0, total: totalSlides });
    const parser = new DOMParser();
    const newBoardPages: Page[] = [];

    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i];
      setProgress({ current: i + 1, total: totalSlides });
      const xmlStr = await entry.file.async("string");
      const doc = parser.parseFromString(xmlStr, "application/xml");

      // Extract all text paragraphs from slide
      const paragraphs: string[] = [];
      const textNodes = doc.getElementsByTagName("a:t");
      for (let j = 0; j < textNodes.length; j++) {
        const text = textNodes[j].textContent?.trim();
        if (text) {
          paragraphs.push(text);
        }
      }

      const slideTitle = paragraphs[0] || `Slide ${entry.num}`;
      const bodyLines = paragraphs.slice(1);

      const frame: FrameObject = {
        id: Math.random().toString(36).slice(2, 10),
        kind: "frame",
        x: 60,
        y: 60,
        w: 960,
        h: 640,
        title: slideTitle,
        order: entry.num,
        color: "#f97316",
      };

      const titleObj: TextObject = {
        id: Math.random().toString(36).slice(2, 10),
        kind: "text",
        x: 100,
        y: 100,
        w: 880,
        h: 60,
        text: slideTitle,
        color: "#0f172a",
        fontSize: 28,
      };

      const pageObjects: any[] = [frame, titleObj];

      if (bodyLines.length > 0) {
        const bodyText = bodyLines.map((l) => `• ${l}`).join("\n\n");
        const bodyObj: TextObject = {
          id: Math.random().toString(36).slice(2, 10),
          kind: "text",
          x: 100,
          y: 180,
          w: 860,
          h: Math.min(480, Math.max(120, bodyLines.length * 40)),
          text: bodyText,
          color: "#334155",
          fontSize: 20,
        };
        pageObjects.push(bodyObj);
      }

      newBoardPages.push({
        id: Math.random().toString(36).slice(2, 10),
        background: "white",
        objects: pageObjects,
      });
    }

    if (newBoardPages.length > 0) {
      useWhiteboard.setState((prev) => ({
        ...prev,
        pages: [...prev.pages, ...newBoardPages],
        activePageId: newBoardPages[0].id,
      }));
      pushHistory();
      toast.success(`Imported ${newBoardPages.length} PowerPoint slides as board pages!`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-card p-6 shadow-2xl border border-border">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary font-bold">
            <Presentation className="h-6 w-6" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Import Slides / Lesson Deck
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Convert PowerPoint (.pptx) presentation slides or PDF documents directly into whiteboard pages for interactive handwriting and teaching.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 hover:bg-muted/30 transition-all cursor-pointer text-center group">
            <input
              type="file"
              accept=".pdf,.pptx,.ppt"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
            />
            {importing ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Loader2 className="h-10 w-10 animate-spin" />
                <span className="text-sm font-bold">
                  Converting {fileType.toUpperCase()} Slide {progress.current} of {progress.total}...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                  <Upload className="h-7 w-7" />
                </div>
                <span className="text-sm font-bold text-foreground">
                  Select PowerPoint (.pptx) or PDF File
                </span>
                <span className="text-xs text-muted-foreground">
                  Drag and drop or tap to browse file on your device or USB drive
                </span>
              </div>
            )}
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
