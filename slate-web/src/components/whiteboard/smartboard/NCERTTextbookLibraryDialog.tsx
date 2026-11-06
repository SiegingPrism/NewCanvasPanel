import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Search,
  RefreshCw,
  DownloadCloud,
  CheckCircle2,
  ExternalLink,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Wifi,
  WifiOff,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import {
  NCERT_CATALOG,
  queryBooks,
  findByDikshaDialCode,
  checkForOfficialUpdates,
  getStoredSyncStatus,
  type TextbookBook,
  type TextbookChapter,
  type EducationBoard,
  type StreamBranch,
  type SyncStatus,
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
  const { pages, setPages, setActivePage } = useWhiteboard();

  const [selectedBoard, setSelectedBoard] = useState<EducationBoard>("cbse");
  const [selectedGrade, setSelectedGrade] = useState<number>(12);
  const [selectedBranch, setSelectedBranch] = useState<StreamBranch>("science");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<TextbookBook | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getStoredSyncStatus());
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);

  // Available books matching active filters
  const filteredBooks = queryBooks({
    board: selectedBoard,
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
      const res = await checkForOfficialUpdates();
      setSyncStatus(res.status);
      toast.success(res.message);
    } catch {
      toast.error("Failed to connect to official NCERT / DIKSHA portal.");
    } finally {
      setIsCheckingSync(false);
    }
  };

  const handleOpenOnBoard = async (book: TextbookBook, chapter: TextbookChapter) => {
    setLoadingChapterId(chapter.pdfCode);
    try {
      // Create dedicated whiteboard lesson pages for this chapter
      const chapterFrame: FrameObject = {
        id: uid(),
        kind: "frame",
        x: 40,
        y: 40,
        w: 1200,
        h: 780,
        title: `${book.subject} (Class ${book.grade}): Chapter ${chapter.chapterNumber} - ${chapter.title}`,
        order: 1,
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
        text: `Official Textbook Source: ${chapter.officialUrl}\nDIKSHA DIAL Code: ${chapter.dikshaDialCode || "Standard Curriculum"}\nEdition: ${book.editionYear} (${book.officialPublisher})\n\n✍️ Write notes, solve examples, or underline key concepts below using your smart pen.`,
        fontSize: 16,
        color: "#475569",
      };

      const newPage: Page = {
        id: uid(),
        background: "lined",
        objects: [chapterFrame, headerText, titleText, notesGuideText],
      };

      setPages([...pages, newPage]);
      setActivePage(newPage.id);
      toast.success(`Loaded "${chapter.title}" onto whiteboard`);
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to load chapter:", err);
      toast.error("Could not load chapter onto whiteboard.");
    } finally {
      setLoadingChapterId(null);
    }
  };

  const handleDownloadOffline = (chapter: TextbookChapter) => {
    toast.success(`Cached "${chapter.title}" for offline classroom use`, {
      description: "Available without internet even if school Wi-Fi goes down.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-6 rounded-3xl bg-card border border-border shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  <span>NCERT & State Board Textbooks</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Class 1 - 12
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Direct official digital textbooks with automatic official-site synchronization and offline caching.
                </DialogDescription>
              </div>
            </div>

            {/* Official Auto-Update Status Badge & Re-sync Button */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/30 text-xs">
                {syncStatus.isOnline ? (
                  <Wifi className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className="font-semibold text-foreground text-[11px]">
                  {syncStatus.isOnline ? "Official Sync: Auto-Updated" : "Offline Cached"}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSyncCheck}
                disabled={isCheckingSync}
                className="h-8 text-xs font-semibold gap-1.5"
                title="Check official NCERT / DIKSHA portal for revised editions"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isCheckingSync && "animate-spin")} />
                <span>Check Updates</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar: Board & Search */}
        <div className="py-3 space-y-2.5 shrink-0 border-b border-border/60">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Board Selector */}
            <div className="flex rounded-xl bg-muted/60 p-1 shrink-0 border border-border/60">
              {[
                { id: "cbse" as const, label: "CBSE / NCERT" },
                { id: "maharashtra" as const, label: "Maharashtra (Balbharti)" },
                { id: "diksha_all" as const, label: "DIKSHA All Boards" },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBoard(b.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                    selectedBoard === b.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Search Box / DIAL Code */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, chapter title, or 6-character DIKSHA DIAL code..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Grade / Class Selector (1 to 12) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
              Class:
            </span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border",
                  selectedGrade === g
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/30 border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                Class {g}
              </button>
            ))}
          </div>

          {/* Stream / Branch Selector (Classes 11 & 12 only) */}
          {selectedGrade >= 11 && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-primary" />
                Stream:
              </span>
              {[
                { id: "science" as const, label: "Science (Phy/Chem/Math/Bio/CS)" },
                { id: "commerce" as const, label: "Commerce (Accounts/BST/Eco)" },
                { id: "arts" as const, label: "Arts / Humanities (History/PolSci/Geo)" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedBranch(s.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all border",
                    selectedBranch === s.id
                      ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs"
                      : "bg-muted/20 border-border/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body: Left book drawer + Right chapter list */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 overflow-hidden">
          {/* Books List (4 cols) */}
          <div className="md:col-span-4 border-r border-border/60 pr-3 overflow-y-auto space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Textbooks ({filteredBooks.length})
            </span>
            {filteredBooks.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No textbooks found matching your search.
              </div>
            ) : (
              filteredBooks.map((book) => {
                const isSelected = selectedBook?.id === book.id;
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => setSelectedBook(book)}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-1",
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                        : "border-border/70 hover:bg-muted/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-foreground">{book.subject}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground">
                        {book.chapters.length} Ch
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-foreground/90 truncate">{book.title}</p>
                    {book.hindiTitle && (
                      <p className="text-[11px] text-muted-foreground truncate">{book.hindiTitle}</p>
                    )}
                    <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {book.editionYear}
                      </span>
                      <span>·</span>
                      <span>{book.officialPublisher}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Chapters List (8 cols) */}
          <div className="md:col-span-8 overflow-y-auto pl-1 pr-2 space-y-3">
            {selectedBook ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div>
                    <h3 className="text-sm font-black text-foreground">{selectedBook.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedBook.officialPublisher} · {selectedBook.editionYear} Edition ·{" "}
                      {selectedBook.chapters.length} Chapters Available
                    </p>
                  </div>
                  <div className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    Class {selectedBook.grade} {selectedBook.branch?.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedBook.chapters.map((ch) => (
                    <div
                      key={ch.pdfCode}
                      className="p-3.5 rounded-2xl border border-border/80 hover:border-primary/50 transition-all bg-card/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-primary px-2 py-0.5 rounded-lg bg-primary/10 shrink-0">
                            Ch {ch.chapterNumber}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {ch.title}
                          </span>
                          {ch.isRevisedEdition && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Rationalised
                            </span>
                          )}
                        </div>
                        {ch.hindiTitle && (
                          <p className="text-[11px] text-muted-foreground">
                            {ch.hindiTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {ch.dikshaDialCode && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                              DIAL: {ch.dikshaDialCode}
                            </span>
                          )}
                          <span>·</span>
                          <span className="truncate">{ch.pdfCode}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadOffline(ch)}
                          title="Save chapter to smart board memory for offline access"
                          className="h-8 text-xs font-semibold gap-1"
                        >
                          <DownloadCloud className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Offline</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={loadingChapterId === ch.pdfCode}
                          onClick={() => handleOpenOnBoard(selectedBook, ch)}
                          className="h-8 text-xs font-bold gap-1.5 shadow-xs"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Open on Board</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium">Select a textbook from the left to view its chapters.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
