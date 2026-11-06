import React, { useState, useEffect } from "react";
import { Sparkles, Users, Shuffle, UserCheck, Plus, Trash2, StickyNote } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { cn } from "@/lib/utils";

const DEFAULT_NAMES = [
  "Aarav",
  "Ananya",
  "Diya",
  "Ishan",
  "Priya",
  "Rohan",
  "Kabir",
  "Tanya",
  "Vihaan",
  "Zara",
  "Aditya",
  "Meera",
  "Arjun",
  "Kavya",
  "Siddharth",
];

export function RandomPickerWidget() {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [tab, setTab] = useState<"pick" | "groups" | "roster">("pick");
  const [names, setNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("slate_class_roster");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_NAMES;
  });
  const [rosterInput, setRosterInput] = useState(names.join("\n"));
  const [chosenStudent, setChosenStudent] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [numGroups, setNumGroups] = useState<number>(3);
  const [generatedGroups, setGeneratedGroups] = useState<string[][]>([]);

  useEffect(() => {
    try {
      localStorage.setItem("slate_class_roster", JSON.stringify(names));
    } catch {}
  }, [names]);

  const saveRoster = () => {
    const list = rosterInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (list.length > 0) {
      setNames(list);
      setTab("pick");
    }
  };

  const pickRandomStudent = () => {
    if (names.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setChosenStudent(null);

    let counter = 0;
    const totalSpins = 24;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * names.length);
      setDisplayName(names[randIdx]);
      counter++;
      if (counter >= totalSpins) {
        clearInterval(interval);
        const finalWinner = names[Math.floor(Math.random() * names.length)];
        setDisplayName(finalWinner);
        setChosenStudent(finalWinner);
        setIsSpinning(false);
      }
    }, 60);
  };

  const generateGroups = () => {
    if (names.length === 0) return;
    const shuffled = [...names].sort(() => Math.random() - 0.5);
    const groups: string[][] = Array.from({ length: numGroups }, () => []);
    shuffled.forEach((name, i) => {
      groups[i % numGroups].push(name);
    });
    setGeneratedGroups(groups);
  };

  const placeGroupsOnBoard = () => {
    if (generatedGroups.length === 0) return;
    const startX = -camera.x / camera.zoom + 80;
    const startY = -camera.y / camera.zoom + 80;
    const colors = ["#fef08a", "#bae6fd", "#bbf7d0", "#fbcfe8", "#fed7aa", "#ddd6fe"];

    generatedGroups.forEach((grp, idx) => {
      const cardX = startX + (idx % 3) * 260;
      const cardY = startY + Math.floor(idx / 3) * 260;
      addObject({
        id: Math.random().toString(36).slice(2, 10),
        kind: "sticky",
        x: cardX,
        y: cardY,
        w: 220,
        h: 200,
        text: `Team ${idx + 1}:\n• ${grp.join("\n• ")}`,
        color: colors[idx % colors.length],
      });
    });
    pushHistory();
  };

  return (
    <div className="w-80 select-none space-y-3 p-1">
      {/* Tab Switcher */}
      <div className="flex rounded-xl bg-muted/60 p-1">
        <button
          onClick={() => setTab("pick")}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "pick"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Pick Student
        </button>
        <button
          onClick={() => {
            setTab("groups");
            if (generatedGroups.length === 0) generateGroups();
          }}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "groups"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Make Groups
        </button>
        <button
          onClick={() => {
            setRosterInput(names.join("\n"));
            setTab("roster");
          }}
          className={cn(
            "flex-1 py-1 text-xs font-bold rounded-lg transition-all",
            tab === "roster"
              ? "bg-card text-foreground shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Class List ({names.length})
        </button>
      </div>

      {/* Tab 1: Pick a Student */}
      {tab === "pick" && (
        <div className="flex flex-col items-center space-y-3 pt-2">
          <div className="flex h-32 w-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-muted/40 p-4 border border-border shadow-inner">
            {chosenStudent ? (
              <div className="text-center animate-in zoom-in-90 duration-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Selected Student
                </span>
                <p className="text-3xl font-black text-foreground mt-1">{chosenStudent}</p>
                <span className="text-xs text-muted-foreground mt-0.5 inline-block">
                  🎉 Your turn to solve!
                </span>
              </div>
            ) : isSpinning ? (
              <div className="text-center">
                <span className="text-xs font-semibold text-muted-foreground animate-pulse">
                  Picking...
                </span>
                <p className="text-2xl font-extrabold text-foreground mt-1 font-mono tracking-wide">
                  {displayName}
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Shuffle className="h-8 w-8 mx-auto opacity-40 mb-1" />
                <p className="text-xs font-medium">
                  Tap &apos;Pick Random&apos; to call on a student
                </p>
              </div>
            )}
          </div>

          <button
            onClick={pickRandomStudent}
            disabled={isSpinning || names.length === 0}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-extrabold shadow-md hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-5 w-5" />
            Pick Random Student
          </button>
        </div>
      )}

      {/* Tab 2: Make Groups */}
      {tab === "groups" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Number of Teams:</span>
            <div className="flex items-center gap-1">
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setNumGroups(n);
                  }}
                  className={cn(
                    "h-7 w-7 rounded-lg text-xs font-bold transition-all",
                    numGroups === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={generateGroups}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-muted font-bold text-foreground hover:bg-accent transition-all active:scale-95 text-xs"
          >
            <Shuffle className="h-4 w-4" />
            Shuffle Teams
          </button>

          {/* Group display */}
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {generatedGroups.map((grp, i) => (
              <div key={i} className="rounded-xl bg-muted/40 p-2 border border-border/80">
                <p className="text-xs font-bold text-primary mb-1">
                  Team {i + 1} ({grp.length})
                </p>
                <p className="text-xs text-foreground/90 font-medium">{grp.join(", ")}</p>
              </div>
            ))}
          </div>

          {generatedGroups.length > 0 && (
            <button
              onClick={placeGroupsOnBoard}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow hover:bg-sky-500 active:scale-95 transition-all"
            >
              <StickyNote className="h-4 w-4" />
              Place Teams as Sticky Notes on Board
            </button>
          )}
        </div>
      )}

      {/* Tab 3: Roster Input */}
      {tab === "roster" && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Enter student names separated by commas or new lines:
          </p>
          <textarea
            value={rosterInput}
            onChange={(e) => setRosterInput(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Aarav, Ananya, Diya, Ishan..."
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setNames(DEFAULT_NAMES);
                setRosterInput(DEFAULT_NAMES.join("\n"));
              }}
              className="flex-1 rounded-xl border border-border py-2 text-xs font-bold hover:bg-muted text-muted-foreground"
            >
              Reset Default
            </button>
            <button
              onClick={saveRoster}
              className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90"
            >
              Save Class List
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
