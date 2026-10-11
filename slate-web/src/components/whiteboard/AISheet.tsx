import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Send,
  Wand2,
  HelpCircle,
  BookOpen,
  Lightbulb,
  Loader2,
  Copy,
  StickyNote,
  Layers,
  Calculator,
  Check,
  Square,
  RotateCcw,
  WifiOff,
  AlertCircle,
  Trash2,
  BookMarked,
  Camera,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  X,
  ExternalLink,
  Move,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useAISettings } from "@/lib/ai/aiSettingsStore";
import { useAuth } from "@/lib/supabase/authStore";
import { AIEngine, AIError, aiErrorMessage, type ChatSource } from "@/lib/ai/aiEngine";
import { saveBoardChat, loadBoardChat, clearBoardChat } from "@/lib/whiteboard/slateStorage";
import { captureCanvasSnapshot } from "@/lib/whiteboard/canvasSnapshot";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: string;
  sources?: ChatSource[];
  feedback?: "up" | "down";
  imageDataUrl?: string;
  hasSnapshot?: boolean;
  verified?: boolean;
};

const QUICK = [
  { label: "Check my work", icon: CheckCircle2, prompt: "Check my solution step-by-step: " },
  { label: "Solve step-by-step", icon: Calculator, prompt: "Solve step-by-step: " },
  { label: "Explain simply", icon: BookOpen, prompt: "Explain simply, with an example: " },
  {
    label: "Make flashcards",
    icon: Layers,
    prompt: "Make 5 flashcards (question and answer) about: ",
  },
  {
    label: "Practice questions",
    icon: HelpCircle,
    prompt: "Give me 5 practice questions with answers on: ",
  },
  { label: "Lesson plan", icon: Wand2, prompt: "Create a 45-minute lesson plan for: " },
  { label: "Activity ideas", icon: Lightbulb, prompt: "Suggest 4 whiteboard activities about: " },
];

