import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { CanvasObject } from "@/lib/whiteboard/types";

export interface TopicInsight {
  topic: string;
  subject: string;
  accuracy: number; // 0 - 100
  questionsAttempted: number;
  status: "mastered" | "needs_revision" | "in_progress";
}

export interface ClassInsightData {
  className: string;
  overallAccuracy: number;
  quizzesCompleted: number;
  participationRate: number;
  topics: TopicInsight[];
}

const DEFAULT_INSIGHTS: Record<string, ClassInsightData> = {
  "Class 9A": {
    className: "Class 9A",
    overallAccuracy: 76,
    quizzesCompleted: 12,
    participationRate: 94,
    topics: [
      { topic: "Coordinate Geometry", subject: "Math", accuracy: 88, questionsAttempted: 48, status: "mastered" },
      { topic: "Laws of Motion", subject: "Physics", accuracy: 82, questionsAttempted: 52, status: "mastered" },
      { topic: "Electric Current & Ohm's Law", subject: "Physics", accuracy: 44, questionsAttempted: 40, status: "needs_revision" },
      { topic: "Polynomial Factorization", subject: "Math", accuracy: 56, questionsAttempted: 45, status: "needs_revision" },
      { topic: "Matter in Our Surroundings", subject: "Chemistry", accuracy: 78, questionsAttempted: 36, status: "in_progress" },
    ],
  },
  "Class 10B": {
    className: "Class 10B",
    overallAccuracy: 81,
    quizzesCompleted: 16,
    participationRate: 96,
    topics: [
      { topic: "Quadratic Equations", subject: "Math", accuracy: 92, questionsAttempted: 60, status: "mastered" },
      { topic: "Chemical Reactions", subject: "Chemistry", accuracy: 86, questionsAttempted: 55, status: "mastered" },
      { topic: "Trigonometric Identities", subject: "Math", accuracy: 51, questionsAttempted: 48, status: "needs_revision" },
      { topic: "Refraction & Lenses", subject: "Physics", accuracy: 58, questionsAttempted: 42, status: "needs_revision" },
    ],
  },
};

export interface ClassInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassInsightsDialog({ open, onOpenChange }: ClassInsightsDialogProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [selectedClass, setSelectedClass] = useState<string>("Class 9A");

  const classData = DEFAULT_INSIGHTS[selectedClass] || DEFAULT_INSIGHTS["Class 9A"];
  const revisionTopics = classData.topics.filter((t) => t.status === "needs_revision");
  const masteredTopics = classData.topics.filter((t) => t.status === "mastered");

  const handleGenerateRevisionQuiz = (topic: TopicInsight) => {
    const cx = (window.innerWidth / 2 - camera.x) / camera.zoom;
    const cy = (window.innerHeight / 2 - camera.y) / camera.zoom;

    // Insert Revision Quiz Card
    const quizCard: CanvasObject = {
      id: `rev_quiz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: "quiz",
      x: cx - 220,
      y: cy - 160,
      w: 440,
      h: 320,
      question: `Revision Quick Check: ${topic.topic}`,
      options: [
        `Directly proportional (V = IR)`,
        `Inversely proportional`,
        `Exponential dependency`,
        `Independent of resistance`,
      ],
      answerIndex: 0,
      color: "#f59e0b",
    };

    addObject(quizCard);
    pushHistory();
    toast.success(`Generated 3-question revision quiz for "${topic.topic}" on whiteboard!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                Class Insights & Topic Analytics
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quiz and poll performance over time: identify struggling topics for targeted revision.
              </p>
            </div>
          </div>

          {/* Class Selector Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border">
            {Object.keys(DEFAULT_INSIGHTS).map((cls) => (
              <Button
                key={cls}
                size="sm"
                variant={selectedClass === cls ? "default" : "ghost"}
                onClick={() => setSelectedClass(cls)}
                className={`rounded-xl text-xs font-bold h-8 px-3 ${
                  selectedClass === cls ? "bg-indigo-600 text-white" : ""
                }`}
              >
                {cls}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Comprehension Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {classData.overallAccuracy}%
                </span>
                <span className="text-xs font-semibold text-emerald-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +4% this week
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Quizzes & Polls
              </span>
              <div className="text-3xl font-black font-mono text-foreground">
                {classData.quizzesCompleted}
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-card/60 space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Student Participation
              </span>
              <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {classData.participationRate}%
              </div>
            </div>
          </div>

          {/* Topics Requiring Revision (Actionable) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Topics Requiring Revision (&lt; 60% Class Accuracy)
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {revisionTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        {topic.subject}
                      </span>
                      <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                        {topic.accuracy}% accuracy
                      </span>
                    </div>

                    <h5 className="text-sm font-extrabold text-foreground">{topic.topic}</h5>
                    <p className="text-xs text-muted-foreground">
                      Based on {topic.questionsAttempted} student responses
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleGenerateRevisionQuiz(topic)}
                    className="w-full h-9 rounded-xl font-bold text-xs gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Put Revision Quiz on Board
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Topics Mastered */}
          <div className="space-y-2.5 pt-2 border-t">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Strong Mastery Topics (&gt; 80% Accuracy)
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {masteredTopics.map((topic) => (
                <div
                  key={topic.topic}
                  className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      {topic.subject}
                    </span>
                    <h5 className="text-xs font-bold text-foreground">{topic.topic}</h5>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {topic.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
