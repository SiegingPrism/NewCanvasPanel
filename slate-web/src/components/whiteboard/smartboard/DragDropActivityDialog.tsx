import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Layers,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Plus,
  Play,
  ArrowRight,
  HelpCircle,
  Award,
  BookOpen,
} from "lucide-react";
import type { ActivityObject, ActivityItem, ActivityType } from "@/lib/whiteboard/types";
import { uid } from "@/lib/whiteboard/store";

// Web Audio API success celebration chime
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    playNote(523.25, now, 0.4);        // C5
    playNote(659.25, now + 0.15, 0.4); // E5
    playNote(783.99, now + 0.3, 0.4);  // G5
    playNote(1046.5, now + 0.45, 0.8); // C6
  } catch {}
}

export interface ActivityTemplate {
  id: string;
  title: string;
  subject: string;
  type: ActivityType;
  instructions: string;
  categories: string[];
  items: { text: string; category: string }[];
}

export const PRESET_ACTIVITIES: ActivityTemplate[] = [
  {
    id: "states-of-matter",
    title: "States of Matter: Solid, Liquid, or Gas?",
    subject: "Science · Grade 3-6",
    type: "sort",
    instructions: "Drag each object or substance into the correct state of matter bucket.",
    categories: ["Solid", "Liquid", "Gas"],
    items: [
      { text: "Ice Cube", category: "Solid" },
      { text: "Iron Nail", category: "Solid" },
      { text: "Wooden Block", category: "Solid" },
      { text: "Water", category: "Liquid" },
      { text: "Orange Juice", category: "Liquid" },
      { text: "Cooking Oil", category: "Liquid" },
      { text: "Steam", category: "Gas" },
      { text: "Oxygen", category: "Gas" },
      { text: "Helium in Balloon", category: "Gas" },
    ],
  },
  {
    id: "parts-of-speech",
    title: "Parts of Speech: Nouns, Verbs & Adjectives",
    subject: "English · Grade 4-8",
    type: "sort",
    instructions: "Sort each word card into Noun, Verb, or Adjective.",
    categories: ["Noun", "Verb", "Adjective"],
    items: [
      { text: "Mountain", category: "Noun" },
      { text: "Teacher", category: "Noun" },
      { text: "Whisper", category: "Verb" },
      { text: "Sprint", category: "Verb" },
      { text: "Luminous", category: "Adjective" },
      { text: "Courageous", category: "Adjective" },
      { text: "Guitar", category: "Noun" },
      { text: "Calculate", category: "Verb" },
      { text: "Vibrant", category: "Adjective" },
    ],
  },
  {
    id: "living-nonliving",
    title: "Living vs Non-Living Things",
    subject: "Biology · Grade 2-5",
    type: "sort",
    instructions: "Categorize each item as a Living organism or Non-Living object.",
    categories: ["Living", "Non-Living"],
    items: [
      { text: "Oak Tree", category: "Living" },
      { text: "Honeybee", category: "Living" },
      { text: "River Rock", category: "Non-Living" },
      { text: "Plastic Bottle", category: "Non-Living" },
      { text: "Fungus / Mushroom", category: "Living" },
      { text: "Bicycle", category: "Non-Living" },
      { text: "Earthworm", category: "Living" },
      { text: "Smart Board", category: "Non-Living" },
    ],
  },
  {
    id: "prime-composite",
    title: "Prime vs Composite Numbers",
    subject: "Math · Grade 5-8",
    type: "sort",
    instructions: "Sort the numbers into Prime (only 2 factors) or Composite (more than 2 factors).",
    categories: ["Prime Numbers", "Composite Numbers"],
    items: [
      { text: "2", category: "Prime Numbers" },
      { text: "3", category: "Prime Numbers" },
      { text: "4", category: "Composite Numbers" },
      { text: "7", category: "Prime Numbers" },
      { text: "9", category: "Composite Numbers" },
      { text: "11", category: "Prime Numbers" },
      { text: "15", category: "Composite Numbers" },
      { text: "17", category: "Prime Numbers" },
      { text: "21", category: "Composite Numbers" },
    ],
  },
  {
    id: "continents-oceans",
    title: "Continents & Oceans of the World",
    subject: "Geography · Grade 3-7",
    type: "sort",
    instructions: "Sort geographic locations into Continents vs Oceans.",
    categories: ["Continent", "Ocean"],
    items: [
      { text: "Asia", category: "Continent" },
      { text: "Pacific", category: "Ocean" },
      { text: "Africa", category: "Continent" },
      { text: "Atlantic", category: "Ocean" },
      { text: "Antarctica", category: "Continent" },
      { text: "Indian", category: "Ocean" },
      { text: "Europe", category: "Continent" },
      { text: "Arctic", category: "Ocean" },
    ],
  },
];

