import type { Page } from "./types";
import { toast } from "sonner";

export interface SlateLessonBundle {
  version: number;
  type: "slate-lesson";
  title: string;
  createdAt: number;
  pages: Page[];
}

/**
 * Exports the active whiteboard pages and lesson material as a portable .slate lesson file.
 */
export function exportLessonFile(title: string, pages: Page[]) {
  try {
    const lessonData: SlateLessonBundle = {
      version: 1,
      type: "slate-lesson",
      title: title || "Classroom Lesson",
      createdAt: Date.now(),
      pages,
    };

    const json = JSON.stringify(lessonData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "Lesson").replace(/[^a-zA-Z0-9_-]/g, "_")}.slate`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Saved lesson file (.slate) to device/USB!");
  } catch (err) {
    console.error("Failed to export lesson:", err);
    toast.error("Could not export lesson file.");
  }
}

/**
 * Reads and validates a .slate lesson file.
 */
export async function importLessonFile(file: File): Promise<SlateLessonBundle> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (data.type !== "slate-lesson" || !Array.isArray(data.pages)) {
    throw new Error("Invalid .slate lesson file format.");
  }

  return data as SlateLessonBundle;
}

