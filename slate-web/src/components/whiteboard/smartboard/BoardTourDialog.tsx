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
    title: "Dual Mirrored Side Docks",
    desc: "Vertical mid-height toolbars on both left and right edges. Reach all tools instantly from wherever you are standing without walking across a 2-meter screen.",
    icon: <Tv className="h-8 w-8 text-sky-500" />,
    badge: "Ergonomics",
  },
  {
    title: "Natural Palm Rejection & Fist Erase",
    desc: "Rest your wrist on the glass naturally while writing. Need to erase? Wipe with your palm or fist—the board automatically switches to eraser without opening menus.",
    icon: <Hand className="h-8 w-8 text-rose-500" />,
    badge: "Hardware Touch",
  },
  {
    title: "Floating Radial Menu",
    desc: "Long-press anywhere on the canvas to open a circular tool wheel right under your fingers: switch pen colors, erase, or undo right where your hand is.",
    icon: <Sparkles className="h-8 w-8 text-amber-500" />,
    badge: "In-Place Control",
  },
  {
    title: "Reachability Pull-Down",
    desc: "Tall 75\", 86\", 98\", or 110\" panels can be over 1.2 meters tall. Tap 'Lower' to slide the canvas down into comfortable reach for shorter teachers and students.",
    icon: <Maximize2 className="h-8 w-8 text-indigo-500" />,
    badge: "Reachability",
  },
  {
    title: "Split Board & Classroom Lock",
    desc: "Split the board into 2 to 4 side-by-side student zones. Tap 'Lock' to freeze camera pan and pinch-zoom so kids never accidentally move the board.",
    icon: <Columns className="h-8 w-8 text-emerald-500" />,
    badge: "Classroom Basics",
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
                idx === currentStep ? "w-6 bg-primary" : "w-2 bg-muted"
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

