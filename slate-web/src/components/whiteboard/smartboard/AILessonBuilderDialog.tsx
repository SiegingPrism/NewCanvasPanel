import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  CheckCircle2,
  Loader2,
  Wand2,
  Eye,
  ChevronRight,
  ArrowLeft,
  Check,
  FileQuestion,
  Workflow,
  ListOrdered,
  LayoutGrid,
} from "lucide-react";
import {
  buildLessonPagesFromCurriculum,
  generateLessonTemplate,
  type LessonCurriculum,
} from "@/lib/ai/lessonBuilder";
import { AIEngine } from "@/lib/ai/aiEngine";
import type { Page } from "@/lib/whiteboard/types";
import { toast } from "sonner";

export interface AILessonBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLessonGenerated: (pages: Page[], topic: string) => void;
}

const INSPIRATION_TOPICS = [
  { label: "🌿 Photosynthesis", topic: "Photosynthesis & Plant Energy", subject: "Science" },
  { label: "💧 Water Cycle", topic: "The Water Cycle & Precipitation", subject: "Science" },
  { label: "🪐 Solar System", topic: "Planets of the Solar System", subject: "Science" },
  {
    label: "📐 Pythagorean Theorem",
    topic: "Pythagorean Theorem & Right Triangles",
    subject: "Mathematics",
  },
  { label: "⚡ Newton's Laws", topic: "Newton's Three Laws of Motion", subject: "Physics" },
  { label: "🏛️ Ancient Rome", topic: "The Roman Republic & Empire", subject: "Social Studies" },
  {
    label: "📖 Figurative Language",
    topic: "Similes, Metaphors & Personification",
    subject: "English",
  },
  { label: "🧬 DNA & Genetics", topic: "Structure of DNA & Inherited Traits", subject: "Biology" },
];

