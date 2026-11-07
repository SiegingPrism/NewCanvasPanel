import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Minus,
  RotateCcw,
  Share2,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { shareNotesToWhatsApp } from "@/lib/whiteboard/whatsAppShare";

export interface StudentAttendance {
  rollNo: number;
  name: string;
  status: "present" | "absent" | "late";
}

export interface HouseData {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  points: number;
}

const DEFAULT_HOUSES: HouseData[] = [
  { id: "shivaji", name: "Shivaji House (Red)", color: "#ef4444", badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30", points: 85 },
  { id: "tagore", name: "Tagore House (Blue)", color: "#3b82f6", badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", points: 90 },
  { id: "ashoka", name: "Ashoka House (Green)", color: "#10b981", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", points: 75 },
  { id: "raman", name: "Raman House (Yellow)", color: "#f59e0b", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", points: 95 },
];

export interface AttendanceHousePointsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceHousePointsDialog({ open, onOpenChange }: AttendanceHousePointsDialogProps) {
  const [activeTab, setActiveTab] = useState<"attendance" | "houses">("attendance");

  // --- Attendance State ---
  const [students, setStudents] = useState<StudentAttendance[]>(() => {
    try {
      const saved = localStorage.getItem("slate_attendance_today");
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default 36 students
    return Array.from({ length: 36 }, (_, i) => ({
      rollNo: i + 1,
      name: `Roll ${i + 1}`,
      status: "present" as const,
    }));
  });

  // --- House Points State ---
  const [houses, setHouses] = useState<HouseData[]>(() => {
    try {
      const saved = localStorage.getItem("slate_house_points");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_HOUSES;
  });

  const saveAttendance = (newStudents: StudentAttendance[]) => {
    setStudents(newStudents);
    try {
      localStorage.setItem("slate_attendance_today", JSON.stringify(newStudents));
    } catch {}
  };

  const saveHouses = (newHouses: HouseData[]) => {
    setHouses(newHouses);
    try {
      localStorage.setItem("slate_house_points", JSON.stringify(newHouses));
    } catch {}
  };

  const toggleStudentStatus = (rollNo: number) => {
    const updated = students.map((s) => {
      if (s.rollNo !== rollNo) return s;
      const nextStatus: "present" | "absent" | "late" =
        s.status === "present" ? "absent" : s.status === "absent" ? "late" : "present";
      return { ...s, status: nextStatus };
    });
    saveAttendance(updated);
  };

  const markAll = (status: "present" | "absent") => {
    const updated = students.map((s) => ({ ...s, status }));
    saveAttendance(updated);
    toast.success(`Marked all ${students.length} students as ${status}`);
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const attendancePct = Math.round((presentCount / students.length) * 100);

  const handleShareAttendanceWhatsApp = () => {
    const summary = `Attendance Report: ${presentCount}/${students.length} Present (${attendancePct}%), ${absentCount} Absent, ${lateCount} Late.`;
    shareNotesToWhatsApp({
      boardTitle: "Daily Classroom Attendance",
      summary,
    });
  };

  const adjustHousePoints = (houseId: string, delta: number) => {
    const updated = houses.map((h) => {
      if (h.id !== houseId) return h;
      return { ...h, points: Math.max(0, h.points + delta) };
    });
    saveHouses(updated);

    const house = houses.find((h) => h.id === houseId);
    toast.success(`${delta > 0 ? "+" : ""}${delta} Points for ${house?.name}!`);
  };

  const sortedHouses = [...houses].sort((a, b) => b.points - a.points);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {activeTab === "attendance" ? <Users className="h-6 w-6" /> : <Trophy className="h-6 w-6 text-amber-500" />}
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                {activeTab === "attendance" ? "Quick Attendance Roster" : "Classroom House Points"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeTab === "attendance"
                  ? "Single-tap roll call: Green (Present), Red (Absent), Yellow (Late)."
                  : "Award house and team points for classroom engagement and activities."}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border">
            <Button
              size="sm"
              variant={activeTab === "attendance" ? "default" : "ghost"}
              onClick={() => setActiveTab("attendance")}
              className={`rounded-xl text-xs font-bold h-8 px-3 ${
                activeTab === "attendance" ? "bg-indigo-600 text-white" : ""
              }`}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Attendance
            </Button>
            <Button
              size="sm"
              variant={activeTab === "houses" ? "default" : "ghost"}
              onClick={() => setActiveTab("houses")}
              className={`rounded-xl text-xs font-bold h-8 px-3 ${
                activeTab === "houses" ? "bg-amber-600 text-white" : ""
              }`}
            >
              <Trophy className="h-3.5 w-3.5 mr-1" />
              House Points
            </Button>
          </div>
        </DialogHeader>

        {/* Tab 1: Attendance Roster */}
        {activeTab === "attendance" ? (
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {/* Stats Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{presentCount} Present</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <XCircle className="h-4 w-4" />
                  <span>{absentCount} Absent</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>{lateCount} Late</span>
                </div>
                <span className="text-xs font-mono font-extrabold text-foreground bg-card px-2.5 py-1 rounded-lg border">
                  {attendancePct}% Overall
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAll("present")}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  All Present
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleShareAttendanceWhatsApp}
                  className="h-8 text-xs font-bold gap-1 bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20 border-emerald-500/30 rounded-xl"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Send WhatsApp
                </Button>
              </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
              {students.map((s) => {
                const isP = s.status === "present";
                const isA = s.status === "absent";
                const isL = s.status === "late";

                return (
                  <button
                    key={s.rollNo}
                    type="button"
                    onClick={() => toggleStudentStatus(s.rollNo)}
                    className={`aspect-square rounded-2xl border flex flex-col items-center justify-center p-1 transition-all active:scale-95 ${
                      isP
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-extrabold shadow-sm"
                        : isA
                        ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400 font-extrabold shadow-sm"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400 font-extrabold shadow-sm"
                    }`}
                  >
                    <span className="text-sm">{s.rollNo}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tight">
                      {isP ? "P" : isA ? "A" : "L"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Tap any roll number to cycle between Present (P), Absent (A), and Late (L).
            </p>
          </div>
        ) : (
          /* Tab 2: House Points */
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {sortedHouses.map((house, idx) => (
                <div
                  key={house.id}
                  className="p-4 rounded-3xl border bg-card/60 shadow-sm flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${house.badgeBg}`}>
                        #{idx + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-foreground">
                        {house.name}
                      </h4>
                    </div>

                    <span className="text-2xl font-black font-mono text-foreground">
                      {house.points} <span className="text-xs font-sans text-muted-foreground">pts</span>
                    </span>
                  </div>

                  {/* Point Adjust Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adjustHousePoints(house.id, -5)}
                      className="h-10 rounded-xl text-xs font-bold text-rose-500 border-rose-500/30 hover:bg-rose-500/10 active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5 mr-1" /> 5
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => adjustHousePoints(house.id, 5)}
                      className="h-10 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> 5
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => adjustHousePoints(house.id, 10)}
                      className="h-10 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> 10
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border text-xs text-muted-foreground">
              <span>Points automatically persist across periods and school days.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveHouses(DEFAULT_HOUSES)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Scores
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
