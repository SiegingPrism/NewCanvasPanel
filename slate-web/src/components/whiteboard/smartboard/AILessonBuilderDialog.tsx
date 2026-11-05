import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Layers,
  CheckCircle2,
  Loader2,
  Wand2,
} from "lucide-react";
import { buildLessonPages } from "@/lib/ai/lessonBuilder";
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
  { label: "📐 Pythagorean Theorem", topic: "Pythagorean Theorem & Right Triangles", subject: "Mathematics" },
  { label: "⚡ Newton's Laws", topic: "Newton's Three Laws of Motion", subject: "Physics" },
  { label: "🏛️ Ancient Rome", topic: "The Roman Republic & Empire", subject: "Social Studies" },
  { label: "📖 Figurative Language", topic: "Similes, Metaphors & Personification", subject: "English" },
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

  const steps = [
    "Formulating lesson objectives & bell-ringer...",
    "Structuring Cornell notes and key principles...",
    "Generating visual flowchart and concept schematic...",
    "Building interactive drag-and-drop sorting activity...",
    "Crafting classroom check-for-understanding quiz...",
    "Creating tap-to-flip vocabulary flashcards & exit ticket...",
  ];

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Please enter a lesson topic.");
      return;
    }

    setIsGenerating(true);
    setGenerationStep(0);

    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          return prev;
        }
      });
    }, 350);

    setTimeout(() => {
      clearInterval(stepInterval);
      const pages = buildLessonPages({
        topic: topic.trim(),
        subject,
        gradeLevel,
        pageCount,
      });

      setIsGenerating(false);
      onLessonGenerated(pages, topic.trim());
      toast.success(`Generated ${pages.length}-page lesson on "${topic.trim()}"!`);
      onOpenChange(false);
    }, 2200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[94vw] p-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-3xl select-none">
        <DialogHeader className="p-6 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-400" />
            AI Lesson Builder · Smart Board Curriculum Pack
          </div>
          <DialogTitle className="text-2xl font-black text-white mt-1">
            Build Ready-to-Teach Whiteboard Lesson
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Type any topic and get 5–8 ready interactive pages with objectives, Cornell notes, visual schematics, drag-and-drop activities, quizzes, and flashcards.
          </p>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* TOPIC INPUT */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 block">
              What topic do you want to teach?
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={isGenerating}
                className="w-full h-14 pl-4 pr-12 rounded-2xl bg-slate-950 border-2 border-slate-700 text-white font-bold text-lg placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                placeholder="e.g. Photosynthesis, Pythagorean Theorem, Newton's Laws..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isGenerating && topic.trim()) {
                    handleGenerate();
                  }
                }}
              />
              <Wand2 className="absolute right-4 top-4 w-6 h-6 text-slate-500 pointer-events-none" />
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span className="text-xs text-slate-500 mr-1">Suggestions:</span>
              {INSPIRATION_TOPICS.map((item) => (
                <button
                  key={item.label}
                  disabled={isGenerating}
                  onClick={() => {
                    setTopic(item.topic);
                    setSubject(item.subject);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* SUBJECT & GRADE SELECTORS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Subject
              </label>
              <select
                disabled={isGenerating}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Science">Science & Biology</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics & Chemistry</option>
                <option value="Social Studies">Social Studies & History</option>
                <option value="Geography">Geography</option>
                <option value="English">English & Literature</option>
                <option value="Computer Science">Computer Science & Coding</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                Grade Level
              </label>
              <select
                disabled={isGenerating}
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="Elementary (Grades 1-5)">Elementary (Grades 1-5)</option>
                <option value="Middle School (Grades 6-8)">Middle School (Grades 6-8)</option>
                <option value="High School (Grades 9-12)">High School (Grades 9-12)</option>
                <option value="College / Advanced">College / Advanced</option>
              </select>
            </div>
          </div>

          {/* PAGE COUNT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Number of Lesson Pages
              </label>
              <span className="text-xs font-black text-indigo-400">{pageCount} Whiteboard Pages</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5, 6, 7, 8].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setPageCount(count)}
                  className={`h-11 rounded-xl font-bold text-sm transition-all ${
                    pageCount === count
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {count} Pages
                </button>
              ))}
            </div>
          </div>

          {/* PROGRESS DISPLAY WHEN GENERATING */}
          {isGenerating && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                <span className="text-sm font-bold text-white">
                  {steps[generationStep]}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${((generationStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              disabled={isGenerating}
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>

            <Button
              disabled={isGenerating || !topic.trim()}
              className="h-14 px-8 text-lg font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-xl shadow-indigo-500/25 gap-2.5"
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Building Lesson...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  Generate {pageCount}-Page Lesson
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
