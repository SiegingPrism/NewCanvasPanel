import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vote, QrCode, CheckCircle2, Trophy, BarChart3, Users, RotateCcw, Wifi, Edit2 } from "lucide-react";
import QRCode from "qrcode";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { QuizObject } from "@/lib/whiteboard/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuickPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuiz?: QuizObject;
}

export function QuickPollDialog({ open, onOpenChange, initialQuiz }: QuickPollDialogProps) {
  const { pages, activePageId } = useWhiteboard();
  const page = pages.find((p) => p.id === activePageId);

  // If page has a quiz object, we can pull it in!
  const quizOnBoard = initialQuiz || (page?.objects.find((o) => o.kind === "quiz") as QuizObject | undefined);

  const [pollId] = useState(() => `poll-${Math.random().toString(36).slice(2, 9)}`);
  const [question, setQuestion] = useState(
    quizOnBoard?.question || "Which planet in our solar system has the most moons?"
  );
  const [options, setOptions] = useState<string[]>(
    quizOnBoard?.options || ["Mars", "Jupiter", "Saturn", "Neptune"]
  );
  const [correctIndex, setCorrectIndex] = useState(quizOnBoard?.answerIndex ?? 2);
  const [votes, setVotes] = useState<number[]>([0, 0, 0, 0]);
  const [revealed, setRevealed] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [serverHost, setServerHost] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  });
  const [editingHost, setEditingHost] = useState(false);

  // Sync options count with votes array
  useEffect(() => {
    if (votes.length !== options.length) {
      setVotes(new Array(options.length).fill(0));
    }
  }, [options.length]);

  // Register poll on server API and poll for incoming votes from student phones
  useEffect(() => {
    if (!open) return;

    // 1. Create or register active poll session on backend server
    fetch("/api/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        pollId,
        question,
        options,
        correctIndex,
      }),
    }).catch(() => {});

    let cancelled = false;
    let prevTotal = 0;

    // 2. Poll server every 1 second for live votes from student phones
    const pollInterval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/poll?id=${pollId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.votes)) {
            const newTotal = data.votes.reduce((a: number, b: number) => a + b, 0);
            if (newTotal > prevTotal) {
              toast.success("Student response registered!");
              prevTotal = newTotal;
            }
            setVotes(data.votes);
          }
        }
      } catch {}
    }, 1000);

    // 3. Fallback same-device listeners
    const handleIncomingVote = (optIdx: number) => {
      setVotes((prev) => {
        const next = [...prev];
        next[optIdx] = (next[optIdx] || 0) + 1;
        return next;
      });
      toast.success("Student response registered!");
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(`slate_poll_${pollId}`);
      bc.onmessage = (ev) => {
        if (ev.data?.type === "vote" && typeof ev.data.optionIndex === "number") {
          handleIncomingVote(ev.data.optionIndex);
        }
      };
    } catch {}

    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(`slate_poll_vote_${pollId}`) && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (typeof data.optionIndex === "number") {
            handleIncomingVote(data.optionIndex);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      if (bc) bc.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [open, pollId, question, options, correctIndex]);

  // Generate real QR code pointing to live poll URL
  useEffect(() => {
    const base = serverHost || (typeof window !== "undefined" ? window.location.origin : "");
    const pollUrl = `${base}/poll?id=${pollId}&q=${encodeURIComponent(question)}&opts=${encodeURIComponent(
      JSON.stringify(options)
    )}&ans=${correctIndex}`;

    QRCode.toDataURL(pollUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [question, options, correctIndex, pollId, serverHost]);

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  const resetPoll = async () => {
    setVotes(new Array(options.length).fill(0));
    setRevealed(false);
    try {
      await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", pollId }),
      });
    } catch {}
    toast.info("Poll responses reset.");
  };

  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const optionColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl bg-card p-6 shadow-2xl border border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Vote className="h-6 w-6" />
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Classroom Live Poll & Quiz
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs font-bold text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{totalVotes} Responses</span>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Left Column: QR Code for Student Phones */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 border border-border p-4 text-center">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Scan with Phone
            </span>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Poll QR Code" className="h-44 w-44 rounded-xl shadow-md border bg-white p-1" />
            ) : (
              <div className="h-44 w-44 rounded-xl bg-muted animate-pulse" />
            )}
            <p className="text-[11px] font-medium text-muted-foreground mt-2">
              Point phone camera to submit answer live
            </p>

            {/* Network Host IP configuration */}
            <div className="mt-3 w-full text-left">
              <button
                type="button"
                onClick={() => setEditingHost(!editingHost)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
              >
                <Wifi className="h-3 w-3" />
                <span>Host: {serverHost.replace(/^https?:\/\//, "")}</span>
                <Edit2 className="h-2.5 w-2.5 opacity-60" />
              </button>
              {editingHost && (
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={serverHost}
                    onChange={(e) => setServerHost(e.target.value)}
                    placeholder="http://192.168.1.5:5173"
                    className="w-full text-[11px] bg-background border rounded px-2 py-1 font-mono"
                  />
                  <button
                    onClick={() => setEditingHost(false)}
                    className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-bold"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Poll Results Chart */}
          <div className="md:col-span-2 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Question
              </span>
              <h3 className="text-base font-bold text-foreground mt-0.5">{question}</h3>
            </div>

            <div className="space-y-2.5">
              {options.map((opt, idx) => {
                const count = votes[idx] || 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isCorrect = revealed && idx === correctIndex;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-md bg-muted flex items-center justify-center text-[11px] font-black">
                          {optionLetters[idx]}
                        </span>
                        <span className={cn(isCorrect && "text-emerald-500 font-extrabold")}>
                          {opt}
                        </span>
                        {isCorrect && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 inline-block ml-1" />
                        )}
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCorrect ? "bg-emerald-500" : optionColors[idx % optionColors.length]
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Poll Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <button
                type="button"
                onClick={resetPoll}
                className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Votes</span>
              </button>

              <button
                type="button"
                onClick={() => setRevealed(!revealed)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm",
                  revealed
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Trophy className="h-3.5 w-3.5" />
                <span>{revealed ? "Hide Answer" : "Reveal Answer"}</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
