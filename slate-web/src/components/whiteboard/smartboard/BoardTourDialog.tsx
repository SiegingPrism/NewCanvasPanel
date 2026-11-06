import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles,
  Hand,
  Columns,
  Maximize2,
  Tv,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BoardTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOUR_STEPS = [
  {
    title: "Tools on both sides",
    desc: "The same tools sit on the left and right edges of the board. Use whichever side you are standing at. Tap a tool twice to change its colour or size.",
    icon: <Tv className="h-8 w-8 text-sky-500" />,
    badge: "Step 1",
  },
  {
    title: "Write and wipe like a real board",
    desc: "You can rest your hand on the glass while writing. To erase, wipe with your palm or fist. No need to pick the eraser first.",
    icon: <Hand className="h-8 w-8 text-rose-500" />,
    badge: "Step 2",
  },
  {
    title: "Press and hold for quick tools",
    desc: "Hold your finger still on the board for a moment. A circle of tools opens under your hand: pen, highlight, eraser, select and undo.",
    icon: <Sparkles className="h-8 w-8 text-amber-500" />,
    badge: "Step 3",
  },
  {
    title: "Can't reach the top?",
    desc: "Tap Lower on either side. The board slides down so you and your students can reach the top. Tap Reset to put it back.",
    icon: <Maximize2 className="h-8 w-8 text-indigo-500" />,
    badge: "Step 4",
  },
  {
    title: "Students at the board",
    desc: "Several students can write at the same time. Split the board into 2 to 4 areas from the board button at the bottom left. Lock stops the board from moving or zooming by accident.",
    icon: <Columns className="h-8 w-8 text-emerald-500" />,
    badge: "Step 5",
  },
];

export function BoardTourDialog({ open, onOpenChange }: BoardTourDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onOpenChange(false);
      try {
        localStorage.setItem("slate_smartboard_tour_done", "true");
      } catch {}
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-card p-6 shadow-2xl border border-border text-center">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              Step {currentStep + 1} of {TOUR_STEPS.length} · {step.badge}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Skip Tour
            </button>
          </div>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/40 shadow-inner border border-border mb-4">
            {step.icon}
          </div>
          <DialogTitle className="text-2xl font-black text-foreground mb-2">
            {step.title}
          </DialogTitle>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed px-4">
            {step.desc}
          </p>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex justify-center gap-1.5 pb-2">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                idx === currentStep ? "w-6 bg-primary" : "w-2 bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95 transition-all"
          >
            <span>{isLast ? "Ready to Teach" : "Next Tip"}</span>
            {isLast ? <CheckCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
