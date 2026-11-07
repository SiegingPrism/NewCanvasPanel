import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, Suspense, lazy } from "react";
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
import { QuickPollDialog } from "@/components/whiteboard/smartboard/QuickPollDialog";

const BigScreenClassroomModal = lazy(() =>
  import("@/components/whiteboard/smartboard/BigScreenClassroomModal").then((m) => ({
    default: m.BigScreenClassroomModal,
  })),
);
const DragDropActivityDialog = lazy(() =>
  import("@/components/whiteboard/smartboard/DragDropActivityDialog").then((m) => ({
    default: m.DragDropActivityDialog,
  })),
);
const AILessonBuilderDialog = lazy(() =>
  import("@/components/whiteboard/smartboard/AILessonBuilderDialog").then((m) => ({
    default: m.AILessonBuilderDialog,
  })),
);
const TeacherAccountDialog = lazy(() =>
  import("@/components/whiteboard/smartboard/TeacherAccountDialog").then((m) => ({
    default: m.TeacherAccountDialog,
  })),
);
import { DocCameraWidget } from "@/components/whiteboard/widgets/DocCameraWidget";
import { LiveCaptionsWidget } from "@/components/whiteboard/widgets/LiveCaptionsWidget";
import { LessonReplayDialog } from "@/components/whiteboard/smartboard/LessonReplayDialog";
import { IndianLessonPacksDialog } from "@/components/whiteboard/smartboard/IndianLessonPacksDialog";
import { NCERTTextbookLibraryDialog } from "@/components/whiteboard/smartboard/NCERTTextbookLibraryDialog";
import { ActivitySuggestionsDialog } from "@/components/whiteboard/smartboard/ActivitySuggestionsDialog";
import { TeamQuizDialog } from "@/components/whiteboard/smartboard/TeamQuizDialog";
import { DotVotingDialog } from "@/components/whiteboard/smartboard/DotVotingDialog";
import { StudentWorkWallDialog } from "@/components/whiteboard/smartboard/StudentWorkWallDialog";
import { TeacherPinSwitchDialog } from "@/components/whiteboard/smartboard/TeacherPinSwitchDialog";
import { SchoolAdminDialog } from "@/components/whiteboard/smartboard/SchoolAdminDialog";
import { MiniWhiteboardsDialog } from "@/components/whiteboard/smartboard/MiniWhiteboardsDialog";
import { TeacherRemoteDialog } from "@/components/whiteboard/smartboard/TeacherRemoteDialog";
import { TimetableDialog } from "@/components/whiteboard/smartboard/TimetableDialog";
import { ScienceSimulationsDialog } from "@/components/whiteboard/smartboard/ScienceSimulationsDialog";
import { AttendanceHousePointsDialog } from "@/components/whiteboard/smartboard/AttendanceHousePointsDialog";
import { AccessibilityDialog } from "@/components/whiteboard/smartboard/AccessibilityDialog";
import { ClassInsightsDialog } from "@/components/whiteboard/smartboard/ClassInsightsDialog";
import { BroadcastDialog } from "@/components/whiteboard/smartboard/BroadcastDialog";
import { broadcastService } from "@/lib/whiteboard/broadcastService";
import { getCurrentActivePeriod } from "@/lib/whiteboard/timetableStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { QuizObject, ActivityObject, Page } from "@/lib/whiteboard/types";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { fetchBoardById } from "@/lib/supabase/dbService";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
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

  // Classroom Smart Board Modals
  const [bigClassroomOpen, setBigClassroomOpen] = useState(false);
  const [bigClassroomTab, setBigClassroomTab] = useState<"timer" | "picker">("timer");
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activeActivity, setActiveActivity] = useState<ActivityObject | null>(null);
  const [aiLessonBuilderOpen, setAiLessonBuilderOpen] = useState(false);
  const [teacherAccountOpen, setTeacherAccountOpen] = useState(false);
  const [lessonReplayOpen, setLessonReplayOpen] = useState(false);
  const [liveCaptionsOpen, setLiveCaptionsOpen] = useState(false);
  const [indianPacksOpen, setIndianPacksOpen] = useState(false);
  const [textbookLibraryOpen, setTextbookLibraryOpen] = useState(false);
  const [activitySuggestionsOpen, setActivitySuggestionsOpen] = useState(false);
  const [teamQuizOpen, setTeamQuizOpen] = useState(false);
  const [dotVotingOpen, setDotVotingOpen] = useState(false);
  const [studentWorkWallOpen, setStudentWorkWallOpen] = useState(false);
  const [teacherPinOpen, setTeacherPinOpen] = useState(false);
  const [schoolAdminOpen, setSchoolAdminOpen] = useState(false);
  const [miniWhiteboardsOpen, setMiniWhiteboardsOpen] = useState(false);
  const [teacherRemoteOpen, setTeacherRemoteOpen] = useState(false);
  const [timetableOpen, setTimetableOpen] = useState(false);
  const [scienceSimsOpen, setScienceSimsOpen] = useState(false);
  const [attendancePointsOpen, setAttendancePointsOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [classInsightsOpen, setClassInsightsOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const { t } = useTranslation();
  const [minimizedTimer, setMinimizedTimer] = useState<{
    remaining: number;
    running: boolean;
  } | null>(null);
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
    boardDockSide,
    reachabilityOffset,
    simpleMode,
    tool,
    setTool,
    setColor,
    undo,
    redo,
    camera,
    setCamera,
    prevPage,
    nextPage,
    addPage,
    deleteSelected,
    duplicateSelected,
    copySelected,
    cutSelected,
    paste,
    setSelected,
    pushHistory,
    setPages,
    setActivePage,
    clearPage,
    addObject,
  } = useWhiteboard();

  // Global Keyboard and Presenter Clicker Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. In Present mode, do nothing! Canvas.tsx handles presentation navigation exclusively.
      if (isPresenting) return;

      // Ignore if user is currently typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // 1. Undo / Redo
      if (isCtrlOrCmd && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isCtrlOrCmd && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }

      // 2. Copy (Ctrl+C / Cmd+C)
      if (isCtrlOrCmd && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        copySelected();
        toast.success("Copied to clipboard");
        return;
      }

      // 3. Cut (Ctrl+X / Cmd+X)
      if (isCtrlOrCmd && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        cutSelected();
        toast.success("Cut to clipboard");
        return;
      }

      // 4. Paste (Ctrl+V / Cmd+V)
      if (isCtrlOrCmd && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        paste();
        toast.success("Pasted");
        return;
      }

      // 5. Duplicate selection (Ctrl+D / Cmd+D)
      if (isCtrlOrCmd && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        duplicateSelected();
        pushHistory();
        return;
      }

      // 6. Find on board
      if (isCtrlOrCmd && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("slate:open-find"));
        return;
      }

      // If Ctrl/Cmd/Alt is held down, don't trigger single letter shortcuts
      if (isCtrlOrCmd || e.altKey) return;

      // 4. Tools: P (Pen), H (Highlighter), E (Eraser), V (Select), T (Text), S (Shapes), L (Laser)
      const key = e.key.toLowerCase();
      if (key === "p") {
        setTool("pen");
      } else if (key === "h") {
        setTool("highlighter");
      } else if (key === "e") {
        setTool("eraser-object");
      } else if (key === "v") {
        setTool("select");
      } else if (key === "t") {
        setTool("text");
      } else if (key === "s") {
        setTool("shape");
      } else if (key === "l") {
        setTool(tool === "laser" ? "pen" : "laser");
      } else if (key === "1") {
        const activePg = pages.find((p) => p.id === activePageId);
        const dark =
          activePg?.background === "blackboard" ||
          activePg?.background === "oled" ||
          activePg?.background === "dark";
        setColor(dark ? "#ffffff" : "#111827");
        toast("Pen color: " + (dark ? "White" : "Black"));
      } else if (key === "2") {
        setColor("#2563eb");
        toast("Pen color: Blue");
      } else if (key === "3") {
        setColor("#dc2626");
        toast("Pen color: Red");
      } else if (key === "4") {
        setColor("#16a34a");
        toast("Pen color: Green");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        pushHistory();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("slate:zoom-in"));
      } else if (e.key === "-") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("slate:zoom-out"));
      } else if (key === "f") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("slate:fit-to-content"));
      } else if (key === "0") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("slate:zoom-reset"));
      } else if (e.key === "PageUp") {
        e.preventDefault();
        prevPage();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        nextPage();
      } else if (key === "n") {
        e.preventDefault();
        addPage("white");
        toast.success("Added new page");
      } else if (e.key === "?") {
        window.dispatchEvent(new CustomEvent("slate:open-help"));
      } else if (e.key === "Escape") {
        setSelected(null);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCamera({ ...camera, x: camera.x + 60 });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCamera({ ...camera, x: camera.x - 60 });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCamera({ ...camera, y: camera.y + 60 });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCamera({ ...camera, y: camera.y - 60 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    tool,
    camera,
    selectedId,
    pages,
    activePageId,
    undo,
    redo,
    prevPage,
    nextPage,
    addPage,
    setTool,
    setColor,
    setCamera,
    deleteSelected,
    duplicateSelected,
    pushHistory,
    copySelected,
    cutSelected,
    paste,
    setSelected,
    isPresenting,
  ]);

  const [radialMenuPos, setRadialMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [liveQuizOpen, setLiveQuizOpen] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<QuizObject | undefined>(undefined);

  useEffect(() => {
    const handleLiveQuiz = (e: Event) => {
      const customEvent = e as CustomEvent<QuizObject | undefined>;
      setActiveQuiz(customEvent.detail);
      setLiveQuizOpen(true);
    };
    window.addEventListener("slate:open-live-quiz", handleLiveQuiz);
    return () => window.removeEventListener("slate:open-live-quiz", handleLiveQuiz);
  }, []);

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
      const broadcastCode = params.get("broadcast");
      if (broadcastCode) {
        window.dispatchEvent(new CustomEvent("slate:join-broadcast", { detail: { code: broadcastCode } }));
      }
    }
  }, [boardId, openAI]);

  // Viewer Screen for Multi-Room Live Broadcast
  const [viewerBroadcastCode, setViewerBroadcastCode] = useState<string | null>(null);

  useEffect(() => {
    const handleJoinBroadcast = (e: Event) => {
      const code = (e as CustomEvent<{ code: string }>).detail?.code;
      if (!code) return;
      setViewerBroadcastCode(code);
      broadcastService.joinViewer(code, {
        onSnapshot: (receivedPages, activeId, receivedCamera) => {
          setPages(receivedPages, activeId);
          setCamera(receivedCamera);
          toast.success(`Connected to Room Broadcast #${code}!`);
        },
        onObjectAdded: (_pageId, object) => {
          addObject(object);
        },
        onPageSwitched: (pageId) => {
          setActivePage(pageId);
        },
        onPageCleared: () => {
          clearPage();
        },
      });
    };

    window.addEventListener("slate:join-broadcast", handleJoinBroadcast);
    return () => {
      window.removeEventListener("slate:join-broadcast", handleJoinBroadcast);
    };
  }, [setPages, setActivePage, setCamera, addObject, clearPage]);

  function handleOpenAI(opts?: { prompt?: string; snapshot?: string; contextText?: string }) {
    openAI({
      boardId,
      contextText: opts?.contextText || contextText,
      prompt: opts?.prompt,
      snapshot: opts?.snapshot,
    });
  }

  // Background Timetable Monitor: checks every 60 seconds for active school periods
  useEffect(() => {
    const checkActivePeriod = () => {
      const activeInfo = getCurrentActivePeriod();
      if (!activeInfo) return;
      const { slot } = activeInfo;
      const promptKey = `slate_prompted_period_${slot.id}_${new Date().toDateString()}`;
      if (sessionStorage.getItem(promptKey)) return;

      toast(`🔔 Period ${slot.periodNum} Active: ${slot.className} · ${slot.subject}`, {
        description: `Scheduled: ${slot.startTime} - ${slot.endTime}. Open ready lesson?`,
        duration: 12000,
        action: {
          label: "Open Lesson",
          onClick: () => {
            sessionStorage.setItem(promptKey, "true");
            const bg = slot.recommendedPaper === "blank" ? "white" : (slot.recommendedPaper || "white");
            addPage(bg as any);
            toast.success(`Loaded ${slot.className} ${slot.subject} lesson!`);
          },
        },
      });
      sessionStorage.setItem(promptKey, "true");
    };

    const initialTimer = setTimeout(checkActivePeriod, 2500);
    const intervalTimer = setInterval(checkActivePeriod, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [addPage]);

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
            const pages =
              Array.isArray(cb.pages) && cb.pages.length
                ? cb.pages
                : [
                    {
                      id: Math.random().toString(36).slice(2, 10),
                      objects: [],
                      background: (cb.background as any) || "white",
                    },
                  ];
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
              boardOrder: prev.boardOrder.includes(cb.id)
                ? prev.boardOrder
                : [cb.id, ...prev.boardOrder],
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
    const handleOpenBigTimer = () => {
      setBigClassroomTab("timer");
      setBigClassroomOpen(true);
    };
    const handleOpenNamePicker = () => {
      setBigClassroomTab("picker");
      setBigClassroomOpen(true);
    };
    const handleOpenActivity = (e: any) => {
      setActiveActivity(e.detail?.activity || null);
      setActivityDialogOpen(true);
    };
    const handleOpenAILesson = () => setAiLessonBuilderOpen(true);
    const handleOpenAccount = () => setTeacherAccountOpen(true);
    const handleOpenReplay = () => setLessonReplayOpen(true);
    const handleOpenCaptions = () => setLiveCaptionsOpen((p) => !p);
    const handleOpenDocCamera = () => launch("doc-camera");
    const handleOpenIndianPacks = () => setIndianPacksOpen(true);
    const handleOpenTextbooks = () => setTextbookLibraryOpen(true);
    const handleOpenActivitySuggestions = () => setActivitySuggestionsOpen(true);
    const handleOpenTeamQuiz = () => setTeamQuizOpen(true);
    const handleOpenDotVoting = () => setDotVotingOpen(true);
    const handleOpenStudentWorkWall = () => setStudentWorkWallOpen(true);
    const handleOpenTeacherPin = () => setTeacherPinOpen(true);
    const handleOpenSchoolAdmin = () => setSchoolAdminOpen(true);
    const handleOpenMiniWhiteboards = () => setMiniWhiteboardsOpen(true);
    const handleOpenTeacherRemote = () => setTeacherRemoteOpen(true);
    const handleOpenTimetable = () => setTimetableOpen(true);
    const handleOpenScienceSims = () => setScienceSimsOpen(true);
    const handleOpenAttendancePoints = () => setAttendancePointsOpen(true);
    const handleOpenAccessibility = () => setAccessibilityOpen(true);
    const handleOpenClassInsights = () => setClassInsightsOpen(true);
    const handleOpenBroadcast = () => setBroadcastOpen(true);

    window.addEventListener("slate:open-widgets", handleOpenWidgets);
    window.addEventListener("slate:open-ai", handleOpenAIEvt);
    window.addEventListener("slate:open-big-timer", handleOpenBigTimer);
    window.addEventListener("slate:open-name-picker", handleOpenNamePicker);
    window.addEventListener("slate:open-activity", handleOpenActivity);
    window.addEventListener("slate:open-ai-lesson-builder", handleOpenAILesson);
    window.addEventListener("slate:open-teacher-account", handleOpenAccount);
    window.addEventListener("slate:open-lesson-replay", handleOpenReplay);
    window.addEventListener("slate:open-live-captions", handleOpenCaptions);
    window.addEventListener("slate:open-doc-camera", handleOpenDocCamera);
    window.addEventListener("slate:open-indian-packs", handleOpenIndianPacks);
    window.addEventListener("slate:open-textbook-library", handleOpenTextbooks);
    window.addEventListener("slate:open-activity-suggestions", handleOpenActivitySuggestions);
    window.addEventListener("slate:open-team-quiz", handleOpenTeamQuiz);
    window.addEventListener("slate:open-dot-voting", handleOpenDotVoting);
    window.addEventListener("slate:open-student-work-wall", handleOpenStudentWorkWall);
    window.addEventListener("slate:open-teacher-pin", handleOpenTeacherPin);
    window.addEventListener("slate:open-school-admin", handleOpenSchoolAdmin);
    window.addEventListener("slate:open-mini-whiteboards", handleOpenMiniWhiteboards);
    window.addEventListener("slate:open-teacher-remote", handleOpenTeacherRemote);
    window.addEventListener("slate:open-timetable", handleOpenTimetable);
    window.addEventListener("slate:open-science-sims", handleOpenScienceSims);
    window.addEventListener("slate:open-attendance-points", handleOpenAttendancePoints);
    window.addEventListener("slate:open-accessibility", handleOpenAccessibility);
    window.addEventListener("slate:open-class-insights", handleOpenClassInsights);
    window.addEventListener("slate:open-broadcast", handleOpenBroadcast);

    return () => {
      window.removeEventListener("slate:open-widgets", handleOpenWidgets);
      window.removeEventListener("slate:open-ai", handleOpenAIEvt);
      window.removeEventListener("slate:open-big-timer", handleOpenBigTimer);
      window.removeEventListener("slate:open-name-picker", handleOpenNamePicker);
      window.removeEventListener("slate:open-activity", handleOpenActivity);
      window.removeEventListener("slate:open-ai-lesson-builder", handleOpenAILesson);
      window.removeEventListener("slate:open-teacher-account", handleOpenAccount);
      window.removeEventListener("slate:open-lesson-replay", handleOpenReplay);
      window.removeEventListener("slate:open-live-captions", handleOpenCaptions);
      window.removeEventListener("slate:open-doc-camera", handleOpenDocCamera);
      window.removeEventListener("slate:open-indian-packs", handleOpenIndianPacks);
      window.removeEventListener("slate:open-textbook-library", handleOpenTextbooks);
      window.removeEventListener("slate:open-activity-suggestions", handleOpenActivitySuggestions);
      window.removeEventListener("slate:open-team-quiz", handleOpenTeamQuiz);
      window.removeEventListener("slate:open-dot-voting", handleOpenDotVoting);
      window.removeEventListener("slate:open-student-work-wall", handleOpenStudentWorkWall);
      window.removeEventListener("slate:open-teacher-pin", handleOpenTeacherPin);
      window.removeEventListener("slate:open-school-admin", handleOpenSchoolAdmin);
      window.removeEventListener("slate:open-mini-whiteboards", handleOpenMiniWhiteboards);
      window.removeEventListener("slate:open-teacher-remote", handleOpenTeacherRemote);
      window.removeEventListener("slate:open-timetable", handleOpenTimetable);
      window.removeEventListener("slate:open-science-sims", handleOpenScienceSims);
      window.removeEventListener("slate:open-attendance-points", handleOpenAttendancePoints);
      window.removeEventListener("slate:open-accessibility", handleOpenAccessibility);
      window.removeEventListener("slate:open-class-insights", handleOpenClassInsights);
      window.removeEventListener("slate:open-broadcast", handleOpenBroadcast);
    };
  }, [boardId, openAI]);

  // Minimized timer tick
  useEffect(() => {
    if (!minimizedTimer || !minimizedTimer.running) return;
    const interval = setInterval(() => {
      setMinimizedTimer((prev) => {
        if (!prev) return null;
        if (prev.remaining <= 1) {
          clearInterval(interval);
          return { remaining: 0, running: false };
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [minimizedTimer?.running]);

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
          transform:
            reachabilityOffset > 0 ? `translateY(${reachabilityOffset * 100}%)` : undefined,
        }}
      >
        <WhiteboardCanvas onOpenAI={handleOpenAI} onPresentationChange={setIsPresenting} />

        {/* Live Broadcast Mirror Floating Status Banner */}
        {viewerBroadcastCode && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-indigo-950/95 border border-indigo-500/50 text-indigo-100 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold font-mono">
              Room Broadcast #{viewerBroadcastCode}
            </span>
            <span className="text-[11px] text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded-lg">
              Live Mirroring
            </span>
            <button
              onClick={() => {
                broadcastService.stop();
                setViewerBroadcastCode(null);
                toast("Exited room broadcast mirror");
              }}
              className="text-xs font-bold text-white bg-rose-600/90 hover:bg-rose-600 px-2.5 py-1 rounded-xl transition active:scale-95 cursor-pointer"
            >
              Exit
            </button>
          </div>
        )}
        {/* Faint First-Time Teacher Guide: vanishes on first stroke */}
        {page && page.objects.length === 0 && !isPresenting && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none z-10 transition-opacity duration-300">
            <p className="text-base sm:text-lg font-medium text-muted-foreground/35 tracking-wide">
              {boardMode ? t("writeAnywhere") : "Write anywhere."}
            </p>
          </div>
        )}
        {boardMode && <SplitBoardDivider />}
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2 pt-[max(1.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] sm:p-3 sm:pt-[max(0.75rem,calc(var(--sat,env(safe-area-inset-top,0px))+0.5rem))] transition-[opacity,transform] duration-300 z-30",
          isPresenting ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        style={{
          // Move the top bar down with the pulled-down board so shorter teachers can reach it too.
          transform:
            boardMode && reachabilityOffset > 0
              ? `translateY(${reachabilityOffset * 100}dvh)`
              : undefined,
        }}
      >
        <TopBar
          onOpenAI={() => handleOpenAI()}
          onOpenWidgets={() => setWidgetsOpen(true)}
          boardTitle={board?.title ?? "Untitled board"}
        />
      </div>

      {/* Smart Board Mode: Mirrored or Single Side Dock + High-Visibility Corner Controls */}
      {boardMode ? (
        <>
          {(boardDockSide === "both" || boardDockSide === "left") && (
            <SmartBoardSideDock side="left" onOpenWidgets={() => setWidgetsOpen(true)} />
          )}
          {(boardDockSide === "both" || boardDockSide === "right") && (
            <SmartBoardSideDock side="right" onOpenWidgets={() => setWidgetsOpen(true)} />
          )}
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
            {w.kind === "doc-camera" && <DocCameraWidget onClose={() => close(w.id)} />}
          </FloatingWidget>
        );
      })}

      {/* Classroom Live Quiz from Quiz Cards */}
      <QuickPollDialog
        open={liveQuizOpen}
        onOpenChange={setLiveQuizOpen}
        initialQuiz={activeQuiz}
      />

      {/* Smart Board Big Centre Screen Timer & Student Name Picker */}
      <Suspense fallback={null}>
        {bigClassroomOpen && (
          <BigScreenClassroomModal
            open={bigClassroomOpen}
            onOpenChange={setBigClassroomOpen}
            defaultTab={bigClassroomTab}
            onMinimizeTimer={(rem, run) => setMinimizedTimer({ remaining: rem, running: run })}
          />
        )}
      </Suspense>

      {/* Floating Corner Minimized Timer Pill */}
      {minimizedTimer && (
        <div
          onClick={() => {
            setBigClassroomTab("timer");
            setBigClassroomOpen(true);
            setMinimizedTimer(null);
          }}
          className="fixed top-20 right-6 z-40 bg-slate-900/95 hover:bg-slate-900 text-white border-2 border-indigo-500 shadow-2xl rounded-2xl px-5 py-2.5 flex items-center gap-3 cursor-pointer select-none backdrop-blur-md active:scale-95 transition-all"
          title="Tap to enlarge classroom timer"
        >
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono font-black text-2xl tabular-nums text-indigo-300">
            {String(Math.floor(minimizedTimer.remaining / 60)).padStart(2, "0")}:
            {String(minimizedTimer.remaining % 60).padStart(2, "0")}
          </span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Timer
          </span>
        </div>
      )}

      {/* Drag and Drop Classroom Activities (Sort, Match, Label) */}
      <Suspense fallback={null}>
        {activityDialogOpen && (
          <DragDropActivityDialog
            open={activityDialogOpen}
            onOpenChange={setActivityDialogOpen}
            activity={activeActivity}
            onInsertActivityToCanvas={(act) => {
              const actObj = act as ActivityObject;
              useWhiteboard.getState().addObject(actObj);
              useWhiteboard.getState().pushHistory();
              toast.success("Interactive activity added to whiteboard!");
            }}
          />
        )}
      </Suspense>

      {/* AI Lesson Builder (5-8 Ready Pages) */}
      <Suspense fallback={null}>
        {aiLessonBuilderOpen && (
          <AILessonBuilderDialog
            open={aiLessonBuilderOpen}
            onOpenChange={setAiLessonBuilderOpen}
            onLessonGenerated={(newPages, lessonTopic) => {
              const state = useWhiteboard.getState();
              const currentPages = state.pages;
              const mergedPages = [...currentPages, ...newPages];
              useWhiteboard.setState({
                pages: mergedPages,
                activePageId: newPages[0]?.id || currentPages[0]?.id,
              });
              useWhiteboard.getState().pushHistory();
              toast.success(`Added ${newPages.length} lesson pages for "${lessonTopic}"!`);
            }}
          />
        )}
      </Suspense>

      {/* Teacher Account & Cloud Sync */}
      <Suspense fallback={null}>
        {teacherAccountOpen && (
          <TeacherAccountDialog
            open={teacherAccountOpen}
            onOpenChange={setTeacherAccountOpen}
            onOpenCloudBoard={(targetBoardId) => {
              navigate({ to: "/board/$boardId", params: { boardId: targetBoardId } });
            }}
          />
        )}
      </Suspense>

      {/* Lesson Replay Dialog */}
      <LessonReplayDialog open={lessonReplayOpen} onOpenChange={setLessonReplayOpen} />

      {/* Live Classroom Speech Captions */}
      {liveCaptionsOpen && <LiveCaptionsWidget onClose={() => setLiveCaptionsOpen(false)} />}

      {/* Indian School Lesson Packs (CBSE & State Boards) */}
      <IndianLessonPacksDialog open={indianPacksOpen} onOpenChange={setIndianPacksOpen} />

      {/* NCERT & State Board Digital Textbooks (Class 1-12) */}
      <NCERTTextbookLibraryDialog open={textbookLibraryOpen} onOpenChange={setTextbookLibraryOpen} />

      {/* Activity Suggestions from Board Content */}
      <ActivitySuggestionsDialog open={activitySuggestionsOpen} onOpenChange={setActivitySuggestionsOpen} />

      {/* Team Quiz Game with Buzzers & Live Leaderboard */}
      <TeamQuizDialog open={teamQuizOpen} onOpenChange={setTeamQuizOpen} />

      {/* Sticky-Note Brainstorm & Dot Voting */}
      <DotVotingDialog open={dotVotingOpen} onOpenChange={setDotVotingOpen} />

      {/* Student Work Wall & QR Photo Submission */}
      <StudentWorkWallDialog open={studentWorkWallOpen} onOpenChange={setStudentWorkWallOpen} />

      {/* Quick Teacher PIN Switching */}
      <TeacherPinSwitchDialog open={teacherPinOpen} onOpenChange={setTeacherPinOpen} />

      {/* School Board Fleet Admin */}
      <SchoolAdminDialog open={schoolAdminOpen} onOpenChange={setSchoolAdminOpen} />

      {/* Phones as Mini Whiteboards */}
      <MiniWhiteboardsDialog
        open={miniWhiteboardsOpen}
        onOpenChange={setMiniWhiteboardsOpen}
        boardId={boardId}
      />

      {/* Teacher's Phone as Remote Control */}
      <TeacherRemoteDialog
        open={teacherRemoteOpen}
        onOpenChange={setTeacherRemoteOpen}
        boardId={boardId}
      />

      {/* Timetable Mode */}
      <TimetableDialog
        open={timetableOpen}
        onOpenChange={setTimetableOpen}
      />

      {/* Science Simulations (PhET) */}
      <ScienceSimulationsDialog
        open={scienceSimsOpen}
        onOpenChange={setScienceSimsOpen}
      />

      {/* Quick Attendance & House Points */}
      <AttendanceHousePointsDialog
        open={attendancePointsOpen}
        onOpenChange={setAttendancePointsOpen}
      />

      {/* Accessibility Options */}
      <AccessibilityDialog
        open={accessibilityOpen}
        onOpenChange={setAccessibilityOpen}
      />

      {/* Class Insights & Analytics */}
      <ClassInsightsDialog
        open={classInsightsOpen}
        onOpenChange={setClassInsightsOpen}
      />

      {/* Broadcast to Other Rooms */}
      <BroadcastDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
        boardId={boardId}
      />
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
    case "doc-camera":
      return "Document Camera (USB Visualizer)";
    default:
      return k;
  }
}
