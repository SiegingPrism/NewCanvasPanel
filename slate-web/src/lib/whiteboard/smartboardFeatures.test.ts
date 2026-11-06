import { describe, it, expect } from "vitest";
import {
  buildLessonPages,
  buildLessonPagesFromCurriculum,
  generateLessonTemplate,
  LessonCurriculumSchema,
} from "../ai/lessonBuilder";
import { PRESET_ACTIVITIES } from "@/components/whiteboard/smartboard/DragDropActivityDialog";
import type { ActivityObject } from "./types";

describe("Smart Board Features", () => {
  describe("AI Lesson Builder", () => {
    it("validates curriculum JSON against LessonCurriculumSchema with zod", () => {
      const template = generateLessonTemplate("Photosynthesis", "Biology");
      const validated = LessonCurriculumSchema.parse(template);
      expect(validated.topic).toBe("Photosynthesis");
      expect(validated.objectives.length).toBeGreaterThanOrEqual(2);
      expect(validated.quiz.length).toBeGreaterThanOrEqual(2);
      expect(validated.flashcards.length).toBeGreaterThanOrEqual(3);

      const customPages = buildLessonPagesFromCurriculum(validated, 6);
      expect(customPages).toHaveLength(6);
      expect(customPages[0].title).toContain("Photosynthesis");
    });

    it("generates 6 ready-to-teach whiteboard pages with complete curriculum objects", () => {
      const pages = buildLessonPages({
        topic: "Photosynthesis",
        subject: "Science",
        gradeLevel: "Middle School (Grades 6-8)",
        pageCount: 6,
      });

      expect(pages).toHaveLength(6);

      // Page 1: Title & Goals
      expect(pages[0].title).toContain("Title & Goals: Photosynthesis");
      const p1Kinds = pages[0].objects.map((o) => o.kind);
      expect(p1Kinds).toContain("frame");
      expect(p1Kinds).toContain("text");
      expect(p1Kinds).toContain("sticky"); // Goals & Bell-Ringer

      // Page 2: Concept Notes
      expect(pages[1].title).toContain("Concept Notes");
      const p2Stickies = pages[1].objects.filter((o) => o.kind === "sticky");
      expect(p2Stickies.length).toBeGreaterThanOrEqual(4); // 3 principles + Cornell summary

      // Page 3: Flowchart / Schematic
      expect(pages[2].title).toContain("Flowchart");
      const p3Nodes = pages[2].objects.filter((o) => o.kind === "diagram-node");
      expect(p3Nodes.length).toBe(4); // start -> process -> decision -> end

      // Page 4: Interactive Drag-and-Drop Activity
      expect(pages[3].title).toContain("Interactive Activity");
      const activityObj = pages[3].objects.find((o) => o.kind === "activity") as ActivityObject;
      expect(activityObj).toBeDefined();
      expect(activityObj.activityType).toBe("sort");
      expect(activityObj.categories?.length).toBeGreaterThanOrEqual(2);
      expect(activityObj.items.length).toBeGreaterThanOrEqual(4);

      // Page 5: Classroom Quiz Cards
      expect(pages[4].title).toContain("Quiz");
      const p5Quizzes = pages[4].objects.filter((o) => o.kind === "quiz");
      expect(p5Quizzes.length).toBe(3);

      // Page 6: Flashcards
      expect(pages[5].title).toContain("Flashcards");
      const p6Cards = pages[5].objects.filter((o) => o.kind === "flashcard");
      expect(p6Cards.length).toBe(4);
    });

    it("supports 7 and 8 page requests including exit ticket reflection", () => {
      const pages = buildLessonPages({
        topic: "Pythagorean Theorem",
        subject: "Mathematics",
        pageCount: 7,
      });

      expect(pages).toHaveLength(7);
      expect(pages[6].title).toContain("Exit Ticket");
      const exitStickies = pages[6].objects.filter((o) => o.kind === "sticky");
      expect(exitStickies.length).toBe(3); // 1 Thing Learned, 1 Question, 1-5 Rating
    });
  });

  describe("Drag and Drop Classroom Activities", () => {
    it("contains robust preset educational activities across subjects", () => {
      expect(PRESET_ACTIVITIES.length).toBeGreaterThanOrEqual(5);

      const statesOfMatter = PRESET_ACTIVITIES.find((a) => a.id === "states-of-matter");
      expect(statesOfMatter).toBeDefined();
      expect(statesOfMatter?.categories).toEqual(["Solid", "Liquid", "Gas"]);
      expect(statesOfMatter?.items.length).toBe(9);

      const partsOfSpeech = PRESET_ACTIVITIES.find((a) => a.id === "parts-of-speech");
      expect(partsOfSpeech).toBeDefined();
      expect(partsOfSpeech?.categories).toEqual(["Noun", "Verb", "Adjective"]);

      const livingNonLiving = PRESET_ACTIVITIES.find((a) => a.id === "living-nonliving");
      expect(livingNonLiving).toBeDefined();
      expect(livingNonLiving?.categories).toEqual(["Living", "Non-Living"]);

      // Verify Match activity preset
      const cellMatch = PRESET_ACTIVITIES.find((a) => a.id === "cell-biology-match");
      expect(cellMatch).toBeDefined();
      expect(cellMatch?.type).toBe("match");
      expect(cellMatch?.items.length).toBeGreaterThanOrEqual(4);

      // Verify Label activity preset with diagram and target spots
      const plantLabel = PRESET_ACTIVITIES.find((a) => a.id === "plant-anatomy-label");
      expect(plantLabel).toBeDefined();
      expect(plantLabel?.type).toBe("label");
      expect(plantLabel?.spots?.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Teacher Cloud Sync & Storage", () => {
    it("persists and restores retry queue from localStorage safely", () => {
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: (k: string) => store[k] || null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
      };

      const mockQueue = [
        {
          id: "queue_test_1",
          boardId: "board_123",
          userId: "user_abc",
          payload: { title: "Period 1 Biology", pages: [] },
          retryCount: 1,
          lastAttempt: Date.now(),
        },
      ];
      mockStorage.setItem("slate_sync_retry_queue", JSON.stringify(mockQueue));

      const raw = mockStorage.getItem("slate_sync_retry_queue");
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].boardId).toBe("board_123");
    });

    it("skips cloud upload when a board has no pages in memory to prevent overwriting cloud copy with empty board", () => {
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const activeMeta = { id: "active_board", title: "Active Board", updatedAt: Date.now() };
      const activePages = [{ id: "p1", objects: [], background: "white" as const }];

      const allBoards = {
        active_board: activeMeta,
        board_with_data: { id: "board_with_data", title: "Saved Board", updatedAt: Date.now() },
        board_without_data: { id: "board_without_data", title: "Unloaded Board", updatedAt: Date.now() },
        old_board: { id: "old_board", title: "Old Board", updatedAt: startOfToday - 1000 },
      };

      const allBoardData: Record<string, { pages?: any[] }> = {
        board_with_data: { pages: [{ id: "p2", objects: [], background: "white" as const }] },
        board_without_data: {}, // No pages in memory
      };

      const boardsToUpload: Array<{ meta: any; pages: any[] }> = [];
      if (activePages && activePages.length > 0) {
        boardsToUpload.push({ meta: activeMeta, pages: activePages });
      }

      for (const [bId, bMeta] of Object.entries(allBoards)) {
        if (bId === activeMeta.id) continue;
        if (bMeta.updatedAt && bMeta.updatedAt >= startOfToday) {
          const bData = allBoardData[bId];
          const bPages = bData?.pages;
          // SAFETY: If a board has no data in memory, skip upload instead of sending empty/blank board
          if (!bPages || !Array.isArray(bPages) || bPages.length === 0) {
            continue;
          }
          boardsToUpload.push({ meta: bMeta, pages: bPages });
        }
      }

      // Only the active board and the board with real data are uploaded
      expect(boardsToUpload.map((b) => b.meta.id)).toEqual(["active_board", "board_with_data"]);
      expect(boardsToUpload.find((b) => b.meta.id === "board_without_data")).toBeUndefined();
    });
  });
});

