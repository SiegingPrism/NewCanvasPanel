import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Timer,
  Clock,
  Dices,
  Trophy,
  Calculator,
  StickyNote,
  ImagePlus,
  Ruler,
  Table as TableIcon,
  Mic,
  LineChart,
  Sigma,
  Sparkles,
  HelpCircle,
  Atom,
  Layers,
  Grid3X3,
  Eye,
  Compass,
  Box,
  Globe,
  Grid,
  EyeOff,
  MonitorPlay,
  Bot,
  Plus,
} from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { StickyNoteObject } from "@/lib/whiteboard/types";
import { MathFormulaDialog } from "./MathFormulaDialog";
import { ImageSearchDialog } from "./ImageSearchDialog";
import { TableDialog } from "./TableDialog";
import { PeriodicTableDialog, type ElementData } from "./widgets/PeriodicTableDialog";
import { FlashcardsDialog, type Flashcard } from "./widgets/FlashcardsDialog";
import { WidgetTutorialDialog, type WidgetGuideItem } from "./WidgetTutorialDialog";
import { GeoMapsDialog } from "./widgets/GeoMapsDialog";
import { GridTemplatesDialog } from "./widgets/GridTemplatesDialog";
import { MagicDoodleDialog } from "./widgets/MagicDoodleDialog";
import { QuickPollDialog } from "./smartboard/QuickPollDialog";
import { ShareNotesDialog } from "./smartboard/ShareNotesDialog";
import { PageSorterDialog } from "./smartboard/PageSorterDialog";
import { DocumentImportDialog } from "./smartboard/DocumentImportDialog";
import { BoardTourDialog } from "./smartboard/BoardTourDialog";
import { BoardSettingsDialog } from "./smartboard/BoardSettingsDialog";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { exportLessonFile, importLessonFile } from "@/lib/whiteboard/lessonFiles";
import { toast } from "sonner";
import {
  Sun,
  Search,
  Shuffle,
  Volume2,
  Triangle,
  Divide,
  Video,
  Vote,
  Share2,
  FileUp,
  Sliders,
  Tv,
  KeyRound,
  Save,
  FolderOpen,
  Cloud,
} from "lucide-react";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export type WidgetKind =
  | "timer"
  | "stopwatch"
  | "dice"
  | "score"
  | "calculator"
  | "voice"
  | "graph"
  | "ruler"
  | "curtain"
  | "protractor"
  | "shapes3d"
  | "spotlight"
  | "magnifier"
  | "random-picker"
  | "classroom-manager"
  | "geometry-kit"
  | "manipulatives"
  | "embedded-media";

const SIMPLE_MODE_HIDDEN_WIDGETS: string[] = ["shapes3d", "voice"];

export type TabId = "insert" | "teach" | "classroom" | "stem" | "ai";

