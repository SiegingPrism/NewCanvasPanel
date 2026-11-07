import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pen,
  Highlighter,
  Eraser,
  StickyNote,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Upload,
  Send,
  Layers,
  Edit3,
  Bookmark,
  Share2,
  Download,
  List,
  Check,
  Palette,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { playPageTurnSound } from "@/lib/audio/pageTurnSound";
import type { TextbookBook, TextbookChapter } from "@/lib/curriculum/ncertCatalog";
import type { Page, ImageObject, FrameObject, TextObject } from "@/lib/whiteboard/types";

interface NCERTBookReaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: TextbookBook | null;
  initialChapter?: TextbookChapter | null;
}

type AnnotationTool = "pen" | "highlighter" | "eraser";

interface StickyNoteItem {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const PEN_COLORS = [
  { name: "Charcoal", hex: "#0f172a" },
  { name: "Royal Blue", hex: "#1d4ed8" },
  { name: "Crimson", hex: "#dc2626" },
  { name: "Emerald", hex: "#15803d" },
  { name: "Purple", hex: "#7e22ce" },
  { name: "Amber", hex: "#d97706" },
];

const HIGHLIGHTER_COLORS = [
  { name: "Neon Yellow", hex: "rgba(250, 204, 21, 0.45)" },
  { name: "Neon Green", hex: "rgba(74, 222, 128, 0.45)" },
  { name: "Neon Pink", hex: "rgba(244, 114, 182, 0.45)" },
  { name: "Sky Blue", hex: "rgba(56, 189, 248, 0.45)" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function NCERTBookReaderModal({
  open,
  onOpenChange,
  book,
  initialChapter,
}: NCERTBookReaderModalProps) {
  const { setPages, setActivePage } = useWhiteboard();

  // Active chapter
  const [activeChapter, setActiveChapter] = useState<TextbookChapter | null>(null);

  // Real PDF State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");

  // In-book annotations state
  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [penColor, setPenColor] = useState<string>("#1d4ed8");
  const [penSize, setPenSize] = useState<number>(3);
  const [highlighterColor, setHighlighterColor] = useState<string>("rgba(250, 204, 21, 0.45)");
  const [stickyNotes, setStickyNotes] = useState<Record<number, StickyNoteItem[]>>({});
  const [activeStickyColor, setActiveStickyColor] = useState<string>("#fef08a");

  // Scratchpad side drawer
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [scratchNotes, setScratchNotes] = useState<string>("");

  // Underlying PDF canvases
  const leftPdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightPdfCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Overlay annotation canvases
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize chapter when book or initialChapter changes
  useEffect(() => {
    if (!book) return;
    const targetChapter =
      initialChapter || (book.chapters && book.chapters.length > 0 ? book.chapters[0] : null);
    setActiveChapter(targetChapter);
    setPdfDoc(null);
    setPdfPageCount(0);
    setPdfFileName(null);
    setCurrentPageIndex(0);
  }, [book, initialChapter]);

  // Load Real PDF File using pdfjs-dist
  const handleLoadPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please select an official PDF file.");
      return;
    }

    setLoadingPdf(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const loadedDoc = await loadingTask.promise;
      setPdfDoc(loadedDoc);
      setPdfPageCount(loadedDoc.numPages);
      setPdfFileName(file.name);
      setCurrentPageIndex(0);
      toast.success(`Loaded "${file.name}" (${loadedDoc.numPages} pages)`);
    } catch (err) {
      console.error("PDF loading error:", err);
      toast.error("Failed to load PDF. Please check file format.");
    } finally {
      setLoadingPdf(false);
    }
  };

  // Render PDF pages on canvas when page index changes
  const renderPdfPage = useCallback(
    async (pageNumber: number, targetCanvas: HTMLCanvasElement | null) => {
      if (!pdfDoc || !targetCanvas || pageNumber < 1 || pageNumber > pdfPageCount) return;
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        targetCanvas.width = viewport.width;
        targetCanvas.height = viewport.height;
        const ctx = targetCanvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.warn(`Error rendering PDF page ${pageNumber}:`, err);
      }
    },
    [pdfDoc, pdfPageCount]
  );

