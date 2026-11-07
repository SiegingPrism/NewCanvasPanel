/**
 * Classroom Timetable Store & Background Period Monitor
 * Starts with an empty timetable, allows school period configuration,
 * and provides background interval checking to offer lessons when periods start.
 */

import type { PageBackground } from "./types";

export interface PeriodSlot {
  id: string;
  periodNum: number;
  startTime: string; // "HH:mm" e.g. "09:00"
  endTime: string;   // "HH:mm" e.g. "09:45"
  className: string; // "Class 9A"
  subject: string;   // "Mathematics"
  room?: string;
  recommendedPaper?: "blank" | "grid" | "lined" | "four-line";
}

export interface DaySchedule {
  day: string; // "Monday", "Tuesday", etc.
  periods: PeriodSlot[];
}

const STORAGE_KEY = "slate_school_timetable_v1";

export const EMPTY_TIMETABLE: DaySchedule[] = [
  { day: "Monday", periods: [] },
  { day: "Tuesday", periods: [] },
  { day: "Wednesday", periods: [] },
  { day: "Thursday", periods: [] },
  { day: "Friday", periods: [] },
  { day: "Saturday", periods: [] },
];

export const SAMPLE_DEMO_TIMETABLE: DaySchedule[] = [
  {
    day: "Monday",
    periods: [
      { id: "p1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10A", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "p2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 9B", subject: "Science (Physics)", recommendedPaper: "blank" },
      { id: "p3", periodNum: 3, startTime: "10:30", endTime: "11:15", className: "Class 8A", subject: "Hindi Vyakaran", recommendedPaper: "lined" },
    ],
  },
  {
    day: "Tuesday",
    periods: [
      { id: "t1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9A", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "t2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 10A", subject: "Science (Biology)", recommendedPaper: "blank" },
    ],
  },
  {
    day: "Wednesday",
    periods: [
      { id: "w1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10B", subject: "Mathematics", recommendedPaper: "grid" },
      { id: "w2", periodNum: 2, startTime: "09:30", endTime: "10:15", className: "Class 9A", subject: "Science", recommendedPaper: "blank" },
    ],
  },
  {
    day: "Thursday",
    periods: [
      { id: "th1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9B", subject: "Mathematics", recommendedPaper: "grid" },
    ],
  },
  {
    day: "Friday",
    periods: [
      { id: "f1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 10A", subject: "Math Revision", recommendedPaper: "grid" },
    ],
  },
  {
    day: "Saturday",
    periods: [
      { id: "s1", periodNum: 1, startTime: "08:45", endTime: "09:30", className: "Class 9A & 9B", subject: "House Quiz Competition", recommendedPaper: "blank" },
    ],
  },
];

export function getTimetable(): DaySchedule[] {
  if (typeof window === "undefined") return EMPTY_TIMETABLE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_TIMETABLE;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : EMPTY_TIMETABLE;
  } catch {
    return EMPTY_TIMETABLE;
  }
}

export function saveTimetable(schedule: DaySchedule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slate:timetable-updated"));
    }
  } catch {}
}

/**
 * Identify the current active period for today's schedule
 */
export function getCurrentActivePeriod(customSchedule?: DaySchedule[]): { day: string; slot: PeriodSlot } | null {
  const schedule = customSchedule || getTimetable();
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[now.getDay()];

  const daySchedule = schedule.find((d) => d.day === currentDayName);
  if (!daySchedule || !daySchedule.periods || daySchedule.periods.length === 0) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const slot of daySchedule.periods) {
    const [startH, startM] = slot.startTime.split(":").map(Number);
    const [endH, endM] = slot.endTime.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    // Active period check (with 5-minute pre-period grace period)
    if (currentMinutes >= startTotal - 5 && currentMinutes <= endTotal) {
      return { day: currentDayName, slot };
    }
  }

  return null;
}

