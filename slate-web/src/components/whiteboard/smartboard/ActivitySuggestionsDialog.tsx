import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Lightbulb, Plus, Check, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import { AIEngine } from "@/lib/ai/aiEngine";
import type { CanvasObject, StickyNoteObject } from "@/lib/whiteboard/types";

interface ActivitySuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SuggestedActivity = {
  id: string;
  title: string;
  category: "Debate & Discussion" | "Problem Solving" | "Starter Template";
  description: string;
  objectsToInsert: CanvasObject[];
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function textObj(x: number, y: number, text: string, fontSize = 24, color = "#0f172a", w = 600, h = 50): CanvasObject {
  return {
    id: uid(),
    kind: "text",
    x,
    y,
    w,
    h,
    text,
    fontSize,
    color,
  };
}

export function ActivitySuggestionsDialog({ open, onOpenChange }: ActivitySuggestionsDialogProps) {
  const { pages, activePageId, setPages } = useWhiteboard();
  const page = pages.find((p) => p.id === activePageId);

  const [isLoading, setIsLoading] = useState(false);

  // Extract board text to generate tailored activities
  const boardText = (page?.objects || [])
    .map((o) => (o as any).text || (o as any).inkText || (o as any).latex || "")
    .filter(Boolean)
    .join(" ")
    .trim();

  const [activities] = useState<SuggestedActivity[]>([
    {
      id: "act-1",
      title: "Step-by-Step Problem Solving Breakdown",
      category: "Problem Solving",
      description: "Structured 3-column workspace: Given Facts, Derivation / Formula, and Final Answer with Units.",
      objectsToInsert: [
        textObj(100, 60, "🎯 Collaborative Problem-Solving Challenge", 24, "#0f172a"),
        {
          id: uid(),
          kind: "sticky",
          x: 100,
          y: 120,
          w: 240,
          h: 220,
          text: "1. GIVEN & DATA:\n• List known variables\n• State units & conditions\n• Identify target unknown",
          color: "#bae6fd",
        },
        {
          id: uid(),
          kind: "sticky",
          x: 380,
          y: 120,
          w: 240,
          h: 220,
          text: "2. FORMULA & WORKING:\n• Apply core theorem/equation\n• Show intermediate algebra\n• Check signs and constants",
          color: "#fef08a",
        },
        {
          id: uid(),
          kind: "sticky",
          x: 660,
          y: 120,
          w: 240,
          h: 220,
          text: "3. CONCLUSION & UNITS:\n• Final calculated result\n• Physical interpretation\n• Sanity check / estimation",
          color: "#bbf7d0",
        },
      ],
    },
    {
      id: "act-2",
      title: "Concept Check: Myth vs Fact Debate",
      category: "Debate & Discussion",
      description: "Identify common student misconceptions on this topic and contrast them with verified scientific principles.",
      objectsToInsert: [
        textObj(100, 60, "⚖️ Classroom Concept Check: Misconception vs Reality", 24, "#0f172a"),
        {
          id: uid(),
          kind: "sticky",
          x: 140,
          y: 130,
          w: 320,
          h: 240,
          text: "❌ Common Misconceptions:\n• What do students often confuse?\n• What false assumptions are made?\n• Where do sign errors happen?",
          color: "#fee2e2",
        },
        {
          id: uid(),
          kind: "sticky",
          x: 520,
          y: 130,
          w: 320,
          h: 240,
          text: "✅ Verified Scientific Truth:\n• The actual rule or law\n• Real-world analogy\n• Verification test",
          color: "#dcfce7",
        },
      ],
    },
    {
      id: "act-3",
      title: "Interactive 2x2 Matrix Template",
      category: "Starter Template",
      description: "Classify concepts by Difficulty (Easy vs Challenging) and Importance (Core Exam vs Advanced).",
      objectsToInsert: [
        textObj(100, 50, "📊 Concept Priority Matrix (2x2 Matrix)", 24, "#0f172a"),
        {
          id: uid(),
          kind: "shape",
          shape: "rect",
          x: 120,
          y: 110,
          w: 720,
          h: 460,
          color: "#94a3b8",
          size: 2,
        },
        {
          id: uid(),
          kind: "sticky",
          x: 150,
          y: 140,
          w: 220,
          h: 180,
          text: "High Priority & Foundational\n(Master immediately)",
          color: "#fef08a",
        },
        {
          id: uid(),
          kind: "sticky",
          x: 480,
          y: 140,
          w: 220,
          h: 180,
          text: "High Priority & Complex\n(Requires step-by-step practice)",
          color: "#fed7aa",
        },
      ],
    },
  ]);

  const handleInsertActivity = (act: SuggestedActivity) => {
    if (!page) return;
    setPages(
      pages.map((p) =>
        p.id === activePageId
          ? { ...p, objects: [...p.objects, ...act.objectsToInsert] }
          : p,
      ),
    );
    toast.success(`Inserted "${act.title}" onto current board!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 bg-card border shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Lightbulb className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Activity Suggestions from Board Content
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI analyzes your lesson drawings and notes to generate interactive student exercises.
              </p>
            </div>
          </div>
        </DialogHeader>

        {boardText && (
          <div className="p-2.5 rounded-xl bg-muted/40 border text-xs text-muted-foreground truncate">
            <span className="font-semibold text-foreground">Analyzing Context: </span>
            <span>"{boardText.slice(0, 90)}..."</span>
          </div>
        )}

        <div className="space-y-3 my-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-2xl border bg-card hover:border-primary/50 transition-all flex flex-col gap-2 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-sky-500" />
                  {act.title}
                </h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600">
                  {act.category}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {act.description}
              </p>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={() => handleInsertActivity(act)}
                  className="gap-1.5 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Insert onto Board
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