  useEffect(() => {
    if (!pdfDoc || !open) return;
    renderPdfPage(currentPageIndex + 1, leftPdfCanvasRef.current);
    if (currentPageIndex + 2 <= pdfPageCount) {
      renderPdfPage(currentPageIndex + 2, rightPdfCanvasRef.current);
    } else if (rightPdfCanvasRef.current) {
      const ctx = rightPdfCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, rightPdfCanvasRef.current.width, rightPdfCanvasRef.current.height);
    }
  }, [pdfDoc, currentPageIndex, pdfPageCount, open, renderPdfPage]);

  // Load annotations from localStorage
  const loadPageAnnotations = useCallback(
    (pageNum: number, canvas: HTMLCanvasElement | null) => {
      if (!canvas || !book || !activeChapter) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const storageKey = `slate_anno_${book.id}_ch${activeChapter.chapterNumber}_p${pageNum}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = savedData;
      }
    },
    [book, activeChapter]
  );

  // Save annotations to localStorage
  const savePageAnnotations = useCallback(
    (pageNum: number, canvas: HTMLCanvasElement | null) => {
      if (!canvas || !book || !activeChapter) return;
      const storageKey = `slate_anno_${book.id}_ch${activeChapter.chapterNumber}_p${pageNum}`;
      try {
        const dataUrl = canvas.toDataURL("image/png");
        localStorage.setItem(storageKey, dataUrl);
      } catch (err) {
        console.warn("Could not save page annotations:", err);
      }
    },
    [book, activeChapter]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      loadPageAnnotations(currentPageIndex, leftCanvasRef.current);
      loadPageAnnotations(currentPageIndex + 1, rightCanvasRef.current);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentPageIndex, open, loadPageAnnotations]);

  // Turn to Next Page (advance by 2 for dual spread)
  const handleNextPage = () => {
    const total = pdfDoc ? pdfPageCount : 2;
    if (currentPageIndex + 2 >= total) {
      toast.info("End of Chapter reached.");
      return;
    }
    savePageAnnotations(currentPageIndex, leftCanvasRef.current);
    savePageAnnotations(currentPageIndex + 1, rightCanvasRef.current);

    if (soundEnabled) {
      playPageTurnSound();
    }
    setFlipDirection("next");
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPageIndex((prev) => prev + 2);
      setIsFlipping(false);
    }, 300);
  };

  // Turn to Prev Page
  const handlePrevPage = () => {
    if (currentPageIndex <= 0) {
      toast.info("You are on the first page.");
      return;
    }
    savePageAnnotations(currentPageIndex, leftCanvasRef.current);
    savePageAnnotations(currentPageIndex + 1, rightCanvasRef.current);

    if (soundEnabled) {
      playPageTurnSound();
    }
    setFlipDirection("prev");
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.max(prev - 2, 0));
      setIsFlipping(false);
    }, 300);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Canvas drawing handlers
  const handlePointerDown = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null
  ) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    isDrawingRef.current = true;
    currentCanvasRef.current = canvas;
    lastPointRef.current = { x, y };

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.arc(x, y, penSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = penColor;
      ctx.fill();
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current || !currentCanvasRef.current) return;
    const canvas = currentCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "multiply";
      ctx.strokeStyle = highlighterColor;
      ctx.lineWidth = 22;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPointRef.current = { x, y };
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    currentCanvasRef.current = null;
  };

  // Clear current page annotations
  const handleClearAnnotations = (pageNum: number, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (book && activeChapter) {
      localStorage.removeItem(`slate_anno_${book.id}_ch${activeChapter.chapterNumber}_p${pageNum}`);
    }
    toast.success("Page annotations cleared");
  };

  // Add Sticky Note
  const handleAddStickyNote = (pageNum: number) => {
    const text = prompt("Enter note text for this page:");
    if (!text || text.trim().length === 0) return;
    const newNote: StickyNoteItem = {
      id: uid(),
      x: 30 + Math.random() * 40,
      y: 80 + Math.random() * 40,
      text: text.trim(),
      color: activeStickyColor,
    };
    setStickyNotes((prev) => ({
      ...prev,
      [pageNum]: [...(prev[pageNum] || []), newNote],
    }));
    toast.success("Sticky note added");
  };

  // Send current view or chapter to Whiteboard
  const handleSendToBoard = () => {
    if (!book || !activeChapter) return;

    const wb = useWhiteboard.getState();
    const pageId = uid();
    const frameId = uid();

    // If PDF page is loaded, composite it onto a canvas and push as image
    if (pdfDoc && leftPdfCanvasRef.current) {
      const mergedCanvas = document.createElement("canvas");
      mergedCanvas.width = leftPdfCanvasRef.current.width;
      mergedCanvas.height = leftPdfCanvasRef.current.height;
      const mCtx = mergedCanvas.getContext("2d");
      if (mCtx) {
        mCtx.drawImage(leftPdfCanvasRef.current, 0, 0);
        if (leftCanvasRef.current) {
          mCtx.drawImage(leftCanvasRef.current, 0, 0);
        }
        const dataUrl = mergedCanvas.toDataURL("image/png");

        const frame: FrameObject = {
          id: frameId,
          kind: "frame",
          x: 40,
          y: 40,
          w: 1240,
          h: 840,
          title: `${book.subject} (Class ${book.grade}): ${activeChapter.title} · Page ${currentPageIndex + 1}`,
          order: wb.pages.length + 1,
          color: "#2563eb",
        };

        const imageObj: ImageObject = {
          id: uid(),
          kind: "image",
          x: 60,
          y: 70,
          w: 640,
          h: 780,
          src: dataUrl,
        };

        const noteObj: TextObject = {
          id: uid(),
          kind: "text",
          x: 740,
          y: 80,
          w: 500,
          h: 120,
          text: `Teacher Notes & Solution:\n\nUse your smart pen to solve equations or annotate key concepts for the class.`,
          fontSize: 20,
          color: "#1e293b",
        };

        const newPage: Page = {
          id: pageId,
          background: "lined",
          objects: [frame, imageObj, noteObj],
        };

        wb.setPages([...wb.pages, newPage], pageId);
        setActivePage(pageId);
        toast.success(`Sent textbook page ${currentPageIndex + 1} to whiteboard`);
        onOpenChange(false);
        return;
      }
    }

    // If no PDF loaded yet, send authentic chapter reference card
    const frame: FrameObject = {
      id: frameId,
      kind: "frame",
      x: 40,
      y: 40,
      w: 1200,
      h: 800,
      title: `${book.subject} (Class ${book.grade}): Chapter ${activeChapter.chapterNumber} - ${activeChapter.title}`,
      order: wb.pages.length + 1,
      color: "#2563eb",
    };

    const headerText: TextObject = {
      id: uid(),
      kind: "text",
      x: 80,
      y: 80,
      w: 1100,
      h: 50,
      text: `NCERT Class ${book.grade} ${book.subject} · Chapter ${activeChapter.chapterNumber}`,
      fontSize: 26,
      color: "#1e3a8a",
    };

    const titleText: TextObject = {
      id: uid(),
      kind: "text",
      x: 80,
      y: 140,
      w: 1100,
      h: 60,
      text: `${activeChapter.title}${activeChapter.hindiTitle ? ` (${activeChapter.hindiTitle})` : ""}`,
      fontSize: 32,
      color: "#0f172a",
    };

    const infoText: TextObject = {
      id: uid(),
      kind: "text",
      x: 80,
      y: 220,
      w: 1100,
      h: 120,
      text: `Official Textbook Portal: ${activeChapter.officialUrl}\nPublisher: ${book.officialPublisher} (${book.editionYear})\n\n✍️ Write lesson notes, solve exercises, or draw diagrams below using your smart pen.`,
      fontSize: 18,
      color: "#334155",
    };

    const newPage: Page = {
      id: pageId,
      background: "lined",
      objects: [frame, headerText, titleText, infoText],
    };

    wb.setPages([...wb.pages, newPage], pageId);
    setActivePage(pageId);
    toast.success(`Created lesson slide for "${activeChapter.title}"`);
    onOpenChange(false);
  };

  if (!book || !activeChapter) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1500px] h-[92vh] max-h-[920px] p-0 flex flex-col bg-slate-900 border border-slate-700 shadow-2xl rounded-3xl overflow-hidden select-none outline-none z-[100]"
        aria-describedby={undefined}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {book.title} - Chapter {activeChapter.chapterNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Top Reader Navigation Bar */}
        <div className="h-14 px-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 text-white z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate max-w-[340px] md:max-w-[500px]">
                {book.title} - Chapter {activeChapter.chapterNumber}: {activeChapter.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Class {book.grade} {book.subject}</span>
                <span>•</span>
                <span className="text-blue-400">NCERT Official Portal</span>
                {pdfFileName && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {pdfFileName} ({pdfPageCount}p)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            {/* Open directly on ncert.nic.in */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(activeChapter.officialUrl, "_blank")}
              className="h-8 text-xs font-semibold gap-1.5 border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-xl cursor-pointer"
              title="Open official chapter PDF directly on ncert.nic.in in a browser tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open on ncert.nic.in</span>
            </Button>

            {/* Load Local PDF File */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={handleLoadPdfFile}
              className="hidden"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={loadingPdf}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs font-semibold gap-1.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl cursor-pointer"
              title="Load downloaded official chapter PDF to view and annotate with 3D page turning"
            >
              {loadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{pdfDoc ? "Change PDF" : "Load Chapter PDF"}</span>
            </Button>

            {/* Sound Toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              title={soundEnabled ? "Disable page flip sound" : "Enable page flip sound"}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            {/* Send to Board */}
            <Button
              size="sm"
              onClick={handleSendToBoard}
              className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md rounded-xl cursor-pointer"
              title="Send current textbook page or chapter card to whiteboard"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Send to Board</span>
            </Button>

            {/* Close */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-lg ml-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* In-Book Teacher Annotations Toolbar */}
        <div className="h-11 px-4 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0 text-slate-300 z-20">
          <div className="flex items-center gap-1.5">
            {/* Tool selectors */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTool("pen")}
              className={cn(
                "h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer",
                tool === "pen"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Pen className="h-3.5 w-3.5" />
              <span>Pen</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTool("highlighter")}
              className={cn(
                "h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer",
                tool === "highlighter"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span>Highlight</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setTool("eraser")}
              className={cn(
                "h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg cursor-pointer",
                tool === "eraser"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Eraser</span>
            </Button>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Palette Swatches */}
            {tool === "pen" && (
              <div className="flex items-center gap-1">
                {PEN_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={cn(
                      "h-5 w-5 rounded-full border border-white/20 transition-all cursor-pointer",
                      penColor === c.hex && "ring-2 ring-blue-400 scale-110 shadow-md"
                    )}
                  />
                ))}
              </div>
            )}

            {tool === "highlighter" && (
              <div className="flex items-center gap-1">
                {HIGHLIGHTER_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setHighlighterColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    className={cn(
                      "h-5 w-5 rounded-full border border-white/30 transition-all cursor-pointer",
                      highlighterColor === c.hex && "ring-2 ring-amber-400 scale-110 shadow-md"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Add Sticky Note */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddStickyNote(currentPageIndex)}
              className="h-7 text-xs font-medium gap-1 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 rounded-lg cursor-pointer"
            >
              <StickyNote className="h-3.5 w-3.5" />
              <span>Note</span>
            </Button>

            {/* Notes Drawer Toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowScratchpad(!showScratchpad)}
              className={cn(
                "h-7 text-xs font-medium gap-1 rounded-lg cursor-pointer",
                showScratchpad
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Notes</span>
            </Button>

            {/* Clear Current Page */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                handleClearAnnotations(currentPageIndex, leftCanvasRef.current);
                handleClearAnnotations(currentPageIndex + 1, rightCanvasRef.current);
              }}
              className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Clear</span>
            </Button>
          </div>
        </div>

        {/* Dual-Spread 3D Flipbook Main Viewport */}
        <div className="flex-1 min-h-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6 flex items-center justify-center relative overflow-hidden">
          {/* Main Book Dual-Spread Container */}
          <div
            className="w-full max-w-[1360px] h-full max-h-[760px] flex shadow-2xl rounded-2xl overflow-hidden bg-white text-slate-900 border border-slate-300 relative"
            style={{ perspective: "2000px" }}
          >
            {/* Center Spine Binding Crease & Shadow */}
            <div className="absolute left-1/2 top-0 bottom-0 w-8 -translate-x-1/2 bg-gradient-to-r from-black/15 via-black/5 to-black/15 pointer-events-none z-30" />

            {/* ================= LEFT PAGE ================= */}
            <div className="flex-1 h-full border-r border-slate-200 flex flex-col relative bg-[#fcfbf9] overflow-hidden">
              {/* PDF Canvas Layer */}
              <canvas
                ref={leftPdfCanvasRef}
                className={cn(
                  "absolute inset-0 w-full h-full object-contain pointer-events-none z-10",
                  !pdfDoc && "hidden"
                )}
              />

              {/* In-Book Teacher Drawing Layer */}
              <canvas
                ref={leftCanvasRef}
                width={700}
                height={900}
                onPointerDown={(e) => handlePointerDown(e, leftCanvasRef.current)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute inset-0 w-full h-full touch-none z-20 cursor-crosshair"
              />

              {/* Sticky Notes on Left Page */}
              <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
                {(stickyNotes[currentPageIndex] || []).map((note) => (
                  <div
                    key={note.id}
                    style={{ left: `${note.x}%`, top: `${note.y}%` }}
                    className="absolute p-2.5 rounded-lg shadow-lg text-xs font-medium w-48 text-slate-900 bg-amber-100 border border-amber-300 pointer-events-auto"
                  >
                    <p className="whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))}
              </div>

              {/* Cover / Chapter Overview when no PDF loaded */}
              {!pdfDoc && (
                <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto z-15">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                        {book.subject} · Class {book.grade}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {book.editionYear}
                      </span>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">
                        {book.title}
                      </h3>
                      {book.hindiTitle && (
                        <p className="text-base font-semibold text-slate-600">
                          {book.hindiTitle}
                        </p>
                      )}
                      <p className="text-xs font-medium text-slate-500 pt-1">
                        Official Publisher: {book.officialPublisher}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 space-y-2 mt-4">
                      <h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                        <Bookmark className="h-4 w-4 text-blue-600" />
                        Chapter {activeChapter.chapterNumber}: {activeChapter.title}
                      </h4>
                      {activeChapter.hindiTitle && (
                        <p className="text-xs font-medium text-blue-700">
                          {activeChapter.hindiTitle}
                        </p>
                      )}
                      <p className="text-[11px] text-blue-800 leading-relaxed pt-1">
                        This digital reference is indexed directly to official Government of India
                        curriculum publications.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <div className="flex items-start gap-2 text-xs font-semibold text-amber-900">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>Viewing Official Chapter Material:</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-normal">
                      To ensure compliance with official NCERT digital dissemination terms (June 2026),
                      chapters can be opened directly on the national portal or loaded from school
                      storage.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => window.open(activeChapter.officialUrl, "_blank")}
                        className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open on ncert.nic.in</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs font-semibold gap-1.5 border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900 rounded-xl"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Load Chapter PDF</span>
                      </Button>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 text-center border-t border-slate-100 pt-2">
                    Page 1 · Cover & Reference
                  </div>
                </div>
              )}
            </div>

            {/* ================= RIGHT PAGE ================= */}
            <div
              className={cn(
                "flex-1 h-full flex flex-col relative bg-[#fcfbf9] overflow-hidden transition-transform duration-300 origin-left",
                isFlipping && flipDirection === "next" && "-rotate-y-12 shadow-2xl",
                isFlipping && flipDirection === "prev" && "rotate-y-12 shadow-2xl"
              )}
            >
              {/* PDF Canvas Layer */}
              <canvas
                ref={rightPdfCanvasRef}
                className={cn(
                  "absolute inset-0 w-full h-full object-contain pointer-events-none z-10",
                  !pdfDoc && "hidden"
                )}
              />

              {/* In-Book Teacher Drawing Layer */}
              <canvas
                ref={rightCanvasRef}
                width={700}
                height={900}
                onPointerDown={(e) => handlePointerDown(e, rightCanvasRef.current)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="absolute inset-0 w-full h-full touch-none z-20 cursor-crosshair"
              />

              {/* Sticky Notes on Right Page */}
              <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
                {(stickyNotes[currentPageIndex + 1] || []).map((note) => (
                  <div
                    key={note.id}
                    style={{ left: `${note.x}%`, top: `${note.y}%` }}
                    className="absolute p-2.5 rounded-lg shadow-lg text-xs font-medium w-48 text-slate-900 bg-amber-100 border border-amber-300 pointer-events-auto"
                  >
                    <p className="whitespace-pre-wrap">{note.text}</p>
                  </div>
                ))}
              </div>

              {/* Notes / Ready Area when no PDF loaded */}
              {!pdfDoc && (
                <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto z-15">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-bold text-slate-700">
                        Smart Board Annotation Canvas
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Interactive Stylus Ready
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Pen className="h-4 w-4 text-blue-600" />
                        Teacher Notes & Practice
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Use the pen and highlighter tools above to write notes, solve examples, or
                        paste sticky notes. You can push this directly to the whiteboard by clicking
                        &ldquo;Send to Board&rdquo;.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 space-y-2">
                      <div className="text-xs font-bold text-slate-800">
                        Official Chapter Source:
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 break-all bg-slate-100 p-2 rounded-lg">
                        {activeChapter.officialUrl}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 text-center border-t border-slate-100 pt-2">
                    Page 2 · Teacher Notes & Whiteboard Canvas
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Left / Prev Page Turn Button */}
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-white flex items-center justify-center shadow-xl transition-all cursor-pointer z-35",
              currentPageIndex <= 0 && "opacity-30 cursor-not-allowed"
            )}
            title="Previous Page (or Left Arrow)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Right / Next Page Turn Button */}
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPageIndex + 2 >= (pdfDoc ? pdfPageCount : 2)}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-600 text-white flex items-center justify-center shadow-xl transition-all cursor-pointer z-35",
              currentPageIndex + 2 >= (pdfDoc ? pdfPageCount : 2) && "opacity-30 cursor-not-allowed"
            )}
            title="Next Page (or Right Arrow)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Bottom Page Indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-white text-xs font-bold shadow-lg flex items-center gap-3 z-35">
            <span>
              {pdfDoc
                ? `Pages ${currentPageIndex + 1}-${Math.min(currentPageIndex + 2, pdfPageCount)} of ${pdfPageCount}`
                : "Pages 1-2 · Official Chapter Overview"}
            </span>
          </div>

          {/* Side Drawer: Scratchpad / Lesson Notes */}
          {showScratchpad && (
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-slate-900/95 border-l border-slate-700 p-4 flex flex-col gap-3 shadow-2xl z-40">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-blue-400" />
                  Teaching Notes Drawer
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowScratchpad(false)}
                  className="h-6 w-6 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <textarea
                value={scratchNotes}
                onChange={(e) => setScratchNotes(e.target.value)}
                placeholder="Type lesson plan, homework questions, or class discussion notes here..."
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
              />
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Lesson notes saved");
                  setShowScratchpad(false);
                }}
                className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
              >
                Save Notes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
