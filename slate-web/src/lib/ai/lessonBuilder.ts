import { uid } from "../whiteboard/store";
import { z } from "zod";
import type {
  Page,
  CanvasObject,
  TextObject,
  StickyNoteObject,
  QuizObject,
  FlashcardObject,
  DiagramNodeObject,
  ActivityObject,
  FrameObject,
} from "../whiteboard/types";

// =========================================================================
// ZOD SCHEMA FOR VALIDATED CURRICULUM OUTPUT
// =========================================================================

export const LessonCurriculumSchema = z.object({
  topic: z.string(),
  subject: z.string(),
  gradeLevel: z.string(),
  objectives: z.array(z.string()).min(2),
  bellRingerQuestions: z.array(z.string()).min(2),
  corePrinciples: z
    .array(
      z.object({
        heading: z.string(),
        explanation: z.string(),
        bulletPoints: z.array(z.string()).min(1),
      }),
    )
    .min(2),
  conceptFlowchart: z.object({
    title: z.string(),
    steps: z
      .array(
        z.object({
          stepNumber: z.number(),
          label: z.string(),
          description: z.string(),
        }),
      )
      .min(3),
  }),
  sortingActivity: z.object({
    title: z.string(),
    instruction: z.string(),
    categories: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          color: z.string().optional(),
        }),
      )
      .min(2),
    items: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          correctCategoryId: z.string(),
        }),
      )
      .min(4),
  }),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(3),
        correctIndex: z.number().min(0),
        explanation: z.string().optional(),
      }),
    )
    .min(2),
  flashcards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
      }),
    )
    .min(3),
  exitTicket: z.object({
    prompts: z.array(z.string()).min(2),
  }),
});

export type LessonCurriculum = z.infer<typeof LessonCurriculumSchema>;

export interface LessonBuilderOptions {
  topic: string;
  gradeLevel?: string;
  subject?: string;
  pageCount?: number; // 5 to 8
  language?: string;
  curriculum?: LessonCurriculum;
}

/**
 * Fallback structural template explicitly titled and labeled as an outline to fill in.
 * Used when offline or when no Gemini API key is configured.
 */
