import { describe, it, expect } from "vitest";
import { importLessonFile, type SlateLessonBundle } from "./lessonFiles";
import type { Page } from "./types";

describe("Lesson Files (.slate bundle)", () => {
  it("validates and parses a valid .slate lesson bundle", async () => {
    const mockPages: Page[] = [
      {
        id: "page-1",
        background: "white",
        objects: [
          {
            id: "stroke-1",
            kind: "pen",
            points: [{ x: 10, y: 10 }],
            color: "#000000",
            size: 4,
          },
        ],
      },
      {
        id: "page-2",
        background: "blackboard",
        objects: [
          {
            id: "text-1",
            kind: "text",
            x: 100,
            y: 100,
            w: 200,
            h: 50,
            text: "Welcome to Physics",
            color: "#ffffff",
            fontSize: 24,
          },
        ],
      },
    ];

    const mockBundle: SlateLessonBundle = {
      version: 1,
      type: "slate-lesson",
      title: "Newton's Laws of Motion",
      createdAt: Date.now(),
      pages: mockPages,
    };

    const mockFile = new File([JSON.stringify(mockBundle)], "newtons_laws.slate", {
      type: "application/json",
    });

    const parsed = await importLessonFile(mockFile);
    expect(parsed.type).toBe("slate-lesson");
    expect(parsed.title).toBe("Newton's Laws of Motion");
    expect(parsed.pages.length).toBe(2);
    expect(parsed.pages[0].objects[0].kind).toBe("pen");
    expect(parsed.pages[1].background).toBe("blackboard");
  });

  it("rejects invalid or corrupted lesson files", async () => {
    const invalidFile = new File(['{"type": "not-a-lesson"}'], "bad.slate", {
      type: "application/json",
    });

    await expect(importLessonFile(invalidFile)).rejects.toThrow(
      "Invalid .slate lesson file format.",
    );
  });
});
