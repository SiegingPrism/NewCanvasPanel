import { uid } from "../whiteboard/store";
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

export interface LessonBuilderOptions {
  topic: string;
  gradeLevel?: string;
  subject?: string;
  pageCount?: number; // 5 to 8
  language?: string;
}

/**
 * Builds 5 to 8 pedagogical whiteboard pages for a smart board lesson.
 * Designed to provide full classroom engagement:
 *  - Slide 1: Title, Objectives, Bell-Ringer Warmup
 *  - Slide 2: Core Principles & Cornell-style Notes
 *  - Slide 3: Visual Concept Flowchart / Diagram
 *  - Slide 4: Interactive Drag-and-Drop Sorting Activity
 *  - Slide 5: Classroom Quiz Cards (Check for Understanding)
 *  - Slide 6: Key Vocabulary Flashcards (Tap to Flip)
 *  - Slide 7: Exit Ticket & Reflection
 */
export function buildLessonPages(options: LessonBuilderOptions): Page[] {
  const topic = options.topic.trim() || "New Lesson";
  const subject = options.subject || "General Science";
  const grade = options.gradeLevel || "Middle School (Grades 6-8)";
  const targetPages = Math.min(Math.max(options.pageCount || 6, 5), 8);

  const pages: Page[] = [];

  // =========================================================================
  // PAGE 1: TITLE, LEARNING GOALS & BELL-RINGER
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
      fontSize: 40,
      fontFamily: "sans-serif",
      color: "#1e1b4b",
    } as TextObject,
    {
      id: uid(),
      kind: "text",
      x: 104,
      y: 155,
      w: 700,
      h: 30,
      text: `${subject} · ${grade} · Slate Smart Board Interactive Lesson`,
      fontSize: 16,
      fontFamily: "sans-serif",
      color: "#6366f1",
    } as TextObject,
    // Objectives Card
    {
      id: uid(),
      kind: "sticky",
      x: 100,
      y: 210,
      w: 480,
      h: 380,
      text: `🎯 TODAY'S LEARNING GOALS:\n\n1. Define and understand the core fundamentals of ${topic}.\n\n2. Analyze cause, effect, and practical real-world applications.\n\n3. Collaborate on the smart board to sort, categorize, and solve practice problems.\n\n4. Successfully complete the classroom check-for-understanding quiz.`,
      color: "#eff6ff",
    } as StickyNoteObject,
    // Bell-Ringer Prompt
    {
      id: uid(),
      kind: "sticky",
      x: 620,
      y: 210,
      w: 480,
      h: 380,
      text: `🔔 3-MINUTE BELL-RINGER WARM-UP:\n\nBefore we begin, answer these on your mini-boards or in your notes:\n\n• What is the first thing that comes to your mind when you hear "${topic}"?\n\n• Where do you see or encounter this in everyday life?\n\n• One question you hope we answer in class today.`,
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
  // PAGE 2: CORE PRINCIPLES & STRUCTURED NOTES
  // =========================================================================
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
    {
      id: uid(),
      kind: "sticky",
      x: 100,
      y: 160,
      w: 320,
      h: 340,
      text: `💡 PRINCIPLE 1: FOUNDATION\n\n• Primary mechanism driving ${topic}.\n\n• Governed by constant rules and standard inputs.\n\n• Key Takeaway: Essential for balance and function in the system.`,
      color: "#f0fdf4",
    } as StickyNoteObject,
    {
      id: uid(),
      kind: "sticky",
      x: 450,
      y: 160,
      w: 320,
      h: 340,
      text: `⚡ PRINCIPLE 2: TRANSFORMATION\n\n• Energy or information flow through ${topic}.\n\n• Changes observed when environmental variables shift.\n\n• Key Takeaway: Dynamic interactions create measurable outcomes.`,
      color: "#faf5ff",
    } as StickyNoteObject,
    {
      id: uid(),
      kind: "sticky",
      x: 800,
      y: 160,
      w: 320,
      h: 340,
      text: `🌍 PRINCIPLE 3: APPLICATION\n\n• Real-world impact and modern technological use.\n\n• How scientists and historians analyze ${topic}.\n\n• Key Takeaway: Connects theory to human progress and daily life.`,
      color: "#fff7ed",
    } as StickyNoteObject,
    {
      id: uid(),
      kind: "sticky",
      x: 100,
      y: 530,
      w: 1020,
      h: 120,
      text: `📝 CORNELL SUMMARY: In summary, ${topic} is characterized by systematic processes, interdependence of parts, and observable outputs that shape our understanding of ${subject}.`,
      color: "#f1f5f9",
    } as StickyNoteObject,
  ];

  pages.push({
    id: uid(),
    title: `2. Concept Notes: ${topic}`,
    background: "lined",
    objects: p2Objects,
  });

  // =========================================================================
  // PAGE 3: VISUAL CONCEPT FLOWCHART / SCHEMATIC
  // =========================================================================
  const node1Id = uid();
  const node2Id = uid();
  const node3Id = uid();
  const node4Id = uid();

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
      text: `Process Flow & Mechanism: ${topic}`,
      fontSize: 32,
      fontFamily: "sans-serif",
      color: "#0f172a",
    } as TextObject,
    {
      id: node1Id,
      kind: "diagram-node",
      x: 100,
      y: 280,
      w: 200,
      h: 110,
      nodeType: "start",
      label: `Initial Input / Stimulus\nfor ${topic}`,
      color: "#3b82f6",
      connectedTo: [node2Id],
    } as DiagramNodeObject,
    {
      id: node2Id,
      kind: "diagram-node",
      x: 370,
      y: 280,
      w: 220,
      h: 110,
      nodeType: "process",
      label: `Core Processing Stage\n(Reactions & Dynamics)`,
      color: "#8b5cf6",
      connectedTo: [node3Id],
    } as DiagramNodeObject,
    {
      id: node3Id,
      kind: "diagram-node",
      x: 660,
      y: 280,
      w: 200,
      h: 110,
      nodeType: "decision",
      label: `Threshold / Check\nReached?`,
      color: "#f59e0b",
      connectedTo: [node4Id],
    } as DiagramNodeObject,
    {
      id: node4Id,
      kind: "diagram-node",
      x: 930,
      y: 280,
      w: 200,
      h: 110,
      nodeType: "end",
      label: `Final Equilibrium &\nProduct Result`,
      color: "#10b981",
    } as DiagramNodeObject,
    {
      id: uid(),
      kind: "sticky",
      x: 100,
      y: 450,
      w: 1030,
      h: 180,
      text: `🔍 SMART BOARD ANNOTATION ZONE:\n\nInvite students to write intermediate chemical equations, formulas, dates, or vocabulary notes directly above or below each node!`,
      color: "#eef2ff",
    } as StickyNoteObject,
  ];

  pages.push({
    id: uid(),
    title: `3. Flowchart: ${topic}`,
    background: "grid",
    objects: p3Objects,
  });

  // =========================================================================
  // PAGE 4: INTERACTIVE DRAG-AND-DROP ACTIVITY
  // =========================================================================
  const lowerTopic = topic.toLowerCase();
  let actCategories = ["Core Characteristics", "Supporting Evidence", "Real-World Examples"];
  let actItems = [
    { id: uid(), text: "Essential Property A", category: "Core Characteristics" },
    { id: uid(), text: "Essential Property B", category: "Core Characteristics" },
    { id: uid(), text: "Experimental Observation", category: "Supporting Evidence" },
    { id: uid(), text: "Data Measurement", category: "Supporting Evidence" },
    { id: uid(), text: "Practical Case Study 1", category: "Real-World Examples" },
    { id: uid(), text: "Practical Case Study 2", category: "Real-World Examples" },
  ];

  if (lowerTopic.includes("photo") || lowerTopic.includes("plant")) {
    actCategories = ["Inputs (Reactants)", "Outputs (Products)", "Cell Machinery"];
    actItems = [
      { id: uid(), text: "Sunlight Energy", category: "Inputs (Reactants)" },
      { id: uid(), text: "Carbon Dioxide (CO2)", category: "Inputs (Reactants)" },
      { id: uid(), text: "Water (H2O)", category: "Inputs (Reactants)" },
      { id: uid(), text: "Glucose Sugar", category: "Outputs (Products)" },
      { id: uid(), text: "Oxygen Gas (O2)", category: "Outputs (Products)" },
      { id: uid(), text: "Chloroplasts", category: "Cell Machinery" },
      { id: uid(), text: "Chlorophyll Pigment", category: "Cell Machinery" },
      { id: uid(), text: "Stomata Pores", category: "Cell Machinery" },
    ];
  } else if (lowerTopic.includes("water") || lowerTopic.includes("cycle")) {
    actCategories = ["Atmosphere", "Surface Water", "Groundwater"];
    actItems = [
      { id: uid(), text: "Water Vapor", category: "Atmosphere" },
      { id: uid(), text: "Condensation into Clouds", category: "Atmosphere" },
      { id: uid(), text: "Rivers & Lakes", category: "Surface Water" },
      { id: uid(), text: "Ocean Evaporation", category: "Surface Water" },
      { id: uid(), text: "Soil Moisture", category: "Groundwater" },
      { id: uid(), text: "Aquifer Infiltration", category: "Groundwater" },
    ];
  } else if (lowerTopic.includes("math") || lowerTopic.includes("pythag") || lowerTopic.includes("triangle")) {
    actCategories = ["Legs (a & b)", "Hypotenuse (c)", "Applications"];
    actItems = [
      { id: uid(), text: "Side a = 3", category: "Legs (a & b)" },
      { id: uid(), text: "Side b = 4", category: "Legs (a & b)" },
      { id: uid(), text: "Side c = 5", category: "Hypotenuse (c)" },
      { id: uid(), text: "Longest Side", category: "Hypotenuse (c)" },
      { id: uid(), text: "Opposite Right Angle", category: "Hypotenuse (c)" },
      { id: uid(), text: "Construction & Surveying", category: "Applications" },
      { id: uid(), text: "GPS Distance Tracking", category: "Applications" },
    ];
  }

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
      title: `${topic}: Category Sort Challenge`,
      instructions: "Students come to the board and drag each card into the correct category bucket.",
      categories: actCategories,
      items: actItems,
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
    {
      id: uid(),
      kind: "quiz",
      x: 100,
      y: 160,
      w: 480,
      h: 220,
      question: `What is the primary factor that initiates ${topic}?`,
      options: [
        "A sudden drop in temperature",
        "The primary input energy or stimulus",
        "An isolated chemical catalyst",
        "A completely random external fluctuation",
      ],
      answerIndex: 1,
      revealed: false,
    } as QuizObject,
    {
      id: uid(),
      kind: "quiz",
      x: 620,
      y: 160,
      w: 480,
      h: 220,
      question: `Which statement best describes how ${topic} impacts systems?`,
      options: [
        "It maintains static equilibrium without change",
        "It drives measurable transformations across stages",
        "It eliminates all outside variables",
        "It only occurs in simulated conditions",
      ],
      answerIndex: 1,
      revealed: false,
    } as QuizObject,
    {
      id: uid(),
      kind: "quiz",
      x: 100,
      y: 410,
      w: 1000,
      h: 200,
      question: `Why is understanding ${topic} critical for modern scientists and thinkers?`,
      options: [
        "It allows accurate predictions and innovative applications",
        "It is merely a historical convention",
        "It cannot be tested or measured",
        "It only applies to theoretical problems",
      ],
      answerIndex: 0,
      revealed: false,
    } as QuizObject,
  ];

  pages.push({
    id: uid(),
    title: `5. Quiz: ${topic}`,
    background: "white",
    objects: p5Objects,
  });

  // =========================================================================
  // PAGE 6: KEY VOCABULARY FLASHCARDS
  // =========================================================================
  if (targetPages >= 6) {
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
      {
        id: uid(),
        kind: "flashcard",
        x: 100,
        y: 160,
        w: 480,
        h: 210,
        front: `TERM 1: Core Phenomenon\n\n(Tap card to reveal definition)`,
        back: `Definition:\nThe foundational event or mechanism that defines ${topic}.`,
        flipped: false,
      } as FlashcardObject,
      {
        id: uid(),
        kind: "flashcard",
        x: 620,
        y: 160,
        w: 480,
        h: 210,
        front: `TERM 2: Primary Variable\n\n(Tap card to reveal definition)`,
        back: `Definition:\nThe measurable condition or quantity that shifts during the process.`,
        flipped: false,
      } as FlashcardObject,
      {
        id: uid(),
        kind: "flashcard",
        x: 100,
        y: 400,
        w: 480,
        h: 210,
        front: `TERM 3: System Reaction\n\n(Tap card to reveal definition)`,
        back: `Definition:\nThe observable response triggered when variables reach equilibrium.`,
        flipped: false,
      } as FlashcardObject,
      {
        id: uid(),
        kind: "flashcard",
        x: 620,
        y: 400,
        w: 480,
        h: 210,
        front: `TERM 4: Practical Outcome\n\n(Tap card to reveal definition)`,
        back: `Definition:\nThe tangible benefit or discovery yielded from studying ${topic}.`,
        flipped: false,
      } as FlashcardObject,
    ];

    pages.push({
      id: uid(),
      title: `6. Flashcards: ${topic}`,
      background: "dots",
      objects: p6Objects,
    });
  }

  // =========================================================================
  // PAGE 7: EXIT TICKET & REFLECTION
  // =========================================================================
  if (targetPages >= 7) {
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
      {
        id: uid(),
        kind: "sticky",
        x: 100,
        y: 160,
        w: 320,
        h: 460,
        text: `⭐ 1 BIG THING I LEARNED:\n\nWrite down the most surprising or essential concept you understood about ${topic} during today's lesson.`,
        color: "#ecfdf5",
      } as StickyNoteObject,
      {
        id: uid(),
        kind: "sticky",
        x: 450,
        y: 160,
        w: 320,
        h: 460,
        text: `❓ 1 QUESTION I STILL HAVE:\n\nWhat is one question or mystery about ${topic} that you want to explore tomorrow?`,
        color: "#fef2f2",
      } as StickyNoteObject,
      {
        id: uid(),
        kind: "sticky",
        x: 800,
        y: 160,
        w: 320,
        h: 460,
        text: `📊 SELF-RATING (1-5):\n\nHow confident do you feel explaining ${topic} to a classmate?\n\n1 = Need Help\n3 = Getting There\n5 = Can Teach Others!`,
        color: "#fffbeb",
      } as StickyNoteObject,
    ];

    pages.push({
      id: uid(),
      title: `7. Exit Ticket: ${topic}`,
      background: "four-line",
      objects: p7Objects,
    });
  }

  return pages;
}
