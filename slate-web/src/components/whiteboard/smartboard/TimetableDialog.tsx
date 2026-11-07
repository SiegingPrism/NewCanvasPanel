import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Clock,
  Play,
  Plus,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";

export interface PeriodSlot {
  id: string;
  periodNum: number;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:45"
  className: string; // e.g. "Class 9A"
  subject: string;   // e.g. "Mathematics"
  room?: string;
  recommendedPaper?: "blank" | "grid" | "lined" | "four-line";
}

export interface DaySchedule {
  day: string; // "Monday", etc.
  periods: PeriodSlot[];
}

const DEFAULT_TIMETABLE: DaySchedule[] = [
  {
    day: "Monday",
    periods: [
      { id: "p1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10A", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "p2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 9B", subject: "Science (Physics)", recommendedPaper: "blank" },
      { id: "p3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 8A", subject: "Hindi Vyakaran", recommendedPaper: "lined" },
      { id: "p4", periodNum: 4, startTime: "11:15", endTime: "12:00", className: "Class 10B", subject: "Social Science", recommendedPaper: "blank" },
      { id: "p5", periodNum: 5, startTime: "12:45", endTime: "01:30", className: "Class 9A", subject: "English Literature", recommendedPaper: "lined" },
      { id: "p6", periodNum: 6, startTime: "01:30", endTime: "02:15", className: "Class 11A", subject: "Chemistry Lab", recommendedPaper: "blank" },
    ],
  },
  {
    day: "Tuesday",
    periods: [
      { id: "t1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9A", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "t2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 10A", subject: "Science (Biology)", recommendedPaper: "blank" },
      { id: "t3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 8B", subject: "English Writing", recommendedPaper: "lined" },
      { id: "t4", periodNum: 4, startTime: "11:15", endTime: "12:00", className: "Class 9B", subject: "Geography & Maps", recommendedPaper: "blank" },
      { id: "t5", periodNum: 5, startTime: "12:45", endTime: "01:30", className: "Class 10B", subject: "Mathematics", recommendedPaper: "grid" },
    ],
  },
  {
    day: "Wednesday",
    periods: [
      { id: "w1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10B", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "w2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 9A", subject: "Science (Chemistry)", recommendedPaper: "blank" },
      { id: "w3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 8A", subject: "Marathi", recommendedPaper: "lined" },
      { id: "w4", periodNum: 4, startTime: "11:15", endTime: "12:00", className: "Class 10A", subject: "Physics", recommendedPaper: "blank" },
    ],
  },
  {
    day: "Thursday",
    periods: [
      { id: "th1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9B", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "th2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 10B", subject: "Science Lab", recommendedPaper: "blank" },
      { id: "th3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 9A", subject: "History", recommendedPaper: "lined" },
    ],
  },
  {
    day: "Friday",
    periods: [
      { id: "f1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10A", subject: "Mathematics Revision", recommendedPaper: "grid" },
      { id: "f2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 9A", subject: "Weekly Quiz & Polls", recommendedPaper: "blank" },
      { id: "f3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 8B", subject: "Science", recommendedPaper: "blank" },
    ],
  },
  {
    day: "Saturday",
    periods: [
      { id: "s1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9A & 9B", subject: "House Quiz Competition", recommendedPaper: "blank" },
      { id: "s2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 10A", subject: "Exam Prep & Doubts", recommendedPaper: "grid" },
    ],
  },
];

export interface TimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimetableDialog({ open, onOpenChange }: TimetableDialogProps) {
  const { addPage } = useWhiteboard();
  const [timetable, setTimetable] = useState<DaySchedule[]>(() => {
    try {
      const saved = localStorage.getItem("slate_school_timetable");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TIMETABLE;
  });

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = daysOfWeek[new Date().getDay()] || "Monday";
  const [selectedDay, setSelectedDay] = useState<string>(
    timetable.some((d) => d.day === todayName) ? todayName : "Monday"
  );

  const [activeSlot, setActiveSlot] = useState<PeriodSlot | null>(null);

  // Detect current period based on clock time
  useEffect(() => {
    const now = new Date();
    const curMinutes = now.getHours() * 60 + now.getMinutes();

    const currentDaySchedule = timetable.find((d) => d.day === todayName);
    if (!currentDaySchedule) return;

    for (const p of currentDaySchedule.periods) {
      const [sh, sm] = p.startTime.split(":").map(Number);
      const [eh, em] = p.endTime.split(":").map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;

      if (curMinutes >= startMin && curMinutes <= endMin) {
        setActiveSlot(p);
        return;
      }
    }

    // Default to first period of selected day if outside school hours
    if (currentDaySchedule.periods.length > 0) {
      setActiveSlot(currentDaySchedule.periods[0]);
    }
  }, [timetable, todayName]);

  const handleStartLesson = (slot: PeriodSlot) => {
    // 1. Add page with recommended subject background
    const bg = slot.recommendedPaper === "blank" ? "white" : (slot.recommendedPaper || "white");
    addPage(bg as any);

    toast.success(`Started lesson for ${slot.className} - ${slot.subject}!`, {
      description: `Period ${slot.periodNum} (${slot.startTime} - ${slot.endTime})`,
    });
    onOpenChange(false);
  };

  const handleResetDefaults = () => {
    setTimetable(DEFAULT_TIMETABLE);
    try {
      localStorage.setItem("slate_school_timetable", JSON.stringify(DEFAULT_TIMETABLE));
    } catch {}
    toast("Reset timetable to standard school schedule");
  };

  const currentDayData = timetable.find((d) => d.day === selectedDay) || timetable[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                Classroom Timetable Mode (वेळापत्रक)
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-tap period launch: automatic class detection, subject paper, and lesson setup.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset Default Schedule
          </Button>
        </DialogHeader>

        {/* Day Selector Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 border-b">
          {timetable.map((d) => (
            <Button
              key={d.day}
              size="sm"
              variant={selectedDay === d.day ? "default" : "secondary"}
              onClick={() => setSelectedDay(d.day)}
              className={`rounded-xl text-xs font-bold shrink-0 h-9 px-3.5 ${
                selectedDay === d.day
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : ""
              }`}
            >
              {d.day}
              {d.day === todayName && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                  Today
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Periods List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentDayData?.periods.map((slot) => {
              const isCurrent = activeSlot?.id === slot.id && selectedDay === todayName;

              return (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isCurrent
                      ? "bg-amber-500/10 border-amber-500/40 shadow-md ring-2 ring-amber-500/30"
                      : "bg-card hover:bg-muted/30 border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-100">
                          Period {slot.periodNum}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 flex items-center gap-1 animate-pulse">
                            ● Now Active
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-foreground truncate">
                        {slot.className} · {slot.subject}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Recommended Paper:{" "}
                        <span className="font-semibold text-foreground capitalize">
                          {slot.recommendedPaper || "blank"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartLesson(slot)}
                    className={`w-full h-11 rounded-xl font-bold gap-2 text-xs transition-all active:scale-98 ${
                      isCurrent
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                  >
                    <Play className="h-4 w-4" />
                    Start Lesson for Period {slot.periodNum}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
