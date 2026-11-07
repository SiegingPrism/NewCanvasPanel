import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, Monitor, Clock, Send, KeyRound, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SchoolAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BoardDevice = {
  id: string;
  room: string;
  model: string;
  status: "active" | "idle" | "standby";
  currentTeacher: string;
  lastPing: string;
};

export function SchoolAdminDialog({ open, onOpenChange }: SchoolAdminDialogProps) {
  const [eodClearEnabled, setEodClearEnabled] = useState(true);
  const [eodClearTime, setEodClearTime] = useState("17:00");
  const [isPushingPacks, setIsPushingPacks] = useState(false);

  const [devices] = useState<BoardDevice[]>([
    { id: "BRD-01", room: "Room 101 (Class 6A)", model: "BenQ RP7502 75″", status: "active", currentTeacher: "Sunita Roy", lastPing: "Just now" },
    { id: "BRD-02", room: "Room 104 (Class 8B)", model: "SMART Board 6000S", status: "active", currentTeacher: "Vikram Kulkarni", lastPing: "1m ago" },
    { id: "BRD-03", room: "Physics Lab 2", model: "ViewSonic IFP7550", status: "idle", currentTeacher: "Anil Deshmukh", lastPing: "3m ago" },
    { id: "BRD-04", room: "Math Lab (Room 202)", model: "Promethean ActivPanel", status: "active", currentTeacher: "Pooja Sharma", lastPing: "Just now" },
    { id: "BRD-05", room: "Junior Science Lab", model: "Newline Lyra 65″", status: "standby", currentTeacher: "None", lastPing: "15m ago" },
  ]);

  const handlePushLessonPacks = () => {
    setIsPushingPacks(true);
    setTimeout(() => {
      setIsPushingPacks(false);
      toast.success("CBSE & State Board Lesson Packs pushed to all 5 school boards!");
    }, 1200);
  };

  const handleSaveEodSchedule = () => {
    localStorage.setItem("slate_school_admin_eod_clear_enabled", eodClearEnabled ? "true" : "false");
    localStorage.setItem("slate_school_admin_eod_clear_time", eodClearTime);
    toast.success(`Automatic End-of-Day clear scheduled for ${eodClearTime} daily.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-6 bg-card border shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-foreground">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <span>School Board Fleet Admin</span>
            </DialogTitle>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
              5 Boards Connected
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage interactive whiteboards across classrooms, deploy curriculum packs, and configure privacy rules.
          </p>
        </DialogHeader>

        <div className="space-y-4 my-2 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Central Actions Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl border bg-muted/30 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-indigo-500" />
                  Fleet-wide Lesson Pack Push
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Deploy offline NCERT maps, science diagrams, and Devanagari templates to all boards.
                </p>
              </div>
              <Button
                onClick={handlePushLessonPacks}
                disabled={isPushingPacks}
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {isPushingPacks ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Push Packs to All 5 Boards</span>
              </Button>
            </div>

            <div className="p-4 rounded-2xl border bg-muted/30 flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Automatic End-of-Day Clear
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Signs out teachers and wipes local temp boards at daily closing time to protect privacy.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={eodClearTime}
                  onChange={(e) => setEodClearTime(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border bg-background text-xs font-mono"
                />
                <Button
                  onClick={handleSaveEodSchedule}
                  size="sm"
                  variant="outline"
                  className="text-xs font-semibold rounded-xl flex-1"
                >
                  <Check className="h-3.5 w-3.5" /> Save Time
                </Button>
              </div>
            </div>
          </div>

          {/* Connected Classroom Displays */}
          <div>
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5 text-indigo-500" />
              <span>Smart Boards Fleet Status</span>
            </h4>
            <div className="space-y-2">
              {devices.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-2xl border bg-card flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        d.status === "active"
                          ? "bg-emerald-500 animate-pulse"
                          : d.status === "idle"
                            ? "bg-amber-500"
                            : "bg-slate-400",
                      )}
                    />
                    <div>
                      <div className="font-bold text-foreground">{d.room}</div>
                      <div className="text-[11px] text-muted-foreground">{d.model} • ID: {d.id}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-foreground">Teacher: {d.currentTeacher}</div>
                    <div className="text-[10px] text-muted-foreground">Heartbeat: {d.lastPing}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

