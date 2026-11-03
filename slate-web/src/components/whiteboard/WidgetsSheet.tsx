import { useState, useEffect, useRef } from "react";
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

export function WidgetsSheet({
  open,
  onOpenChange,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onLaunch: (kind: WidgetKind) => void;
}) {
  const { addObject, pushHistory, camera, setTool, pages } = useWhiteboard();
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
      useWhiteboard.setState((prev) => ({
        ...prev,
        pages: bundle.pages.length ? bundle.pages : prev.pages,
        activePageId: bundle.pages[0]?.id || prev.activePageId,
      }));
      pushHistory();
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

    window.addEventListener("slate:open-page-sorter", handleOpenSorter);
    window.addEventListener("slate:open-poll", handleOpenPoll);
    window.addEventListener("slate:share-notes", handleShareNotes);
    window.addEventListener("slate:open-tour", handleOpenTour);
    window.addEventListener("slate:open-board-settings", handleOpenSettings);
    window.addEventListener("slate:open-import", handleOpenImport);
    window.addEventListener("slate:open-teacher-login", handleOpenTeacherLogin);

    return () => {
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
      desc: "Roll 1-4",
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
      desc: "Floating calc",
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
      label: "MathPad 2D",
      desc: "Plot curves",
      icon: LineChart,
      color: "bg-cyan-500/10 text-cyan-500",
    },
    {
      kind: "curtain" as const,
      label: "Reveal Curtain",
      desc: "Conceal / reveal",
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
      desc: "Focus aperture",
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
      label: "Random Picker",
      desc: "Students & teams",
      icon: Shuffle,
      color: "bg-amber-500/10 text-amber-500",
    },
    {
      kind: "classroom-manager" as const,
      label: "Noise Meter",
      desc: "Traffic & decibels",
      icon: Volume2,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      kind: "geometry-kit" as const,
      label: "Geometry Kit",
      desc: "Compass & square",
      icon: Triangle,
      color: "bg-cyan-500/10 text-cyan-500",
    },
    {
      kind: "manipulatives" as const,
      label: "Manipulatives",
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
          className="w-full sm:max-w-md flex flex-col h-full max-h-dvh p-4 sm:p-6 pt-[max(1rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.75rem))] overflow-hidden"
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
          <div className="mt-3 space-y-6 flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 pb-8 touch-auto">
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Classroom Widgets
                </h3>
                <span className="text-[10px] text-muted-foreground">tap to open</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.kind}
                      onClick={() => {
                        onLaunch(it.kind);
                        onOpenChange(false);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-lg ${it.color} transition-transform group-hover:scale-105`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="text-xs font-semibold leading-tight">{it.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">{it.desc}</div>
                      </div>
                    </button>
                  );
                })}
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Study quiz</div>
                  </div>
                </button>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Canvas Tools
                </h3>
                <span className="text-[10px] text-muted-foreground">insert to board</span>
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
                    <div className="text-xs font-semibold leading-tight">Sticky note</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Colored notes</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Chemistry elements</div>
                  </div>
                </button>
                <button
                  onClick={handleInsertWholePeriodicTable}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/5 p-2.5 text-center transition hover:bg-teal-500/10 active:scale-95 group"
                  title="Place entire 118-element periodic table on board"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-600/15 text-teal-600 dark:text-teal-400 transition-transform group-hover:scale-105">
                    <Grid3X3 className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight text-teal-700 dark:text-teal-300">Whole Table</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">All 118 on board</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">LaTeX code</div>
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
                    <div className="text-xs font-semibold leading-tight">Image Search</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Online photos</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Measure & align</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Grid data</div>
                  </div>
                </button>
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
                    <div className="text-xs font-semibold leading-tight text-amber-700 dark:text-amber-300">Magic Doodle</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">340 AI icons</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setGridTemplatesOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/5 p-2.5 text-center transition hover:bg-teal-500/10 active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 transition-transform group-hover:scale-105">
                    <Grid className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight text-teal-700 dark:text-teal-300">Grid Paper</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Notebook & lines</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setGeoMapsOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-2.5 text-center transition hover:bg-blue-500/10 active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-105">
                    <Globe className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight text-blue-700 dark:text-blue-300">Geo Maps</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">World & continents</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    window.dispatchEvent(new CustomEvent("slate:solve-math"));
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-violet-600/15 text-violet-600 dark:text-violet-400 transition-transform group-hover:scale-105">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Solve Math</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">AI recognition</div>
                  </div>
                </button>
              </div>
            </section>

            {/* Smart Board Classroom Actions */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Smart Board Classroom Actions
                </h3>
                <span className="text-[10px] text-muted-foreground">interactive</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Student voting</div>
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
                    <div className="text-xs font-bold leading-tight text-emerald-700 dark:text-emerald-400">Share via QR</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">PDF download</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Reorder slides</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setDocImportOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-105">
                    <FileUp className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Import PDF/PPT</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Slides to pages</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setBoardSettingsOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-foreground transition-transform group-hover:scale-105">
                    <Sliders className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight">Board Setup</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Panel size & UI</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setBoardTourOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center transition hover:bg-accent active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105">
                    <Tv className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold leading-tight">60s Tour</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Board basics</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    onOpenChange(false);
                    setAuthOpen(true);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-2.5 text-center transition hover:bg-indigo-500/10 active:scale-95 group"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-105">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-xs font-bold leading-tight text-indigo-700 dark:text-indigo-400">Teacher Login</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Cloud sign in</div>
                  </div>
                </button>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Export .slate bundle</div>
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
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">Load .slate file</div>
                  </div>
                </button>
              </div>
            </section>
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
      {geoMapsOpen && (
        <GeoMapsDialog open={geoMapsOpen} onOpenChange={setGeoMapsOpen} />
      )}
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
    setOpenWidgets((w) => [
      ...w,
      { id: uid(), kind, x: defaultX, y: defaultY },
    ]);
  }
  function close(id: string) {
    setOpenWidgets((w) => w.filter((x) => x.id !== id));
  }
  return { openWidgets, launch, close };
}
