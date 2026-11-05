import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Layers,
  RotateCcw,
  Plus,
  Play,
  Award,
  BookOpen,
  Shuffle,
  Tag,
  Link2,
  Check,
} from "lucide-react";
import type { ActivityObject, ActivityItem, ActivityType } from "@/lib/whiteboard/types";
import { uid } from "@/lib/whiteboard/store";
import { toast } from "sonner";

// Offline-first Web Audio API sound generator
function playAudioFeedback(type: "correct" | "placed" | "error") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === "placed") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "correct") {
      const playNote = (freq: number, start: number, dur: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.25, start + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(start);
        o.stop(start + dur);
      };
      playNote(523.25, now, 0.35);        // C5
      playNote(659.25, now + 0.12, 0.35); // E5
      playNote(783.99, now + 0.24, 0.35); // G5
      playNote(1046.5, now + 0.36, 0.6);  // C6
    }
  } catch {}
}

export interface ActivitySpot {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  subject: string;
  type: ActivityType;
  instructions: string;
  categories: string[];
  spots?: ActivitySpot[];
  items: { id: string; text: string; category: string; matchText?: string }[];
}

export const PRESET_ACTIVITIES: ActivityTemplate[] = [
  // 1. SORT: States of Matter
  {
    id: "states-of-matter",
    title: "States of Matter: Solid, Liquid, or Gas?",
    subject: "Science · Grade 3-6",
    type: "sort",
    instructions: "Drag each card into the correct state of matter bucket on the smart board.",
    categories: ["Solid", "Liquid", "Gas"],
    items: [
      { id: "som-1", text: "Ice Cube", category: "Solid" },
      { id: "som-2", text: "Iron Nail", category: "Solid" },
      { id: "som-3", text: "Wooden Block", category: "Solid" },
      { id: "som-4", text: "Water", category: "Liquid" },
      { id: "som-5", text: "Orange Juice", category: "Liquid" },
      { id: "som-6", text: "Cooking Oil", category: "Liquid" },
      { id: "som-7", text: "Steam", category: "Gas" },
      { id: "som-8", text: "Oxygen", category: "Gas" },
      { id: "som-9", text: "Helium in Balloon", category: "Gas" },
    ],
  },
  // 2. SORT: Parts of Speech
  {
    id: "parts-of-speech",
    title: "Parts of Speech: Nouns, Verbs & Adjectives",
    subject: "English · Grade 4-8",
    type: "sort",
    instructions: "Sort each word card into Noun, Verb, or Adjective.",
    categories: ["Noun", "Verb", "Adjective"],
    items: [
      { id: "pos-1", text: "Mountain", category: "Noun" },
      { id: "pos-2", text: "Teacher", category: "Noun" },
      { id: "pos-3", text: "Whisper", category: "Verb" },
      { id: "pos-4", text: "Sprint", category: "Verb" },
      { id: "pos-5", text: "Luminous", category: "Adjective" },
      { id: "pos-6", text: "Courageous", category: "Adjective" },
      { id: "pos-7", text: "Guitar", category: "Noun" },
      { id: "pos-8", text: "Calculate", category: "Verb" },
      { id: "pos-9", text: "Vibrant", category: "Adjective" },
    ],
  },
  // 3. SORT: Living vs Non-Living
  {
    id: "living-nonliving",
    title: "Living vs Non-Living Things",
    subject: "Biology · Grade 2-5",
    type: "sort",
    instructions: "Categorize each item as a Living organism or Non-Living object.",
    categories: ["Living", "Non-Living"],
    items: [
      { id: "lnl-1", text: "Oak Tree", category: "Living" },
      { id: "lnl-2", text: "Honeybee", category: "Living" },
      { id: "lnl-3", text: "River Rock", category: "Non-Living" },
      { id: "lnl-4", text: "Plastic Bottle", category: "Non-Living" },
      { id: "lnl-5", text: "Fungus / Mushroom", category: "Living" },
      { id: "lnl-6", text: "Bicycle", category: "Non-Living" },
      { id: "lnl-7", text: "Earthworm", category: "Living" },
      { id: "lnl-8", text: "Smart Board", category: "Non-Living" },
    ],
  },
  // 4. SORT: Prime vs Composite Numbers
  {
    id: "prime-composite",
    title: "Prime vs Composite Numbers",
    subject: "Math · Grade 5-8",
    type: "sort",
    instructions: "Sort the numbers into Prime (only 2 factors) or Composite (more than 2 factors).",
    categories: ["Prime Numbers", "Composite Numbers"],
    items: [
      { id: "pc-1", text: "2", category: "Prime Numbers" },
      { id: "pc-2", text: "3", category: "Prime Numbers" },
      { id: "pc-3", text: "4", category: "Composite Numbers" },
      { id: "pc-4", text: "7", category: "Prime Numbers" },
      { id: "pc-5", text: "9", category: "Composite Numbers" },
      { id: "pc-6", text: "11", category: "Prime Numbers" },
      { id: "pc-7", text: "15", category: "Composite Numbers" },
      { id: "pc-8", text: "17", category: "Prime Numbers" },
      { id: "pc-9", text: "21", category: "Composite Numbers" },
    ],
  },
  // 5. SORT: Continents & Oceans
  {
    id: "continents-oceans",
    title: "Continents & Oceans of the World",
    subject: "Geography · Grade 3-7",
    type: "sort",
    instructions: "Sort geographic locations into Continents vs Oceans.",
    categories: ["Continent", "Ocean"],
    items: [
      { id: "co-1", text: "Asia", category: "Continent" },
      { id: "co-2", text: "Pacific", category: "Ocean" },
      { id: "co-3", text: "Africa", category: "Continent" },
      { id: "co-4", text: "Atlantic", category: "Ocean" },
      { id: "co-5", text: "Antarctica", category: "Continent" },
      { id: "co-6", text: "Indian", category: "Ocean" },
      { id: "co-7", text: "Europe", category: "Continent" },
      { id: "co-8", text: "Arctic", category: "Ocean" },
    ],
  },
  // 6. MATCH: Cell Biology Term to Definition
  {
    id: "cell-biology-match",
    title: "Cell Organelles: Match Term to Function",
    subject: "Biology · Grade 6-10",
    type: "match",
    instructions: "Match each cell organelle to its correct biological function.",
    categories: ["Mitochondria", "Ribosome", "Nucleus", "Chloroplast", "Cell Membrane"],
    items: [
      { id: "cbm-1", text: "Powerhouse of the cell (produces ATP)", category: "Mitochondria", matchText: "Mitochondria" },
      { id: "cbm-2", text: "Site of protein synthesis", category: "Ribosome", matchText: "Ribosome" },
      { id: "cbm-3", text: "Stores genetic DNA & directs cell activities", category: "Nucleus", matchText: "Nucleus" },
      { id: "cbm-4", text: "Captures sunlight for photosynthesis in plants", category: "Chloroplast", matchText: "Chloroplast" },
      { id: "cbm-5", text: "Regulates entry and exit of substances", category: "Cell Membrane", matchText: "Cell Membrane" },
    ],
  },
  // 7. LABEL: Plant Anatomy Targets
  {
    id: "plant-anatomy-label",
    title: "Plant Anatomy: Label the Structures",
    subject: "Botany · Grade 4-9",
    type: "label",
    instructions: "Drag each anatomical label onto the corresponding target hotspot on the diagram.",
    categories: ["Flower", "Leaf", "Stem", "Root System"],
    spots: [
      { id: "pal-spot-1", label: "Flower", x: 50, y: 16 },
      { id: "pal-spot-2", label: "Leaf", x: 26, y: 44 },
      { id: "pal-spot-3", label: "Stem", x: 54, y: 55 },
      { id: "pal-spot-4", label: "Root System", x: 50, y: 84 },
    ],
    items: [
      { id: "pal-1", text: "Flower", category: "Flower" },
      { id: "pal-2", text: "Leaf", category: "Leaf" },
      { id: "pal-3", text: "Stem", category: "Stem" },
      { id: "pal-4", text: "Root System", category: "Root System" },
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

  // ID-based player placements: Record<itemId, targetCategoryOrSlot>
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemOrder, setItemOrder] = useState<string[]>([]);

  // Multi-Touch Simultaneous Dragging State
  // pointerId -> { itemId, x, y, startX, startY }
  const [activeDrags, setActiveDrags] = useState<Record<number, { itemId: string; x: number; y: number }>>({});
  const activeDragsRef = useRef<Record<number, { itemId: string; x: number; y: number }>>({});
  const bucketRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Custom builder state
  const [customTitle, setCustomTitle] = useState("");
  const [customSubject, setCustomSubject] = useState("Science");
  const [customType, setCustomType] = useState<ActivityType>("sort");
  const [customCat1, setCustomCat1] = useState("Category A");
  const [customCat2, setCustomCat2] = useState("Category B");
  const [customItems1, setCustomItems1] = useState("Item 1, Item 2, Item 3");
  const [customItems2, setCustomItems2] = useState("Item 4, Item 5, Item 6");

  // Sync initialActivity into state
  useEffect(() => {
    if (initialActivity) {
      const items = initialActivity.items.map((it) => ({
        id: it.id || uid(),
        text: it.text,
        category: it.category || "",
      }));
      const t: ActivityTemplate = {
        id: initialActivity.id,
        title: initialActivity.title,
        subject: "Classroom Activity",
        type: initialActivity.activityType || "sort",
        instructions: initialActivity.instructions || "Drag cards into the matching buckets.",
        categories: initialActivity.categories || ["Category 1", "Category 2"],
        items,
      };
      setCurrentActivity(t);
      setItemOrder(items.map((i) => i.id));
      const initPlacements: Record<string, string> = {};
      initialActivity.items.forEach((it) => {
        if (it.currentBucket && it.id) {
          initPlacements[it.id] = it.currentBucket;
        }
      });
      setPlacements(initPlacements);
      setChecked(false);
      setScore(null);
      setTab("play");
    } else {
      setItemOrder(currentActivity.items.map((i) => i.id));
    }
  }, [initialActivity]);

  const loadPreset = (template: ActivityTemplate) => {
    setCurrentActivity(template);
    setItemOrder(template.items.map((i) => i.id));
    setPlacements({});
    setChecked(false);
    setScore(null);
    setSelectedItemId(null);
    setTab("play");
  };

  const shuffleCards = () => {
    setItemOrder((prev) => [...prev].sort(() => Math.random() - 0.5));
    toast.success("Shuffled card bank!");
  };

  // Tap-based fallback placement
  const handleCardClick = (itemId: string) => {
    if (checked) setChecked(false);
    setSelectedItemId((prev) => (prev === itemId ? null : itemId));
  };

  const handleBucketClick = (category: string) => {
    if (selectedItemId) {
      setPlacements((prev) => ({
        ...prev,
        [selectedItemId]: category,
      }));
      playAudioFeedback("placed");
      setSelectedItemId(null);
      if (checked) setChecked(false);
    }
  };

  const returnCardToBank = (itemId: string) => {
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (checked) setChecked(false);
  };

  // Multi-Touch Simultaneous Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, itemId: string) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const dragInfo = {
      itemId,
      x: e.clientX,
      y: e.clientY,
    };
    activeDragsRef.current[e.pointerId] = dragInfo;
    setActiveDrags({ ...activeDragsRef.current });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragsRef.current[e.pointerId]) {
      activeDragsRef.current[e.pointerId].x = e.clientX;
      activeDragsRef.current[e.pointerId].y = e.clientY;
      setActiveDrags({ ...activeDragsRef.current });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = activeDragsRef.current[e.pointerId];
    if (!drag) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const { itemId, x, y } = drag;
    delete activeDragsRef.current[e.pointerId];
    setActiveDrags({ ...activeDragsRef.current });

    // Check collision against bucket / target elements
    let droppedInBucket: string | null = null;
    for (const [catName, el] of Object.entries(bucketRefs.current)) {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          droppedInBucket = catName;
          break;
        }
      }
    }

    if (droppedInBucket) {
      setPlacements((prev) => ({
        ...prev,
        [itemId]: droppedInBucket!,
      }));
      playAudioFeedback("placed");
      if (checked) setChecked(false);
    }
  };

  const checkAnswers = () => {
    let correctCount = 0;
    const total = currentActivity.items.length;

    currentActivity.items.forEach((item) => {
      if (placements[item.id] === item.category) {
        correctCount++;
      }
    });

    setScore(correctCount);
    setChecked(true);

    if (correctCount === total) {
      playAudioFeedback("correct");
      toast.success("Perfect score! All items placed correctly!");
    } else {
      toast.info(`${correctCount} of ${total} correct. Tap wrong cards to return them.`);
    }
  };

  const resetActivity = () => {
    setPlacements({});
    setChecked(false);
    setScore(null);
    setSelectedItemId(null);
  };

  const insertCurrentToCanvas = () => {
    if (!onInsertActivityToCanvas) return;
    const activityObj: ActivityObject = {
      id: uid(),
      kind: "activity",
      x: 100,
      y: 100,
      w: 880,
      h: 560,
      activityType: currentActivity.type,
      title: currentActivity.title,
      instructions: currentActivity.instructions,
      categories: currentActivity.categories,
      items: currentActivity.items.map((it) => ({
        id: it.id,
        text: it.text,
        category: it.category,
        currentBucket: placements[it.id],
      })),
      completed: score === currentActivity.items.length,
      score: score || 0,
    };
    onInsertActivityToCanvas(activityObj);
    toast.success(`Inserted "${currentActivity.title}" onto whiteboard!`);
    onOpenChange(false);
  };

  const handleCreateCustom = () => {
    if (!customTitle.trim()) return;
    const cat1 = customCat1.trim() || "Category 1";
    const cat2 = customCat2.trim() || "Category 2";
    const items1 = customItems1.split(",").map((s) => s.trim()).filter(Boolean);
    const items2 = customItems2.split(",").map((s) => s.trim()).filter(Boolean);

    const items = [
      ...items1.map((txt) => ({ id: uid(), text: txt, category: cat1 })),
      ...items2.map((txt) => ({ id: uid(), text: txt, category: cat2 })),
    ];

    const template: ActivityTemplate = {
      id: uid(),
      title: customTitle,
      subject: customSubject,
      type: customType,
      instructions: `Sort each card into ${cat1} or ${cat2}.`,
      categories: [cat1, cat2],
      items,
    };

    loadPreset(template);
  };

  // Unplaced cards (ordered by itemOrder)
  const unplacedCardIds = itemOrder.filter((id) => !placements[id]);
  const itemMap = new Map(currentActivity.items.map((i) => [i.id, i]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] p-0 overflow-hidden bg-slate-900 text-white border-slate-700 shadow-2xl rounded-3xl select-none max-h-[94vh] flex flex-col">
        {/* Header Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={tab === "play" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-sm font-bold rounded-xl ${
                tab === "play" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("play")}
            >
              <Play className="w-4 h-4 fill-current" />
              Play Activity
            </Button>
            <Button
              variant={tab === "library" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-sm font-bold rounded-xl ${
                tab === "library" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("library")}
            >
              <BookOpen className="w-4 h-4" />
              Activity Library
            </Button>
            <Button
              variant={tab === "create" ? "secondary" : "ghost"}
              className={`h-11 px-5 gap-2 text-sm font-bold rounded-xl ${
                tab === "create" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setTab("create")}
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {tab === "play" && (
              <>
                <Button
                  variant="outline"
                  onClick={shuffleCards}
                  className="h-11 px-4 text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl gap-2"
                  title="Randomize card order for students"
                >
                  <Shuffle className="w-4 h-4 text-amber-400" />
                  Shuffle Bank
                </Button>
                {onInsertActivityToCanvas && (
                  <Button
                    variant="outline"
                    className="h-11 px-4 text-xs font-bold border-indigo-500/40 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/60 rounded-xl gap-2"
                    onClick={insertCurrentToCanvas}
                  >
                    <Plus className="w-4 h-4" />
                    Insert onto Board
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* TAB 1: PLAY MODE (Multi-touch enabled) */}
        {tab === "play" && (
          <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto">
            {/* Title & Instructions */}
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  {currentActivity.subject} · {currentActivity.type.toUpperCase()} Challenge
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
              <p className="text-sm text-slate-300 mt-0.5">
                {currentActivity.instructions} <span className="text-indigo-400 font-semibold">(Multi-touch: multiple students can drag cards together!)</span>
              </p>
            </div>

            {/* ACTIVITY PLAY AREA BY TYPE */}

            {/* 1. SORT: BUCKET / CATEGORY COLUMNS */}
            {currentActivity.type === "sort" && (
              <div
                className={`grid gap-4 my-2 flex-1 min-h-[240px] ${
                  currentActivity.categories.length === 2
                    ? "grid-cols-2"
                    : currentActivity.categories.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-4"
                }`}
              >
                {currentActivity.categories.map((cat, idx) => {
                  const placedItemIds = Object.entries(placements)
                    .filter(([_, bucket]) => bucket === cat)
                    .map(([itemId]) => itemId);

                  const colThemes = [
                    "border-blue-500/40 bg-blue-950/20 text-blue-300",
                    "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
                    "border-amber-500/40 bg-amber-950/20 text-amber-300",
                    "border-purple-500/40 bg-purple-950/20 text-purple-300",
                  ];
                  const theme = colThemes[idx % colThemes.length];

                  return (
                    <div
                      key={cat}
                      ref={(el) => {
                        bucketRefs.current[cat] = el;
                      }}
                      onClick={() => handleBucketClick(cat)}
                      className={`rounded-2xl border-2 p-4 flex flex-col transition-all cursor-pointer ${theme} ${
                        selectedItemId
                          ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 border-indigo-500/80 shadow-lg"
                          : "hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
                        <span className="font-black text-lg text-white">{cat}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 font-bold text-slate-300">
                          {placedItemIds.length}
                        </span>
                      </div>

                      {/* Bucket Items List */}
                      <div className="space-y-2 flex-1">
                        {placedItemIds.map((itemId) => {
                          const item = itemMap.get(itemId);
                          if (!item) return null;
                          const isCorrect = checked && item.category === cat;
                          const isIncorrect = checked && item.category !== cat;

                          return (
                            <div
                              key={itemId}
                              onClick={(e) => {
                                e.stopPropagation();
                                returnCardToBank(itemId);
                              }}
                              className={`p-3 rounded-xl font-bold text-base flex items-center justify-between shadow-md transition-all cursor-pointer min-h-[52px] ${
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
                                <span className="text-sm font-black">
                                  {isCorrect ? "✓" : "✗"}
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {placedItemIds.length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-4 text-center text-sm font-semibold">
                            Drop card here or tap to place
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. MATCH: PAIRING ROWS SCREEN */}
            {currentActivity.type === "match" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2 flex-1 min-h-[260px] overflow-y-auto pr-1">
                {currentActivity.categories.map((promptTerm, idx) => {
                  const placedItemId = Object.entries(placements).find(([_, target]) => target === promptTerm)?.[0];
                  const placedItem = placedItemId ? itemMap.get(placedItemId) : null;
                  const isCorrect = checked && placedItem?.category === promptTerm;
                  const isIncorrect = checked && placedItem && placedItem.category !== promptTerm;

                  return (
                    <div
                      key={promptTerm}
                      ref={(el) => {
                        bucketRefs.current[promptTerm] = el;
                      }}
                      onClick={() => handleBucketClick(promptTerm)}
                      className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all cursor-pointer min-h-[76px] ${
                        isCorrect
                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-100"
                          : isIncorrect
                          ? "border-rose-500 bg-rose-950/40 text-rose-100"
                          : placedItem
                          ? "border-indigo-500 bg-indigo-950/30 text-white"
                          : selectedItemId
                          ? "border-indigo-400 border-dashed bg-slate-800/80 text-slate-200 ring-2 ring-indigo-400/40"
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      {/* Left: Term Prompt */}
                      <div className="font-extrabold text-base text-white flex items-center gap-2.5 shrink-0 max-w-[40%]">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{promptTerm}</span>
                      </div>

                      {/* Right: Paired Match Slot */}
                      <div className="flex-1">
                        {placedItem ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              returnCardToBank(placedItemId!);
                            }}
                            className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : isIncorrect
                                ? "bg-rose-800 text-white"
                                : "bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
                            }`}
                            title="Tap to unpair"
                          >
                            <span className="leading-snug">{placedItem.text}</span>
                            {checked && (
                              <span className="font-black text-sm ml-2">
                                {isCorrect ? "✓" : "✗"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl border-2 border-dashed border-slate-800 text-[11px] text-slate-500 text-center font-medium">
                            Drop definition card here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. LABEL: INTERACTIVE DIAGRAM WITH HOTSPOT SPOTS */}
            {currentActivity.type === "label" && (
              <div className="relative flex-1 min-h-[300px] max-h-[420px] my-2 rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden flex items-center justify-center select-none shadow-inner">
                {/* Embedded Scientific Illustration */}
                <svg viewBox="0 0 600 380" className="w-full h-full max-h-[380px] object-contain pointer-events-none">
                  {/* Ground Layer */}
                  <path d="M 40 300 Q 300 295 560 300 L 560 380 L 40 380 Z" fill="#2d1b0f" opacity="0.75" />
                  <line x1="40" y1="300" x2="560" y2="300" stroke="#92400e" strokeWidth="3" strokeDasharray="8 6" />

                  {/* Roots */}
                  <path d="M 300 300 C 290 330 250 350 210 365" stroke="#b45309" strokeWidth="5" strokeLinecap="round" fill="none" />
                  <path d="M 300 300 C 310 335 350 355 390 370" stroke="#b45309" strokeWidth="5" strokeLinecap="round" fill="none" />
                  <path d="M 300 300 C 295 330 305 355 300 375" stroke="#d97706" strokeWidth="6" strokeLinecap="round" fill="none" />
                  <path d="M 260 325 C 230 335 200 340 180 345" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M 330 330 C 360 340 390 345 420 350" stroke="#92400e" strokeWidth="3" strokeLinecap="round" fill="none" />

                  {/* Main Stem */}
                  <path d="M 300 300 C 303 220 297 150 300 85" stroke="#16a34a" strokeWidth="12" strokeLinecap="round" fill="none" />

                  {/* Foliage / Leaves */}
                  <path d="M 300 210 C 230 200 160 175 130 145 C 185 135 255 160 300 190 Z" fill="#22c55e" opacity="0.9" stroke="#15803d" strokeWidth="2.5" />
                  <path d="M 300 200 C 235 180 180 165 130 145" stroke="#15803d" strokeWidth="2.5" fill="none" />

                  <path d="M 300 165 C 370 155 440 130 470 100 C 415 90 345 115 300 145 Z" fill="#22c55e" opacity="0.9" stroke="#15803d" strokeWidth="2.5" />
                  <path d="M 300 155 C 365 135 420 120 470 100" stroke="#15803d" strokeWidth="2.5" fill="none" />

                  {/* Flower Petals & Stamen */}
                  <circle cx="300" cy="55" r="16" fill="#facc15" stroke="#ca8a04" strokeWidth="3" />
                  <circle cx="300" cy="22" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="300" cy="88" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="267" cy="55" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="333" cy="55" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="276" cy="31" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="324" cy="31" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="276" cy="79" r="18" fill="#ec4899" opacity="0.9" />
                  <circle cx="324" cy="79" r="18" fill="#ec4899" opacity="0.9" />
                </svg>

                {/* Hotspot Target Pins Overlay */}
                {(currentActivity.spots || [
                  { id: "pal-spot-1", label: "Flower", x: 50, y: 16 },
                  { id: "pal-spot-2", label: "Leaf", x: 26, y: 44 },
                  { id: "pal-spot-3", label: "Stem", x: 54, y: 55 },
                  { id: "pal-spot-4", label: "Root System", x: 50, y: 84 },
                ]).map((spot) => {
                  const placedItemId = Object.entries(placements).find(([_, target]) => target === spot.label)?.[0];
                  const placedItem = placedItemId ? itemMap.get(placedItemId) : null;
                  const isCorrect = checked && placedItem?.category === spot.label;
                  const isIncorrect = checked && placedItem && placedItem.category !== spot.label;

                  return (
                    <div
                      key={spot.id}
                      ref={(el) => {
                        bucketRefs.current[spot.label] = el;
                      }}
                      onClick={() => handleBucketClick(spot.label)}
                      style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className={`absolute cursor-pointer flex flex-col items-center group transition-all z-10 ${
                        selectedItemId ? "animate-pulse" : ""
                      }`}
                    >
                      <div
                        className={`px-3.5 py-1.5 rounded-full border-2 text-xs font-black shadow-2xl flex items-center gap-1.5 backdrop-blur-md transition-all ${
                          isCorrect
                            ? "bg-emerald-600 border-emerald-400 text-white scale-110"
                            : isIncorrect
                            ? "bg-rose-600 border-rose-400 text-white scale-110 animate-shake"
                            : placedItem
                            ? "bg-indigo-600 border-indigo-400 text-white"
                            : selectedItemId
                            ? "bg-amber-500 border-amber-300 text-slate-950 ring-4 ring-amber-400/50"
                            : "bg-slate-900/90 border-slate-600 text-slate-200 hover:border-indigo-400 hover:scale-105"
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                        <span>{placedItem ? placedItem.text : `Target: ${spot.label}`}</span>
                        {checked && placedItem && (
                          <span className="font-extrabold ml-1">{isCorrect ? "✓" : "✗"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* UNPLACED CARDS BANK */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Card Bank ({unplacedCardIds.length} remaining)
                  </span>
                  <button
                    type="button"
                    onClick={shuffleCards}
                    className="p-1 rounded-md text-amber-400 hover:bg-slate-800 transition"
                    title="Shuffle cards"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                </div>
                {selectedItemId && (
                  <span className="text-xs font-bold text-indigo-400 animate-pulse">
                    Tap a category bucket above to place selected card
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 min-h-[72px] p-3 rounded-2xl bg-slate-950 border border-slate-800 items-center">
                {unplacedCardIds.length === 0 ? (
                  <div className="w-full text-center text-sm font-bold text-emerald-400 py-2 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    All cards placed! Tap "Check Answers" below to evaluate.
                  </div>
                ) : (
                  unplacedCardIds.map((itemId) => {
                    const item = itemMap.get(itemId);
                    if (!item) return null;
                    const isSelected = selectedItemId === itemId;

                    return (
                      <div
                        key={itemId}
                        onPointerDown={(e) => handlePointerDown(e, itemId)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={() => handleCardClick(itemId)}
                        className={`touch-none min-h-[56px] px-5 py-3 rounded-2xl font-bold text-base shadow-md transition-all active:scale-95 cursor-grab active:cursor-grabbing border flex items-center justify-center ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-500/40 scale-105"
                            : "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                        }`}
                      >
                        {item.text}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ACTION CONTROLS (≥64px touch target) */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={resetActivity}
                className="min-h-[56px] px-6 rounded-2xl border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 font-bold text-base gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Reset Board
              </Button>

              <Button
                onClick={checkAnswers}
                className="min-h-[56px] px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg shadow-lg shadow-emerald-600/30 active:scale-95 transition-all gap-2"
              >
                <Award className="w-5 h-5" />
                Check Answers
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY PRESET LIBRARY */}
        {tab === "library" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-3">
            <h3 className="text-lg font-black text-white mb-2">Curriculum Activity Library</h3>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_ACTIVITIES.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className="p-4 rounded-2xl border border-slate-800 bg-slate-950 hover:border-indigo-500/60 hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                        {preset.subject}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        {preset.type}
                      </span>
                    </div>
                    <div className="text-base font-bold text-white mt-1 group-hover:text-indigo-200">
                      {preset.title}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {preset.instructions}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>{preset.items.length} cards · {preset.categories.length} categories</span>
                    <span className="font-bold text-indigo-400 group-hover:translate-x-1 transition-transform">
                      Play Now →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CREATE CUSTOM ACTIVITY */}
        {tab === "create" && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <h3 className="text-lg font-black text-white">Create Custom Smart Board Activity</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                  Activity Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Periodic Groups: Metals vs Non-Metals"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                    Subject / Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chemistry · Grade 8"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                    Activity Type
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as ActivityType)}
                    className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium"
                  >
                    <option value="sort">Category Sort (Buckets)</option>
                    <option value="match">Match (Pairing)</option>
                    <option value="label">Label (Diagram Targets)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-blue-400 block">
                    Category 1 Name
                  </label>
                  <input
                    type="text"
                    value={customCat1}
                    onChange={(e) => setCustomCat1(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
                  />
                  <label className="text-xs font-semibold text-slate-400 block">
                    Items (comma-separated):
                  </label>
                  <textarea
                    rows={3}
                    value={customItems1}
                    onChange={(e) => setCustomItems1(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                    placeholder="Iron, Copper, Gold, Silver"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-emerald-400 block">
                    Category 2 Name
                  </label>
                  <input
                    type="text"
                    value={customCat2}
                    onChange={(e) => setCustomCat2(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-700 text-white font-medium"
                  />
                  <label className="text-xs font-semibold text-slate-400 block">
                    Items (comma-separated):
                  </label>
                  <textarea
                    rows={3}
                    value={customItems2}
                    onChange={(e) => setCustomItems2(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
                    placeholder="Oxygen, Nitrogen, Helium, Neon"
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateCustom}
                disabled={!customTitle.trim()}
                className="w-full min-h-[56px] rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-extrabold text-base"
              >
                Launch Custom Activity
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