/** Markdown styling without the typography plugin (Tailwind preflight resets headings and lists). */
const MD_CLASS =
  "max-w-none break-words leading-relaxed text-foreground " +
  "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 " +
  "[&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 " +
  "[&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-1.5 " +
  "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 " +
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:my-0.5 " +
  "[&_strong]:font-semibold [&_a]:text-primary [&_a]:underline " +
  "[&_code]:font-mono [&_code]:text-[0.85em] [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded " +
  "[&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
  "[&_table]:w-full [&_table]:text-xs [&_table]:my-2 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted [&_td]:border [&_td]:px-2 [&_td]:py-1 " +
  "[&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Converts Markdown/LaTeX to plain readable text for sticky notes and flashcards. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ""))
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\$([^$\n]+?)\$/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(.+?)\*(?=\s|$)/g, "$1$2")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractFormula(md: string): string | null {
  const m = md.match(/\$\$([\s\S]+?)\$\$/) || md.match(/\$([^$\n]+?)\$/);
  return m ? m[1].trim() : null;
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function AISheet({
  open,
  onOpenChange,
  contextText,
  boardId,
  initialPrompt,
  initialSnapshot,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  contextText?: string;
  boardId?: string;
  initialPrompt?: string;
  initialSnapshot?: string;
}) {
  const addRecentAI = useWhiteboard((s) => s.addRecentAI);
  const addObject = useWhiteboard((s) => s.addObject);
  const pushHistory = useWhiteboard((s) => s.pushHistory);
  const pages = useWhiteboard((s) => s.pages);
  const activePageId = useWhiteboard((s) => s.activePageId);
  const setTool = useWhiteboard((s) => s.setTool);
  const setSelected = useWhiteboard((s) => s.setSelected);
  const setSelectedIds = useWhiteboard((s) => s.setSelectedIds);
  const camera = useWhiteboard((s) => s.camera);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hintMode, setHintMode] = useState(false);
  const [attachedSnapshot, setAttachedSnapshot] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isLoadedRef = useRef(false);
  const online = useOnlineStatus();
  const hasAuth = useAuth((s) => Boolean(s.session?.access_token));
  const configured = useAISettings((s) => Boolean(s.getApiKey())) || hasAuth;

  const hasTriggeredPromptRef = useRef<string | null>(null);

  // 1. Load per-board chat history from IndexedDB
  useEffect(() => {
    if (!boardId) {
      isLoadedRef.current = true;
      return;
    }
    let active = true;
    loadBoardChat<Msg>(boardId).then((saved) => {
      if (active && saved && Array.isArray(saved) && saved.length > 0) {
        setMessages(saved);
      }
      isLoadedRef.current = true;
    });
    return () => {
      active = false;
    };
  }, [boardId]);

  // 2. Persist per-board chat history to IndexedDB (debounced by ~1000ms so streamed chunks don't spam writes)
  useEffect(() => {
    if (!boardId || !isLoadedRef.current) return;
    const timer = setTimeout(() => {
      saveBoardChat(boardId, messages);
    }, 1000);
    return () => clearTimeout(timer);
  }, [boardId, messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Stop any running request when the sheet unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  function getInsertionCoords() {
    const screenW = typeof window !== "undefined" ? window.innerWidth : 800;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;
    const p = pages.find((page) => page.id === activePageId) || pages[0];
    const offset = p ? (p.objects.length % 6) * 20 : 0;
    return {
      x: (screenW / 2 - camera.x) / camera.zoom - 130 + offset,
      y: (screenH / 2 - camera.y) / camera.zoom - 100 + offset,
    };
  }

  function handleAttachSnapshot() {
    const snap = captureCanvasSnapshot(Boolean(contextText));
    if (snap) {
      setAttachedSnapshot(snap);
      toast.success(contextText ? "Selection snapshot attached!" : "Board snapshot attached!");
    } else {
      toast.info("No content on the board to capture yet.");
    }
  }

  function handleFeedback(msgId: string, type: "up" | "down") {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === type ? undefined : type } : m)),
    );
    toast.success(type === "up" ? "Thanks for your feedback!" : "Feedback recorded. We'll improve this.");
  }

  function handlePlaceAnswerOnBoard(content: string) {
    const newId = uid();
    const formula = extractFormula(content);
    const { x, y } = getInsertionCoords();

    if (formula) {
      addObject({
        id: newId,
        kind: "formula",
        x,
        y,
        w: 300,
        h: 120,
        latex: formula,
        label: "AI Solution",
        isAiAnswer: true,
      });
    } else {
      addObject({
        id: newId,
        kind: "sticky",
        x,
        y,
        w: 300,
        h: 220,
        text: `🤖 AI Answer:\n\n${toPlainText(content).slice(0, 800)}`,
        color: "#dbeafe",
        isAiAnswer: true,
      });
    }
    pushHistory();
    setTool("select");
    setSelected(newId);
    setSelectedIds([]);
    onOpenChange(false);
    toast.success("AI answer placed on board! Drag to move it where you want.", {
      icon: "✨",
    });
  }

  function handleAddSticky(content: string) {
    const id = uid();
    const { x, y } = getInsertionCoords();
    addObject({
      id,
      kind: "sticky",
      x,
      y,
      w: 260,
      h: 200,
      text: toPlainText(content).slice(0, 600),
      color: "#fef08a",
      isAiAnswer: true,
    });
    pushHistory();
    setTool("select");
    setSelected(id);
    setSelectedIds([]);
    onOpenChange(false);
    toast.success("Added to the board! Drag to move it where you want.", { icon: "✨" });
  }

  function handleAddFlashcard(content: string, question: string) {
    const id = uid();
    const { x, y } = getInsertionCoords();
    addObject({
      id,
      kind: "flashcard",
      x,
      y,
      w: 260,
      h: 150,
      front: question.slice(0, 140),
      back: toPlainText(content).slice(0, 300),
      flipped: false,
      isAiAnswer: true,
    });
    pushHistory();
    setTool("select");
    setSelected(id);
    setSelectedIds([]);
    onOpenChange(false);
    toast.success("Flashcard added to board! Drag to move it where you want.", { icon: "✨" });
  }

  function handleInsertMath(latex: string) {
    const id = uid();
    const { x, y } = getInsertionCoords();
    addObject({
      id,
      kind: "formula",
      x,
      y,
      w: 280,
      h: 110,
      latex,
      label: "AI",
      isAiAnswer: true,
    });
    pushHistory();
    setTool("select");
    setSelected(id);
    setSelectedIds([]);
    onOpenChange(false);
    toast.success("Formula added to board! Drag to move it where you want.", { icon: "✨" });
  }

  async function handleCopy(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  async function runChat(history: Msg[], snapshotToSend?: string | null) {
    const assistantId = uid();
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const update = (patch: Partial<Msg>) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)));

    try {
      const { text, sources } = await AIEngine.chat(
        history.map((m) => ({ role: m.role, content: m.content })),
        {
          contextText,
          imageDataUrl: snapshotToSend || undefined,
          hintMode,
          signal: controller.signal,
          onText: (full) => update({ content: full }),
        },
      );
      update({ content: text, sources });
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      addRecentAI({ prompt: lastUser?.content || "", response: text, boardId: boardId ?? null });
    } catch (err) {
      const partial = (err as AIError & { partialText?: string })?.partialText || "";
      if (err instanceof AIError && err.code === "aborted") {
        update({ content: partial, error: partial ? undefined : "Stopped." });
      } else {
        update({ content: partial, error: aiErrorMessage(err) });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setLoading(false);
    }
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const history = messages.filter(
      (m) => !(m.role === "assistant" && (m.error || !m.content.trim())),
    );
    const snap = attachedSnapshot;
    setInput("");
    setAttachedSnapshot(null);
    void runChat(
      [...history, { id: uid(), role: "user", content: clean, imageDataUrl: snap || undefined }],
      snap,
    );
  }

  function retry() {
    if (loading) return;
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx === -1) return;
    const history = messages
      .slice(0, lastUserIdx + 1)
      .filter((m) => !(m.role === "assistant" && (m.error || !m.content.trim())));
    const lastUserMsg = messages[lastUserIdx];
    void runChat(history, lastUserMsg?.imageDataUrl);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function clearChat() {
    abortRef.current?.abort();
    setMessages([]);
    if (boardId) {
      clearBoardChat(boardId);
    }
  }

  // Auto-trigger explanation or prefilled prompt when opening AI Sheet with an initial prompt
  useEffect(() => {
    if (!open) {
      hasTriggeredPromptRef.current = null;
      return;
    }
    if (open && initialSnapshot && !attachedSnapshot) {
      setAttachedSnapshot(initialSnapshot);
    }
    if (
      open &&
      initialPrompt &&
      isLoadedRef.current &&
      hasTriggeredPromptRef.current !== initialPrompt
    ) {
      hasTriggeredPromptRef.current = initialPrompt;
      const snap = initialSnapshot || attachedSnapshot;
      setAttachedSnapshot(null);
      const history = messages.filter(
        (m) => !(m.role === "assistant" && (m.error || !m.content.trim())),
      );
      void runChat(
        [...history, { id: uid(), role: "user", content: initialPrompt, imageDataUrl: snap || undefined }],
        snap,
      );
    }
  }, [open, initialPrompt, initialSnapshot, isLoadedRef.current]);

  const canSend = online && configured && !loading && input.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b p-3.5">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" /> Slate AI
            </SheetTitle>
            <div className="flex items-center gap-1.5 mr-6">
              <button
                type="button"
                onClick={() => setHintMode(!hintMode)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition",
                  hintMode
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "text-muted-foreground hover:bg-accent border border-transparent",
                )}
                title="Toggle Socratic Hint Mode (gives clues and guiding questions instead of full answers)"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>Hints</span>
              </button>

              <button
                type="button"
                onClick={handleAttachSnapshot}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition",
                  attachedSnapshot
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-accent border border-transparent",
                )}
                title="Attach canvas snapshot so AI can see diagrams, graphs, and handwriting"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>See Board</span>
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearChat}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground hover:bg-accent"
                  title="Start a new chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        {attachedSnapshot && (
          <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-2 text-xs text-primary">
            <img
              src={attachedSnapshot}
              alt="Board Snapshot"
              className="h-8 w-10 rounded border border-primary/30 object-cover bg-white"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Board snapshot attached</p>
              <p className="text-[11px] text-muted-foreground">AI can now see your drawing or diagram</p>
            </div>
            <button
              type="button"
              onClick={() => setAttachedSnapshot(null)}
              className="rounded p-1 hover:bg-primary/20 text-muted-foreground hover:text-foreground"
              title="Remove snapshot"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {hintMode && (
          <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
            <span>Hint mode active — guiding questions, no spoilers</span>
          </div>
        )}

        {!online && (
          <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
            <WifiOff className="h-4 w-4 shrink-0" />
            You're offline. Slate AI needs an internet connection.
          </div>
        )}
        {online && !configured && (
          <div className="flex items-center gap-2 border-b bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            AI isn't set up yet. Sign in or add a personal Gemini key in AI Settings.
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {contextText && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
              <span className="font-semibold">Using your selection: </span>
              <span className="italic">
                "{contextText.slice(0, 100)}
                {contextText.length > 100 ? "…" : ""}"
              </span>
            </div>
          )}

          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-sm font-medium">Ask anything</p>
              <p className="text-xs text-muted-foreground">
                Solve problems, check your work, explain diagrams, or create flashcards. Tap "See Board" to let the AI see your canvas!
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    className="flex items-center gap-2 rounded-lg border border-border px-2 py-2 text-left text-xs transition hover:bg-accent hover:border-primary/40"
                    onClick={() => {
                      setInput(q.prompt);
                      inputRef.current?.focus();
                    }}
                  >
                    <q.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="line-clamp-1">{q.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => {
            const isLast = idx === messages.length - 1;
            const streaming = loading && isLast && m.role === "assistant";
            const formula = m.role === "assistant" && m.content ? extractFormula(m.content) : null;
            const question =
              m.role === "assistant"
                ? [...messages.slice(0, idx)].reverse().find((x) => x.role === "user")?.content ||
                  "Question"
                : "";
            return (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "space-y-1.5"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground shadow-sm"
                      : "max-w-[96%] rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-foreground shadow-sm"
                  }
                >
                  {m.role === "user" ? (
                    <div>
                      {m.imageDataUrl && (
                        <div className="mb-2 overflow-hidden rounded-lg border border-white/20">
                          <img
                            src={m.imageDataUrl}
                            alt="Attached ink"
                            className="max-h-36 w-full object-contain bg-white"
                          />
                        </div>
                      )}
                      {!m.imageDataUrl && m.hasSnapshot && (
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white/90">
                          <Camera className="h-3 w-3" />
                          <span>Board snapshot attached</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    </div>
                  ) : (
                    <>
                      {m.verified && (
                        <div className="mb-2 inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span>Verified</span>
                        </div>
                      )}

                      {m.content && (
                        <div className={MD_CLASS}>
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {m.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {streaming && !m.content && (
                        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span>Thinking…</span>
                        </div>
                      )}

                      {m.error && (
                        <div
                          className={`flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive ${m.content ? "mt-3" : ""}`}
                        >
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p>{m.error}</p>
                            {isLast && !loading && (
                              <button
                                onClick={retry}
                                className="mt-1.5 inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                              >
                                <RotateCcw className="h-3 w-3" /> Try again
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {m.sources && m.sources.length > 0 && !streaming && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <BookMarked className="h-3.5 w-3.5 text-primary/80" />
                          <span>From your workspace:</span>
                          {m.sources.map((s, i) => (
                            <a
                              key={i}
                              href={s.url || (s.id ? `/board/${s.id}` : "#")}
                              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-foreground hover:bg-accent hover:text-primary transition font-medium"
                            >
                              <span>{s.title}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                            </a>
                          ))}
                        </div>
                      )}

                      {m.content && !streaming && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2 text-xs">
                          <button
                            onClick={() => handlePlaceAnswerOnBoard(m.content)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-1 font-semibold hover:bg-primary/20 transition shadow-xs"
                            title="Place answer directly on the whiteboard so you can move and position it anywhere"
                          >
                            <Move className="h-3.5 w-3.5" />
                            Place on Board
                          </button>
                          <button
                            onClick={() => handleAddSticky(m.content)}
                            className="inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 font-medium text-foreground hover:bg-accent transition"
                            title="Add to board as a sticky note"
                          >
                            <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                            Sticky
                          </button>
                          <button
                            onClick={() => handleAddFlashcard(m.content, question)}
                            className="inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 font-medium text-foreground hover:bg-accent transition"
                            title="Add to board as a flashcard (your question on the front)"
                          >
                            <Layers className="h-3.5 w-3.5 text-emerald-500" />
                            Flashcard
                          </button>
                          {formula && (
                            <button
                              onClick={() => handleInsertMath(formula)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 font-medium text-foreground hover:bg-accent transition"
                              title="Add the first formula to the board"
                            >
                              <Calculator className="h-3.5 w-3.5 text-purple-500" />
                              Formula
                            </button>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleFeedback(m.id, "up")}
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent transition text-muted-foreground",
                                m.feedback === "up" && "text-emerald-500 font-bold bg-emerald-500/10",
                              )}
                              title="Good answer"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(m.id, "down")}
                              className={cn(
                                "inline-flex items-center justify-center h-6 w-6 rounded hover:bg-accent transition text-muted-foreground",
                                m.feedback === "down" && "text-rose-500 font-bold bg-rose-500/10",
                              )}
                              title="Needs improvement"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="inline-flex items-center gap-1 rounded-md bg-accent/60 px-2 py-1 font-medium text-foreground hover:bg-accent transition"
                              title="Copy text"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t p-3 bg-card"
        >
          <Button
            size="icon"
            type="button"
            variant={attachedSnapshot ? "default" : "outline"}
            onClick={handleAttachSnapshot}
            title={attachedSnapshot ? "Snapshot attached" : "Attach board snapshot to your question"}
            className="shrink-0"
          >
            <Camera className="h-4 w-4" />
          </Button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            disabled={!online || !configured}
            placeholder={
              !online
                ? "You're offline"
                : !configured
                  ? "Add a Gemini API key in AI Settings"
                  : attachedSnapshot
                    ? "Ask about this board snapshot…"
                    : "Ask a question, paste a problem…"
            }
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          {loading ? (
            <Button size="icon" type="button" variant="secondary" onClick={stop} title="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" type="submit" disabled={!canSend} title="Send">
              <Send className="h-4 w-4" />
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
