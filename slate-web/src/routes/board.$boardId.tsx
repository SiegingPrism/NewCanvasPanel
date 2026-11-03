import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WhiteboardCanvas } from "@/components/whiteboard/Canvas";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { TopBar } from "@/components/whiteboard/TopBar";
import { WidgetsSheet, useWidgetLauncher } from "@/components/whiteboard/WidgetsSheet";
import { useAISheetStore } from "@/lib/ai/aiSheetStore";
import { HandwritingLanguageDialog } from "@/components/whiteboard/HandwritingLanguageDialog";
import { useInk } from "@/lib/ink/recognizer";
import { FloatingWidget } from "@/components/whiteboard/FloatingWidget";
import {
  CalculatorWidget,
  DiceWidget,
  ScoreWidget,
  StopwatchWidget,
  TimerWidget,
  VoiceNoteWidget,
  MathGraphWidget,
} from "@/components/whiteboard/widgets/BasicWidgets";
import { RulerWidget } from "@/components/whiteboard/widgets/RulerWidget";
import { CurtainWidget } from "@/components/whiteboard/widgets/CurtainWidget";
import { ProtractorWidget } from "@/components/whiteboard/widgets/ProtractorWidget";
import { Shapes3DWidget } from "@/components/whiteboard/widgets/Shapes3DWidget";
import { SpotlightWidget } from "@/components/whiteboard/widgets/SpotlightWidget";
import { MagnifierWidget } from "@/components/whiteboard/widgets/MagnifierWidget";
import { RandomPickerWidget } from "@/components/whiteboard/widgets/RandomPickerWidget";
import { ClassroomManagerWidget } from "@/components/whiteboard/widgets/ClassroomManagerWidget";
import { GeometryKitWidget } from "@/components/whiteboard/widgets/GeometryKitWidget";
import { PrimaryManipulativesWidget } from "@/components/whiteboard/widgets/PrimaryManipulativesWidget";
import { EmbeddedMediaWidget } from "@/components/whiteboard/widgets/EmbeddedMediaWidget";
import { SmartBoardSideDock } from "@/components/whiteboard/smartboard/SmartBoardSideDock";
import { SmartBoardCornerControls } from "@/components/whiteboard/smartboard/SmartBoardCornerControls";
import { RadialMenu } from "@/components/whiteboard/smartboard/RadialMenu";
import { SplitBoardDivider } from "@/components/whiteboard/smartboard/SplitBoardDivider";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { fetchBoardById } from "@/lib/supabase/dbService";
import { Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/board/$boardId")({
  head: () => ({
    meta: [{ title: "Board — Slate" }, { name: "robots", content: "noindex" }],
  }),
  component: BoardPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div>
        <h1 className="text-lg font-semibold">Couldn't open this board</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to dashboard
        </a>
      </div>
    </div>
  ),
});

