/**
 * Assessment Store for Slate Whiteboard
 * Persists real student performance records from Quizzes, Polls, and Team Games
 * to drive authentic Class Insights without hardcoded/fake numbers.
 */

export interface AssessmentRecord {
  id: string;
  type: "quiz" | "poll" | "team-quiz";
  className: string;      // e.g. "Class 9A", "Class 10B"
  topic: string;          // e.g. "Ohm's Law", "Fractions", or Question title
  totalStudents: number;  // Number of student respondents
  correctCount: number;   // Number of correct submissions
  accuracy: number;       // Percentage (0 - 100)
  date: string;           // ISO date string
  timestamp: number;
}

const STORAGE_KEY = "slate_assessment_records_v1";

/**
 * Retrieve all real assessment records from localStorage
 */
export function getAssessmentRecords(): AssessmentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load assessment records:", err);
    return [];
  }
}

/**
 * Save a new real assessment result (from QuickPoll, LiveQuiz, or TeamQuiz)
 */
export function recordAssessmentResult(
  record: Omit<AssessmentRecord, "id" | "timestamp" | "date"> & { date?: string }
): AssessmentRecord {
  const newRecord: AssessmentRecord = {
    ...record,
    id: `assess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    date: record.date || new Date().toISOString(),
  };

  try {
    const existing = getAssessmentRecords();
    const updated = [newRecord, ...existing].slice(0, 200); // keep last 200 records
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slate:assessment-recorded", { detail: newRecord }));
    }
  } catch (err) {
    console.warn("Failed to save assessment record:", err);
  }

  return newRecord;
}

/**
 * Clear all assessment records
 */
export function clearAssessmentRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("slate:assessment-recorded"));
    }
  } catch {}
}
