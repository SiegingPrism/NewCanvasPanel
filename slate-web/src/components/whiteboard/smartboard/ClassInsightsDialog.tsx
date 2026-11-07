import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Calendar,
  Share2,
  RotateCcw,
  Plus,
  Radio,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";
import {
  getAssessmentRecords,
  clearAssessmentRecords,
  type AssessmentRecord,
} from "@/lib/whiteboard/assessmentStore";

export interface TopicInsight {
  topic: string;
  accuracy: number; // 0 - 100
  questionsAttempted: number;
  totalCorrect: number;
  status: "mastered" | "needs_revision" | "in_progress";
}

export interface ClassInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassInsightsDialog({ open, onOpenChange }: ClassInsightsDialogProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [records, setRecords] = useState<AssessmentRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("All Classes");

  // Load real assessment records on open
  useEffect(() => {
    if (open) {
      setRecords(getAssessmentRecords());
    }
  }, [open]);

  // Listen for real-time assessments
  useEffect(() => {
    const handleUpdate = () => {
      setRecords(getAssessmentRecords());
    };
    window.addEventListener("slate:assessment-recorded", handleUpdate);
    return () => window.removeEventListener("slate:assessment-recorded", handleUpdate);
  }, []);

  // Filter records by class
  const filteredRecords = selectedClass === "All Classes"
    ? records
    : records.filter((r) => r.className === selectedClass);

  // Group by topic
  const topicMap = new Map<string, { total: number; correct: number }>();
  filteredRecords.forEach((r) => {
    const existing = topicMap.get(r.topic) || { total: 0, correct: 0 };
    existing.total += r.totalStudents;
    existing.correct += r.correctCount;
    topicMap.set(r.topic, existing);
  });

  const topics: TopicInsight[] = Array.from(topicMap.entries()).map(([topic, data]) => {
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    const status: TopicInsight["status"] =
      accuracy < 60 ? "needs_revision" : accuracy >= 80 ? "mastered" : "in_progress";
    return {
      topic,
      accuracy,
      questionsAttempted: data.total,
      totalCorrect: data.correct,
      status,
    };
  });

  const revisionTopics = topics.filter((t) => t.status === "needs_revision");
  const masteredTopics = topics.filter((t) => t.status === "mastered");

  const totalStudentsAttempted = filteredRecords.reduce((acc, r) => acc + r.totalStudents, 0);
  const totalCorrect = filteredRecords.reduce((acc, r) => acc + r.correctCount, 0);
  const overallAccuracy = totalStudentsAttempted > 0
    ? Math.round((totalCorrect / totalStudentsAttempted) * 100)
    : 0;

  const handleGenerateRevisionQuiz = (topic: TopicInsight) => {
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;

    const quizCard: CanvasObject = {
      id: `rev_quiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "quiz",
      x: cx - 220,
      y: cy - 160,
      w: 440,
      h: 320,
      question: `Revision Quick Check: ${topic.topic}`,
      options: [
        `Option A: Core principle of ${topic.topic}`,
        `Option B: Inverse relationship`,
        `Option C: Constant invariant factor`,
        `Option D: Non-linear fluctuation`,
      ],
      answerIndex: 0,
      color: "#f59e0b",
    };

    addObject(quizCard);
    pushHistory();
    toast.success(`Generated targeted revision quiz for "${topic.topic}" on whiteboard!`);
    onOpenChange(false);
  };

  const handleClearHistory = () => {
    clearAssessmentRecords();
    setRecords([]);
    toast.info("Assessment analytics history cleared.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Class Insights & Topic Analytics
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real quiz and poll performance: automatically identifies struggling topics for targeted revision.
              </p>
            </div>
          </div>

          {records.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border"
                title="Clear Assessment History"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </DialogHeader>

        {records.length === 0 ? (
          <div className="py-14 px-4 flex flex-col items-center justify-center text-center space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-500">
              <BarChart3 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                No Assessment Results Yet
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you run a <strong>Live QR Poll</strong>, <strong>Live Quiz</strong>, or <strong>Team Buzzer Game</strong> in class, actual student accuracy and topic comprehension data will be recorded and analyzed here.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  window.dispatchEvent(new CustomEvent("slate:open-poll"));
                }}
                className="gap-2 rounded-2xl border-primary/30 hover:bg-primary/5 text-primary text-xs font-bold"
              >
                <Radio className="h-4 w-4" />
                Start Live QR Poll
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  window.dispatchEvent(new CustomEvent("slate:open-team-quiz"));
                }}
                className="gap-2 rounded-2xl border-amber-500/30 hover:bg-amber-500/5 text-amber-600 dark:text-amber-400 text-xs font-bold"
              >
                <Zap className="h-4 w-4" />
                Start Team Buzzers
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pt-3 pr-1">
            {/* Class Stats Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Comprehension Rate
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    {overallAccuracy}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> Real Data
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Quizzes & Polls
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    {filteredRecords.length}
                  </span>
                  <span className="text-xs text-muted-foreground">conducted</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Student Responses
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-foreground">
                    {totalStudentsAttempted}
                  </span>
                  <span className="text-xs text-muted-foreground">total</span>
                </div>
              </div>
            </div>

            {/* Topics Needing Revision (< 60%) */}
            {revisionTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Topics Requiring Revision (&lt; 60% Class Accuracy)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {revisionTopics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                            Struggling
                          </span>
                          <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                            {topic.accuracy}% accuracy
                          </span>
                        </div>
                        <h5 className="font-bold text-foreground text-sm mt-1.5 line-clamp-2">
                          {topic.topic}
                        </h5>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Based on {topic.questionsAttempted} student responses
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleGenerateRevisionQuiz(topic)}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Put Revision Quiz on Board
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mastered Topics (>= 80%) */}
            {masteredTopics.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Strong Mastery Topics (&gt; 80% Accuracy)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {masteredTopics.map((topic, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between"
                    >
                      <div>
                        <h5 className="font-bold text-foreground text-xs line-clamp-1">
                          {topic.topic}
                        </h5>
                        <span className="text-[10px] text-muted-foreground">
                          {topic.questionsAttempted} student answers
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {topic.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
