import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Timer,
  Users,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Minimize2,
  Sparkles,
  Shuffle,
  Plus,
  Trash2,
  Check,
  UserCheck,
  UserPlus,
  Settings2,
  X,
} from "lucide-react";

// Web Audio API harmonic chime (works 100% offline, zero network assets required)
function playClassroomChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playHarmonic = (freq: number, start: number, dur: number, vol = 0.3) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    // 3-tone cheerful school chime: C5 -> E5 -> G5
    playHarmonic(523.25, now, 0.6, 0.25);
    playHarmonic(659.25, now + 0.2, 0.6, 0.25);
    playHarmonic(783.99, now + 0.4, 1.2, 0.35);
  } catch {}
}

const DEFAULT_STUDENTS = [
  "Emma Watson",
  "Liam Smith",
  "Noah Johnson",
  "Olivia Brown",
  "Lucas Garcia",
  "Sophia Davis",
  "Ethan Miller",
  "Ava Wilson",
  "Mason Martinez",
  "Mia Anderson",
  "Alexander Thomas",
  "Harper White",
  "James Taylor",
  "Charlotte Moore",
  "Benjamin Jackson",
  "Amelia Martin",
];

const PRESETS = [
  { label: "30 sec", sec: 30 },
  { label: "1 min", sec: 60 },
  { label: "2 min", sec: 120 },
  { label: "3 min", sec: 180 },
  { label: "5 min", sec: 300 },
  { label: "10 min", sec: 600 },
  { label: "15 min", sec: 900 },
];

export interface BigScreenClassroomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "timer" | "picker";
  onMinimizeTimer?: (secondsRemaining: number, isRunning: boolean) => void;
}

