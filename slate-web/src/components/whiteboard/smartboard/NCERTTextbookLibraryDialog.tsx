import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Search,
  RefreshCw,
  ExternalLink,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Upload,
  Lock,
  Unlock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { NCERTBookReaderModal } from "./NCERTBookReaderModal";
import {
  NCERT_CATALOG,
  queryBooks,
  syncCatalogWithServer,
  isTextbookLibraryPermitted,
  setTextbookLibraryPermitted,
  type TextbookBook,
  type TextbookChapter,
  type GradeLevel,
  type StreamBranch,
  type CatalogSyncResult,
} from "@/lib/curriculum/ncertCatalog";
import type { Page, TextObject, FrameObject } from "@/lib/whiteboard/types";

interface NCERTTextbookLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function NCERTTextbookLibraryDialog({
  open,
  onOpenChange,
}: NCERTTextbookLibraryDialogProps) {
  const { t } = useTranslation();
  const { setActivePage } = useWhiteboard();

  // Permission switch state
  const [hasPermission, setHasPermission] = useState<boolean>(isTextbookLibraryPermitted());

  // Filter state
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(12);
  const [selectedBranch, setSelectedBranch] = useState<StreamBranch>("science");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<TextbookBook | null>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<CatalogSyncResult | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);

  // 3D Flipbook Reader state
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [readerBook, setReaderBook] = useState<TextbookBook | null>(null);
  const [readerChapter, setReaderChapter] = useState<TextbookChapter | null>(null);

  // Check permission on mount / open
  useEffect(() => {
    if (open) {
      setHasPermission(isTextbookLibraryPermitted());
    }
  }, [open]);

  const handleOpenReader = (book: TextbookBook, chapter?: TextbookChapter) => {
    setReaderBook(book);
    setReaderChapter(chapter || (book.chapters.length > 0 ? book.chapters[0] : null));
    setIsReaderOpen(true);
    onOpenChange(false);
  };

  // Available books matching active filters
  const filteredBooks = queryBooks({
    board: "cbse",
    grade: selectedGrade,
    branch: selectedGrade >= 11 ? selectedBranch : undefined,
    searchQuery,
  });

  // Keep first book selected if none or current selected is not in filtered list
  useEffect(() => {
    if (filteredBooks.length > 0) {
      if (!selectedBook || !filteredBooks.some((b) => b.id === selectedBook.id)) {
        setSelectedBook(filteredBooks[0]);
      }
    } else {
      setSelectedBook(null);
    }
  }, [filteredBooks, selectedBook]);

  const handleManualSyncCheck = async () => {
    setIsCheckingSync(true);
    try {
      const res = await syncCatalogWithServer(true);
      setSyncStatus(res.result);
      toast.success(res.result.message);
    } catch {
      toast.error("Failed to connect to curriculum server. Using bundled catalog.");
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handleOpenOnBoard = async (book: TextbookBook, chapter: TextbookChapter) => {
    setLoadingChapterId(chapter.pdfCode);
    try {
      const wb = useWhiteboard.getState();
      const pageId = uid();
      const frameId = uid();

      const chapterFrame: FrameObject = {
        id: frameId,
        kind: "frame",
        x: 40,
        y: 40,
        w: 1200,
        h: 800,
        title: `${book.subject} (Class ${book.grade}): Chapter ${chapter.chapterNumber} - ${chapter.title}`,
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
        text: `NCERT Class ${book.grade} ${book.subject} · Chapter ${chapter.chapterNumber}`,
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
        text: `${chapter.title}${chapter.hindiTitle ? ` (${chapter.hindiTitle})` : ""}`,
        fontSize: 32,
        color: "#0f172a",
      };

      const notesGuideText: TextObject = {
        id: uid(),
        kind: "text",
        x: 80,
        y: 220,
        w: 1100,
        h: 120,
        text: `Official Textbook Source: ${chapter.officialUrl}\nEdition: ${book.editionYear} (${book.officialPublisher})\n\n✍️ Write notes, solve examples, or underline key concepts below using your smart pen.`,
        fontSize: 18,
        color: "#334155",
      };

      const newPage: Page = {
        id: pageId,
        background: "lined",
        objects: [chapterFrame, headerText, titleText, notesGuideText],
      };

      wb.setPages([...wb.pages, newPage], pageId);
      setActivePage(pageId);
      toast.success(`Loaded "${chapter.title}" onto whiteboard`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to generate whiteboard lesson page.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl h-[88vh] max-h-[820px] p-0 flex flex-col bg-background shadow-2xl rounded-3xl border border-border overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 pb-3 border-b border-border flex flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>NCERT Curriculum Textbooks</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                    Class 1–12
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct official chapter links on ncert.nic.in · Government of India National Curriculum
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isCheckingSync}
                onClick={handleManualSyncCheck}
                className="h-8 text-xs font-semibold gap-1.5 rounded-xl cursor-pointer"
                title="Check curriculum catalog status"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isCheckingSync && "animate-spin")} />
                <span>{isCheckingSync ? "Checking..." : "Check Catalog"}</span>
              </Button>
            </div>
          </DialogHeader>

          {/* PERMISSION GATE: If not permitted, display compliant Notice Card */}
          {!hasPermission ? (
            <div className="flex-1 p-6 md:p-10 flex items-center justify-center bg-muted/20 overflow-y-auto">
              <div className="max-w-xl w-full p-6 md:p-8 rounded-3xl bg-card border border-border shadow-xl space-y-5 text-center">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
                  <ShieldAlert className="h-7 w-7" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground">
                    Digital Textbook Access Notice
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Direct in-app reproduction of NCERT textbooks requires institutional licensing agreements.
                    To comply with official NCERT digital dissemination terms (June 2026), textbooks are
                    accessed directly via official portals or local school files.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-muted/40 border border-border text-left space-y-2.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Compliant Access Options Available Today:</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Open verified chapter PDFs directly on the official <strong>ncert.nic.in</strong> portal.</li>
                    <li>Import downloaded school textbook PDFs onto the whiteboard for classroom annotation.</li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    onClick={() => window.open("https://ncert.nic.in/textbook.php", "_blank")}
                    className="w-full sm:w-auto h-10 px-5 text-xs font-bold gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Open ncert.nic.in Portal</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setTextbookLibraryPermitted(true);
                      setHasPermission(true);
                      toast.success("Institutional preview mode enabled.");
                    }}
                    className="w-full sm:w-auto h-10 px-5 text-xs font-semibold gap-2 rounded-xl border-border"
                  >
                    <Unlock className="h-4 w-4 text-primary" />
                    <span>Enable Institutional Preview</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Filter Controls Bar */}
              <div className="p-3 border-b border-border bg-card/60 flex flex-wrap items-center gap-2.5 shrink-0">
                {/* Search Box */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by topic, subject, or chapter title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background rounded-xl"
                  />
                </div>

                {/* Grade Chips */}
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  <span className="text-[11px] font-bold text-muted-foreground px-1 uppercase tracking-wider">
                    Class:
                  </span>
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as GradeLevel[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGrade(g)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                        selectedGrade === g
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Class {g}
                    </button>
                  ))}
                </div>

                {/* Stream Chips (for 11-12) */}
                {selectedGrade >= 11 && (
                  <div className="flex items-center gap-1 border-l border-border pl-2">
                    {(["science", "commerce", "arts"] as StreamBranch[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedBranch(b)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer",
                          selectedBranch === b
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Content: Left Book List + Right Chapter List */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                {/* Left: Book List */}
                <div className="md:col-span-4 border-r border-border p-3 overflow-y-auto space-y-2">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Textbooks ({filteredBooks.length})
                  </div>

                  {filteredBooks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No textbooks found matching your search.
                    </div>
                  ) : (
                    filteredBooks.map((book) => {
                      const isSelected = selectedBook?.id === book.id;
                      return (
                        <div
                          key={book.id}
                          onClick={() => setSelectedBook(book)}
                          className={cn(
                            "p-3 rounded-2xl border transition-all cursor-pointer text-left relative",
                            isSelected
                              ? "bg-primary/10 border-primary shadow-xs"
                              : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-foreground">
                              {book.subject}
                            </span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md shrink-0">
                              {book.chapters.length} Ch
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-foreground mt-0.5 line-clamp-1">
                            {book.title}
                          </div>
                          {book.hindiTitle && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {book.hindiTitle}
                            </div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between">
                            <span>{book.editionYear}</span>
                            <span className="capitalize">{book.medium}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Right: Chapter List */}
                <div className="md:col-span-8 flex flex-col h-full min-h-0 pl-1 pr-2 overflow-hidden">
                  {selectedBook ? (
                    <div className="flex-1 flex flex-col h-full min-h-0 p-4 overflow-hidden">
                      {/* Chapter Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border shrink-0">
                        <div>
                          <h3 className="text-base font-extrabold text-foreground">
                            {selectedBook.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedBook.officialPublisher} · {selectedBook.editionYear} ·{" "}
                            {selectedBook.chapters.length} Chapters Available
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleOpenReader(selectedBook)}
                            className="h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md rounded-xl cursor-pointer"
                            title="Open interactive 3D flipbook reader with annotations"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>📖 Read Book (3D Flipbook)</span>
                          </Button>
                          <div className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0">
                            Class {selectedBook.grade} {selectedBook.branch?.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Scrollable Chapter Items */}
                      <div className="flex-1 overflow-y-auto pt-2 space-y-2 pr-1">
                        {selectedBook.chapters.map((ch) => (
                          <div
                            key={ch.pdfCode}
                            className="p-3.5 rounded-2xl border border-border/80 hover:border-primary/50 transition-all bg-card shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                                  Ch {ch.chapterNumber}
                                </span>
                                <span className="text-xs font-bold text-foreground">
                                  {ch.title}
                                </span>
                              </div>
                              {ch.hindiTitle && (
                                <p className="text-xs text-muted-foreground">{ch.hindiTitle}</p>
                              )}
                              <p className="text-[11px] font-mono text-muted-foreground truncate">
                                {ch.pdfCode}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {/* Open on ncert.nic.in */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(ch.officialUrl, "_blank")}
                                title="Open official chapter PDF directly on ncert.nic.in"
                                className="h-8 text-xs font-semibold gap-1.5 rounded-xl border-border hover:bg-muted"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                                <span>Open on ncert.nic.in</span>
                              </Button>

                              {/* Read Book in 3D Reader */}
                              <Button
                                size="sm"
                                onClick={() => handleOpenReader(selectedBook, ch)}
                                className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs"
                                title="Open in 3D reader with stylus annotations"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>Read Book</span>
                              </Button>

                              {/* Send to Board */}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={loadingChapterId === ch.pdfCode}
                                onClick={() => handleOpenOnBoard(selectedBook, ch)}
                                className="h-8 text-xs font-bold gap-1 rounded-xl border-border hover:bg-muted"
                                title="Create lesson slide on whiteboard"
                              >
                                <span>Send to Board</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground space-y-2">
                      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm">Select a textbook from the left to view its chapters.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Interactive 3D Flipbook Reader Modal */}
      {isReaderOpen && readerBook && (
        <NCERTBookReaderModal
          open={isReaderOpen}
          onOpenChange={setIsReaderOpen}
          book={readerBook}
          initialChapter={readerChapter}
        />
      )}
    </>
  );
}
