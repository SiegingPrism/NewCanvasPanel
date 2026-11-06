import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Monitor, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { AIEngine, aiErrorMessage, type MindMapNode } from "@/lib/ai/aiEngine";
import { extractBoardSearchStrings } from "@/lib/ai/localRAG";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TOPIC_SUGGESTIONS = [
  "Photosynthesis & Plant Energy",
  "Newton's Laws of Motion",
  "Indian Constitution & Rights",
  "Machine Learning Foundations",
  "Cell Biology & Mitosis",
  "World War II Turning Points",
];

export function GenerateMindMapDialog({
  open,
  onOpenChange,
  initialMode = "screen",
  initialTopic = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "screen" | "custom";
  initialTopic?: string;
}) {
  const {
    pages,
    activePageId,
    activeBoardId,
    boards,
    camera,
    addObject,
    pushHistory,
    selectedId,
    selectedIds,
  } = useWhiteboard();
  const boardTitle = (activeBoardId && boards?.[activeBoardId]?.title) || "";
  const [mode, setMode] = useState<"screen" | "custom">(initialTopic ? "custom" : initialMode);
  const [customTopic, setCustomTopic] = useState(initialTopic);
  const [loading, setLoading] = useState(false);

  // Sync mode and topic when dialog opens
  useEffect(() => {
    if (open) {
      if (initialTopic) {
        setCustomTopic(initialTopic);
        setMode("custom");
      } else {
        setMode(initialMode);
      }
    }
  }, [open, initialTopic, initialMode]);

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];
  const objectCount = activePage?.objects?.length || 0;
  const boardStrings = activePage ? extractBoardSearchStrings({ pages: [activePage] }) : [];

  async function handleGenerate() {
    setLoading(true);
    const toastId = toast.loading("Synthesizing AI Mind-Map...");

    try {
      const screenW = typeof window !== "undefined" ? window.innerWidth : 800;
      const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

      // Find ideal placement coordinates
      let startX = (screenW / 2 - camera.x) / camera.zoom;
      let startY = (screenH / 2 - camera.y) / camera.zoom;

      if (activePage?.objects && activePage.objects.length > 0) {
        let maxX = -Infinity;
        let sumY = 0;
        let count = 0;
        for (const o of activePage.objects) {
          if ("x" in o && "w" in o && "y" in o && "h" in o) {
            maxX = Math.max(maxX, o.x + o.w);
            sumY += o.y + o.h / 2;
            count++;
          }
        }
        if (count > 0 && maxX > -Infinity) {
          startX = maxX + 280;
          startY = sumY / count;
        }
      }

      let tree: MindMapNode;

      if (mode === "screen") {
        // Option 1: Based on work on screen
        let snapshot: string | undefined;
        try {
          const mainCanvas = document.querySelector("canvas");
          if (mainCanvas) {
            snapshot = mainCanvas.toDataURL("image/webp", 0.78);
            if (!snapshot.startsWith("data:image/webp")) {
              snapshot = mainCanvas.toDataURL("image/jpeg", 0.78);
            }
          }
        } catch {}

        const targetIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        const selectedObjects = activePage?.objects?.filter((o) => targetIds.includes(o.id)) || [];
        let selectedText = "";
        for (const obj of selectedObjects) {
          if (obj.kind === "text" || obj.kind === "sticky") selectedText += " " + obj.text;
          else if (obj.kind === "formula") selectedText += " " + obj.latex;
        }

        const contextParts = [
          boardTitle ? `Board Title: ${boardTitle}` : "",
          selectedText.trim() ? `Selected Focus Area:\n${selectedText.trim()}` : "",
          boardStrings.length > 0
            ? `Text, notes, and formulas on canvas:\n${boardStrings.slice(0, 30).join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        if (!contextParts && !snapshot && objectCount === 0) {
          toast.dismiss(toastId);
          toast.error(
            "Your board is currently empty. Please select 'Different Topic' or write on the canvas first.",
          );
          setLoading(false);
          return;
        }

        tree = await AIEngine.generateMindMap(
          contextParts || "Current Whiteboard Work",
          startX,
          startY,
          {
            imageDataUrl: snapshot,
            isScreenWork: true,
          },
        );
      } else {
        // Option 2: Different custom topic
        const topic = customTopic.trim();
        if (!topic) {
          toast.dismiss(toastId);
          toast.error("Please enter a topic for your mind map.");
          setLoading(false);
          return;
        }

        tree = await AIEngine.generateMindMap(topic, startX, startY);
      }

      function addNodes(node: typeof tree) {
        addObject({
          id: node.id,
          kind: "mindmap-node",
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          label: node.label,
          level: node.level,
          color: node.color,
          parentId: node.parentId,
        });
        (node.children || []).forEach(addNodes);
      }

      addNodes(tree);
      pushHistory();
      toast.dismiss(toastId);
      toast.success(
        mode === "screen"
          ? "Mind-Map generated from your screen work!"
          : `Mind-Map generated for "${tree.label}"!`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(aiErrorMessage(err, "Mind map generation failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-w-[95vw] p-5 rounded-2xl bg-card border border-border shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Generate AI Mind-Map
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose the source for your concept mind map
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Source Switcher Cards */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {/* Card 1: Screen Work */}
          <button
            type="button"
            onClick={() => setMode("screen")}
            className={cn(
              "flex flex-col items-start p-3 rounded-xl border text-left transition relative select-none",
              mode === "screen"
                ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/25 ring-1 ring-purple-600"
                : "border-border hover:bg-muted/40 hover:border-muted-foreground/30",
            )}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span
                className={cn(
                  "p-1.5 rounded-lg",
                  mode === "screen" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <Monitor className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full tracking-wider",
                  mode === "screen"
                    ? "bg-purple-600/20 text-purple-600 dark:text-purple-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                On-Screen
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground leading-tight">
              Current Work
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug mt-1">
              Summarize & structure your writing, notes, and drawings on this board
            </span>
          </button>

          {/* Card 2: Custom Topic */}
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={cn(
              "flex flex-col items-start p-3 rounded-xl border text-left transition relative select-none",
              mode === "custom"
                ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/25 ring-1 ring-purple-600"
                : "border-border hover:bg-muted/40 hover:border-muted-foreground/30",
            )}
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <span
                className={cn(
                  "p-1.5 rounded-lg",
                  mode === "custom" ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                <Lightbulb className="h-4 w-4" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full tracking-wider",
                  mode === "custom"
                    ? "bg-purple-600/20 text-purple-600 dark:text-purple-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                Different
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground leading-tight">
              Different Topic
            </span>
            <span className="text-[11px] text-muted-foreground leading-snug mt-1">
              Explore any new concept, chapter, or subject from scratch
            </span>
          </button>
        </div>

        {/* Dynamic Mode Details */}
        <div className="mt-2 space-y-3">
          {mode === "screen" ? (
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                <span>Detected Canvas Content</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {objectCount > 0
                  ? `Found ${objectCount} element${objectCount === 1 ? "" : "s"} on this board (${boardStrings.length} text fragments & formulas). AI will analyze both the handwritten strokes and text.`
                  : "Your canvas is currently empty. Write or sketch on the board, or choose 'Different Topic' above."}
              </p>
              {boardTitle && (
                <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md inline-block">
                  Board: {boardTitle}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Topic or Concept Name</label>
              <Input
                placeholder="e.g. Thermodynamics, Indian History, Cell Division..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customTopic.trim() && !loading) {
                    handleGenerate();
                  }
                }}
                autoFocus
                className="text-xs h-9 bg-background"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Suggestions
                </span>
                <div className="flex flex-wrap gap-1">
                  {TOPIC_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomTopic(s)}
                      className="text-[10px] px-2 py-0.5 rounded-md border border-border bg-muted/40 hover:bg-purple-500/10 hover:border-purple-500/30 text-muted-foreground hover:text-purple-600 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={loading || (mode === "custom" && !customTopic.trim())}
            className="text-xs h-8 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BrainCircuit className="h-3.5 w-3.5" />
                Generate Mind-Map
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