export function AILessonBuilderDialog({
  open,
  onOpenChange,
  onLessonGenerated,
}: AILessonBuilderDialogProps) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Science");
  const [gradeLevel, setGradeLevel] = useState("Middle School (Grades 6-8)");
  const [pageCount, setPageCount] = useState(6);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  // Preview Mode
  const [generatedCurriculum, setGeneratedCurriculum] = useState<LessonCurriculum | null>(null);
  const [previewPages, setPreviewPages] = useState<Page[]>([]);
  const [activePreviewSlide, setActivePreviewSlide] = useState(0);
  const [isTemplateFallback, setIsTemplateFallback] = useState(false);

  const steps = [
    "Formulating lesson objectives & bell-ringer...",
    "Structuring Cornell notes and key principles...",
    "Generating visual flowchart and concept schematic...",
    "Building interactive drag-and-drop sorting activity...",
    "Crafting classroom check-for-understanding quiz...",
    "Creating tap-to-flip vocabulary flashcards & exit ticket...",
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a lesson topic.");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      // 1. Attempt real Gemini generation with Zod validation
      const curriculum = await AIEngine.generateLessonCurriculum({
        topic: topic.trim(),
        subject,
        gradeLevel,
      });

      clearInterval(stepInterval);
      const pages = buildLessonPagesFromCurriculum(curriculum, pageCount);
      setGeneratedCurriculum(curriculum);
      setPreviewPages(pages);
      setIsTemplateFallback(false);
      setActivePreviewSlide(0);
      setIsGenerating(false);
      toast.success(`Generated curriculum on "${topic.trim()}"! Review preview below.`);
    } catch (err: any) {
      clearInterval(stepInterval);
      console.warn(
        "AI generation offline or unavailable, falling back to lesson outline template:",
        err,
      );

      // 2. Offline / No API Key: Fallback to structured Lesson Template outline
      const templateCurriculum = generateLessonTemplate(topic.trim(), subject, gradeLevel);
      const pages = buildLessonPagesFromCurriculum(templateCurriculum, pageCount);
      setGeneratedCurriculum(templateCurriculum);
      setPreviewPages(pages);
      setIsTemplateFallback(true);
      setActivePreviewSlide(0);
      setIsGenerating(false);
      toast.info(
        "AI unavailable (offline or key not configured) — generated a structured Lesson Template outline to fill in.",
        { duration: 6000 },
      );
    }
  };

  const handleConfirmInsert = () => {
    if (!previewPages.length) return;
    onLessonGenerated(previewPages, topic.trim());
    toast.success(`Added ${previewPages.length} whiteboard pages to your board!`);
    onOpenChange(false);
    // Reset preview
    setGeneratedCurriculum(null);
    setPreviewPages([]);
  };

  const handleResetToEdit = () => {
    setGeneratedCurriculum(null);
    setPreviewPages([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-3xl select-none max-h-[92vh] flex flex-col">
        <DialogHeader className="p-6 border-b border-border bg-muted/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-500" />
              AI Lesson Builder · Smart Board Curriculum
            </div>
            {generatedCurriculum && (
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  isTemplateFallback
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {isTemplateFallback ? "Lesson Template (Outline)" : "Gemini AI Generated"}
              </span>
            )}
          </div>
          <DialogTitle className="text-2xl font-black text-foreground mt-1">
            {generatedCurriculum
              ? `Preview: ${generatedCurriculum.topic}`
              : "Build Ready-to-Teach Whiteboard Lesson"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {generatedCurriculum
              ? "Review your structured pages below. You can tap on each slide to inspect the content before inserting onto the smart board."
              : "Type any topic to generate ready interactive pages with objectives, Cornell notes, visual schematics, drag-and-drop activities, quizzes, and flashcards."}
          </p>
        </DialogHeader>

        {/* BODY */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {!generatedCurriculum ? (
            /* ================= STEP 1: FORM INPUTS ================= */
            <>
              {/* TOPIC INPUT */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5 block">
                  What topic do you want to teach?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={isGenerating}
                    className="w-full h-14 pl-4 pr-12 rounded-2xl bg-background border-2 border-border text-foreground font-bold text-lg placeholder:text-muted-foreground/60 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Photosynthesis, Pythagorean Theorem, Newton's Laws..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isGenerating && topic.trim()) {
                        handleGenerate();
                      }
                    }}
                  />
                  <Wand2 className="absolute right-4 top-4 w-6 h-6 text-muted-foreground pointer-events-none" />
                </div>

                {/* Quick Inspiration Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="text-xs text-muted-foreground mr-1">Suggestions:</span>
                  {INSPIRATION_TOPICS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => {
                        setTopic(item.topic);
                        setSubject(item.subject);
                      }}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-foreground hover:bg-muted/80 border border-border transition active:scale-95 cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBJECT & GRADE LEVEL */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5 block">
                    <BookOpen className="inline w-3.5 h-3.5 mr-1 text-indigo-500" />
                    Subject Area
                  </label>
                  <select
                    disabled={isGenerating}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-background border border-input text-foreground font-medium text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Science">Science (General)</option>
                    <option value="Biology">Biology & Life Sciences</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Social Studies">Social Studies & History</option>
                    <option value="Geography">Geography & Earth Science</option>
                    <option value="English">English & Language Arts</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5 block">
                    <GraduationCap className="inline w-3.5 h-3.5 mr-1 text-emerald-500" />
                    Target Grade Level
                  </label>
                  <select
                    disabled={isGenerating}
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-background border border-input text-foreground font-medium text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Primary (Grades 1-5)">Primary / Elementary (Grades 1-5)</option>
                    <option value="Middle School (Grades 6-8)">Middle School (Grades 6-8)</option>
                    <option value="High School (Grades 9-12)">High School (Grades 9-12)</option>
                    <option value="University / College">University / College</option>
                  </select>
                </div>
              </div>

              {/* PAGE COUNT */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-1.5 block">
                  <Layers className="inline w-3.5 h-3.5 mr-1 text-purple-500" />
                  Lesson Length ({pageCount} Whiteboard Pages)
                </label>
                <div className="flex gap-2">
                  {[5, 6, 7, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setPageCount(count)}
                      className={`flex-1 h-11 rounded-xl text-xs font-bold transition active:scale-95 border ${
                        pageCount === count
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                          : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      {count} Pages {count === 6 && "★"}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROGRESS ANIMATION */}
              {isGenerating && (
                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {steps[generationStep]}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.min(100, ((generationStep + 1) / steps.length) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* ================= STEP 2: SLIDE PREVIEW ================= */
            <div className="space-y-4">
              {/* Slide Selector Carousel Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {previewPages.map((page, idx) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePreviewSlide(idx)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                      activePreviewSlide === idx
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    <span className="h-5 w-5 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>
                      {idx === 0
                        ? "Goals & Warmup"
                        : idx === 1
                          ? "Cornell Notes"
                          : idx === 2
                            ? "Flowchart"
                            : idx === 3
                              ? "Activity"
                              : idx === 4
                                ? "Quiz"
                                : idx === 5
                                  ? "Flashcards"
                                  : "Exit Ticket"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Slide Detailed Content Card */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4 min-h-[280px]">
                {activePreviewSlide === 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                      <ListOrdered className="w-4 h-4" />
                      Slide 1: Title, Objectives & Bell-Ringer
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-1.5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">🎯 Learning Goals</div>
                        {generatedCurriculum.objectives.map((obj, i) => (
                          <div key={i} className="text-foreground">
                            • {obj}
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                        <div className="font-bold text-amber-600 dark:text-amber-400">🔔 Bell-Ringer Prompts</div>
                        {generatedCurriculum.bellRingerQuestions.map((q, i) => (
                          <div key={i} className="text-foreground">
                            • {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activePreviewSlide === 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                      <BookOpen className="w-4 h-4" />
                      Slide 2: Core Principles & Structured Notes
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {generatedCurriculum.corePrinciples.map((p, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1"
                        >
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">{p.heading}</div>
                          <div className="text-muted-foreground text-[11px]">{p.explanation}</div>
                          <div className="mt-2 text-foreground">
                            {p.bulletPoints.map((bp, bidx) => (
                              <div key={bidx}>• {bp}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePreviewSlide === 2 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-bold">
                      <Workflow className="w-4 h-4" />
                      Slide 3: Visual Concept Flowchart
                    </div>
                    <div className="text-xs font-semibold text-foreground">
                      {generatedCurriculum.conceptFlowchart.title}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {generatedCurriculum.conceptFlowchart.steps.map((st, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center space-y-1"
                        >
                          <div className="font-bold text-purple-600 dark:text-purple-400">{st.label}</div>
                          <div className="text-[11px] text-muted-foreground">{st.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePreviewSlide === 3 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-bold">
                      <LayoutGrid className="w-4 h-4" />
                      Slide 4: Interactive Drag-and-Drop Classification
                    </div>
                    <div className="text-xs text-foreground">
                      {generatedCurriculum.sortingActivity.instruction}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {generatedCurriculum.sortingActivity.categories.map((c) => (
                        <span
                          key={c.id}
                          className="px-3 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold"
                        >
                          Category: {c.name}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      {generatedCurriculum.sortingActivity.items.map((it) => (
                        <div
                          key={it.id}
                          className="p-2 rounded-lg bg-muted border border-border text-foreground truncate"
                        >
                          📄 {it.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePreviewSlide === 4 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-bold">
                      <FileQuestion className="w-4 h-4" />
                      Slide 5: Classroom Check-for-Understanding Quiz
                    </div>
                    <div className="space-y-2 text-xs">
                      {generatedCurriculum.quiz.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-muted/60 border border-border space-y-1"
                        >
                          <div className="font-bold text-foreground">
                            {idx + 1}. {q.question}
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                            {q.options.map((opt, oidx) => (
                              <div
                                key={oidx}
                                className={
                                  oidx === q.correctIndex ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""
                                }
                              >
                                {String.fromCharCode(65 + oidx)}) {opt}{" "}
                                {oidx === q.correctIndex && "✓"}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePreviewSlide === 5 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                      <Layers className="w-4 h-4" />
                      Slide 6: Vocabulary Flashcards (Tap to Flip)
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {generatedCurriculum.flashcards.map((fc, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-xl bg-muted/60 border border-border space-y-1"
                        >
                          <div className="font-bold text-indigo-600 dark:text-indigo-400">{fc.front}</div>
                          <div className="text-[11px] text-muted-foreground">{fc.back}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePreviewSlide >= 6 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      Slide 7: Student Exit Ticket & Reflections
                    </div>
                    <div className="space-y-2 text-xs">
                      {generatedCurriculum.exitTicket.prompts.map((pr, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-foreground"
                        >
                          📌 Prompt {i + 1}: {pr}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-border bg-muted/40 flex items-center justify-between shrink-0">
          {!generatedCurriculum ? (
            <>
              <Button
                variant="ghost"
                disabled={isGenerating}
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                disabled={isGenerating || !topic.trim()}
                onClick={handleGenerate}
                className="min-h-[56px] px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 active:scale-95 transition-all gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Curriculum...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    Generate & Preview Lesson
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleResetToEdit}
                className="min-h-[52px] rounded-xl border-border bg-background text-foreground hover:bg-muted gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit Topic
              </Button>
              <Button
                onClick={handleConfirmInsert}
                className="min-h-[56px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 active:scale-95 transition-all gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                Insert All {previewPages.length} Pages into Board
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