export function BigScreenClassroomModal({
  open,
  onOpenChange,
  defaultTab = "timer",
  onMinimizeTimer,
}: BigScreenClassroomModalProps) {
  const [activeTab, setActiveTab] = useState<"timer" | "picker" | "teams">(defaultTab);

  useEffect(() => {
    if (open && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  // -------------------------------------------------------------------------
  // TIMER STATE
  // -------------------------------------------------------------------------
  const [totalSeconds, setTotalSeconds] = useState(120);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setIsTimerRunning(false);
            if (soundEnabled) {
              playClassroomChime();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, soundEnabled]);

  const setTimerPreset = (sec: number) => {
    setIsTimerRunning(false);
    setTotalSeconds(sec);
    setRemainingSeconds(sec);
  };

  const adjustTimer = (deltaSec: number) => {
    setTotalSeconds((t) => Math.max(10, t + deltaSec));
    setRemainingSeconds((r) => Math.max(0, r + deltaSec));
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setRemainingSeconds(totalSeconds);
  };

  const timerMinutes = Math.floor(remainingSeconds / 60);
  const timerSeconds = remainingSeconds % 60;
  const progressPercent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  // -------------------------------------------------------------------------
  // NAME PICKER & TEAMS STATE
  // -------------------------------------------------------------------------
  const [students, setStudents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("slate:classroom_students");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STUDENTS;
  });

  const [availableStudents, setAvailableStudents] = useState<string[]>(students);
  const [pickedHistory, setPickedHistory] = useState<string[]>([]);
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [removeAfterPick, setRemoveAfterPick] = useState(true);
  const [isEditingRoster, setIsEditingRoster] = useState(false);
  const [rosterDraft, setRosterDraft] = useState("");
  const [teamCount, setTeamCount] = useState(4);
  const [generatedTeams, setGeneratedTeams] = useState<{ name: string; members: string[] }[]>([]);

  useEffect(() => {
    setAvailableStudents(students);
  }, [students]);

  const saveRoster = (newRoster: string[]) => {
    setStudents(newRoster);
    setAvailableStudents(newRoster);
    try {
      localStorage.setItem("slate:classroom_students", JSON.stringify(newRoster));
    } catch {}
  };

  const spinWheel = () => {
    if (availableStudents.length === 0) {
      // Auto reset pool if all picked
      setAvailableStudents(students);
      setPickedHistory([]);
    }
    const pool = availableStudents.length > 0 ? availableStudents : students;
    if (pool.length === 0) return;

    setIsSpinning(true);
    let counter = 0;
    const maxSpins = 25;
    const interval = 60;

    const timer = setInterval(() => {
      const randIdx = Math.floor(Math.random() * pool.length);
      setCurrentWinner(pool[randIdx]);
      counter++;

      if (counter >= maxSpins) {
        clearInterval(timer);
        const finalWinner = pool[Math.floor(Math.random() * pool.length)];
        setCurrentWinner(finalWinner);
        setIsSpinning(false);
        if (soundEnabled) playClassroomChime();

        if (removeAfterPick) {
          setAvailableStudents((prev) => prev.filter((s) => s !== finalWinner));
        }
        setPickedHistory((prev) => [finalWinner, ...prev]);
      }
    }, interval);
  };

  const generateTeams = () => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const teams: { name: string; members: string[] }[] = [];
    for (let i = 0; i < teamCount; i++) {
      teams.push({ name: `Team ${i + 1}`, members: [] });
    }
    shuffled.forEach((student, index) => {
      teams[index % teamCount].members.push(student);
    });
    setGeneratedTeams(teams);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 z-[100] w-screen h-screen max-w-none max-h-none rounded-none p-0 overflow-hidden bg-slate-950 text-white border-none shadow-2xl flex flex-col select-none">
        {/* Header Tabs & Fullscreen Controls */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "timer" ? "secondary" : "ghost"}
              className={`h-12 px-6 gap-2.5 text-base font-bold rounded-xl ${
                activeTab === "timer" ? "bg-indigo-600 text-white hover:bg-indigo-500" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("timer")}
            >
              <Timer className="w-5 h-5" />
              Classroom Timer
            </Button>
            <Button
              variant={activeTab === "picker" ? "secondary" : "ghost"}
              className={`h-12 px-6 gap-2.5 text-base font-bold rounded-xl ${
                activeTab === "picker" ? "bg-indigo-600 text-white hover:bg-indigo-500" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("picker")}
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
              Name Picker
            </Button>
            <Button
              variant={activeTab === "teams" ? "secondary" : "ghost"}
              className={`h-12 px-6 gap-2.5 text-base font-bold rounded-xl ${
                activeTab === "teams" ? "bg-indigo-600 text-white hover:bg-indigo-500" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => {
                setActiveTab("teams");
                if (generatedTeams.length === 0) generateTeams();
              }}
            >
              <Users className="w-5 h-5 text-emerald-400" />
              Make Teams
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-slate-400 hover:text-white rounded-xl"
              title={soundEnabled ? "Mute audio chime" : "Enable audio chime"}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6 text-red-400" />}
            </Button>
            {activeTab === "timer" && onMinimizeTimer && (
              <Button
                variant="outline"
                className="h-11 px-4 gap-2 text-xs font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl"
                onClick={() => {
                  onMinimizeTimer(remainingSeconds, isTimerRunning);
                  onOpenChange(false);
                }}
              >
                <Minimize2 className="w-4 h-4" />
                Minimize to Corner
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-300 rounded-xl ml-1"
              title="Close Fullscreen"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* TAB 1: BIG CENTRE TIMER (500-600px ring & 160px digits) */}
        {activeTab === "timer" && (
          <div className="p-8 flex flex-col items-center justify-center flex-1 bg-gradient-to-b from-slate-900 to-slate-950 overflow-y-auto">
            {/* Circular Progress & Huge Digital Display */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-[460px] h-[460px] md:w-[540px] md:h-[540px] transform -rotate-90">
                <circle
                  cx="270"
                  cy="270"
                  r="230"
                  stroke="currentColor"
                  strokeWidth="20"
                  className="text-slate-800"
                  fill="transparent"
                />
                <circle
                  cx="270"
                  cy="270"
                  r="230"
                  stroke="currentColor"
                  strokeWidth="20"
                  strokeDasharray={2 * Math.PI * 230}
                  strokeDashoffset={2 * Math.PI * 230 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  className={`transition-all duration-500 ${
                    remainingSeconds <= 10
                      ? "text-red-500 animate-pulse"
                      : remainingSeconds <= 60
                      ? "text-amber-500"
                      : "text-indigo-500"
                  }`}
                  fill="transparent"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-mono font-black tracking-tighter tabular-nums select-none ${
                    remainingSeconds === 0
                      ? "text-8xl md:text-[140px] text-red-400 animate-bounce"
                      : "text-9xl md:text-[160px] text-white drop-shadow-2xl"
                  }`}
                >
                  {String(timerMinutes).padStart(2, "0")}:{String(timerSeconds).padStart(2, "0")}
                </span>
                {remainingSeconds === 0 && (
                  <span className="text-2xl font-black uppercase tracking-widest text-red-400 mt-4">Time's Up!</span>
                )}
              </div>
            </div>

            {/* Quick Presets Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 max-w-xl">
              {PRESETS.map((p) => (
                <button
                  key={p.sec}
                  onClick={() => setTimerPreset(p.sec)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    totalSeconds === p.sec
                      ? "bg-indigo-600 text-white shadow-indigo-500/25 ring-2 ring-indigo-400"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Huge Controls Row (>= 64px touch target) */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                className="h-16 px-6 text-lg font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl"
                onClick={() => adjustTimer(-60)}
                title="Subtract 1 minute"
              >
                - 1 min
              </Button>

              <Button
                className={`h-16 px-12 text-2xl font-bold gap-3 rounded-2xl shadow-xl transition-all ${
                  isTimerRunning
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                {isTimerRunning ? "Pause" : remainingSeconds === 0 ? "Restart" : "Start Timer"}
              </Button>

              <Button
                variant="outline"
                className="h-16 px-6 text-lg font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl"
                onClick={() => adjustTimer(60)}
                title="Add 1 minute"
              >
                + 1 min
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl ml-2"
                onClick={resetTimer}
                title="Reset timer"
              >
                <RotateCcw className="w-7 h-7" />
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: RANDOM STUDENT NAME PICKER */}
        {activeTab === "picker" && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-slate-900 to-slate-950">
            {isEditingRoster ? (
              <div className="w-full max-w-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-white">Edit Class Roster</h4>
                  <span className="text-xs text-slate-400">One student name per line</span>
                </div>
                <textarea
                  className="w-full h-56 p-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={rosterDraft}
                  onChange={(e) => setRosterDraft(e.target.value)}
                  placeholder="Paste student names here..."
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditingRoster(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6"
                    onClick={() => {
                      const lines = rosterDraft
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean);
                      if (lines.length > 0) {
                        saveRoster(lines);
                      }
                      setIsEditingRoster(false);
                    }}
                  >
                    Save Roster ({rosterDraft.split("\n").filter((l) => l.trim()).length} Students)
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Centre Winner Display (>= 100px font for smart boards) */}
                <div className="w-full max-w-4xl py-14 px-8 rounded-3xl bg-slate-950/80 border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-3">
                    {isSpinning ? "Selecting random student..." : currentWinner ? "Selected Student:" : "Ready to Pick"}
                  </span>
                  <div
                    className={`font-black tracking-tight transition-all duration-150 min-h-[130px] flex items-center justify-center ${
                      isSpinning
                        ? "text-6xl md:text-7xl text-slate-400 scale-95"
                        : currentWinner
                        ? "text-7xl md:text-[104px] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-indigo-400 scale-105 drop-shadow-2xl"
                        : "text-5xl md:text-6xl text-slate-600"
                    }`}
                  >
                    {currentWinner || "Tap Spin to Start"}
                  </div>

                  {currentWinner && !isSpinning && (
                    <div className="mt-4 flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                      <Sparkles className="w-4 h-4" />
                      Congratulations! It's your turn at the board.
                    </div>
                  )}
                </div>

                {/* Big Action Buttons */}
                <div className="flex items-center gap-4 mt-8">
                  <Button
                    disabled={isSpinning}
                    className="h-16 px-12 text-2xl font-black gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-xl shadow-indigo-500/25"
                    onClick={spinWheel}
                  >
                    <Shuffle className={`w-7 h-7 ${isSpinning ? "animate-spin" : ""}`} />
                    {isSpinning ? "Spinning..." : "Pick a Student"}
                  </Button>

                  <Button
                    variant="outline"
                    className="h-16 px-5 border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-2xl gap-2 font-semibold"
                    onClick={() => {
                      setRosterDraft(students.join("\n"));
                      setIsEditingRoster(true);
                    }}
                  >
                    <Settings2 className="w-5 h-5" />
                    Roster ({students.length})
                  </Button>
                </div>

                {/* Pool Status & Toggles */}
                <div className="flex items-center gap-6 mt-6 text-sm text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={removeAfterPick}
                      onChange={(e) => setRemoveAfterPick(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Remove from pool after picked ({availableStudents.length} remaining)</span>
                  </label>

                  {pickedHistory.length > 0 && (
                    <button
                      className="text-xs text-indigo-400 hover:underline"
                      onClick={() => {
                        setAvailableStudents(students);
                        setPickedHistory([]);
                        setCurrentWinner(null);
                      }}
                    >
                      Reset Pool
                    </button>
                  )}
                </div>

                {/* Recent History Chips */}
                {pickedHistory.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 max-w-xl">
                    <span className="text-xs text-slate-500 mr-1">Already picked:</span>
                    {pickedHistory.slice(0, 8).map((name, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-400 border border-slate-700/50"
                      >
                        {name}
                      </span>
                    ))}
                    {pickedHistory.length > 8 && (
                      <span className="text-xs text-slate-500">+{pickedHistory.length - 8} more</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 3: MAKE TEAMS & GROUPS */}
        {activeTab === "teams" && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[460px] bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="flex items-center justify-between w-full max-w-4xl mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-300">Number of Teams:</span>
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setTeamCount(num);
                      const shuffled = [...students].sort(() => Math.random() - 0.5);
                      const t: { name: string; members: string[] }[] = [];
                      for (let i = 0; i < num; i++) t.push({ name: `Team ${i + 1}`, members: [] });
                      shuffled.forEach((s, idx) => t[idx % num].members.push(s));
                      setGeneratedTeams(t);
                    }}
                    className={`h-10 w-10 rounded-xl font-bold text-sm ${
                      teamCount === num
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <Button
                className="h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 rounded-xl"
                onClick={generateTeams}
              >
                <Shuffle className="w-4 h-4" />
                Reshuffle Teams
              </Button>
            </div>

            {/* Teams Grid */}
            <div
              className={`grid gap-4 w-full max-w-4xl ${
                teamCount === 2
                  ? "grid-cols-2"
                  : teamCount === 3
                  ? "grid-cols-3"
                  : teamCount === 4
                  ? "grid-cols-2 md:grid-cols-4"
                  : "grid-cols-2 md:grid-cols-3"
              }`}
            >
              {generatedTeams.map((team, idx) => {
                const colors = [
                  "border-blue-500/50 bg-blue-950/30 text-blue-300",
                  "border-emerald-500/50 bg-emerald-950/30 text-emerald-300",
                  "border-amber-500/50 bg-amber-950/30 text-amber-300",
                  "border-purple-500/50 bg-purple-950/30 text-purple-300",
                  "border-pink-500/50 bg-pink-950/30 text-pink-300",
                  "border-cyan-500/50 bg-cyan-950/30 text-cyan-300",
                ];
                const cardColor = colors[idx % colors.length];

                return (
                  <div
                    key={team.name}
                    className={`p-4 rounded-2xl border shadow-lg ${cardColor} min-h-[180px] flex flex-col`}
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 font-black text-lg">
                      <span>{team.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-medium">
                        {team.members.length} students
                      </span>
                    </div>
                    <ul className="space-y-1.5 flex-1">
                      {team.members.map((m, mIdx) => (
                        <li key={mIdx} className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

