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
  Sparkles,
  Send,
  Layers,
  Edit3,
  Bookmark,
  Share2,
  Download,
  List,
  Check,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWhiteboard } from "@/lib/whiteboard/store";
import {
  getChapterPages,
  playPageTurnSound,
  type TextbookPageContent,
} from "@/lib/curriculum/ncertBookContent";
import type { TextbookBook, TextbookChapter } from "@/lib/curriculum/ncertCatalog";
import type { Page, TextObject, FrameObject, StickyNoteObject } from "@/lib/whiteboard/types";

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
  const { pages: boardPages, setPages, setActivePage } = useWhiteboard();

  // Current chapter & pages
  const [activeChapter, setActiveChapter] = useState<TextbookChapter | null>(null);
  const [chapterPages, setChapterPages] = useState<TextbookPageContent[]>([]);
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

  // Teaching scratchpad side drawer
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [scratchNotes, setScratchNotes] = useState<string>("");

  // Canvases for left and right pages
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize chapter when book or initialChapter changes
  useEffect(() => {
    if (!book) return;
    const targetChapter =
      initialChapter || (book.chapters && book.chapters.length > 0 ? book.chapters[0] : null);
    setActiveChapter(targetChapter);

    if (targetChapter) {
      const p = getChapterPages(
        book.id,
        book.subject,
        book.grade,
        targetChapter.chapterNumber,
        targetChapter.title,
        book.editionYear,
        book.officialPublisher
      );
      setChapterPages(p);
      setCurrentPageIndex(0);
    }
  }, [book, initialChapter]);

  // Load annotations from localStorage for given page number
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

  // Save current canvas to localStorage
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

  // Synchronize canvas drawings on page turn
  useEffect(() => {
    if (!open) return;
    const leftPageNum = currentPageIndex;
    const rightPageNum = currentPageIndex + 1;

    // Small delay to allow canvas elements to mount
    const timer = setTimeout(() => {
      loadPageAnnotations(leftPageNum, leftCanvasRef.current);
      if (rightPageNum < chapterPages.length) {
        loadPageAnnotations(rightPageNum, rightCanvasRef.current);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentPageIndex, open, chapterPages.length, loadPageAnnotations]);

  // Turn to Next Page (advance by 2 for dual spread)
  const handleNextPage = () => {
    if (currentPageIndex + 2 >= chapterPages.length && currentPageIndex + 1 >= chapterPages.length) {
      toast.info("End of Chapter reached.");
      return;
    }
    // Save current annotations before flipping
    savePageAnnotations(currentPageIndex, leftCanvasRef.current);
    if (currentPageIndex + 1 < chapterPages.length) {
      savePageAnnotations(currentPageIndex + 1, rightCanvasRef.current);
    }

    if (soundEnabled) {
      playPageTurnSound();
    }
    setFlipDirection("next");
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.min(prev + 2, Math.max(0, chapterPages.length - 1)));
      setIsFlipping(false);
    }, 320);
  };

  // Turn to Prev Page
  const handlePrevPage = () => {
    if (currentPageIndex <= 0) {
      toast.info("You are on the first page.");
      return;
    }
    savePageAnnotations(currentPageIndex, leftCanvasRef.current);
    if (currentPageIndex + 1 < chapterPages.length) {
      savePageAnnotations(currentPageIndex + 1, rightCanvasRef.current);
    }

    if (soundEnabled) {
      playPageTurnSound();
    }
    setFlipDirection("prev");
    setIsFlipping(true);

    setTimeout(() => {
      setCurrentPageIndex((prev) => Math.max(prev - 2, 0));
      setIsFlipping(false);
    }, 320);
  };

  // Keyboard navigation (ArrowLeft / ArrowRight)
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
  }, [open, currentPageIndex, chapterPages.length]);

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

  const handlePointerMove = (
    e: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement | null
  ) => {
    if (!isDrawingRef.current || currentCanvasRef.current !== canvas || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPointRef.current) return;

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

  const handlePointerUp = (pageNum: number, canvas: HTMLCanvasElement | null) => {
    if (isDrawingRef.current && canvas) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      currentCanvasRef.current = null;
      savePageAnnotations(pageNum, canvas);
    }
  };

  // Clear current page annotations
  const handleClearPage = (pageNum: number, canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (book && activeChapter) {
      const storageKey = `slate_anno_${book.id}_ch${activeChapter.chapterNumber}_p${pageNum}`;
      localStorage.removeItem(storageKey);
    }
    toast.success("Annotations cleared for this page");
  };

  // Add sticky note to page
  const handleAddStickyNote = (pageNum: number) => {
    const newNote: StickyNoteItem = {
      id: uid(),
      x: 30 + Math.random() * 80,
      y: 60 + Math.random() * 120,
      text: "Teacher Note:\nExplain this concept to class.",
      color: activeStickyColor,
    };
    setStickyNotes((prev) => ({
      ...prev,
      [pageNum]: [...(prev[pageNum] || []), newNote],
    }));
    toast.success("Sticky note added to page");
  };

  // Update sticky note text
  const handleUpdateStickyText = (pageNum: number, id: string, text: string) => {
    setStickyNotes((prev) => ({
      ...prev,
      [pageNum]: (prev[pageNum] || []).map((n) => (n.id === id ? { ...n, text } : n)),
    }));
  };

  // Delete sticky note
  const handleDeleteSticky = (pageNum: number, id: string) => {
    setStickyNotes((prev) => ({
      ...prev,
      [pageNum]: (prev[pageNum] || []).filter((n) => n.id !== id),
    }));
  };

  // Send Active Textbook Page Directly to Whiteboard
  const handleSendToWhiteboard = (pageContent: TextbookPageContent, canvas: HTMLCanvasElement | null) => {
    if (!book || !activeChapter) return;

    // Build structured canvas objects for this page
    const newPageId = uid();
    const frameId = uid();

    const lessonFrame: FrameObject = {
      id: frameId,
      kind: "frame",
      x: 60,
      y: 60,
      w: 1240,
      h: 820,
      title: `${book.subject} (Class ${book.grade}): ${activeChapter.title} - Page ${pageContent.pageNumber}`,
      order: boardPages.length + 1,
      color: "#2563eb",
    };

    const headerText: TextObject = {
      id: uid(),
      kind: "text",
      x: 100,
      y: 95,
      w: 1160,
      h: 40,
      text: `${book.officialPublisher} · Class ${book.grade} ${book.subject} · ${pageContent.header}`,
      fontSize: 20,
      color: "#1e40af",
    };

    const titleText: TextObject = {
      id: uid(),
      kind: "text",
      x: 100,
      y: 140,
      w: 1160,
      h: 50,
      text: pageContent.chapterTitle,
      fontSize: 28,
      color: "#0f172a",
    };

    // Aggregate sections text
    const sectionTexts: string[] = [];
    pageContent.sections.forEach((sec) => {
      if (sec.heading) sectionTexts.push(`📌 ${sec.heading}`);
      sec.paragraphs.forEach((p) => sectionTexts.push(p));
      if (sec.callout) {
        sectionTexts.push(`\n💡 ${sec.callout.title.toUpperCase()}: ${sec.callout.text}`);
      }
      if (sec.mathLatex && sec.mathLatex.length > 0) {
        sectionTexts.push(`\n📐 Formulas / Key Equations:\n${sec.mathLatex.join("\n")}`);
      }
      if (sec.questions && sec.questions.length > 0) {
        sectionTexts.push("\n📝 Practice Questions:");
        sec.questions.forEach((q) => {
          sectionTexts.push(`${q.qNumber}. ${q.question}`);
        });
      }
    });

    const bodyText: TextObject = {
      id: uid(),
      kind: "text",
      x: 100,
      y: 200,
      w: 740,
      h: 640,
      text: sectionTexts.join("\n\n"),
      fontSize: 16,
      color: "#1e293b",
    };

    // Right-side teaching notes card
    const notesCard: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: 880,
      y: 200,
      w: 380,
      h: 600,
      color: "#fef08a",
      text: `✍️ TEACHER NOTES & EXPLANATIONS\n\n• DIKSHA DIAL Code: ${activeChapter.dikshaDialCode || "Standard Curriculum"}\n• Edition: ${book.editionYear}\n\n• Key Concepts for Class Discussion:\n  1. Review definitions with students.\n  2. Solve step-by-step example on board.\n  3. Assign practice questions 1 & 2.\n\nUse your smart pen to solve equations or annotate here during the lesson!`,
    };

    const newWhiteboardPage: Page = {
      id: newPageId,
      title: `${book.subject} Ch${activeChapter.chapterNumber} P${pageContent.pageNumber}`,
      objects: [lessonFrame, headerText, titleText, bodyText, notesCard],
      background: "lined",
    };

    const wb = useWhiteboard.getState();
    wb.setPages([...wb.pages, newWhiteboardPage], newPageId);
    wb.setActivePage(newPageId);
    onOpenChange(false);
    toast.success(`Sent Page ${pageContent.pageNumber} to Whiteboard!`);
  };

  if (!open || !book || !activeChapter || chapterPages.length === 0) {
    return null;
  }

  const leftPage = chapterPages[currentPageIndex] || null;
  const rightPage =
    currentPageIndex + 1 < chapterPages.length ? chapterPages[currentPageIndex + 1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1500px] h-[92vh] max-h-[920px] z-50 p-0 gap-0 overflow-hidden rounded-3xl bg-[#0f172a] text-slate-100 border border-slate-700 shadow-2xl flex flex-col select-none"
      >
        <DialogTitle className="sr-only">
          {book.title} - Chapter {activeChapter.chapterNumber}
        </DialogTitle>

        {/* TOP BAR: Book Info, Chapter Switcher, Annotation Toolbar, Actions */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-[#1e293b] z-20 shrink-0 gap-2">
          {/* Left: Book & Chapter Info */}
          <div className="flex items-center gap-2 min-w-0 shrink">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                  {book.board.toUpperCase()} · Class {book.grade}
                </span>
                <span className="text-[11px] font-semibold text-white truncate hidden md:inline">
                  {book.title}
                </span>
              </div>
            </div>

            {/* Chapter Selector Dropdown */}
            <select
              value={activeChapter.chapterNumber}
              onChange={(e) => {
                const chNum = Number(e.target.value);
                const ch = book.chapters.find((c) => c.chapterNumber === chNum);
                if (ch) {
                  setActiveChapter(ch);
                  const p = getChapterPages(
                    book.id,
                    book.subject,
                    book.grade,
                    ch.chapterNumber,
                    ch.title,
                    book.editionYear,
                    book.officialPublisher
                  );
                  setChapterPages(p);
                  setCurrentPageIndex(0);
                  toast.success(`Switched to Chapter ${ch.chapterNumber}`);
                }
              }}
              className="text-xs font-semibold bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] sm:max-w-[210px] truncate cursor-pointer shrink-0"
            >
              {book.chapters.map((ch) => (
                <option key={ch.chapterNumber} value={ch.chapterNumber}>
                  Ch {ch.chapterNumber}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          {/* IN-BOOK SMART ANNOTATION TOOLBAR */}
          <div className="flex items-center gap-1.5 bg-slate-850 bg-[#0f172a] border border-slate-700 rounded-xl px-2 py-1 shadow-inner shrink-0">
            {/* Pen Tool */}
            <button
              onClick={() => setTool("pen")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                tool === "pen"
                  ? "bg-blue-600 text-white shadow-xs ring-1 ring-blue-300"
                  : "text-slate-300 hover:bg-slate-800"
              )}
              title="Stylus Pen"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pen</span>
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/60 ml-0.5 shrink-0"
                style={{ backgroundColor: penColor }}
              />
            </button>

            {/* Color Swatches for Pen */}
            {tool === "pen" && (
              <div className="flex items-center gap-1 pl-1 pr-1 border-r border-slate-700">
                {PEN_COLORS.slice(0, 5).map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={cn(
                      "w-4 h-4 rounded-full border transition-transform hover:scale-110 cursor-pointer",
                      penColor === c.hex ? "border-white scale-110 ring-2 ring-blue-400" : "border-slate-500"
                    )}
                    title={c.name}
                  />
                ))}
              </div>
            )}

            {/* Highlighter Tool */}
            <button
              onClick={() => setTool("highlighter")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                tool === "highlighter"
                  ? "bg-amber-500 text-slate-950 shadow-xs ring-1 ring-amber-300"
                  : "text-slate-300 hover:bg-slate-800"
              )}
              title="Highlighter (semi-transparent)"
            >
              <Highlighter className="w-3.5 h-3.5" />
              <span>Highlight</span>
            </button>

            {/* Eraser Tool */}
            <button
              onClick={() => setTool("eraser")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                tool === "eraser"
                  ? "bg-rose-600 text-white shadow-xs ring-1 ring-rose-300"
                  : "text-slate-300 hover:bg-slate-800"
              )}
              title="Eraser"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>

            {/* Sticky Note */}
            <button
              onClick={() => handleAddStickyNote(currentPageIndex)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Add Sticky Note"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Note</span>
            </button>

            {/* Clear Page Annotations */}
            <button
              onClick={() => handleClearPage(currentPageIndex, leftCanvasRef.current)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear annotations on left page"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={soundEnabled ? "Mute page-turn sound" : "Enable page-turn sound"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Scratchpad Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScratchpad((prev) => !prev)}
              className={cn(
                "rounded-xl text-xs font-bold h-8 px-2.5 border-slate-700 cursor-pointer",
                showScratchpad ? "bg-blue-600 text-white border-blue-500" : "bg-slate-800 text-slate-200"
              )}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              <span>Notes</span>
            </Button>

            {/* Send Page to Whiteboard */}
            {leftPage && (
              <Button
                size="sm"
                onClick={() => handleSendToWhiteboard(leftPage, leftCanvasRef.current)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs h-8 px-3 shadow-md gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Send to Board</span>
              </Button>
            )}

            {/* Close */}
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
              title="Close Book Reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* FLIPBOOK WORKSPACE AREA */}
        <div className="flex-1 relative overflow-hidden bg-[#181a1f] flex items-center justify-center p-3 select-none">
          {/* Main Book Dual-Spread Container with 3D perspective */}
          <div
            className={cn(
              "relative flex w-full max-w-[1380px] h-[calc(100%-20px)] rounded-2xl shadow-2xl transition-all duration-300",
              isFlipping && flipDirection === "next" && "scale-[0.995]",
              isFlipping && flipDirection === "prev" && "scale-[0.995]"
            )}
            style={{
              perspective: "2000px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* LEFT PAGE */}
            {leftPage && (
              <div
                className="relative flex-1 h-full bg-[#fcfbf7] text-[#1c1917] rounded-l-2xl border-r border-[#e7e5e4] shadow-inner overflow-hidden flex flex-col"
                style={{
                  boxShadow: "inset -18px 0 30px -10px rgba(0, 0, 0, 0.12)",
                }}
              >
                {/* Book Page Header */}
                <div className="flex items-center justify-between px-8 pt-6 pb-3 border-b border-[#e7e5e4]/80 text-[#78716c] text-xs font-serif shrink-0">
                  <span className="font-semibold uppercase tracking-wider">
                    {book.subject} · Class {book.grade}
                  </span>
                  <span>{leftPage.header}</span>
                  <span className="font-bold text-[#44403c]">Page {leftPage.pageNumber}</span>
                </div>

                {/* Page Content Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 font-serif text-[#1c1917] relative">
                  {/* Chapter Banner on Page 1 */}
                  {leftPage.type === "cover" ? (
                    <div className="flex flex-col items-center justify-center text-center py-8 space-y-6">
                      <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-600 shadow-md">
                        <BookOpen className="w-10 h-10 stroke-[1.8]" />
                      </div>
                      <div>
                        <span className="text-xs font-sans font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                          Official NCERT Curriculum · NEP 2020
                        </span>
                        <h1 className="text-3xl font-extrabold text-[#0f172a] mt-3 font-sans tracking-tight">
                          {leftPage.chapterTitle}
                        </h1>
                        {activeChapter.hindiTitle && (
                          <h2 className="text-xl font-medium text-slate-600 mt-1">
                            {activeChapter.hindiTitle}
                          </h2>
                        )}
                        {activeChapter.marathiTitle && (
                          <h2 className="text-lg font-medium text-slate-500 mt-0.5">
                            {activeChapter.marathiTitle}
                          </h2>
                        )}
                      </div>

                      <div className="w-full max-w-md p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-left text-xs font-sans text-amber-900 space-y-2">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800">
                          <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                          <span>Learning Objectives & Syllabus Key</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-amber-800/90 leading-relaxed">
                          <li>Understand fundamental real-world principles & applications</li>
                          <li>Derive core mathematical formulas and observe scientific diagrams</li>
                          <li>Solve curated board-exam exercises with step-by-step reasoning</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}

                  {/* Sections */}
                  {leftPage.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-3">
                      {sec.heading && (
                        <h3 className="text-lg font-bold font-sans text-[#0f172a] border-b pb-1 border-slate-200">
                          {sec.heading}
                        </h3>
                      )}
                      {sec.paragraphs.map((para, pIdx) => (
                        <p key={pIdx} className="text-sm leading-relaxed text-[#292524]">
                          {para}
                        </p>
                      ))}

                      {/* Scientific Diagram */}
                      {sec.diagramSvg && (
                        <div
                          className="my-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: sec.diagramSvg }}
                        />
                      )}

                      {/* Mathematical Formulas Card */}
                      {sec.mathLatex && sec.mathLatex.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 font-sans text-xs text-blue-950 space-y-1.5 shadow-sm">
                          <span className="font-bold text-blue-800 uppercase tracking-wide">
                            Formula Derivation & Mathematical Definition:
                          </span>
                          <div className="space-y-1 font-mono text-sm font-semibold text-blue-900 bg-white/80 p-2.5 rounded-lg border border-blue-100">
                            {sec.mathLatex.map((math, mIdx) => (
                              <div key={mIdx}>{math}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Callout Box */}
                      {sec.callout && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-sans text-emerald-950">
                          <div className="font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{sec.callout.title}</span>
                          </div>
                          <p className="leading-relaxed text-emerald-900">{sec.callout.text}</p>
                        </div>
                      )}

                      {/* Exercises / Questions */}
                      {sec.questions && sec.questions.length > 0 && (
                        <div className="space-y-2 mt-4 font-sans">
                          <div className="font-bold text-sm text-slate-900 border-b pb-1">
                            Board Practice Exercises:
                          </div>
                          {sec.questions.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1"
                            >
                              <div className="font-semibold text-slate-900">
                                {q.qNumber}. {q.question}
                              </div>
                              {q.options && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className="px-2 py-1 bg-white rounded border border-slate-200 text-slate-700"
                                    >
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.hint && (
                                <div className="text-[11px] text-slate-500 italic pt-0.5">
                                  Hint: {q.hint}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Sticky Notes on Left Page */}
                  {(stickyNotes[currentPageIndex] || []).map((note) => (
                    <div
                      key={note.id}
                      style={{
                        position: "absolute",
                        left: `${note.x}px`,
                        top: `${note.y}px`,
                        backgroundColor: note.color,
                      }}
                      className="w-48 p-2.5 rounded-xl shadow-lg border border-black/10 z-30 font-sans text-xs text-slate-900 group"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-black/10 text-[10px] text-slate-600 font-bold">
                        <span>Teacher Note</span>
                        <button
                          onClick={() => handleDeleteSticky(currentPageIndex, note.id)}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        value={note.text}
                        onChange={(e) =>
                          handleUpdateStickyText(currentPageIndex, note.id, e.target.value)
                        }
                        className="w-full h-16 bg-transparent resize-none border-none focus:outline-none pt-1 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Annotation Overlay Canvas */}
                <canvas
                  ref={leftCanvasRef}
                  width={680}
                  height={800}
                  className="absolute inset-0 w-full h-full pointer-events-auto z-10 touch-none"
                  style={{ mixBlendMode: tool === "highlighter" ? "multiply" : "normal" }}
                  onPointerDown={(e) => handlePointerDown(e, leftCanvasRef.current)}
                  onPointerMove={(e) => handlePointerMove(e, leftCanvasRef.current)}
                  onPointerUp={() => handlePointerUp(currentPageIndex, leftCanvasRef.current)}
                />
              </div>
            )}

            {/* CENTER BINDING CREASE / BOOK SPINE SHADOW */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-6 pointer-events-none z-20 bg-gradient-to-r from-black/15 via-black/30 to-black/15 shadow-2xl" />

            {/* RIGHT PAGE */}
            {rightPage ? (
              <div
                className="relative flex-1 h-full bg-[#fcfbf7] text-[#1c1917] rounded-r-2xl border-l border-[#e7e5e4] shadow-inner overflow-hidden flex flex-col"
                style={{
                  boxShadow: "inset 18px 0 30px -10px rgba(0, 0, 0, 0.12)",
                }}
              >
                {/* Book Page Header */}
                <div className="flex items-center justify-between px-8 pt-6 pb-3 border-b border-[#e7e5e4]/80 text-[#78716c] text-xs font-serif shrink-0">
                  <span className="font-semibold uppercase tracking-wider">{rightPage.header}</span>
                  <span>{activeChapter.title}</span>
                  <span className="font-bold text-[#44403c]">Page {rightPage.pageNumber}</span>
                </div>

                {/* Page Content Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 font-serif text-[#1c1917] relative">
                  {rightPage.sections.map((sec, idx) => (
                    <div key={idx} className="space-y-3">
                      {sec.heading && (
                        <h3 className="text-lg font-bold font-sans text-[#0f172a] border-b pb-1 border-slate-200">
                          {sec.heading}
                        </h3>
                      )}
                      {sec.paragraphs.map((para, pIdx) => (
                        <p key={pIdx} className="text-sm leading-relaxed text-[#292524]">
                          {para}
                        </p>
                      ))}

                      {/* Scientific Diagram */}
                      {sec.diagramSvg && (
                        <div
                          className="my-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: sec.diagramSvg }}
                        />
                      )}

                      {/* Formulas */}
                      {sec.mathLatex && sec.mathLatex.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 font-sans text-xs text-blue-950 space-y-1.5 shadow-sm">
                          <span className="font-bold text-blue-800 uppercase tracking-wide">
                            Mathematical Derivations & Relations:
                          </span>
                          <div className="space-y-1 font-mono text-sm font-semibold text-blue-900 bg-white/80 p-2.5 rounded-lg border border-blue-100">
                            {sec.mathLatex.map((math, mIdx) => (
                              <div key={mIdx}>{math}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Callout */}
                      {sec.callout && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-sans text-amber-950">
                          <div className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>{sec.callout.title}</span>
                          </div>
                          <p className="leading-relaxed text-amber-900">{sec.callout.text}</p>
                        </div>
                      )}

                      {/* Questions */}
                      {sec.questions && sec.questions.length > 0 && (
                        <div className="space-y-2 mt-4 font-sans">
                          <div className="font-bold text-sm text-slate-900 border-b pb-1">
                            Chapter Review & NCERT Questions:
                          </div>
                          {sec.questions.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1"
                            >
                              <div className="font-semibold text-slate-900">
                                {q.qNumber}. {q.question}
                              </div>
                              {q.options && (
                                <div className="grid grid-cols-2 gap-1.5 pt-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className="px-2 py-1 bg-white rounded border border-slate-200 text-slate-700"
                                    >
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.hint && (
                                <div className="text-[11px] text-slate-500 italic pt-0.5">
                                  Hint: {q.hint}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Sticky Notes on Right Page */}
                  {(stickyNotes[currentPageIndex + 1] || []).map((note) => (
                    <div
                      key={note.id}
                      style={{
                        position: "absolute",
                        left: `${note.x}px`,
                        top: `${note.y}px`,
                        backgroundColor: note.color,
                      }}
                      className="w-48 p-2.5 rounded-xl shadow-lg border border-black/10 z-30 font-sans text-xs text-slate-900 group"
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-black/10 text-[10px] text-slate-600 font-bold">
                        <span>Teacher Note</span>
                        <button
                          onClick={() => handleDeleteSticky(currentPageIndex + 1, note.id)}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <textarea
                        value={note.text}
                        onChange={(e) =>
                          handleUpdateStickyText(currentPageIndex + 1, note.id, e.target.value)
                        }
                        className="w-full h-16 bg-transparent resize-none border-none focus:outline-none pt-1 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Right Page Annotation Canvas */}
                <canvas
                  ref={rightCanvasRef}
                  width={680}
                  height={800}
                  className="absolute inset-0 w-full h-full pointer-events-auto z-10 touch-none"
                  style={{ mixBlendMode: tool === "highlighter" ? "multiply" : "normal" }}
                  onPointerDown={(e) => handlePointerDown(e, rightCanvasRef.current)}
                  onPointerMove={(e) => handlePointerMove(e, rightCanvasRef.current)}
                  onPointerUp={() => handlePointerUp(currentPageIndex + 1, rightCanvasRef.current)}
                />
              </div>
            ) : (
              /* End of Book Page Back Cover */
              <div className="relative flex-1 h-full bg-[#f4f2ec] rounded-r-2xl border-l border-[#e7e5e4] flex flex-col items-center justify-center p-8 text-center text-slate-600">
                <Check className="w-16 h-16 text-emerald-500 mb-4 bg-emerald-50 p-3 rounded-full border border-emerald-200" />
                <h3 className="text-xl font-bold text-slate-800">Chapter Complete!</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  You have reached the end of {activeChapter.title}. Use "Send to Board" to teach or switch to the next chapter.
                </p>
              </div>
            )}
          </div>

          {/* SIDE-BY-SIDE TEACHER SCRATCHPAD DRAWER */}
          {showScratchpad && (
            <div className="w-80 h-full ml-4 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 flex flex-col z-30 backdrop-blur">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span>Teaching Scratchpad</span>
                </div>
                <button
                  onClick={() => setShowScratchpad(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 py-2">
                Jot quick formulas, homework tasks, or student questions alongside the book:
              </p>
              <textarea
                value={scratchNotes}
                onChange={(e) => setScratchNotes(e.target.value)}
                placeholder="Type lesson notes, questions, or homework points here..."
                className="flex-1 w-full p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (!scratchNotes.trim()) return;
                  toast.success("Scratchpad notes saved for this class");
                }}
                className="mt-3 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl"
              >
                Save Scratch Notes
              </Button>
            </div>
          )}

          {/* DOG-EAR PREV PAGE BUTTON (Left Edge) */}
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex <= 0}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/90 hover:bg-blue-600 text-white border border-slate-700 shadow-2xl flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none hover:scale-105 active:scale-95 z-30"
            title="Previous Page (or Left Arrow)"
          >
            <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* DOG-EAR NEXT PAGE BUTTON (Right Edge) */}
          <button
            onClick={handleNextPage}
            disabled={
              currentPageIndex + 2 >= chapterPages.length &&
              currentPageIndex + 1 >= chapterPages.length
            }
            className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/90 hover:bg-blue-600 text-white border border-slate-700 shadow-2xl flex items-center justify-center transition-all disabled:opacity-20 disabled:pointer-events-none hover:scale-105 active:scale-95 z-30"
            title="Next Page (or Right Arrow)"
          >
            <ChevronRight className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* BOTTOM NAVIGATION BAR: Slider & Page Counter */}
        <div className="flex items-center justify-between px-6 py-2 border-t border-slate-700 bg-[#1e293b] z-20 shrink-0 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              Showing Pages {currentPageIndex + 1} -{" "}
              {Math.min(currentPageIndex + 2, chapterPages.length)} of {chapterPages.length}
            </span>
            <span className="text-slate-600">·</span>
            <span>Use Left/Right arrow keys or tap page edges to flip</span>
          </div>

          {/* Page Scrubber Slider */}
          <div className="flex items-center gap-3 w-80">
            <span className="text-[11px] font-mono">1</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, chapterPages.length - 1)}
              step={2}
              value={currentPageIndex}
              onChange={(e) => {
                const targetIdx = Number(e.target.value);
                savePageAnnotations(currentPageIndex, leftCanvasRef.current);
                if (currentPageIndex + 1 < chapterPages.length) {
                  savePageAnnotations(currentPageIndex + 1, rightCanvasRef.current);
                }
                if (soundEnabled) playPageTurnSound();
                setCurrentPageIndex(targetIdx);
              }}
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[11px] font-mono">{chapterPages.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPageIndex <= 0}
              className="text-xs text-slate-300 hover:text-white h-7 px-2"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={
                currentPageIndex + 2 >= chapterPages.length &&
                currentPageIndex + 1 >= chapterPages.length
              }
              className="text-xs text-slate-300 hover:text-white h-7 px-2"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
