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
  Check,
  Sparkles,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";
import {
  getTimetable,
  saveTimetable,
  EMPTY_TIMETABLE,
  SAMPLE_DEMO_TIMETABLE,
  getCurrentActivePeriod,
  type DaySchedule,
  type PeriodSlot,
} from "@/lib/whiteboard/timetableStore";

export interface TimetableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimetableDialog({ open, onOpenChange }: TimetableDialogProps) {
  const { addPage } = useWhiteboard();
  const [timetable, setTimetable] = useState<DaySchedule[]>(getTimetable);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = dayNames[now.getDay()] || "Monday";

  const [selectedDay, setSelectedDay] = useState<string>(
    daysOfWeek.includes(todayName) ? todayName : "Monday"
  );

  const [isAddingSlot, setIsAddingSlot] = useState(false);
  const [newClass, setNewClass] = useState("Class 9A");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("09:45");
  const [newPaper, setNewPaper] = useState<"blank" | "grid" | "lined">("grid");

  // Sync state on open
  useEffect(() => {
    if (open) {
      setTimetable(getTimetable());
    }
  }, [open]);

  const currentDayData = timetable.find((d) => d.day === selectedDay) || {
    day: selectedDay,
    periods: [],
  };

  const activePeriodInfo = getCurrentActivePeriod(timetable);
  const isPeriodActive = (slot: PeriodSlot) =>
    activePeriodInfo?.day === selectedDay && activePeriodInfo?.slot.id === slot.id;

  const handleStartLesson = (slot: PeriodSlot) => {
    const bg = slot.recommendedPaper === "blank" ? "white" : (slot.recommendedPaper || "white");
    addPage(bg as any);

    toast.success(`Started lesson for ${slot.className} - ${slot.subject}!`, {
      description: `Period ${slot.periodNum} (${slot.startTime} - ${slot.endTime})`,
    });
    onOpenChange(false);
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.trim() || !newSubject.trim()) return;

    const nextPeriodNum = (currentDayData.periods.length || 0) + 1;
    const newSlot: PeriodSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      periodNum: nextPeriodNum,
      className: newClass.trim(),
      subject: newSubject.trim(),
      startTime: newStart,
      endTime: newEnd,
      recommendedPaper: newPaper,
    };

    const updated = timetable.map((d) =>
      d.day === selectedDay ? { ...d, periods: [...d.periods, newSlot] } : d
    );

    setTimetable(updated);
    saveTimetable(updated);
    setIsAddingSlot(false);
    toast.success(`Added Period ${nextPeriodNum} to ${selectedDay}!`);
  };

  const handleDeleteSlot = (slotId: string) => {
    const updated = timetable.map((d) =>
      d.day === selectedDay
        ? {
            ...d,
            periods: d.periods
              .filter((p) => p.id !== slotId)
              .map((p, idx) => ({ ...p, periodNum: idx + 1 })),
          }
        : d
    );
    setTimetable(updated);
    saveTimetable(updated);
    toast("Period removed");
  };

  const handleLoadDemo = () => {
    setTimetable(SAMPLE_DEMO_TIMETABLE);
    saveTimetable(SAMPLE_DEMO_TIMETABLE);
    toast.success("Loaded sample CBSE school schedule");
  };

  const handleClearAll = () => {
    setTimetable(EMPTY_TIMETABLE);
    saveTimetable(EMPTY_TIMETABLE);
    toast.info("Timetable cleared");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <CalendarDays className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground">
                Classroom Timetable Mode
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatic period detection: prompts lesson launch with recommended paper when period begins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border"
              title="Load demo schedule"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Load Demo</span>
            </button>
            <button
              onClick={handleClearAll}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border"
              title="Clear all periods"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </DialogHeader>

        {/* Days of Week Selector */}
        <div className="flex items-center gap-1.5 py-3 border-b overflow-x-auto select-none">
          {daysOfWeek.map((day) => {
            const isToday = day === todayName;
            const isSel = day === selectedDay;
            const count = (timetable.find((d) => d.day === day)?.periods || []).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isSel
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{day}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isSel ? "bg-white/20 text-white" : "bg-muted text-foreground"
                  }`}>
                    {count}
                  </span>
                )}
                {isToday && (
                  <span className={`text-[9px] uppercase px-1 rounded-sm font-extrabold ${
                    isSel ? "bg-white text-amber-700" : "bg-amber-500/20 text-amber-600"
                  }`}>
                    Today
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Periods List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {currentDayData.periods.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center text-amber-600">
                <Clock className="h-7 w-7" />
              </div>
              <div className="max-w-xs space-y-1">
                <h4 className="font-bold text-foreground text-sm">No periods for {selectedDay}</h4>
                <p className="text-xs text-muted-foreground">
                  Tap below to add a class period, or click "Load Demo" above to start with a sample CBSE timetable.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddingSlot(true)}
                className="gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
              >
                <Plus className="h-4 w-4" />
                Add First Period
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentDayData.periods.map((slot) => {
                const active = isPeriodActive(slot);
                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      active
                        ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/30"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-muted text-foreground">
                          Period {slot.periodNum}
                        </span>
                        {active && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            Now Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="ml-2 text-muted-foreground hover:text-rose-500 p-1"
                          title="Delete Period"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 my-2">
                      <h4 className="text-base font-extrabold text-foreground">
                        {slot.className} · {slot.subject}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Recommended Paper: <strong className="capitalize text-foreground">{slot.recommendedPaper || "Blank"}</strong></span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleStartLesson(slot)}
                      className={`w-full mt-2 rounded-xl text-xs font-bold gap-2 ${
                        active
                          ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                          : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                      }`}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Lesson for Period {slot.periodNum}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Period Slot Form */}
          {isAddingSlot ? (
            <form onSubmit={handleAddSlot} className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <h5 className="font-bold text-xs uppercase text-amber-600 dark:text-amber-400">
                Add Period to {selectedDay}
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">Class</label>
                  <Input
                    value={newClass}
                    onChange={(e) => setNewClass(e.target.value)}
                    placeholder="e.g. Class 9A"
                    className="h-8 text-xs rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">Subject</label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Science"
                    className="h-8 text-xs rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">Start Time</label>
                  <Input
                    type="time"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="h-8 text-xs rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground">End Time</label>
                  <Input
                    type="time"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="h-8 text-xs rounded-lg font-mono"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">Paper:</span>
                  {(["blank", "grid", "lined"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewPaper(p)}
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold capitalize ${
                        newPaper === p ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingSlot(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Save Period
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            currentDayData.periods.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingSlot(true)}
                className="w-full rounded-xl border-dashed border-border text-muted-foreground hover:text-foreground text-xs font-bold gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Add Another Period to {selectedDay}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