export function WidgetsSheet({
  open,
  onOpenChange,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onLaunch: (kind: WidgetKind) => void;
}) {
  const { addObject, pushHistory, camera, setTool, pages, simpleMode } = useWhiteboard();
  const [activeTab, setActiveTab] = useState<TabId>("insert");
  const [mathDialogOpen, setMathDialogOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [tableDialogOpen, setTableDialogOpen] = useState(false);
  const [periodicOpen, setPeriodicOpen] = useState(false);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [inspectElementNum, setInspectElementNum] = useState<number | undefined>(undefined);
  const [geoMapsOpen, setGeoMapsOpen] = useState(false);
  const [gridTemplatesOpen, setGridTemplatesOpen] = useState(false);
  const [magicDoodleOpen, setMagicDoodleOpen] = useState(false);
  const [quickPollOpen, setQuickPollOpen] = useState(false);
  const [shareNotesOpen, setShareNotesOpen] = useState(false);
  const [pageSorterOpen, setPageSorterOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [boardTourOpen, setBoardTourOpen] = useState(false);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);

  const handleImportLesson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bundle = await importLessonFile(file);
      useWhiteboard
        .getState()
        .setPages(bundle.pages.length ? bundle.pages : (p) => p, bundle.pages[0]?.id);
      toast.success(`Loaded lesson "${bundle.title}" (${bundle.pages.length} pages)!`);
    } catch {
      toast.error("Could not load .slate lesson file.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // Listen to smart board trigger events
  useEffect(() => {
    const handleOpenSorter = () => setPageSorterOpen(true);
    const handleOpenPoll = () => setQuickPollOpen(true);
    const handleShareNotes = () => setShareNotesOpen(true);
    const handleOpenTour = () => setBoardTourOpen(true);
    const handleOpenSettings = () => setBoardSettingsOpen(true);
    const handleOpenImport = () => setDocImportOpen(true);
    const handleOpenTeacherLogin = () => setAuthOpen(true);
    const handleOpenWidgetsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: string }>;
      if (customEvent.detail?.tab) {
        const t = customEvent.detail.tab;
        if (t === "math" || t === "stem") {
          setActiveTab("stem");
        } else if (t === "insert" || t === "teach" || t === "classroom" || t === "ai") {
          setActiveTab(t as TabId);
        }
      }
    };

    window.addEventListener("slate:open-widgets", handleOpenWidgetsEvent);
    window.addEventListener("slate:open-page-sorter", handleOpenSorter);
    window.addEventListener("slate:open-poll", handleOpenPoll);
    window.addEventListener("slate:share-notes", handleShareNotes);
    window.addEventListener("slate:open-tour", handleOpenTour);
    window.addEventListener("slate:open-board-settings", handleOpenSettings);
    window.addEventListener("slate:open-import", handleOpenImport);
    window.addEventListener("slate:open-teacher-login", handleOpenTeacherLogin);

    return () => {
      window.removeEventListener("slate:open-widgets", handleOpenWidgetsEvent);
      window.removeEventListener("slate:open-page-sorter", handleOpenSorter);
      window.removeEventListener("slate:open-poll", handleOpenPoll);
      window.removeEventListener("slate:share-notes", handleShareNotes);
      window.removeEventListener("slate:open-tour", handleOpenTour);
      window.removeEventListener("slate:open-board-settings", handleOpenSettings);
      window.removeEventListener("slate:open-import", handleOpenImport);
      window.removeEventListener("slate:open-teacher-login", handleOpenTeacherLogin);
    };
  }, []);

  // Automatically trigger the tutorial popup the first time widgets are opened
  useEffect(() => {
    if (open) {
      try {
        const dismissed = localStorage.getItem("slate_widget_tutorial_dismissed");
        if (dismissed !== "true") {
          setTutorialOpen(true);
        }
      } catch (e) {}
    }
  }, [open]);

  // Listen to inspect element requests from whiteboard canvas clicks
  useEffect(() => {
    const onInspect = (e: Event) => {
      const customEvent = e as CustomEvent<{ number: number }>;
      if (customEvent.detail?.number) {
        setInspectElementNum(customEvent.detail.number);
        setPeriodicOpen(true);
      }
    };
    window.addEventListener("slate:inspect-element", onInspect);
    return () => window.removeEventListener("slate:inspect-element", onInspect);
  }, []);

  function handleInsertWholePeriodicTable() {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
    const tableW = 1080;
    const tableH = 640;
    const cx = (screenW / 2 - camera.x) / camera.zoom - tableW / 2;
    const cy = (screenH / 2 - camera.y) / camera.zoom - tableH / 2;

    addObject({
      id: uid(),
      kind: "periodic-table",
      x: Math.round(cx),
      y: Math.round(cy),
      w: tableW,
      h: tableH,
      title: "Periodic Table of Elements (118 Elements)",
    });
    setTool("select");
    pushHistory();
    onOpenChange(false);
  }

  function addSticky() {
    const colors = ["#fef08a", "#bbf7d0", "#bae6fd", "#fbcfe8", "#fed7aa"];
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cx = (screenW / 2 - camera.x) / camera.zoom - 90;
    const cy = (screenH / 2 - camera.y) / camera.zoom - 90;
    const s: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: cx,
      y: cy,
      w: 180,
      h: 180,
      text: "New note",
      color: colors[Math.floor(Math.random() * colors.length)],
    };
    addObject(s);
    pushHistory();
    onOpenChange(false);
  }

  function handleInsertElement(el: ElementData) {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cx = (screenW / 2 - camera.x) / camera.zoom - 95;
    const cy = (screenH / 2 - camera.y) / camera.zoom - 100;
    const s: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: cx,
      y: cy,
      w: 190,
      h: 200,
      text: `${el.number}  •  ${el.symbol}\n${el.name}\nMass: ${el.mass} u\n${el.category.toUpperCase()}\n${el.config || ""}`,
      color: "#ecfdf5",
    };
    addObject(s);
    pushHistory();
  }

  function handleInsertCard(card: Flashcard) {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;
    const cx = (screenW / 2 - camera.x) / camera.zoom - 110;
    const cy = (screenH / 2 - camera.y) / camera.zoom - 110;
    const s: StickyNoteObject = {
      id: uid(),
      kind: "sticky",
      x: cx,
      y: cy,
      w: 220,
      h: 220,
      text: `[${card.deck}]\n\nQ: ${card.question}\n\nA: ${card.answer}`,
      color: "#fef3c7",
    };
    addObject(s);
    pushHistory();
  }

  function handleTutorialAction(item: WidgetGuideItem) {
    setTutorialOpen(false);
    if (item.id === "sticky") {
      addSticky();
    } else if (item.id === "math-formula") {
      onOpenChange(false);
      setMathDialogOpen(true);
    } else if (item.id === "image-search") {
      onOpenChange(false);
      setImageSearchOpen(true);
    } else if (item.id === "table") {
      onOpenChange(false);
      setTableDialogOpen(true);
    } else if (item.id === "periodic-table") {
      onOpenChange(false);
      setPeriodicOpen(true);
    } else if (item.id === "flashcards") {
      onOpenChange(false);
      setFlashcardsOpen(true);
    } else if (item.id === "solve-math") {
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("slate:solve-math"));
    } else if (item.kind && typeof item.kind === "string") {
      onLaunch(item.kind as WidgetKind);
      onOpenChange(false);
    }
  }

  const items = [
    {
      kind: "timer" as const,
      label: "Timer",
      desc: "Countdown",
      icon: Timer,
      color: "bg-orange-500/10 text-orange-500",
    },
    {
      kind: "stopwatch" as const,
      label: "Stopwatch",
      desc: "Split laps",
      icon: Clock,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      kind: "dice" as const,
      label: "Dice",
      desc: "Roll 1 to 4 dice",
      icon: Dices,
      color: "bg-purple-500/10 text-purple-500",
    },
    {
      kind: "score" as const,
      label: "Scoreboard",
      desc: "Team points",
      icon: Trophy,
      color: "bg-yellow-500/10 text-yellow-500",
    },
    {
      kind: "calculator" as const,
      label: "Calculator",
      desc: "On-board calculator",
      icon: Calculator,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      kind: "voice" as const,
      label: "Voice Notes",
      desc: "Audio memos",
      icon: Mic,
      color: "bg-rose-500/10 text-rose-500",
    },
    {
      kind: "graph" as const,
      label: "Graph",
      desc: "Plot y = f(x)",
      icon: LineChart,
      color: "bg-cyan-500/10 text-cyan-500",
    },
    {
      kind: "curtain" as const,
      label: "Hide & Reveal",
      desc: "Cover part of board",
      icon: Eye,
      color: "bg-red-500/10 text-red-500",
    },
    {
      kind: "protractor" as const,
      label: "Protractor",
      desc: "Angle measurer",
      icon: Compass,
      color: "bg-indigo-500/10 text-indigo-500",
    },
    {
      kind: "shapes3d" as const,
      label: "3D Solids",
      desc: "Geometry shapes",
      icon: Box,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      kind: "spotlight" as const,
      label: "Spotlight",
      desc: "Dim all but one area",
      icon: Sun,
      color: "bg-sky-500/10 text-sky-500",
    },
    {
      kind: "magnifier" as const,
      label: "Magnifier",
      desc: "Back row zoom",
      icon: Search,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      kind: "random-picker" as const,
      label: "Pick a Student",
      desc: "Names & groups",
      icon: Shuffle,
      color: "bg-amber-500/10 text-amber-500",
    },
    {
      kind: "classroom-manager" as const,
      label: "Class Signals",
      desc: "Lights & noise level",
      icon: Volume2,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      kind: "geometry-kit" as const,
      label: "Geometry Kit",
      desc: "Compass & set-square",
      icon: Triangle,
      color: "bg-cyan-500/10 text-cyan-500",
    },
    {
      kind: "manipulatives" as const,
      label: "Maths Models",
      desc: "Clock & fractions",
      icon: Divide,
      color: "bg-pink-500/10 text-pink-500",
    },
    {
      kind: "embedded-media" as const,
      label: "Video & Web",
      desc: "YouTube / web",
      icon: Video,
      color: "bg-red-500/10 text-red-500",
    },
  ];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          overlayClassName="bg-transparent"
          className="right-0 sm:right-3 top-0 sm:top-3 bottom-0 sm:bottom-3 h-full sm:h-[calc(100%-1.5rem)] w-full sm:max-w-md flex flex-col rounded-none sm:rounded-3xl p-4 sm:p-5 pt-[max(1rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.75rem))] overflow-hidden bg-white dark:bg-slate-900 text-foreground shadow-2xl border border-border"
          onInteractOutside={(e) => {
            if (tutorialOpen) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (tutorialOpen) e.preventDefault();
          }}
        >
          <SheetHeader className="flex flex-row items-center justify-between space-y-0 pr-6 border-b border-border/60 pb-3 shrink-0">
            <SheetTitle className="text-base font-bold">Widgets & Tools</SheetTitle>
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-semibold transition active:scale-95"
              title="What does each widget do?"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Feature Guide</span>
            </button>
          </SheetHeader>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 px-0.5 border-b border-border/50 shrink-0 no-scrollbar touch-pan-x">
            {[
              { id: "insert" as const, label: "Insert", icon: Plus },
              { id: "teach" as const, label: "Teach", icon: MonitorPlay },
              { id: "classroom" as const, label: "Classroom", icon: Timer },
              { id: "stem" as const, label: "Maths & STEM", icon: LineChart },
              { id: "ai" as const, label: "AI & Files", icon: Bot },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap transition-all active:scale-95",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-6 touch-auto bg-white dark:bg-slate-900">
            {/* 1. INSERT SECTION */}
            {activeTab === "insert" && (
              <section className="bg-white dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Insert
                  </h3>
                  <span className="text-[10px] text-muted-foreground">add to board</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={addSticky}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-400/20 text-yellow-500 transition-transform group-hover:scale-105">
                      <StickyNote className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Sticky Note</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Coloured notes
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setImageSearchOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-pink-500/10 text-pink-500 transition-transform group-hover:scale-105">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Image</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Online & upload
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setTableDialogOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105">
                      <TableIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Table</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Rows & columns
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setMathDialogOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/10 text-violet-500 transition-transform group-hover:scale-105">
                      <Sigma className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Math Formula</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        LaTeX equation
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("embedded-media");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-500 transition-transform group-hover:scale-105">
                      <Video className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Video & Web</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        YouTube & embed
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 2. TEACH SECTION */}
            {activeTab === "teach" && (
              <section className="bg-white dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Teach
                  </h3>
                  <span className="text-[10px] text-muted-foreground">presentation & focus</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setTool("tape");
                      onOpenChange(false);
                      toast("Cover tape active", {
                        description: "Draw tape over answers to hide them. Tap tape to reveal.",
                      });
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-center transition hover:bg-amber-500/10 active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-105">
                      <EyeOff className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold leading-tight text-amber-700 dark:text-amber-300">
                        Cover Tape
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Hide & tap answers
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setTool("frame");
                      onOpenChange(false);
                      toast("Slide area active", {
                        description: "Drag a box around content to create a presentation slide.",
                      });
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-2.5 text-center transition hover:bg-blue-500/10 active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
                      <MonitorPlay className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold leading-tight text-blue-700 dark:text-blue-300">
                        Slide Area
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Frame for present
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("curtain");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/10 text-red-500 transition-transform group-hover:scale-105">
                      <Eye className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Curtain</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Hide & reveal
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("spotlight");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-105">
                      <Sun className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Spotlight</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Focus on one area
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("magnifier");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-105">
                      <Search className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Magnifier</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Back row zoom
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 3. CLASSROOM SECTION */}
            {activeTab === "classroom" && (
              <section className="bg-white dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Classroom
                  </h3>
                  <span className="text-[10px] text-muted-foreground">engagement & polls</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent("slate:open-big-timer"));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-500/10 text-orange-500 transition-transform group-hover:scale-105">
                      <Timer className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Classroom Timer</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Big centre countdown
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent("slate:open-name-picker"));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105">
                      <Shuffle className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Name Picker & Teams</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Big wheel & groups
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent("slate:open-activity"));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-transform group-hover:scale-105">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Drag & Drop</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Sort, match & label
                      </div>
                    </div>
                  </button>

                  {!simpleMode && (
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        window.dispatchEvent(new CustomEvent("slate:open-ai-lesson-builder"));
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-105">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">AI Lesson Builder</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          5-8 ready pages
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent("slate:open-teacher-account"));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-105">
                      <Cloud className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Teacher Account</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Cloud save & sync
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("stopwatch");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-105">
                      <Clock className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Stopwatch</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Lap counter
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("dice");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-105">
                      <Dices className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Dice</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Roll 1 to 4 dice
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("score");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-500/10 text-yellow-500 transition-transform group-hover:scale-105">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Scoreboard</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Team points
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("classroom-manager");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105">
                      <Volume2 className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Class Signals</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Noise meter & lights
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setQuickPollOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-center transition hover:bg-primary/10 active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                      <Vote className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold leading-tight">Live QR Poll</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Student voting
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      window.dispatchEvent(new CustomEvent("slate:open-live-quiz"));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/5 p-2.5 text-center transition hover:bg-purple-500/10 active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-600 transition-transform group-hover:scale-105">
                      <Vote className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold leading-tight text-purple-700 dark:text-purple-400">
                        Live Quiz
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Class competition
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setShareNotesOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-center transition hover:bg-emerald-500/10 active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-105">
                      <Share2 className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-bold leading-tight text-emerald-700 dark:text-emerald-400">
                        Share via QR
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        PDF download
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setPageSorterOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-transform group-hover:scale-105">
                      <Layers className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Page Sorter</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Reorder slides
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 4. MATHS & SCIENCE SECTION */}
            {activeTab === "stem" && (
              <section className="bg-white dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Maths & Science
                  </h3>
                  <span className="text-[10px] text-muted-foreground">stem instruments</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onLaunch("graph");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                      <LineChart className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Grapher</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Plot y = f(x)
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("ruler");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105">
                      <Ruler className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Ruler</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Measure & align
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("protractor");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-500 transition-transform group-hover:scale-105">
                      <Compass className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Protractor</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Angle measurer
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("geometry-kit");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                      <Triangle className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Geometry Kit</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Compass & set-square
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch("manipulatives");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-pink-500/10 text-pink-500 transition-transform group-hover:scale-105">
                      <Divide className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Maths Models</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Clock & fractions
                      </div>
                    </div>
                  </button>

                  {!simpleMode && (
                    <button
                      onClick={() => {
                        onLaunch("shapes3d");
                        onOpenChange(false);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105">
                        <Box className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">3D Solids</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          Geometry solids
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onLaunch("calculator");
                      onOpenChange(false);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105">
                      <Calculator className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Calculator</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Scientific math
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setPeriodicOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/10 text-teal-500 transition-transform group-hover:scale-105">
                      <Atom className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Periodic Table</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        118 elements
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleInsertWholePeriodicTable}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-teal-500/40 bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    title="Place entire 118-element periodic table on board"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-600/15 text-teal-600 dark:text-teal-400 transition-transform group-hover:scale-105">
                      <Grid3X3 className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight text-teal-700 dark:text-teal-300">
                        Whole Table
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        All 118 on board
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setGeoMapsOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
                      <Globe className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Geo Maps</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        World & continents
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      setGridTemplatesOpen(true);
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 transition-transform group-hover:scale-105">
                      <Grid className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold leading-tight">Grid Paper</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        Notebook & lines
                      </div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* 5. AI & FILES SECTION */}
            {activeTab === "ai" && (
              <div className="space-y-6">
                <section className="bg-white dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      AI Tools
                    </h3>
                    <span className="text-[10px] text-muted-foreground">smart assistants</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        window.dispatchEvent(new CustomEvent("slate:open-ai"));
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-center transition hover:bg-primary/10 active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary transition-transform group-hover:scale-105">
                        <Bot className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-bold leading-tight text-primary">Slate AI</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          Ask & solve anything
                        </div>
                      </div>
                    </button>

                    {!simpleMode && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          window.dispatchEvent(new CustomEvent("slate:solve-math"));
                        }}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/5 p-2.5 text-center transition hover:bg-violet-500/10 active:scale-95 group"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-600/15 text-violet-600 dark:text-violet-400 transition-transform group-hover:scale-105">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-xs font-bold leading-tight text-violet-700 dark:text-violet-300">
                            Solve Math
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                            Reads handwriting
                          </div>
                        </div>
                      </button>
                    )}

                    {!simpleMode && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          setMagicDoodleOpen(true);
                        }}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-center transition hover:bg-amber-500/10 active:scale-95 group"
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-transform group-hover:scale-105">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="text-xs font-semibold leading-tight text-amber-700 dark:text-amber-300">
                            Magic Doodle
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                            AI drawings to icons
                          </div>
                        </div>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onOpenChange(false);
                        setFlashcardsOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105">
                        <Layers className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">Flashcards</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          Study quiz generator
                        </div>
                      </div>
                    </button>
                  </div>
                </section>

                <section className="pt-2 border-t border-border bg-white dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Lesson Files
                    </h3>
                    <span className="text-[10px] text-muted-foreground">backup & tour</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        exportLessonFile("Classroom Lesson", pages);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-transform group-hover:scale-105">
                        <Save className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">Save Lesson</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          .slate bundle
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onOpenChange(false);
                        lessonFileInputRef.current?.click();
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105">
                        <FolderOpen className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">Open Lesson</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          Load .slate file
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        onOpenChange(false);
                        setBoardTourOpen(true);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
                        <Tv className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">60s Tour</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                          Board basics
                        </div>
                      </div>
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <WidgetTutorialDialog
        open={tutorialOpen}
        onOpenChange={setTutorialOpen}
        onSelectAction={handleTutorialAction}
      />
      <MathFormulaDialog open={mathDialogOpen} onOpenChange={setMathDialogOpen} />
      <ImageSearchDialog open={imageSearchOpen} onOpenChange={setImageSearchOpen} />
      <TableDialog open={tableDialogOpen} onOpenChange={setTableDialogOpen} />
      <PeriodicTableDialog
        open={periodicOpen}
        onOpenChange={(v) => {
          setPeriodicOpen(v);
          if (!v) setInspectElementNum(undefined);
        }}
        onInsertElement={handleInsertElement}
        onInsertWholeTable={handleInsertWholePeriodicTable}
        initialElementNumber={inspectElementNum}
      />
      {flashcardsOpen && (
        <FlashcardsDialog
          open={flashcardsOpen}
          onOpenChange={setFlashcardsOpen}
          onInsertCard={handleInsertCard}
        />
      )}
      {magicDoodleOpen && (
        <MagicDoodleDialog open={magicDoodleOpen} onOpenChange={setMagicDoodleOpen} />
      )}
      {gridTemplatesOpen && (
        <GridTemplatesDialog open={gridTemplatesOpen} onOpenChange={setGridTemplatesOpen} />
      )}
      {geoMapsOpen && <GeoMapsDialog open={geoMapsOpen} onOpenChange={setGeoMapsOpen} />}
      <QuickPollDialog open={quickPollOpen} onOpenChange={setQuickPollOpen} />
      <ShareNotesDialog open={shareNotesOpen} onOpenChange={setShareNotesOpen} />
      <PageSorterDialog open={pageSorterOpen} onOpenChange={setPageSorterOpen} />
      <DocumentImportDialog open={docImportOpen} onOpenChange={setDocImportOpen} />
      <BoardTourDialog open={boardTourOpen} onOpenChange={setBoardTourOpen} />
      <BoardSettingsDialog open={boardSettingsOpen} onOpenChange={setBoardSettingsOpen} />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <input
        ref={lessonFileInputRef}
        type="file"
        accept=".slate,application/json"
        onChange={handleImportLesson}
        className="hidden"
      />
    </>
  );
}

function DisabledCard({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-3 text-center opacity-50">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function useWidgetLauncher() {
  const [openWidgets, setOpenWidgets] = useState<
    Array<{ id: string; kind: WidgetKind; x: number; y: number }>
  >([]);
  function launch(kind: WidgetKind) {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const defaultX = isMobile
      ? Math.max(8, Math.round((screenW - 320) / 2))
      : 120 + (openWidgets.length % 5) * 30;
    const defaultY = isMobile
      ? 80 + (openWidgets.length % 4) * 20
      : 120 + (openWidgets.length % 5) * 30;
    setOpenWidgets((w) => [...w, { id: uid(), kind, x: defaultX, y: defaultY }]);
  }
  function close(id: string) {
    setOpenWidgets((w) => w.filter((x) => x.id !== id));
  }
  return { openWidgets, launch, close };
}