export function generateLessonTemplate(
  topic: string,
  subject = "General Science",
  gradeLevel = "Middle School (Grades 6-8)",
): LessonCurriculum {
  const cleanTopic = topic.trim() || "New Lesson";
  return {
    topic: cleanTopic,
    subject,
    gradeLevel,
    objectives: [
      `Define and explain the core scientific concepts of ${cleanTopic}.`,
      `Analyze cause-and-effect relationships and practical real-world applications.`,
      `Collaborate on the board to classify components and solve check-in problems.`,
    ],
    bellRingerQuestions: [
      `What is the first thing that comes to mind when you hear "${cleanTopic}"?`,
      `Where do you observe or encounter this phenomenon in everyday life?`,
      `One question or curiosity you hope we explore during class today.`,
    ],
    corePrinciples: [
      {
        heading: "Principle 1: Foundational Rule",
        explanation: `[Lesson Template: Add core definition of ${cleanTopic} here]`,
        bulletPoints: [
          `Key mechanism or law governing ${cleanTopic}`,
          "Required baseline inputs or conditions",
          "Essential takeaway for student notes",
        ],
      },
      {
        heading: "Principle 2: Dynamic Process",
        explanation: "[Lesson Template: Add energy or information flow step here]",
        bulletPoints: [
          "Measurable change observed during reaction or event",
          "How variables interact with the environment",
          "Connecting rule to outcomes",
        ],
      },
      {
        heading: "Principle 3: Practical Application",
        explanation: "[Lesson Template: Add real-world application here]",
        bulletPoints: [
          "Technological, historical, or biological relevance",
          "Concrete example analyzed in modern studies",
          "Implication for broader systems",
        ],
      },
    ],
    conceptFlowchart: {
      title: `${cleanTopic}: Sequential Process Flow`,
      steps: [
        {
          stepNumber: 1,
          label: "1. Initial Stimulus / Input",
          description: "Primary catalyst initiating the cycle",
        },
        {
          stepNumber: 2,
          label: "2. Intermediate Transformation",
          description: "Active processing and state shift",
        },
        {
          stepNumber: 3,
          label: "3. System Threshold Check",
          description: "Equilibrium or decision milestone",
        },
        {
          stepNumber: 4,
          label: "4. Final Output / Product",
          description: "Resulting equilibrium or work done",
        },
      ],
    },
    sortingActivity: {
      title: `${cleanTopic}: Classification Challenge`,
      instruction: "Drag each card into the appropriate category on the smart board.",
      categories: [
        { id: "cat-1", name: "Inputs & Causes", color: "#3b82f6" },
        { id: "cat-2", name: "Outputs & Effects", color: "#10b981" },
        { id: "cat-3", name: "Environment / Context", color: "#f59e0b" },
      ],
      items: [
        { id: uid(), text: "Starting Material / Energy", correctCategoryId: "cat-1" },
        { id: uid(), text: "Triggering Event", correctCategoryId: "cat-1" },
        { id: uid(), text: "Resulting Byproduct", correctCategoryId: "cat-2" },
        { id: uid(), text: "Observable System State", correctCategoryId: "cat-2" },
        { id: uid(), text: "Ambient Temperature / Setting", correctCategoryId: "cat-3" },
        { id: uid(), text: "Boundary Conditions", correctCategoryId: "cat-3" },
      ],
    },
    quiz: [
      {
        question: `What primary catalyst or baseline initiates ${cleanTopic}?`,
        options: [
          "Primary input energy or environmental stimulus",
          "A random decrease in atmospheric pressure",
          "An isolated inert catalyst with zero reactivity",
          "An irrelevant background variable",
        ],
        correctIndex: 0,
        explanation: `The initial reaction in ${cleanTopic} is directly governed by input energy or stimulus.`,
      },
      {
        question: `Which statement accurately describes how ${cleanTopic} functions?`,
        options: [
          "It produces static equilibrium without any transformation",
          "It drives structured state transitions across distinct phases",
          "It completely avoids all interaction with outside variables",
          "It cannot be observed or measured in empirical settings",
        ],
        correctIndex: 1,
        explanation: `Systems exhibiting ${cleanTopic} progress through measurable dynamic stages.`,
      },
      {
        question: `Why is ${cleanTopic} essential to study in ${subject}?`,
        options: [
          "It allows accurate predictions and innovative applications in real life",
          "It is merely an arbitrary naming convention with no real effect",
          "It was disproven in early experimental literature",
          "It applies only to purely hypothetical mathematical constructs",
        ],
        correctIndex: 0,
        explanation:
          "Mastery of this concept provides predictive models for complex physical and social systems.",
      },
    ],
    flashcards: [
      {
        front: "Key Concept: Foundational Definition",
        back: `The primary rule or mechanism that governs ${cleanTopic}.`,
      },
      {
        front: "Primary Variable",
        back: "The measurable quantity that shifts during the process.",
      },
      {
        front: "System Equilibrium",
        back: "The balanced state attained once inputs and reactions stabilize.",
      },
      {
        front: "Real-World Application",
        back: "How engineers, scientists, or historians leverage this concept today.",
      },
    ],
    exitTicket: {
      prompts: [
        `In your own words, summarize the most important mechanism of ${cleanTopic}.`,
        `How would you explain ${cleanTopic} to someone who has never studied ${subject}?`,
        "What is one question or curiosity you still want to explore tomorrow?",
      ],
    },
  };
}

/**
 * Builds ready whiteboard pages from a structured and validated LessonCurriculum.
 */
