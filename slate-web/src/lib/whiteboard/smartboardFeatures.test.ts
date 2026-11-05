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
    });
  });
});