export interface DragDropActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: ActivityObject | null;
  onInsertActivityToCanvas?: (activity: ActivityObject) => void;
}

export function DragDropActivityDialog({
  open,
  onOpenChange,
  activity: initialActivity,
  onInsertActivityToCanvas,
}: DragDropActivityDialogProps) {
  const [tab, setTab] = useState<"play" | "library" | "create">("play");
  const [currentActivity, setCurrentActivity] = useState<ActivityTemplate>(PRESET_ACTIVITIES[0]);

  // Player state
  const [placements, setPlacements] = useState<Record<string, string>>({}); // itemId -> bucketCategory
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Custom builder state
  const [customTitle, setCustomTitle] = useState("");
  const [customSubject, setCustomSubject] = useState("Science");
  const [customCat1, setCustomCat1] = useState("Category A");
  const [customCat2, setCustomCat2] = useState("Category B");
  const [customItems1, setCustomItems1] = useState("Item 1, Item 2, Item 3");
  const [customItems2, setCustomItems2] = useState("Item 4, Item 5, Item 6");

  useEffect(() => {
    if (initialActivity) {
      // Map initial ActivityObject to play state
      const t: ActivityTemplate = {
        id: initialActivity.id,
        title: initialActivity.title,
        subject: "Classroom Activity",
        type: initialActivity.activityType,
        instructions: initialActivity.instructions || "Drag cards into the matching buckets.",
        categories: initialActivity.categories || ["Category 1", "Category 2"],
        items: initialActivity.items.map((i) => ({
          text: i.text,
          category: i.category || "",
        })),
      };
      setCurrentActivity(t);
      const initPlacements: Record<string, string> = {};
      initialActivity.items.forEach((it) => {
        if (it.currentBucket) initPlacements[it.text] = it.currentBucket;
      });
      setPlacements(initPlacements);
      setChecked(false);
      setScore(null);
      setTab("play");
    }
  }, [initialActivity]);

  const loadPreset = (template: ActivityTemplate) => {
    setCurrentActivity(template);
    setPlacements({});
    setChecked(false);
    setScore(null);
    setSelectedCardId(null);
    setTab("play");
  };

  const handleCardClick = (cardText: string) => {
    if (checked) setChecked(false);
    if (selectedCardId === cardText) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(cardText);
    }
  };

  const handleBucketClick = (category: string) => {
    if (selectedCardId) {
      setPlacements((prev) => ({
        ...prev,
        [selectedCardId]: category,
      }));
      setSelectedCardId(null);
      if (checked) setChecked(false);
    }
  };

  const returnCardToBank = (cardText: string) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[cardText];
      return next;
    });
    if (checked) setChecked(false);
  };

  const checkAnswers = () => {
    let correctCount = 0;
    const total = currentActivity.items.length;

    currentActivity.items.forEach((item) => {
      if (placements[item.text] === item.category) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setChecked(true);

    if (correctCount === total) {
      playSuccessChime();
    }
  };

  const resetActivity = () => {
    setPlacements({});
    setChecked(false);
    setScore(null);
    setSelectedCardId(null);
  };

  const insertCurrentToCanvas = () => {
    if (!onInsertActivityToCanvas) return;
    const activityObj: ActivityObject = {
      id: uid(),
      kind: "activity",
      x: 100,
      y: 100,
      w: 800,
      h: 520,
      activityType: currentActivity.type,
      title: currentActivity.title,
      instructions: currentActivity.instructions,
      categories: currentActivity.categories,
      items: currentActivity.items.map((it) => ({
        id: uid(),
        text: it.text,
        category: it.category,
      })),
      completed: false,
    };
    onInsertActivityToCanvas(activityObj);
    onOpenChange(false);
  };

  const handleCreateCustom = () => {
    if (!customTitle.trim()) return;
    const cat1 = customCat1.trim() || "Category 1";
    const cat2 = customCat2.trim() || "Category 2";
    const items1 = customItems1.split(",").map((s) => s.trim()).filter(Boolean);
    const items2 = customItems2.split(",").map((s) => s.trim()).filter(Boolean);

    const items = [
      ...items1.map((txt) => ({ text: txt, category: cat1 })),
      ...items2.map((txt) => ({ text: txt, category: cat2 })),
    ];

    const template: ActivityTemplate = {
      id: uid(),
      title: customTitle,
      subject: customSubject,
      type: "sort",
      instructions: `Sort each card into ${cat1} or ${cat2}.`,
      categories: [cat1, cat2],
      items,
    };

    loadPreset(template);
  };

  // Cards remaining in the bank (unplaced)
  const unplacedCards = currentActivity.items.filter((item) => !placements[item.text]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[96vw] p-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-3xl select-none max-h-[92vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <Button
              variant={tab === "play" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-base font-semibold rounded-xl ${
                tab === "play" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("play")}
            >
              <Play className="w-4 h-4 fill-current" />
              Play Activity
            </Button>
            <Button
              variant={tab === "library" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-base font-semibold rounded-xl ${
                tab === "library" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("library")}
            >
              <BookOpen className="w-4 h-4" />
              Preset Library
            </Button>
            <Button
              variant={tab === "create" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-base font-semibold rounded-xl ${
                tab === "create" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("create")}
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </Button>
          </div>

          {onInsertActivityToCanvas && tab === "play" && (
            <Button
              variant="outline"
              className="h-10 px-4 text-xs font-bold border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 rounded-xl gap-2"
              onClick={insertCurrentToCanvas}
            >
              <Plus className="w-4 h-4" />
              Insert onto Whiteboard
            </Button>
          )}
        </div>

        {/* TAB 1: INTERACTIVE PLAY MODE */}
        {tab === "play" && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Title & Instructions */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {currentActivity.subject} · Interactive Sort
                </span>
                {score !== null && checked && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                      score === currentActivity.items.length
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    Score: {score} / {currentActivity.items.length} Correct
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-black text-white mt-1">{currentActivity.title}</h3>
              <p className="text-sm text-slate-300 mt-1">{currentActivity.instructions}</p>
            </div>

            {/* BUCKET DROP COLUMNS */}
            <div
              className={`grid gap-4 my-2 flex-1 min-h-[220px] ${
                currentActivity.categories.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-3"
              }`}
            >
              {currentActivity.categories.map((cat, idx) => {
                const bucketItems = currentActivity.items.filter(
                  (item) => placements[item.text] === cat
                );
                const isTarget = Boolean(selectedCardId);

                const colThemes = [
                  "border-blue-500/40 bg-blue-950/20 text-blue-300",
                  "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
                  "border-amber-500/40 bg-amber-950/20 text-amber-300",
                ];
                const theme = colThemes[idx % colThemes.length];

                return (
                  <div
                    key={cat}
                    onClick={() => handleBucketClick(cat)}
                    className={`rounded-2xl border-2 p-4 flex flex-col transition-all cursor-pointer ${theme} ${
                      isTarget
                        ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 border-indigo-500/80 shadow-lg"
                        : "hover:border-slate-500"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <span className="font-black text-lg text-white">{cat}</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-slate-300">
                        {bucketItems.length}
                      </span>
                    </div>

                    {/* Bucket Items List */}
                    <div className="space-y-2 flex-1">
                      {bucketItems.map((item) => {
                        const isCorrect = checked && item.category === cat;
                        const isIncorrect = checked && item.category !== cat;

                        return (
                          <div
                            key={item.text}
                            onClick={(e) => {
                              e.stopPropagation();
                              returnCardToBank(item.text);
                            }}
                            className={`p-3 rounded-xl font-bold text-base flex items-center justify-between shadow-md transition-all cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-600 text-white border-2 border-emerald-400"
                                : isIncorrect
                                ? "bg-red-900/80 text-white border-2 border-red-500 animate-shake"
                                : "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
                            }`}
                            title="Tap to return to card bank"
                          >
                            <span>{item.text}</span>
                            {checked && (
                              <span className="text-xs font-black">
                                {isCorrect ? "✓" : "✗"}
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {bucketItems.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-4 text-center text-sm font-semibold">
                          Tap card then tap here to place
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* UNPLACED CARDS BANK */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Card Bank ({unplacedCards.length} cards remaining)
                </span>
                {selectedCardId && (
                  <span className="text-xs font-bold text-indigo-400 animate-pulse">
                    Tap a bucket above to place "{selectedCardId}"
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 min-h-[64px] p-3 rounded-2xl bg-slate-950 border border-slate-800 items-center">
                {unplacedCards.length === 0 ? (
                  <div className="w-full text-center text-sm font-semibold text-emerald-400 py-2 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    All cards placed! Tap "Check Answers" below.
                  </div>
                ) : (
                  unplacedCards.map((item) => (
                    <button
                      key={item.text}
                      onClick={() => handleCardClick(item.text)}
                      className={`h-12 px-5 rounded-xl font-bold text-base shadow-md transition-all flex items-center gap-2 ${
                        selectedCardId === item.text
                          ? "bg-indigo-600 text-white scale-105 ring-2 ring-indigo-400"
                          : "bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <span>{item.text}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* BOTTOM ACTIONS (CHECK / RESET) */}
            <div className="flex items-center justify-between mt-6 pt-2">
              <Button
                variant="outline"
                className="h-14 px-6 text-base font-bold border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-2xl gap-2"
                onClick={resetActivity}
              >
                <RotateCcw className="w-5 h-5" />
                Reset Activity
              </Button>

              <Button
                disabled={Object.keys(placements).length === 0}
                className="h-14 px-10 text-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl gap-3 shadow-lg shadow-emerald-500/20"
                onClick={checkAnswers}
              >
                <CheckCircle2 className="w-6 h-6" />
                Check Answers
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: PRESET LIBRARY */}
        {tab === "library" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <h4 className="text-xl font-black text-white mb-2">Classroom Drag-and-Drop Activity Library</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PRESET_ACTIVITIES.map((act) => (
                <div
                  key={act.id}
                  className="p-5 rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-indigo-500/50 hover:bg-slate-950 transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      {act.subject}
                    </span>
                    <h5 className="text-lg font-bold text-white mt-1">{act.title}</h5>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{act.instructions}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {act.categories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          {c}
                        </span>
                      ))}
                      <span className="text-xs text-slate-500 self-center ml-1">
                        · {act.items.length} cards
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800/80">
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 rounded-xl gap-2"
                      onClick={() => loadPreset(act)}
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Play on Board
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOM ACTIVITY BUILDER */}
        {tab === "create" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4 max-w-2xl mx-auto w-full">
            <h4 className="text-xl font-black text-white">Create Custom Drag-and-Drop Activity</h4>
            <p className="text-xs text-slate-400">
              Create a custom 2-category sorting activity in 30 seconds for your lesson.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Activity Title</label>
                <input
                  type="text"
                  className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:ring-2 focus:ring-indigo-500"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Carnivores vs Herbivores"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Category 1 Name</label>
                  <input
                    type="text"
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:ring-2 focus:ring-indigo-500"
                    value={customCat1}
                    onChange={(e) => setCustomCat1(e.target.value)}
                    placeholder="e.g. Carnivores"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">Category 2 Name</label>
                  <input
                    type="text"
                    className="w-full h-11 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold text-sm focus:ring-2 focus:ring-indigo-500"
                    value={customCat2}
                    onChange={(e) => setCustomCat2(e.target.value)}
                    placeholder="e.g. Herbivores"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                    Category 1 Items (comma separated)
                  </label>
                  <textarea
                    className="w-full h-28 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs resize-none focus:ring-2 focus:ring-indigo-500"
                    value={customItems1}
                    onChange={(e) => setCustomItems1(e.target.value)}
                    placeholder="Lion, Eagle, Wolf, Shark"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 mb-1 block">
                    Category 2 Items (comma separated)
                  </label>
                  <textarea
                    className="w-full h-28 p-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs resize-none focus:ring-2 focus:ring-indigo-500"
                    value={customItems2}
                    onChange={(e) => setCustomItems2(e.target.value)}
                    placeholder="Deer, Rabbit, Cow, Elephant"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  disabled={!customTitle.trim()}
                  className="h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl gap-2 shadow-lg"
                  onClick={handleCreateCustom}
                >
                  <Sparkles className="w-4 h-4" />
                  Save & Play on Board
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
