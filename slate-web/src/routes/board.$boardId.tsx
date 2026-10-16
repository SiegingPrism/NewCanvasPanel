import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WhiteboardCanvas } from "@/components/whiteboard/Canvas";
import { Toolbar } from "@/components/whiteboard/Toolbar";
import { TopBar } from "@/components/whiteboard/TopBar";
import { WidgetsSheet, useWidgetLauncher } from "@/components/whiteboard/WidgetsSheet";
import { AISheet } from "@/components/whiteboard/AISheet";
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
  const [aiOpen, setAIOpen] = useState(false);
  const [aiOptions, setAiOptions] = useState<{
    prompt?: string;
    snapshot?: string;
    contextText?: string;
  } | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const { langPickerOpen, setLangPickerOpen, translatePickerOpen, closeTranslatePicker } = useInk();
  const { openWidgets, launch, close } = useWidgetLauncher();
  const { selectedId, pages, activePageId, activeBoardId, boards, boardData, openBoard, hydrated } =
    useWhiteboard();

  const [loadTimedOut, setLoadTimedOut] = useState(false);

  // Auto-open AI panel if query parameter ?ai=1 is present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("ai") === "1" || params.get("ai") === "true") {
        setAIOpen(true);
      }
    }
  }, []);

  function handleOpenAI(opts?: { prompt?: string; snapshot?: string; contextText?: string }) {
    if (opts) {
      setAiOptions(opts);
    } else {
      setAiOptions(null);
    }
    setAIOpen(true);
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
    const handleOpenAI = () => setAIOpen(true);
    window.addEventListener("slate:open-widgets", handleOpenWidgets);
    window.addEventListener("slate:open-ai", handleOpenAI);
    return () => {
      window.removeEventListener("slate:open-widgets", handleOpenWidgets);
      window.removeEventListener("slate:open-ai", handleOpenAI);
    };
  }, []);

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
      <WhiteboardCanvas onOpenAI={handleOpenAI} onPresentationChange={setIsPresenting} />

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 pt-[max(1.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] sm:p-3 sm:pt-[max(0.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] transition-opacity duration-300 z-30",
          isPresenting ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <TopBar
          onOpenAI={() => handleOpenAI()}
          onOpenWidgets={() => setWidgetsOpen(true)}
          boardTitle={board?.title ?? "Untitled board"}
        />
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-[max(1rem,calc(var(--sab,0px)+0.75rem))] flex justify-center px-2 z-30 transition-opacity duration-300",
          isPresenting ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
      >
        <Toolbar />
      </div>

      {selectedId && (
        <div className="pointer-events-none absolute bottom-[max(5.5rem,calc(var(--sab,0px)+5rem))] left-1/2 -translate-x-1/2 lg:bottom-4 lg:left-auto lg:right-4 lg:translate-x-0">
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

      {widgetsOpen && (
        <WidgetsSheet open={widgetsOpen} onOpenChange={setWidgetsOpen} onLaunch={launch} />
      )}
      <AISheet
        open={aiOpen}
        onOpenChange={(b) => {
          setAIOpen(b);
          if (!b) setAiOptions(null);
        }}
        contextText={aiOptions?.contextText || contextText}
        initialPrompt={aiOptions?.prompt}
        initialSnapshot={aiOptions?.snapshot}
        boardId={boardId}
      />
      <HandwritingLanguageDialog open={langPickerOpen} onOpenChange={setLangPickerOpen} />
      <HandwritingLanguageDialog
        mode="translate"
        open={translatePickerOpen}
        onOpenChange={(o) => {
          if (!o) closeTranslatePicker();
        }}
      />

      {openWidgets.map((w) => (
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
        </FloatingWidget>
      ))}
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
    default:
      return k;
  }
}