function BoardPage() {
  const { boardId } = Route.useParams();
  const navigate = useNavigate();
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const openAI = useAISheetStore((s) => s.openAI);
  const [isPresenting, setIsPresenting] = useState(false);
  const { langPickerOpen, setLangPickerOpen, translatePickerOpen, closeTranslatePicker } = useInk();
  const { openWidgets, launch, close } = useWidgetLauncher();
  const {
    selectedId,
    pages,
    activePageId,
    activeBoardId,
    boards,
    boardData,
    openBoard,
    hydrated,
    boardMode,
    reachabilityOffset,
    simpleMode,
  } = useWhiteboard();

  const [radialMenuPos, setRadialMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    const handleRadial = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number }>;
      if (customEvent.detail?.x && customEvent.detail?.y) {
        setRadialMenuPos({ x: customEvent.detail.x, y: customEvent.detail.y });
      }
    };
    window.addEventListener("slate:open-radial-menu", handleRadial);
    return () => window.removeEventListener("slate:open-radial-menu", handleRadial);
  }, []);

  // Auto-open AI panel if query parameter ?ai=1 is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ai") === "1" || params.get("ai") === "true") {
        openAI({ boardId });
      }
    }
  }, [boardId, openAI]);

  function handleOpenAI(opts?: { prompt?: string; snapshot?: string; contextText?: string }) {
    openAI({
      boardId,
      contextText: opts?.contextText || contextText,
      prompt: opts?.prompt,
      snapshot: opts?.snapshot,
    });
  }

  // Watchdog timer: If loading takes longer than 3.5s, offer manual recovery
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadTimedOut(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, [boardId]);

  useEffect(() => {
    let cancelled = false;

    // If board is already loaded and active, ensure it has pages
    if (activeBoardId === boardId && (!pages || pages.length === 0)) {
      openBoard(boardId);
      return;
    }

    if (!hydrated) {
      // Force open if hydration takes over 1.5s
      const fallbackHydration = setTimeout(() => {
        if (!cancelled && !boardData[boardId]) {
          openBoard(boardId);
        }
      }, 1500);
      return () => {
        cancelled = true;
        clearTimeout(fallbackHydration);
      };
    }

    if (!boardData[boardId]) {
      if (boards[boardId]) {
        openBoard(boardId);
        return;
      }

      // Fetch from cloud with a strict 2.5s timeout & catch to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
      Promise.race([fetchBoardById(boardId), timeoutPromise])
        .then((cb) => {
          if (cancelled) return;
          if (cb) {
            const pages = Array.isArray(cb.pages) && cb.pages.length
              ? cb.pages
              : [{ id: Math.random().toString(36).slice(2, 10), objects: [], background: (cb.background as any) || "white" }];
            const meta = {
              id: cb.id,
              title: cb.title || "Untitled board",
              tags: [],
              folderId: cb.folder_id || null,
              favorite: Boolean(cb.is_starred),
              archived: false,
              createdAt: cb.created_at ? new Date(cb.created_at).getTime() : Date.now(),
              updatedAt: cb.updated_at ? new Date(cb.updated_at).getTime() : Date.now(),
            };
            useWhiteboard.setState((prev) => ({
              ...prev,
              boards: { ...prev.boards, [cb.id]: meta },
              boardOrder: prev.boardOrder.includes(cb.id) ? prev.boardOrder : [cb.id, ...prev.boardOrder],
              boardData: { ...prev.boardData, [cb.id]: { pages, activePageId: pages[0].id } },
              activeBoardId: cb.id,
              pages,
              activePageId: pages[0].id,
            }));
          } else {
            // Not found in cloud or timed out — open local board or create fallback
            openBoard(boardId);
          }
        })
        .catch(() => {
          if (!cancelled) {
            openBoard(boardId);
          }
        });
      return () => {
        cancelled = true;
      };
    }

    if (activeBoardId !== boardId) {
      openBoard(boardId);
    }
  }, [boardId, boardData, boards, activeBoardId, openBoard, navigate, hydrated, pages]);

  useEffect(() => {
    const handleOpenWidgets = () => setWidgetsOpen(true);
    const handleOpenAIEvt = () => openAI({ boardId });
    window.addEventListener("slate:open-widgets", handleOpenWidgets);
    window.addEventListener("slate:open-ai", handleOpenAIEvt);
    return () => {
      window.removeEventListener("slate:open-widgets", handleOpenWidgets);
      window.removeEventListener("slate:open-ai", handleOpenAIEvt);
    };
  }, [boardId, openAI]);

  const board = boards[boardId];
  const ready = activeBoardId === boardId && pages.length > 0;
  const page = ready ? pages.find((p) => p.id === activePageId) : undefined;
  const selected = page?.objects.find((o) => o.id === selectedId);
  const contextText =
    selected && "text" in selected && typeof selected.text === "string" ? selected.text : undefined;

  if (!ready) {
    return (
      <div className="grid h-dvh w-screen place-items-center bg-background p-4 text-center">
        <div className="max-w-sm space-y-3">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-foreground">
            {loadTimedOut ? "Taking longer than usual to load…" : "Loading board…"}
          </p>
          {loadTimedOut && (
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => openBoard(boardId)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
              >
                Open Blank Canvas
              </button>
              <button
                onClick={() => navigate({ to: "/", replace: true })}
                className="rounded-lg border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background">
      {/* Canvas Viewport with Reachability Pull-Down Support for tall 75", 86", 98", 110" boards */}
      <div
        className="h-full w-full transition-transform duration-300 ease-out"
        style={{
          transform: reachabilityOffset > 0 ? `translateY(${reachabilityOffset * 100}%)` : undefined,
        }}
      >
        <WhiteboardCanvas onOpenAI={handleOpenAI} onPresentationChange={setIsPresenting} />
        {boardMode && <SplitBoardDivider />}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 pt-[max(1.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] sm:p-3 sm:pt-[max(0.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] transition-[opacity,transform] duration-300 z-30",
          isPresenting ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        style={{
          // Move the top bar down with the pulled-down board so shorter teachers can reach it too.
          transform: boardMode && reachabilityOffset > 0 ? `translateY(${reachabilityOffset * 100}dvh)` : undefined,
        }}
      >
        <TopBar
          onOpenAI={() => handleOpenAI()}
          onOpenWidgets={() => setWidgetsOpen(true)}
          boardTitle={board?.title ?? "Untitled board"}
        />
      </div>

      {/* Smart Board Mode: Mirrored Left & Right Side Docks + High-Visibility Corner Controls */}
      {boardMode ? (
        <>
          <SmartBoardSideDock side="left" onOpenWidgets={() => setWidgetsOpen(true)} />
          <SmartBoardSideDock side="right" onOpenWidgets={() => setWidgetsOpen(true)} />
          <SmartBoardCornerControls onOpenSorter={() => setWidgetsOpen(true)} />
        </>
      ) : (
        /* Standard Bottom Floating Toolbar for Mobile & Laptop */
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-[max(4.25rem,calc(var(--sab,56px)+0.75rem))] sm:bottom-4 flex justify-center px-2 z-30 transition-opacity duration-300",
            isPresenting ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          <Toolbar />
        </div>
      )}

      {/* Floating Radial Menu on Long-Press / In-place gesture */}
      {radialMenuPos && (
        <RadialMenu position={radialMenuPos} onClose={() => setRadialMenuPos(null)} />
      )}

      {selectedId && !simpleMode && (
        <div className="pointer-events-none absolute bottom-[max(8.5rem,calc(var(--sab,56px)+5rem))] sm:bottom-20 left-1/2 -translate-x-1/2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-lg ring-1 ring-border">
            <button
              onClick={() => handleOpenAI()}
              className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Ask AI
            </button>
          </div>
        </div>
      )}

      <WidgetsSheet open={widgetsOpen} onOpenChange={setWidgetsOpen} onLaunch={launch} />
      <HandwritingLanguageDialog open={langPickerOpen} onOpenChange={setLangPickerOpen} />
      <HandwritingLanguageDialog
        mode="translate"
        open={translatePickerOpen}
        onOpenChange={(o) => {
          if (!o) closeTranslatePicker();
        }}
      />

      {openWidgets.map((w) => {
        if (w.kind === "spotlight") {
          return <SpotlightWidget key={w.id} onClose={() => close(w.id)} />;
        }
        if (w.kind === "magnifier") {
          return <MagnifierWidget key={w.id} onClose={() => close(w.id)} />;
        }
        return (
          <FloatingWidget
            key={w.id}
            title={titleFor(w.kind)}
            initial={{ x: w.x, y: w.y }}
            onClose={() => close(w.id)}
          >
            {w.kind === "timer" && <TimerWidget />}
            {w.kind === "stopwatch" && <StopwatchWidget />}
            {w.kind === "dice" && <DiceWidget />}
            {w.kind === "score" && <ScoreWidget />}
            {w.kind === "calculator" && <CalculatorWidget />}
            {w.kind === "voice" && <VoiceNoteWidget />}
            {w.kind === "graph" && <MathGraphWidget />}
            {w.kind === "ruler" && <RulerWidget />}
            {w.kind === "curtain" && <CurtainWidget />}
            {w.kind === "protractor" && <ProtractorWidget />}
            {w.kind === "shapes3d" && <Shapes3DWidget />}
            {w.kind === "random-picker" && <RandomPickerWidget />}
            {w.kind === "classroom-manager" && <ClassroomManagerWidget />}
            {w.kind === "geometry-kit" && <GeometryKitWidget />}
            {w.kind === "manipulatives" && <PrimaryManipulativesWidget />}
            {w.kind === "embedded-media" && <EmbeddedMediaWidget />}
          </FloatingWidget>
        );
      })}
    </div>
  );
}

function titleFor(k: string) {
  switch (k) {
    case "timer":
      return "Timer";
    case "stopwatch":
      return "Stopwatch";
    case "dice":
      return "Dice";
    case "score":
      return "Scoreboard";
    case "calculator":
      return "Calculator";
    case "voice":
      return "Voice Notes & Transcriber";
    case "graph":
      return "MathPad 2D Grapher";
    case "ruler":
      return "Interactive Ruler";
    case "curtain":
      return "Classroom Reveal Curtain";
    case "protractor":
      return "Protractor & Angle Dial";
    case "shapes3d":
      return "3D Geometric Solids";
    case "spotlight":
      return "Spotlight & Screen Shade";
    case "magnifier":
      return "Magnifier Zoom Lens";
    case "random-picker":
      return "Random Student Picker & Teams";
    case "classroom-manager":
      return "Traffic Light & Noise Meter";
    case "geometry-kit":
      return "Geometry Kit (Compass & Set-Square)";
    case "manipulatives":
      return "Primary Math Manipulatives";
    case "embedded-media":
      return "Embedded Video & Web Viewer";
    default:
      return k;
  }
}