export function buildLessonPagesFromCurriculum(
  curriculum: LessonCurriculum,
  targetPageCount = 6,
): Page[] {
  const { topic, subject, gradeLevel } = curriculum;
  const pages: Page[] = [];
  const maxPages = Math.min(Math.max(targetPageCount, 5), 8);

  // =========================================================================
  // PAGE 1: TITLE, OBJECTIVES & BELL-RINGER
  // =========================================================================
  const p1Objects: CanvasObject[] = [
    {
      id: uid(),
      kind: "frame",
      x: 60,
      y: 40,
      w: 1160,
      h: 680,
      title: `Lesson 1: ${topic}`,
    } as FrameObject,
    {
      id: uid(),
      kind: "text",
      x: 100,
      y: 90,
      w: 960,
      h: 60,
      text: topic.toUpperCase(),
      fontSize: 38,
      fontFamily: "sans-serif",
      color: "#1e1b4b",
    } as TextObject,
    {
      id: uid(),
      kind: "text",
      x: 104,
      y: 155,
      w: 800,
      h: 30,
      text: `${subject} · ${gradeLevel} · Smart Board Interactive Lesson`,
      fontSize: 16,
      fontFamily: "sans-serif",
      color: "#6366f1",
    } as TextObject,
    {
      id: uid(),
      kind: "sticky",
      x: 100,
      y: 205,
      w: 480,
      h: 390,
      text: `🎯 TODAY'S LEARNING OBJECTIVES:\n\n${curriculum.objectives
        .map((obj, i) => `${i + 1}. ${obj}`)
        .join("\n\n")}`,
      color: "#eff6ff",
    } as StickyNoteObject,
    {
      id: uid(),
      kind: "sticky",
      x: 620,
      y: 205,
      w: 480,
      h: 390,
      text: `🔔 3-MINUTE BELL-RINGER WARM-UP:\n\nBefore we begin, answer these in your notes or on mini-boards:\n\n${curriculum.bellRingerQuestions
        .map((q) => `• ${q}`)
        .join("\n\n")}`,
      color: "#fef3c7",
    } as StickyNoteObject,
  ];

  pages.push({
    id: uid(),
    title: `1. Title & Goals: ${topic}`,
    background: "dots",
    objects: p1Objects,
  });

  // =========================================================================
  // PAGE 2: CORE PRINCIPLES & CORNELL NOTES
  // =========================================================================
  const cardWidth = Math.min(320, Math.floor(1000 / curriculum.corePrinciples.length));
  const p2Objects: CanvasObject[] = [
    {
      id: uid(),
      kind: "frame",
      x: 60,
      y: 40,
      w: 1160,
      h: 680,
      title: `Key Concepts: ${topic}`,
    } as FrameObject,
    {
      id: uid(),
      kind: "text",
      x: 100,
      y: 90,
      w: 960,
      h: 50,
      text: `Key Concepts: Understanding ${topic}`,
      fontSize: 32,
      fontFamily: "sans-serif",
      color: "#0f172a",
    } as TextObject,
  ];

  const colors = ["#f0fdf4", "#faf5ff", "#fff7ed", "#fef2f2"];
  curriculum.corePrinciples.slice(0, 3).forEach((p, idx) => {
    p2Objects.push({
      id: uid(),
      kind: "sticky",
      x: 100 + idx * (cardWidth + 30),
      y: 160,
      w: cardWidth,
      h: 350,
      text: `💡 ${p.heading.toUpperCase()}\n\n${p.explanation}\n\n${p.bulletPoints
        .map((bp) => `• ${bp}`)
        .join("\n\n")}`,
      color: colors[idx % colors.length],
    } as StickyNoteObject);
  });

  p2Objects.push({
    id: uid(),
    kind: "sticky",
    x: 100,
    y: 535,
    w: 1020,
    h: 120,
    text: `📝 CORNELL SUMMARY: In summary, ${topic} exhibits predictable physical, social, or computational behaviors governed by core rules, measurable inputs, and observable transformations.`,
    color: "#f1f5f9",
  } as StickyNoteObject);

  pages.push({
    id: uid(),
    title: `2. Concept Notes: ${topic}`,
    background: "lined",
    objects: p2Objects,
  });

  // =========================================================================
  // PAGE 3: VISUAL CONCEPT FLOWCHART / SCHEMATIC
  // =========================================================================
  const p3Objects: CanvasObject[] = [
    {
      id: uid(),
      kind: "frame",
      x: 60,
      y: 40,
      w: 1160,
      h: 680,
      title: `Schematic: ${topic}`,
    } as FrameObject,
    {
      id: uid(),
      kind: "text",
      x: 100,
      y: 90,
      w: 960,
      h: 50,
      text: curriculum.conceptFlowchart.title || `Process Schematic: ${topic}`,
      fontSize: 30,
      fontFamily: "sans-serif",
      color: "#0f172a",
    } as TextObject,
  ];

  const steps = curriculum.conceptFlowchart.steps.slice(0, 4);
  const nodeIds = steps.map(() => uid());
  const nodeColors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981"];
  const nodeTypes: DiagramNodeObject["nodeType"][] = ["start", "process", "decision", "end"];

  steps.forEach((st, i) => {
    p3Objects.push({
      id: nodeIds[i],
      kind: "diagram-node",
      x: 100 + i * 265,
      y: 260,
      w: 220,
      h: 120,
      nodeType: nodeTypes[i % nodeTypes.length],
      label: `${st.label}\n\n${st.description}`,
      color: nodeColors[i % nodeColors.length],
      connectedTo: i < steps.length - 1 ? [nodeIds[i + 1]] : [],
    } as DiagramNodeObject);
  });

  p3Objects.push({
    id: uid(),
    kind: "sticky",
    x: 100,
    y: 460,
    w: 1010,
    h: 160,
    text: `🔍 SMART BOARD ANNOTATION ZONE:\n\nInvite students to write intermediate formulas, notes, or classroom examples directly above or below each node!`,
    color: "#eef2ff",
  } as StickyNoteObject);

  pages.push({
    id: uid(),
    title: `3. Flowchart: ${topic}`,
    background: "grid",
    objects: p3Objects,
  });

  // =========================================================================
  // PAGE 4: INTERACTIVE DRAG-AND-DROP ACTIVITY
  // =========================================================================
  const act = curriculum.sortingActivity;
  const p4Objects: CanvasObject[] = [
    {
      id: uid(),
      kind: "frame",
      x: 60,
      y: 40,
      w: 1160,
      h: 680,
      title: `Board Activity: ${topic}`,
    } as FrameObject,
    {
      id: uid(),
      kind: "activity",
      x: 100,
      y: 100,
      w: 960,
      h: 560,
      activityType: "sort",
      title: act.title || `${topic}: Interactive Classification`,
      instructions:
        act.instruction || "Drag each card to its matching category on the smart board.",
      categories: act.categories.map((c) => c.name),
      items: act.items.map((it) => {
        const cat = act.categories.find((c) => c.id === it.correctCategoryId);
        return {
          id: it.id || uid(),
          text: it.text,
          category: cat ? cat.name : act.categories[0].name,
        };
      }),
      completed: false,
    } as ActivityObject,
  ];

  pages.push({
    id: uid(),
    title: `4. Interactive Activity: ${topic}`,
    background: "dots",
    objects: p4Objects,
  });

  // =========================================================================
  // PAGE 5: CLASSROOM CHECK-FOR-UNDERSTANDING QUIZ
  // =========================================================================
  const p5Objects: CanvasObject[] = [
    {
      id: uid(),
      kind: "frame",
      x: 60,
      y: 40,
      w: 1160,
      h: 680,
      title: `Check for Understanding: ${topic}`,
    } as FrameObject,
    {
      id: uid(),
      kind: "text",
      x: 100,
      y: 90,
      w: 960,
      h: 50,
      text: `Classroom Quiz: ${topic}`,
      fontSize: 32,
      fontFamily: "sans-serif",
      color: "#0f172a",
    } as TextObject,
  ];

  const q1 = curriculum.quiz[0];
  const q2 = curriculum.quiz[1];
  const q3 = curriculum.quiz[2];

  if (q1) {
    p5Objects.push({
      id: uid(),
      kind: "quiz",
      x: 100,
      y: 160,
      w: 480,
      h: 220,
      question: q1.question,
      options: q1.options,
      answerIndex: q1.correctIndex,
      revealed: false,
    } as QuizObject);
  }
  if (q2) {
    p5Objects.push({
      id: uid(),
      kind: "quiz",
      x: 620,
      y: 160,
      w: 480,
      h: 220,
      question: q2.question,
      options: q2.options,
      answerIndex: q2.correctIndex,
      revealed: false,
    } as QuizObject);
  }
  if (q3) {
    p5Objects.push({
      id: uid(),
      kind: "quiz",
      x: 100,
      y: 410,
      w: 1000,
      h: 200,
      question: q3.question,
      options: q3.options,
      answerIndex: q3.correctIndex,
      revealed: false,
    } as QuizObject);
  }

  pages.push({
    id: uid(),
    title: `5. Quiz: ${topic}`,
    background: "white",
    objects: p5Objects,
  });

  // =========================================================================
  // PAGE 6: KEY VOCABULARY FLASHCARDS (OPTIONAL)
  // =========================================================================
  if (maxPages >= 6 && curriculum.flashcards.length >= 3) {
    const p6Objects: CanvasObject[] = [
      {
        id: uid(),
        kind: "frame",
        x: 60,
        y: 40,
        w: 1160,
        h: 680,
        title: `Flashcards: ${topic}`,
      } as FrameObject,
      {
        id: uid(),
        kind: "text",
        x: 100,
        y: 90,
        w: 960,
        h: 50,
        text: `Vocabulary & Key Terms (Tap to Flip)`,
        fontSize: 32,
        fontFamily: "sans-serif",
        color: "#0f172a",
      } as TextObject,
    ];

    const cards = curriculum.flashcards.slice(0, 4);
    const pos = [
      { x: 100, y: 160 },
      { x: 620, y: 160 },
      { x: 100, y: 400 },
      { x: 620, y: 400 },
    ];

    cards.forEach((fc, idx) => {
      p6Objects.push({
        id: uid(),
        kind: "flashcard",
        x: pos[idx].x,
        y: pos[idx].y,
        w: 480,
        h: 210,
        front: `${fc.front}\n\n(Tap card to reveal definition)`,
        back: `Definition:\n${fc.back}`,
        flipped: false,
      } as FlashcardObject);
    });

    pages.push({
      id: uid(),
      title: `6. Flashcards: ${topic}`,
      background: "dots",
      objects: p6Objects,
    });
  }

  // =========================================================================
  // PAGE 7: EXIT TICKET & REFLECTION (OPTIONAL)
  // =========================================================================
  if (maxPages >= 7) {
    const p7Objects: CanvasObject[] = [
      {
        id: uid(),
        kind: "frame",
        x: 60,
        y: 40,
        w: 1160,
        h: 680,
        title: `Exit Ticket: ${topic}`,
      } as FrameObject,
      {
        id: uid(),
        kind: "text",
        x: 100,
        y: 90,
        w: 960,
        h: 50,
        text: `Exit Ticket: Student Reflections`,
        fontSize: 32,
        fontFamily: "sans-serif",
        color: "#0f172a",
      } as TextObject,
    ];

    const prompts = curriculum.exitTicket.prompts.slice(0, 3);
    const noteColors = ["#ecfdf5", "#fef2f2", "#fffbeb"];
    prompts.forEach((pr, i) => {
      p7Objects.push({
        id: uid(),
        kind: "sticky",
        x: 100 + i * 350,
        y: 160,
        w: 320,
        h: 460,
        text: `📌 PROMPT ${i + 1}:\n\n${pr}`,
        color: noteColors[i % noteColors.length],
      } as StickyNoteObject);
    });

    pages.push({
      id: uid(),
      title: `7. Exit Ticket: ${topic}`,
      background: "four-line",
      objects: p7Objects,
    });
  }

  return pages;
}

/**
 * Builds lesson pages using curriculum if provided, or fallback template outline.
 */
export function buildLessonPages(options: LessonBuilderOptions): Page[] {
  const curriculum =
    options.curriculum ||
    generateLessonTemplate(options.topic, options.subject, options.gradeLevel);
  return buildLessonPagesFromCurriculum(curriculum, options.pageCount || 6);
}
