import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useStrokeRecorderStore,
  RECORDABLE_SHAPES,
} from "@/lib/whiteboard/strokeRecorderStore";
import {
  CircleDot,
  Copy,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Play,
  Square as SquareIcon,
  Flame,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StrokeRecorderDialog() {
  const {
    isOpen,
    setIsOpen,
    isRecording,
    toggleRecording,
    selectedShape,
    setSelectedShape,
    recordedStrokes,
    clearStrokes,
    deleteStroke,
    exportJSON,
  } = useStrokeRecorderStore();

  const [copied, setCopied] = useState(false);

  const total = recordedStrokes.length;
  const matches = recordedStrokes.filter((s) => s.match).length;
  const accuracy = total > 0 ? Math.round((matches / total) * 100) : 100;

  const handleCopy = () => {
    if (recordedStrokes.length === 0) {
      toast.info("No strokes recorded yet. Draw on the canvas to record!");
      return;
    }
    const json = exportJSON();
    navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success(`Copied ${recordedStrokes.length} recorded strokes as JSON`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (recordedStrokes.length === 0) {
      toast.info("No strokes recorded yet. Draw on the canvas to record!");
      return;
    }
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slate_strokes_${selectedShape}_${recordedStrokes.length}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Dataset downloaded as JSON");
  };

  return (
    <>
      {/* Floating REC badge if recording is active while modal is closed */}
      {!isOpen && isRecording && (
        <div
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-red-600/90 hover:bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xl cursor-pointer animate-pulse backdrop-blur-md transition-all border border-red-400/30"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
          <span>REC: {selectedShape} ({total})</span>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="space-y-1 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <Flame className="h-4 w-4 text-orange-500" />
                Stroke Benchmark Recorder
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isRecording ? "destructive" : "default"}
                  onClick={toggleRecording}
                  className="gap-1.5 h-8 text-xs font-medium"
                >
                  {isRecording ? (
                    <>
                      <SquareIcon className="h-3 w-3 fill-current" />
                      Stop REC
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      Start REC
                    </>
                  )}
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Tag and record hand-drawn strokes directly into the benchmark dataset for continuous shape recognizer tuning.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-3 overflow-y-auto min-h-0 flex-1">
            {/* Target Shape Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Target Shape to Draw:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {RECORDABLE_SHAPES.map((shape) => {
                  const isSelected = selectedShape === shape.id;
                  const countForShape = recordedStrokes.filter(
                    (s) => s.expectedShape === shape.id
                  ).length;
                  return (
                    <button
                      key={shape.id}
                      onClick={() => setSelectedShape(shape.id)}
                      className={cn(
                        "flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs font-medium transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <span className="truncate max-w-full text-[11px]">{shape.label}</span>
                      <span className="text-[9px] opacity-70">({countForShape})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Stats */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border bg-card/60">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{total}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium">Strokes</div>
              </div>
              <div className="text-center border-x border-border/40">
                <div className="text-lg font-bold text-emerald-500">{matches}</div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium">Passed</div>
              </div>
              <div className="text-center">
                <div className={cn("text-lg font-bold", accuracy >= 80 ? "text-emerald-500" : "text-amber-500")}>
                  {accuracy}%
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-medium">Live Accuracy</div>
              </div>
            </div>

            {/* Recorded Strokes History */}
            <div className="flex flex-col space-y-1.5 min-h-0 flex-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase">
                <span>Recent Captured Strokes ({recordedStrokes.length})</span>
                {recordedStrokes.length > 0 && (
                  <button
                    onClick={clearStrokes}
                    className="text-red-500 hover:text-red-600 flex items-center gap-1 text-[10px] normal-case"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </button>
                )}
              </div>

              {recordedStrokes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground space-y-1">
                  <CircleDot className="h-6 w-6 text-muted-foreground/40 mb-1" />
                  <p className="font-medium text-foreground">No strokes recorded yet</p>
                  <p className="text-[11px] max-w-xs">
                    Click <strong className="text-primary font-semibold">Start REC</strong> above, then draw on the whiteboard with your pen or finger.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {recordedStrokes.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-background/80 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {s.match ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="font-medium text-foreground capitalize truncate">
                          {s.expectedShape}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {s.points.length} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono",
                            s.match
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {s.recognizedShape ? `-> ${s.recognizedShape}` : "-> rejected"}
                        </span>
                        <button
                          onClick={() => deleteStroke(s.id)}
                          className="text-muted-foreground hover:text-red-500 p-0.5"
                          title="Delete stroke"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {recordedStrokes.length} strokes ready for benchmark suite
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={recordedStrokes.length === 0}
                className="gap-1.5 h-8 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                Copy JSON
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                disabled={recordedStrokes.length === 0}
                className="gap-1.5 h-8 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download .json
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
