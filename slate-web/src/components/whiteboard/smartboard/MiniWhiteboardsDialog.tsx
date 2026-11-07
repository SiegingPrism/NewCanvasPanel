import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Smartphone,
  Copy,
  ExternalLink,
  Trash2,
  Maximize2,
  ArrowUpRight,
  Check,
  RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";
import { getSupabase } from "@/lib/supabase/client";

export interface StudentSubmission {
  studentName: string;
  rollNo?: string;
  imageData: string;
  timestamp: number;
}

export interface MiniWhiteboardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId?: string;
}

export function MiniWhiteboardsDialog({
  open,
  onOpenChange,
  boardId = "default",
}: MiniWhiteboardsDialogProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [enlargedSubmission, setEnlargedSubmission] = useState<StudentSubmission | null>(null);

  const studentBoardUrl = typeof window !== "undefined"
    ? `${window.location.origin}/student-board?session=${boardId}`
    : `https://slate.local/student-board?session=${boardId}`;

  // Generate QR Code
  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(studentBoardUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code error:", err));
  }, [open, studentBoardUrl]);

  // Listen for live student submissions
  useEffect(() => {
    if (!open) return;

    const handleSubmission = (payload: any) => {
      if (!payload || !payload.imageData || !payload.studentName) return;
      const sub: StudentSubmission = {
        studentName: payload.studentName,
        rollNo: payload.rollNo,
        imageData: payload.imageData,
        timestamp: payload.timestamp || Date.now(),
      };

      setSubmissions((prev) => {
        const filtered = prev.filter((s) => s.studentName !== sub.studentName);
        return [sub, ...filtered];
      });

      toast.info(`New mini whiteboard from ${sub.studentName}`);
    };

    // 1. Supabase Realtime channel
    const supabase = getSupabase();
    let channel: any = null;
    if (supabase && boardId) {
      channel = supabase
        .channel(`slate_mini_board_${boardId}`)
        .on("broadcast", { event: "submit" }, (msg: any) => {
          if (msg.payload) handleSubmission(msg.payload);
        })
        .subscribe();
    }

    // 2. BroadcastChannel (local tabs / network)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`slate_mini_board_${boardId}`);
      bc.onmessage = (ev) => {
        if (ev.data) handleSubmission(ev.data);
      };
    } catch {}

    // 3. Storage event fallback
    const onStorage = (e: StorageEvent) => {
      if (e.key === `slate_mini_board_submission_${boardId}` && e.newValue) {
        try {
          handleSubmission(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (channel) channel.unsubscribe();
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [open, boardId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentBoardUrl);
    setCopied(true);
    toast.success("Student link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushToBigBoard = (sub: StudentSubmission) => {
    // Calculate placement near center of current view
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;

    const imageObject: CanvasObject = {
      id: `student_mini_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "image",
      x: cx - 200,
      y: cy - 150,
      w: 400,
      h: 300,
      src: sub.imageData,
    };

    addObject(imageObject);
    pushHistory();
    toast.success(`Pushed ${sub.studentName}'s mini whiteboard to the big screen!`);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setSubmissions([]);
    toast("Submissions cleared for next question");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
          <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Smartphone className="h-6 w-6" />
              </span>
              <div>
                <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                  Phones as Mini Whiteboards
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full font-bold">
                    {submissions.length} Received
                  </span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Students draw on their phones; review live responses and push solutions to the board.
                </p>
              </div>
            </div>

            {submissions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {/* Connection Banner & QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border">
              {qrDataUrl && (
                <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 shrink-0">
                  <img src={qrDataUrl} alt="QR Code to Join" className="w-28 h-28" />
                </div>
              )}
              <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Step 1: Students scan QR code with phone camera
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Ask students to scan or open this link on their phones:
                </p>
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    readOnly
                    value={studentBoardUrl}
                    className="flex-1 bg-background px-3 py-1.5 text-xs font-mono rounded-lg border text-muted-foreground truncate"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyLink}
                    className="h-8 gap-1 text-xs shrink-0 rounded-lg"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(studentBoardUrl, "_blank")}
                    className="h-8 w-8 p-0 shrink-0"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Submissions Grid */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Live Student Answers ({submissions.length})
                </h3>
                {submissions.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Tap a card to enlarge or push directly to the big board
                  </span>
                )}
              </div>

              {submissions.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border-2 border-dashed border-border bg-card/40 space-y-2">
                  <Sparkles className="h-8 w-8 mx-auto text-indigo-400/60" />
                  <p className="text-sm font-semibold text-foreground">Waiting for student submissions...</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When students tap "Submit" on their phones, their handwritten drawings will appear here in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {submissions.map((sub, idx) => (
                    <div
                      key={sub.studentName + idx}
                      className="group relative rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      {/* Image Preview */}
                      <div
                        onClick={() => setEnlargedSubmission(sub)}
                        className="bg-white aspect-[4/3] flex items-center justify-center p-2 cursor-pointer border-b relative"
                      >
                        <img
                          src={sub.imageData}
                          alt={sub.studentName}
                          className="max-h-full max-w-full object-contain"
                        />
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Maximize2 className="h-3.5 w-3.5" />
                        </span>
                      </div>

                      {/* Card Info & Push button */}
                      <div className="p-2.5 flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {sub.studentName}
                          </p>
                          {sub.rollNo && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              Roll: {sub.rollNo}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handlePushToBigBoard(sub)}
                          className="h-7 px-2 text-[11px] font-bold gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
                          title="Place student solution on the whiteboard"
                        >
                          <ArrowUpRight className="h-3 w-3" />
                          Board
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Capacity Advisory Notice */}
            <div className="pt-2 border-t flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="text-indigo-500 font-bold">💡 Realtime Capacity:</span>
              <span>
                Free Supabase tier supports up to 200 concurrent student connections (~4-5 simultaneous classrooms). Pro tier supports 500+ connections.
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enlarged Submission Modal */}
      {enlargedSubmission && (
        <Dialog open={!!enlargedSubmission} onOpenChange={() => setEnlargedSubmission(null)}>
          <DialogContent className="max-w-3xl p-6 rounded-3xl bg-card border shadow-2xl">
            <DialogHeader className="flex-row items-center justify-between pb-3 border-b">
              <div>
                <DialogTitle className="text-lg font-bold">
                  {enlargedSubmission.studentName}
                  {enlargedSubmission.rollNo ? ` (Roll: ${enlargedSubmission.rollNo})` : ""}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Submitted at {new Date(enlargedSubmission.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <Button
                onClick={() => {
                  handlePushToBigBoard(enlargedSubmission);
                  setEnlargedSubmission(null);
                }}
                className="gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
              >
                <ArrowUpRight className="h-4 w-4" />
                Push to Big Board
              </Button>
            </DialogHeader>

            <div className="bg-white rounded-2xl p-4 my-2 border flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img
                src={enlargedSubmission.imageData}
                alt={enlargedSubmission.studentName}
                className="max-h-[55vh] max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
