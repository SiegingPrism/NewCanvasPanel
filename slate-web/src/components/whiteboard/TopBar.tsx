import { useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useWhiteboard,
  syncRetryQueue,
  persistSyncRetryQueue,
  type BoardMeta,
} from "@/lib/whiteboard/store";
import type { ImageObject, PageBackground, Page } from "@/lib/whiteboard/types";
import {
  Upload,
  Search,
  Download,
  QrCode,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Grid3x3,
  Layout,
  MessageSquare,
  Package,
  ArrowLeft,
  MoreHorizontal,
  Check,
  Sparkles,
  Settings,
  FileText,
  BrainCircuit,
  Loader2,
  LineChart,
  EyeOff,
  Menu,
  ScanEye,
  Bot,
  Sigma,
  BookOpen,
  MonitorPlay,
  Compass,
  LayoutGrid,
  Cloud,
  CloudOff,
  BellRing,
  ShieldCheck,
  Tv,
  Vote,
  Share2,
  Layers,
  Sliders,
  KeyRound,
  FolderOpen,
  Save,
  Timer,
  AlertTriangle,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { exportLessonFile, importLessonFile } from "@/lib/whiteboard/lessonFiles";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { syncBoardToSupabase } from "@/lib/supabase/dbService";
import { useAuth } from "@/lib/supabase/authStore";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { AISettingsDialog } from "@/components/ai/AISettingsDialog";
import { DocumentViewerDialog } from "@/components/document/DocumentViewerDialog";
import { MathFormulaDialog } from "./MathFormulaDialog";
import { FeatureTourDialog } from "./FeatureTourDialog";
import { GenerateMindMapDialog } from "./GenerateMindMapDialog";
import { NewPagePickerContent } from "./smartboard/NewPagePickerContent";
import { DocumentImportDialog } from "./smartboard/DocumentImportDialog";
import { AIEngine, aiErrorMessage } from "@/lib/ai/aiEngine";
import { extractBoardSearchStrings } from "@/lib/ai/localRAG";
import type { MindMapNodeObject } from "@/lib/whiteboard/types";

import { TEMPLATES } from "@/lib/whiteboard/templates";
import { useStrokeRecorderStore } from "@/lib/whiteboard/strokeRecorderStore";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PAPER_TEMPLATES: { id: PageBackground; label: string; icon: string }[] = [
  { id: "white", label: "White", icon: "🗒️" },
  { id: "blackboard", label: "Chalkboard", icon: "🏫" },
  { id: "oled", label: "Black", icon: "🌌" },
  { id: "dark", label: "Dark grey", icon: "⬛" },
  { id: "grid", label: "Squared paper", icon: "📐" },
  { id: "dots", label: "Dot paper", icon: "📓" },
  { id: "lined", label: "Lined paper", icon: "📝" },
  { id: "isometric", label: "Triangle grid (3D)", icon: "🔺" },
  { id: "four-line", label: "4-line handwriting", icon: "✍️" },
  { id: "music-staves", label: "Music staves", icon: "🎼" },
  { id: "millimeter-graph", label: "Graph paper (mm)", icon: "📊" },
];

export function TopBar({
  onOpenAI,
  onOpenWidgets,
  boardTitle,
}: {
  onOpenAI: () => void;
  onOpenWidgets: () => void;
  boardTitle?: string;
}) {
  const {
    pages,
    activePageId,
    activeBoardId,
    boards,
    prevPage,
    nextPage,
    addPage,
    undo,
    redo,
    setBackground,
    applyTemplate,
    addObject,
    pushHistory,
    setAllTapeReveal,
    syncWithCloud,
    boardMode,
    toggleBoardMode,
    panelSize,
    simpleMode,
    syncStatus,
  } = useWhiteboard(
    useShallow((s) => ({
      pages: s.pages,
      activePageId: s.activePageId,
      activeBoardId: s.activeBoardId,
      boards: s.boards,
      prevPage: s.prevPage,
      nextPage: s.nextPage,
      addPage: s.addPage,
      undo: s.undo,
      redo: s.redo,
      setBackground: s.setBackground,
      applyTemplate: s.applyTemplate,
      addObject: s.addObject,
      pushHistory: s.pushHistory,
      setAllTapeReveal: s.setAllTapeReveal,
      syncWithCloud: s.syncWithCloud,
      boardMode: s.boardMode,
      toggleBoardMode: s.toggleBoardMode,
      panelSize: s.panelSize,
      simpleMode: s.simpleMode,
      syncStatus: s.syncStatus,
    })),
  );

  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const lessonFileInputRef = useRef<HTMLInputElement>(null);
  const titleClicksRef = useRef<number>(0);
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [templateTab, setTemplateTab] = useState<"background" | "template">("background");
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false);
  const [newPagePopoverOpen, setNewPagePopoverOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mathFormulaOpen, setMathFormulaOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [mindMapDialogOpen, setMindMapDialogOpen] = useState(false);
  const [endClassDialogOpen, setEndClassDialogOpen] = useState(false);

  function playEndClassChime() {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.8);
      });
    } catch {}
  }

  const [endClassSaving, setEndClassSaving] = useState(false);
  const [endClassError, setEndClassError] = useState<string | null>(null);

  const handleEndClass = () => {
    setEndClassError(null);
    setEndClassSaving(false);
    setEndClassDialogOpen(true);
  };

  const confirmEndClass = async () => {
    const currentUser = useAuth.getState().user;
    if (!currentUser) {
      setEndClassError(
        "No teacher account is signed in on this smart board. Notes cannot be uploaded to the cloud.",
      );
      return;
    }

    setEndClassSaving(true);
    setEndClassError(null);

    try {
      // 1. Identify all boards modified today or currently in the session
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const boardsToUpload: Array<{ meta: BoardMeta; pages: Page[] }> = [];

      // Current active board first
      const activeMeta: BoardMeta =
        activeBoardId && boards[activeBoardId]
          ? boards[activeBoardId]
          : {
              id: activeBoardId || uid(),
              title: boardTitle || "Untitled board",
              tags: [],
              folderId: null,
              favorite: false,
              archived: false,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
      if (pages && Array.isArray(pages) && pages.length > 0) {
        boardsToUpload.push({ meta: activeMeta, pages });
      }

      // Check all other boards in memory modified today (skip any with no data in memory)
      const wbState = useWhiteboard.getState();
      const allBoards = wbState.boards || {};
      const allBoardData = wbState.boardData || {};
      for (const [bId, bMeta] of Object.entries(allBoards)) {
        if (bId === activeMeta.id) continue;
        if (bMeta.updatedAt && bMeta.updatedAt >= startOfToday) {
          const bData = allBoardData[bId];
          const bPages = bData?.pages;
          if (bPages && Array.isArray(bPages) && bPages.length > 0) {
            boardsToUpload.push({ meta: bMeta, pages: bPages });
          }
        }
      }

      // Also check items in syncRetryQueue for this user
      for (const [qId, qItem] of syncRetryQueue.entries()) {
        if (!boardsToUpload.some((b) => b.meta.id === qId)) {
          if (!qItem.userId || qItem.userId === currentUser.id) {
            boardsToUpload.push({ meta: qItem.meta, pages: qItem.pages });
          }
        }
      }

      // Upload each board to cloud and verify
      let allSucceeded = true;
      for (const item of boardsToUpload) {
        const ok = await syncBoardToSupabase(item.meta, item.pages, undefined, false);
        if (!ok) {
          allSucceeded = false;
          break;
        }
      }

      if (!allSucceeded) {
        setEndClassSaving(false);
        setEndClassError(
          "Cloud upload failed for one or more session boards. Please download a lesson file (.slate) to save your work.",
        );
        return;
      }

      // Successful cloud upload: empty queue, chime, notify, sign out, and reset device
      syncRetryQueue.clear();
      persistSyncRetryQueue(syncRetryQueue);

      playEndClassChime();
      toast.success("Class dismissed! All session boards saved to cloud for next period.");

      await useAuth.getState().signOut();
      useWhiteboard.getState().clearOnSignOut();

      setEndClassSaving(false);
      setEndClassDialogOpen(false);
    } catch {
      setEndClassSaving(false);
      setEndClassError(
        "Cloud upload encountered an error. Please download a lesson file (.slate) before clearing.",
      );
    }
  };

  const handleDismissWithoutSaving = async () => {
    playEndClassChime();
    // Empty retry queue so unsaved boards never upload into the next teacher's account
    syncRetryQueue.clear();
    persistSyncRetryQueue(syncRetryQueue);
    await useAuth.getState().signOut();
    useWhiteboard.getState().clearOnSignOut();
    setEndClassDialogOpen(false);
    toast.info("Class dismissed. Board notes cleared for next teacher.");
  };

  const handleOpenLessonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const bundle = await importLessonFile(file);
      useWhiteboard.getState().setPages(bundle.pages, bundle.pages[0]?.id);
      toast.success(`Loaded lesson "${bundle.title}" (${bundle.pages.length} pages)!`);
    } catch {
      toast.error("Could not load .slate lesson file.");
    }
  };

  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainSnapshot, setExplainSnapshot] = useState<string | null>(null);
  const [explainData, setExplainData] = useState<{
    summary: string;
    breakdown: string[];
    recommendations: string[];
  } | null>(null);

  async function handleExplainBoard() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    const img = c.toDataURL("image/png");
    setExplainSnapshot(img);
    setExplainDialogOpen(true);
    setExplainLoading(true);
    setExplainData(null);

    const activePage = pages.find((p) => p.id === activePageId) || pages[0];
    const pageStrings = extractBoardSearchStrings({ pages: activePage ? [activePage] : pages });
    const boardContext = [
      boardTitle ? `Board Title: "${boardTitle}"` : "",
      pageStrings.length > 0
        ? `Text & Formulas on Board: ${pageStrings.slice(0, 15).join("; ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await AIEngine.explainBoard(img, boardContext);
      setExplainData(res);
    } catch (e) {
      console.error(e);
      setExplainDialogOpen(false);
      toast.error(aiErrorMessage(e, "Board explanation failed"));
    } finally {
      setExplainLoading(false);
    }
  }

  function handleGenerateMindMap() {
    setMindMapDialogOpen(true);
  }

  function handleAddGraph() {
    const fn = prompt("Enter a function f(x) to plot on canvas:", "sin(x)");
    if (!fn || !fn.trim()) return;
    const newId = uid();
    addObject({
      id: newId,
      kind: "graph",
      x: 350 + Math.random() * 80,
      y: 250 + Math.random() * 80,
      w: 320,
      h: 220,
      fn: fn.trim(),
      xMin: -6,
      xMax: 6,
      yMin: -4,
      yMax: 4,
      color: "#a855f7",
      title: `f(x) = ${fn.trim()}`,
    });
    pushHistory();
    toast.success("Interactive 2D Graph placed on canvas!");
  }

  const idx = pages.findIndex((p) => p.id === activePageId);
  const page = pages[idx] || pages[0];
  const isDark =
    page?.background === "blackboard" || page?.background === "oled" || page?.background === "dark";
  const pad2 = (n: number) => n.toString().padStart(2, "0");

  function exportPNG() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    try {
      const link = document.createElement("a");
      link.download = `whiteboard-${pad2(idx + 1)}.png`;
      link.href = c.toDataURL("image/png");
      link.click();
      toast.success("PNG exported");
    } catch (err) {
      console.error("[Slate] PNG export error:", err);
      toast.error("Failed to export PNG. External image cross-origin restriction.");
    }
  }

  function exportPDF() {
    const c = document.querySelector<HTMLCanvasElement>("canvas");
    if (!c) return;
    try {
      const maxDim = 1920;
      let exportCanvas = c;
      if (c.width > maxDim || c.height > maxDim) {
        const scale = Math.min(maxDim / c.width, maxDim / c.height);
        const scaledCanvas = document.createElement("canvas");
        scaledCanvas.width = Math.round(c.width * scale);
        scaledCanvas.height = Math.round(c.height * scale);
        const sCtx = scaledCanvas.getContext("2d");
        if (sCtx) {
          sCtx.drawImage(c, 0, 0, scaledCanvas.width, scaledCanvas.height);
          exportCanvas = scaledCanvas;
        }
      }
      const img = exportCanvas.toDataURL("image/jpeg", 0.85);
      const pdf = new jsPDF({
        orientation: exportCanvas.width > exportCanvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [exportCanvas.width, exportCanvas.height],
      });
      pdf.addImage(img, "JPEG", 0, 0, exportCanvas.width, exportCanvas.height, undefined, "FAST");
      pdf.save(`whiteboard-${pad2(idx + 1)}.pdf`);
      toast.success("PDF exported");
    } catch (err) {
      console.error("[Slate] PDF export error:", err);
      toast.error("Failed to export PDF. External image cross-origin restriction.");
    }
  }

  async function shareQR() {
    const currentUser = useAuth.getState().user;
    if (!currentUser) {
      toast.error("Please sign in to share boards to the cloud.", { id: "share-qr" });
      setAuthOpen(true);
      return;
    }

    try {
      const activeMeta = activeBoardId ? boards[activeBoardId] : null;
      if (activeMeta) {
        toast.loading("Syncing board to cloud for sharing...", { id: "share-qr" });
        const ok = await syncBoardToSupabase(activeMeta, pages, undefined, true);
        if (!ok) {
          toast.error("Could not sync board to cloud. Please try again.", { id: "share-qr" });
          return;
        }
        toast.success("Board shared to cloud!", { id: "share-qr" });
      }

      const publicAppOrigin = (import.meta.env.VITE_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
      const isLocalOrApp =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:" ||
        window.location.protocol === "capacitor:";

      const targetOrigin =
        isLocalOrApp && publicAppOrigin ? publicAppOrigin : window.location.origin;
      const targetUrl = activeBoardId
        ? `${targetOrigin}/board/${activeBoardId}`
        : window.location.href;

      const qr = await QRCode.toDataURL(targetUrl, { margin: 1, width: 320 });
      setQrData(qr);
      setQrUrl(targetUrl);
      setQrOpen(true);
    } catch (err) {
      console.error("QR generation failed:", err);
      toast.error("Could not generate shareable QR code", { id: "share-qr" });
    }
  }

  function importFile(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const w = Math.min(maxW, img.width);
        const h = (img.height / img.width) * w;
        const obj: ImageObject = {
          id: uid(),
          kind: "image",
          x: 100,
          y: 100,
          w,
          h,
          src,
        };
        addObject(obj);
        pushHistory();
        toast.success("Image added");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  const iconBtn = boardMode
    ? cn(
        "flex flex-col items-center justify-center h-16 min-w-16 px-2 rounded-2xl transition active:scale-95 shrink-0",
        isDark ? "text-slate-200 hover:bg-slate-800" : "text-foreground hover:bg-accent/80",
      )
    : cn(
        "grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-lg transition active:scale-95 shrink-0",
        isDark ? "text-slate-200 hover:bg-slate-800" : "text-foreground hover:bg-accent/80",
      );
  const iconSize = boardMode ? "h-6 w-6" : "h-3.5 w-3.5 sm:h-4 sm:w-4";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 sm:gap-1.5 rounded-full px-2 py-1 sm:px-3 sm:py-1.5 shadow-lg ring-1 transition-colors duration-200 max-w-[calc(100vw-16px)] backdrop-blur-md",
        isDark
          ? "bg-slate-900/95 ring-slate-700/80 text-slate-100"
          : "bg-card/95 ring-border text-foreground",
      )}
    >
      {/* Back to Previous Page / Dashboard */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
          } else {
            navigate({ to: "/" });
          }
        }}
        className={iconBtn}
        aria-label="Back to Dashboard"
        title="Back to Dashboard"
      >
        <ArrowLeft className={iconSize} />
        {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">Exit</span>}
      </button>

      {boardTitle && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Board title: ${boardTitle}. Triple-click to launch Stroke Benchmark Recorder.`}
          onClick={() => {
            titleClicksRef.current++;
            if (titleClicksRef.current >= 3) {
              titleClicksRef.current = 0;
              useStrokeRecorderStore.getState().openRecorder();
              toast.info("Stroke Benchmark Recorder launched");
            }
            setTimeout(() => {
              titleClicksRef.current = 0;
            }, 1000);
          }}
          className={cn(
            "hidden max-w-[140px] truncate text-xs font-semibold md:block px-1 cursor-pointer select-none",
            isDark ? "text-slate-200 hover:text-white" : "text-foreground/80 hover:text-foreground",
          )}
          title="Triple-click to launch Stroke Benchmark Recorder"
        >
          {boardTitle}
        </span>
      )}

      {/* Cloud Account & Multi-Board Sync Indicator */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("slate:open-teacher-account"))}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all select-none border",
          syncStatus === "saving"
            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
            : syncStatus === "offline"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              : user
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800 hover:bg-sky-100",
        )}
        title={
          syncStatus === "saving"
            ? "Saving to teacher cloud..."
            : syncStatus === "offline"
              ? "Offline: Edits will automatically upload when reconnected"
              : user
                ? `Saved & Synced (${user.email})`
                : "Save lesson to your teacher account"
        }
      >
        {syncStatus === "saving" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
        ) : syncStatus === "offline" ? (
          <CloudOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        ) : (
          <Cloud className="w-3.5 h-3.5 text-current shrink-0" />
        )}
        <span className="hidden sm:inline">
          {syncStatus === "saving"
            ? "Saving..."
            : syncStatus === "offline"
              ? "Offline (Will retry)"
              : user
                ? "Saved"
                : "Save to Account"}
        </span>
      </button>

      {/* End Class Button for Teacher Smart Board */}
      <button
        type="button"
        onClick={handleEndClass}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all select-none border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 active:scale-95 cursor-pointer",
          isDark ? "text-rose-400 border-rose-500/40" : "text-rose-700",
        )}
        title="End Class: Save board, play bell chime, and prep clean board for next period"
      >
        <BellRing className="w-3.5 h-3.5 text-current shrink-0" />
        <span className="hidden sm:inline">End Class</span>
      </button>

      {/* Undo, Redo, and Page Controls: Only shown in standard desktop/mobile mode;
          in Board Mode they are exclusively placed in the bottom corner strips to avoid duplicates and reachability strain */}
      {!boardMode && (
        <>
          <div
            className={cn(
              "h-3.5 sm:h-4 w-px mx-0.5 shrink-0",
              isDark ? "bg-slate-700/60" : "bg-border/60",
            )}
          />

          {/* Undo / Redo */}
          <button
            type="button"
            className={iconBtn}
            aria-label="Undo last action (Ctrl+Z)"
            title="Undo"
            onClick={undo}
          >
            <Undo2 className={iconSize} />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label="Redo last action (Ctrl+Y)"
            title="Redo"
            onClick={redo}
          >
            <Redo2 className={iconSize} />
          </button>

          <div
            className={cn(
              "h-3.5 sm:h-4 w-px mx-0.5 shrink-0",
              isDark ? "bg-slate-700/60" : "bg-border/60",
            )}
          />

          {/* Page Navigation */}
          <button
            type="button"
            className={iconBtn}
            onClick={prevPage}
            aria-label="Previous page (PageUp)"
            title="Previous page"
          >
            <ChevronLeft className={iconSize} />
          </button>
          <span
            className={cn(
              "min-w-8 sm:min-w-10 text-center text-[11px] sm:text-xs font-medium tabular-nums shrink-0 select-none",
              isDark ? "text-slate-300" : "text-foreground/80",
            )}
          >
            {pad2(idx + 1)}/{pad2(pages.length)}
          </span>
          <button
            type="button"
            className={iconBtn}
            onClick={nextPage}
            aria-label="Next page (PageDown)"
            title="Next page"
          >
            <ChevronRight className={iconSize} />
          </button>
          <Popover modal={false} open={newPagePopoverOpen} onOpenChange={setNewPagePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={iconBtn}
                aria-label="Add new page or template (N)"
                title="Add page (N) — choose style or template"
              >
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              side="bottom"
              sideOffset={8}
              className={cn(
                "w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-3.5 shadow-2xl space-y-2.5 border max-h-[min(78vh,520px)] overflow-y-auto",
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-card border-border text-card-foreground",
              )}
            >
              <NewPagePickerContent
                onClose={() => setNewPagePopoverOpen(false)}
                onOpenDocImport={() => setDocImportOpen(true)}
                isDark={isDark}
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      <div
        className={cn(
          "h-3.5 sm:h-4 w-px mx-0.5 shrink-0",
          isDark ? "bg-slate-700/60" : "bg-border/60",
        )}
      />

      {/* Background & Templates Picker */}
      <Popover modal={false} open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={iconBtn}
            aria-label="Paper backgrounds and templates"
            title="Paper & backgrounds"
          >
            <Grid3x3 className={iconSize} />
            {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">Paper</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className={cn(
            "w-80 p-2.5 space-y-2 shadow-xl rounded-2xl border",
            isDark
              ? "bg-slate-900 border-slate-700 text-slate-100"
              : "bg-card border-border text-card-foreground",
          )}
        >
          {/* Segmented Switch */}
          <div className="flex rounded-xl bg-muted/60 p-1 text-xs">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTemplateTab("background");
              }}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center font-medium transition",
                templateTab === "background"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Backgrounds
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTemplateTab("template");
              }}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-center font-medium transition",
                templateTab === "template"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Templates
            </button>
          </div>

          {templateTab === "background" ? (
            <div className="space-y-1">
              <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Paper Background
              </div>
              <div className="grid grid-cols-1 gap-1">
                {PAPER_TEMPLATES.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    aria-label={`Paper background: ${bg.label}`}
                    title={bg.label}
                    onClick={() => {
                      setBackground(bg.id);
                      setTemplatePopoverOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition active:scale-95 text-left",
                      page.background === bg.id
                        ? "bg-primary/10 text-primary font-semibold ring-1 ring-primary/20"
                        : isDark
                          ? "hover:bg-slate-800 text-slate-200"
                          : "hover:bg-accent text-foreground",
                    )}
                  >
                    <span className="text-base leading-none">{bg.icon}</span>
                    <span className="flex-1">{bg.label}</span>
                    {page.background === bg.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Canvas Templates</span>
                <span className="text-[10px] lowercase font-normal text-muted-foreground/70">
                  tap to apply
                </span>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    aria-label={`Apply template: ${t.title}`}
                    title={t.title}
                    onClick={() => {
                      applyTemplate(t.key);
                      toast.success(`Applied ${t.title} template`);
                      setTemplatePopoverOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition active:scale-95 group",
                      isDark
                        ? "hover:bg-slate-800 text-slate-200"
                        : "hover:bg-accent text-foreground",
                    )}
                  >
                    <span className="text-xl leading-none mt-0.5">{t.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-foreground">{t.title}</span>
                        <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
                          {t.category}
                        </span>
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {t.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Lecture Presentation Mode */}
      <button
        type="button"
        className={cn(
          iconBtn,
          "hidden sm:flex text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
        )}
        aria-label="Lecture presentation mode (full screen)"
        title="Present (full screen)"
        onClick={() => window.dispatchEvent(new CustomEvent("slate:start-presentation"))}
      >
        <MonitorPlay className={iconSize} />
        {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">Present</span>}
      </button>

      {/* Board map (renamed from Radar Minimap) */}
      <button
        type="button"
        className={cn(
          iconBtn,
          "hidden sm:flex text-sky-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30",
        )}
        aria-label="Toggle board navigation map"
        title="Board map"
        onClick={() => window.dispatchEvent(new CustomEvent("slate:toggle-minimap"))}
      >
        <Compass className={iconSize} />
        {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">Map</span>}
      </button>

      {/* Direct AI Assistant Button (hidden in Simple Mode) */}
      {!simpleMode && (
        <button
          type="button"
          className={cn(iconBtn, "text-primary hover:bg-primary/10")}
          aria-label="Open Slate AI assistant"
          title="AI helper"
          onClick={onOpenAI}
        >
          <Bot className={iconSize} />
          {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">AI</span>}
        </button>
      )}

      {/* Burger Menu */}
      <Popover modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={iconBtn} aria-label="Main menu" title="Menu">
            <Menu className={iconSize} />
            {boardMode && <span className="text-[11px] font-bold mt-0.5 leading-none">Menu</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className={cn(
            "w-56 p-1.5 space-y-1 shadow-xl rounded-2xl border max-h-[85vh] overflow-y-auto",
            isDark
              ? "bg-slate-900 border-slate-700 text-slate-100"
              : "bg-card border-border text-foreground",
          )}
        >
          {/* AI Features */}
          {!simpleMode && (
            <button
              type="button"
              aria-label="Build AI Lesson (5-8 Ready Pages)"
              title="AI Lesson Builder"
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition",
                isDark ? "hover:bg-slate-800" : "hover:bg-accent",
              )}
              onClick={() => {
                setMenuOpen(false);
                window.dispatchEvent(new CustomEvent("slate:open-ai-lesson-builder"));
              }}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>AI Lesson Builder</span>
            </button>
          )}
          <button
            type="button"
            aria-label="Open AI Assistant"
            title="AI Assistant"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-primary transition",
              isDark ? "hover:bg-slate-800" : "hover:bg-accent",
            )}
            onClick={() => {
              setMenuOpen(false);
              onOpenAI();
            }}
          >
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span>AI Assistant</span>
          </button>
          <button
            type="button"
            aria-label="Explain Board with AI"
            title="Explain Board"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              handleExplainBoard();
            }}
          >
            <ScanEye className="h-3.5 w-3.5 text-amber-500" />
            <span>Explain Board</span>
          </button>
          <button
            type="button"
            aria-label="Generate AI Mind-Map from board"
            title="Generate AI Mind-Map"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              handleGenerateMindMap();
            }}
          >
            <BrainCircuit className="h-3.5 w-3.5 text-purple-500" />
            <span>Generate AI Mind-Map</span>
          </button>
          <button
            type="button"
            aria-label="PDF and Documents Intelligence"
            title="PDF & Docs Intelligence"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              setDocViewerOpen(true);
            }}
          >
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span>PDF & Docs Intelligence</span>
          </button>
          <button
            type="button"
            aria-label="Plot 2D Math Function"
            title="Plot 2D Math Function"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              handleAddGraph();
            }}
          >
            <LineChart className="h-3.5 w-3.5 text-cyan-500" />
            <span>Plot 2D Math Function</span>
          </button>
          <button
            type="button"
            aria-label="Insert LaTeX Math Formula"
            title="Math Formula (LaTeX)"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              setMathFormulaOpen(true);
            }}
          >
            <Sigma className="h-3.5 w-3.5 text-violet-500" />
            <span>Math Formula (LaTeX)</span>
          </button>
          <button
            type="button"
            aria-label="Solve Written Math with AI"
            title="Solve Written Math"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:solve-math"));
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Solve Written Math</span>
          </button>
          <button
            type="button"
            aria-label="Open AI and Whiteboard Settings"
            title="Settings"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              setAiSettingsOpen(true);
            }}
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Settings</span>
          </button>

          {/* Smart Board Classroom Controls */}
          <div className={cn("h-px w-full my-1", isDark ? "bg-slate-700/60" : "bg-border/60")} />
          <button
            type="button"
            aria-label={`Toggle Smart Board layout (${boardMode ? "Currently active" : "Currently off"})`}
            title="Smart Board Layout"
            className={cn(
              "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-bold text-primary transition",
              isDark ? "hover:bg-slate-800" : "hover:bg-accent",
            )}
            onClick={() => {
              setMenuOpen(false);
              toggleBoardMode();
              toast(
                boardMode
                  ? "Switched to Standard Toolbar"
                  : "Switched to Smart Board Mode (Dual Docks)",
              );
            }}
          >
            <div className="flex items-center gap-2">
              <Tv className="h-3.5 w-3.5" />
              <span>Smart Board Layout</span>
            </div>
            <span className="text-[10px] bg-primary/10 px-1.5 py-0.5 rounded font-mono">
              {boardMode ? "Active" : "Off"}
            </span>
          </button>
          <button
            type="button"
            aria-label={`Open Board Setup and calibration (${panelSize} inch panel)`}
            title={`Board Setup (${panelSize}")`}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-board-settings"));
            }}
          >
            <Sliders className="h-3.5 w-3.5 text-sky-500" />
            <span>Board Setup ({panelSize}&quot;)</span>
          </button>
          <button
            type="button"
            aria-label="Start 60-second Smart Board Tour"
            title="60s Smart Board Tour"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-tour"));
            }}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>60s Smart Board Tour</span>
          </button>
          <button
            type="button"
            aria-label="Launch Classroom Live Poll"
            title="Classroom Live Poll"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-poll"));
            }}
          >
            <Vote className="h-3.5 w-3.5 text-primary" />
            <span>Classroom Live Poll</span>
          </button>
          <button
            type="button"
            aria-label="Share Notes with students via QR code"
            title="Share Notes via QR"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:share-notes"));
            }}
          >
            <Share2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Share Notes via QR</span>
          </button>
          <button
            type="button"
            aria-label="Big Screen Timer & Student Name Picker"
            title="Timer & Name Picker"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-big-timer"));
            }}
          >
            <Timer className="h-3.5 w-3.5 text-orange-500" />
            <span>Big Screen Timer & Picker</span>
          </button>
          <button
            type="button"
            aria-label="Drag and Drop Classroom Activities"
            title="Drag & Drop Activities"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-activity"));
            }}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Drag & Drop Activities</span>
          </button>
          <button
            type="button"
            aria-label="Save Lesson to Teacher Cloud Account"
            title="Save to Cloud Account"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-teacher-account"));
            }}
          >
            <Cloud className="h-3.5 w-3.5 text-sky-500" />
            <span>Teacher Cloud Account</span>
          </button>
          <button
            type="button"
            aria-label="Open Page Sorter Grid"
            title="Page Sorter Grid"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-page-sorter"));
            }}
          >
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Page Sorter Grid</span>
          </button>

          <div className={cn("h-px w-full my-1", isDark ? "bg-slate-700/60" : "bg-border/60")} />

          {/* Tools & Files */}
          <button
            type="button"
            aria-label="Find text or handwriting on board (Ctrl+F)"
            title="Find on Board (Ctrl+F)"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:open-find"));
            }}
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Find on Board</span>
          </button>
          <button
            type="button"
            aria-label="Open Classroom Widgets and Tools"
            title="Widgets"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              onOpenWidgets();
            }}
          >
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Widgets</span>
          </button>
          <button
            type="button"
            aria-label="Open Feature Guide and Tutorial"
            title="Feature Guide & Tutorial"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              setTourOpen(true);
            }}
          >
            <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
            <span>Feature Guide & Tutorial</span>
          </button>
          <button
            type="button"
            aria-label="Start Lecture Presentation mode"
            title="Lecture Presentation"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-indigo-400" : "hover:bg-accent text-indigo-500",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:start-presentation"));
            }}
          >
            <MonitorPlay className="h-3.5 w-3.5 text-indigo-500" />
            <span>Lecture Presentation</span>
          </button>
          <button
            type="button"
            aria-label="Toggle board navigation map"
            title="Board map"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-sky-400" : "hover:bg-accent text-sky-500",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:toggle-minimap"));
            }}
          >
            <Compass className="h-3.5 w-3.5 text-sky-500" />
            <span>Board map</span>
          </button>
          <button
            type="button"
            aria-label="Automatically frame canvas items into presentation slides"
            title="Auto-Frame Slides"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(new CustomEvent("slate:auto-frame-slides"));
            }}
          >
            <LayoutGrid className="h-3.5 w-3.5 text-indigo-400" />
            <span>Auto-Frame Slides</span>
          </button>
          <button
            type="button"
            aria-label="Save Lesson package file (.slate)"
            title="Save Lesson File (.slate)"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              exportLessonFile(
                activeBoardId && boards?.[activeBoardId]?.title
                  ? boards[activeBoardId].title
                  : "Lesson",
                pages,
              );
            }}
          >
            <Save className="h-3.5 w-3.5 text-indigo-400" />
            <span>Save Lesson File (.slate)</span>
          </button>
          <button
            type="button"
            aria-label="Open Lesson package file (.slate)"
            title="Open Lesson File (.slate)"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              lessonFileInputRef.current?.click();
            }}
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
            <span>Open Lesson File (.slate)</span>
          </button>
          <button
            type="button"
            aria-label="Import image to whiteboard"
            title="Import Image"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              fileRef.current?.click();
            }}
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Import Image</span>
          </button>
          <button
            type="button"
            aria-label="Export board as PNG image"
            title="Export PNG"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              exportPNG();
            }}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export PNG</span>
          </button>
          <button
            type="button"
            aria-label="Export board as PDF document"
            title="Export PDF"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              exportPDF();
            }}
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            aria-label="Share board via QR code"
            title="Share Board (QR Code)"
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              shareQR();
            }}
          >
            <QrCode className="h-3.5 w-3.5 text-emerald-500" />
            <span>Share Board (QR Code)</span>
          </button>

          <div className={cn("h-px w-full my-1", isDark ? "bg-slate-700/60" : "bg-border/60")} />

          <button
            type="button"
            aria-label={user ? "Account and Cloud Sync settings" : "Sign in to Slate account"}
            title={user ? "Account & Cloud Sync" : "Sign In to Slate"}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
              isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-accent text-foreground",
            )}
            onClick={() => {
              setMenuOpen(false);
              setAuthOpen(true);
            }}
          >
            <ShieldCheck
              className={cn("h-3.5 w-3.5", user ? "text-emerald-500" : "text-primary")}
            />
            <span>{user ? "Account & Cloud Sync" : "Sign In to Slate"}</span>
          </button>
        </PopoverContent>
      </Popover>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => importFile(e.target.files)}
      />

      <input
        ref={lessonFileInputRef}
        type="file"
        accept=".slate,.json"
        className="hidden"
        onChange={handleOpenLessonFile}
      />

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-semibold flex items-center justify-center gap-1.5">
              <Cloud className="h-4 w-4 text-emerald-500" />
              Scan to open board
            </DialogTitle>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="rounded-xl border bg-white p-2 shadow-sm">
                <img
                  src={qrData}
                  alt="QR code"
                  className="rounded-lg max-w-[210px] w-full aspect-square"
                />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Scan with any phone or camera to open this live board. Synced to Supabase Cloud.
              </p>
              {qrUrl && (
                <div className="flex items-center gap-2 w-full pt-1">
                  <input
                    readOnly
                    value={qrUrl}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border bg-muted/40 font-mono text-muted-foreground truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(qrUrl);
                      toast.success("Board link copied!");
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shrink-0"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Explain This Board Dialog */}
      <Dialog open={explainDialogOpen} onOpenChange={setExplainDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ScanEye className="h-5 w-5 text-amber-500" />
              AI Visual Board Explanation
            </DialogTitle>
            <DialogDescription>
              Multimodal vision analysis of all strokes, geometric diagrams, equations, and elements
              on canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {explainSnapshot && (
              <div className="rounded-xl border overflow-hidden max-h-48 bg-muted/20 flex items-center justify-center p-2">
                <img
                  src={explainSnapshot}
                  alt="Board snapshot"
                  className="max-h-44 object-contain rounded shadow-2xs"
                />
              </div>
            )}

            {explainLoading ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">
                  Analyzing visual strokes, layout, and concepts...
                </p>
              </div>
            ) : explainData ? (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Overview
                  </h4>
                  <p className="text-xs text-foreground mt-1 leading-relaxed">
                    {explainData.summary}
                  </p>
                </div>

                {explainData.breakdown.length > 0 && (
                  <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Key Concepts Illustrated
                    </h4>
                    <ul className="space-y-1">
                      {explainData.breakdown.map((item, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-foreground/90 flex items-start gap-1.5"
                        >
                          <span className="text-primary font-bold">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {explainData.recommendations.length > 0 && (
                  <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Recommended Next Actions
                    </h4>
                    <ul className="space-y-1">
                      {explainData.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-foreground/90 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-500 font-bold">✓</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Settings Dialog */}
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />

      {/* PDF & Document Intelligence Dialog */}
      <DocumentViewerDialog
        open={docViewerOpen}
        onOpenChange={setDocViewerOpen}
        boardId={page.id}
      />

      {/* Math Formula Dialog */}
      <MathFormulaDialog open={mathFormulaOpen} onOpenChange={setMathFormulaOpen} />

      {/* Feature Guide & Tutorial Tour */}
      <FeatureTourDialog open={tourOpen} onOpenChange={setTourOpen} />

      {/* AI Mind-Map Generator Dialog */}
      <GenerateMindMapDialog open={mindMapDialogOpen} onOpenChange={setMindMapDialogOpen} />

      {/* Slide & Document Import Dialog */}
      <DocumentImportDialog open={docImportOpen} onOpenChange={setDocImportOpen} />

      {/* Account & Cloud Sync Dialog */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />

      {/* End Class Confirmation Dialog */}
      <Dialog open={endClassDialogOpen} onOpenChange={setEndClassDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-card border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <BellRing className="h-5 w-5 text-rose-500" />
              <span>End Current Class Period?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Dismiss the class, chime the bell, back up all notes to your cloud account, and reset
              the board cleanly for the next teacher.
            </DialogDescription>
          </DialogHeader>

          {endClassError && (
            <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-foreground">{endClassError}</p>
                <p className="text-[11px] text-muted-foreground">
                  To keep your work safe before resetting the board, download a portable .slate
                  lesson file to your USB drive or device:
                </p>
                <button
                  type="button"
                  onClick={() => exportLessonFile(boardTitle || "Lesson", pages)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Lesson File (.slate)</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-5">
            <button
              type="button"
              disabled={endClassSaving}
              onClick={() => setEndClassDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {endClassError ? (
              <>
                {useAuth.getState().user && (
                  <button
                    type="button"
                    disabled={endClassSaving}
                    onClick={confirmEndClass}
                    className="px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {endClassSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>Retry Cloud Save</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={endClassSaving}
                  onClick={handleDismissWithoutSaving}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Dismiss & Clear Board</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={endClassSaving}
                onClick={confirmEndClass}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {endClassSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <BellRing className="h-4 w-4" />
                    <span>Dismiss & Save Board</span>
                  </>
                )}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
