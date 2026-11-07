import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Zap, Users, RotateCcw, Plus, Minus, Crown, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";
import { recordAssessmentResult } from "@/lib/whiteboard/assessmentStore";
import { getCurrentActivePeriod } from "@/lib/whiteboard/timetableStore";

interface TeamQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Team = {
  id: "red" | "blue" | "green" | "yellow";
  name: string;
  color: string;
  bgLight: string;
  score: number;
  lastBuzzedAt: number | null;
};

export function TeamQuizDialog({ open, onOpenChange }: TeamQuizDialogProps) {
  const [teams, setTeams] = useState<Team[]>([
    { id: "red", name: "Team Red", color: "#ef4444", bgLight: "bg-red-500/10 text-red-600 border-red-500/30", score: 0, lastBuzzedAt: null },
    { id: "blue", name: "Team Blue", color: "#3b82f6", bgLight: "bg-blue-500/10 text-blue-600 border-blue-500/30", score: 0, lastBuzzedAt: null },
    { id: "green", name: "Team Green", color: "#10b981", bgLight: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", score: 0, lastBuzzedAt: null },
    { id: "yellow", name: "Team Yellow", color: "#f59e0b", bgLight: "bg-amber-500/10 text-amber-600 border-amber-500/30", score: 0, lastBuzzedAt: null },
  ]);

  const [activeBuzzerTeam, setActiveBuzzerTeam] = useState<Team | null>(null);
  const [isBuzzerLocked, setIsBuzzerLocked] = useState(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [targetClass, setTargetClass] = useState<string>(() => {
    const currentPeriod = getCurrentActivePeriod();
    return currentPeriod?.slot.className || "Class 9A";
  });
  const timerRef = useRef<any>(null);

  // Play audio tone on buzzer
  const playBuzzerSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

  const handleBuzz = (teamId: "red" | "blue" | "green" | "yellow") => {
    if (isBuzzerLocked) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    playBuzzerSound();
    setIsBuzzerLocked(true);
    setActiveBuzzerTeam(team);
    setCountdown(10);

    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, lastBuzzedAt: Date.now() } : t)),
    );

    toast.success(`⚡ ${team.name} buzzed in first!`);
  };

  // 10s countdown timer
  useEffect(() => {
    if (activeBuzzerTeam && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [activeBuzzerTeam]);

  const handleAwardPoints = (teamId: "red" | "blue" | "green" | "yellow", delta: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t)),
    );
    handleResetBuzzer();
    if (delta > 0) {
      setQuestionCount((q) => q + 1);
      setHasSaved(false);
    }
  };

  const handleResetBuzzer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsBuzzerLocked(false);
    setActiveBuzzerTeam(null);
    setCountdown(10);
  };

  const saveGameResults = () => {
    const totalPoints = teams.reduce((acc, t) => acc + t.score, 0);
    if ((questionCount > 0 || totalPoints > 0) && !hasSaved) {
      const cls = targetClass.trim() || "Class 9A";
      recordAssessmentResult({
        type: "team-quiz",
        className: cls,
        topic: "Team Buzzer Challenge",
        totalStudents: teams.length,
        questionCount: Math.max(1, questionCount),
        teamScores: teams.map((t) => ({ id: t.id, name: t.name, score: t.score, color: t.color })),
      });
      setHasSaved(true);
      toast.success(`Saved team game results (${Math.max(1, questionCount)} questions) for ${cls} to Class Insights!`);
    }
  };

  const handleResetAllScores = () => {
    saveGameResults();
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0, lastBuzzedAt: null })));
    setQuestionCount(0);
    setHasSaved(false);
    handleResetBuzzer();
    toast.info("Leaderboard reset for a new game.");
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      saveGameResults();
    }
    onOpenChange(isOpen);
  };

  // Sort teams for live leaderboard
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-6 bg-card border shadow-2xl flex flex-col max-h-[88vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-foreground">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Trophy className="h-6 w-6" />
                </span>
                <span>Team Quiz Game &amp; Live Buzzers</span>
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold text-muted-foreground">Class:</span>
                <input
                  type="text"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="text-xs font-bold text-foreground bg-muted/60 border border-border px-2 py-0.5 rounded-lg w-28 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. Class 9A"
                />
                {getCurrentActivePeriod()?.slot.className === targetClass && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Current Period
                  </span>
                )}
                <span className="text-xs font-mono font-bold text-muted-foreground ml-2">
                  • {questionCount} questions answered
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={saveGameResults}
                disabled={questionCount === 0 || hasSaved}
                className="gap-1.5 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                Save to Insights
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetAllScores}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Game
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Teams tap their on-screen or phone buzzers. Fastest finger first wins the floor!
          </p>
        </DialogHeader>

        {/* Active Buzzer Floor Banner */}
        <div className="mt-2 p-4 rounded-2xl border text-center transition-all bg-muted/40">
          {activeBuzzerTeam ? (
            <div className="space-y-2 animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
                <Zap className="h-4 w-4 text-amber-500 animate-bounce" />
                <span>Floor Active — Question Time</span>
              </div>
              <h2 className="text-3xl font-black" style={{ color: activeBuzzerTeam.color }}>
                {activeBuzzerTeam.name} Buzzed In!
              </h2>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-mono font-extrabold bg-card px-4 py-1 rounded-xl border shadow-sm">
                  ⏱️ {countdown}s
                </span>
                <Button
                  onClick={() => handleAwardPoints(activeBuzzerTeam.id, 100)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md"
                >
                  Correct (+100)
                </Button>
                <Button
                  onClick={() => handleAwardPoints(activeBuzzerTeam.id, -50)}
                  variant="outline"
                  className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-sm px-4 py-2 rounded-xl"
                >
                  Incorrect (-50)
                </Button>
                <Button
                  onClick={handleResetBuzzer}
                  variant="ghost"
                  className="text-xs text-muted-foreground rounded-xl"
                >
                  Pass / Reset
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-2 text-center text-muted-foreground text-sm font-medium">
              Ready for question. Tap any team buzzer to claim the floor.
            </div>
          )}
        </div>

        {/* 4 Team Buzzers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          {teams.map((t) => {
            const isWinner = activeBuzzerTeam?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleBuzz(t.id)}
                disabled={isBuzzerLocked}
                className={cn(
                  "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50",
                  t.bgLight,
                  isWinner ? "ring-4 ring-amber-400 scale-105" : "hover:border-primary/50",
                )}
                style={{ minHeight: "110px" }}
              >
                <span className="text-sm font-bold truncate max-w-full">{t.name}</span>
                <span className="text-2xl font-black tracking-tight">{t.score} pts</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/80 shadow-xs">
                  ⚡ BUZZ
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Leaderboard Standings */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border bg-card p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span>Leaderboard Standings</span>
          </h4>
          <div className="space-y-2">
            {sortedTeams.map((t, idx) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs",
                      idx === 0
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {idx === 0 ? "👑" : idx + 1}
                  </span>
                  <span className="font-bold text-sm" style={{ color: t.color }}>
                    {t.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base">{t.score} pts</span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleAwardPoints(t.id, 25)}
                      className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs"
                      title="+25 points"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleAwardPoints(t.id, -25)}
                      className="p-1 rounded bg-muted hover:bg-muted/80 text-foreground text-xs"
                      title="-25 points"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

