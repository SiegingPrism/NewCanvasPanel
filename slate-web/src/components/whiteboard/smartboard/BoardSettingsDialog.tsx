import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PenTool,
  Layers,
  Users,
  Tv,
  Check,
  Lock,
  Sparkles,
  Sliders,
  Shield,
  Volume2,
  Globe,
} from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import {
  getSmartBoardProfile,
  SMART_BOARD_PROFILES,
  PanelDiagonal,
} from "@/lib/whiteboard/smartBoardProfiles";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

interface BoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardSettingsDialog({ open, onOpenChange }: BoardSettingsDialogProps) {
  const {
    panelSize,
    setPanelSize,
    boardMode,
    setBoardMode,
    simpleMode,
    setSimpleMode,
    lockBoard,
    setLockBoard,
    splitBoardZones,
    setSplitBoardZones,
    autoSnapEnabled,
    setAutoSnapEnabled,
    setBackground,
  } = useWhiteboard();

  const [tab, setTab] = useState<"writing" | "pages" | "classroom" | "display" | "language">("writing");
  const { t, language, setLanguage } = useTranslation();
  const profile = getSmartBoardProfile(panelSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl bg-card p-6 shadow-2xl border border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold">
            <Sliders className="h-6 w-6" />
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Smart Board Settings
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Task-based Tab Navigation */}
        <div className="flex rounded-2xl bg-muted/60 p-1.5 my-2">
          <button
            onClick={() => setTab("writing")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all",
              tab === "writing"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PenTool className="h-4 w-4" />
            Writing
          </button>
          <button
            onClick={() => setTab("pages")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all",
              tab === "pages"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers className="h-4 w-4" />
            Pages
          </button>
          <button
            onClick={() => setTab("classroom")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all",
              tab === "classroom"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="h-4 w-4" />
            Classroom
          </button>
          <button
            onClick={() => setTab("display")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all",
              tab === "display"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Tv className="h-4 w-4" />
            Display
          </button>
          <button
            onClick={() => setTab("language")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all",
              tab === "language"
                ? "bg-card text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="h-4 w-4" />
            {t("language")}
          </button>
        </div>

        {/* Tab 1: Writing */}
        {tab === "writing" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Contact-Size Palm Rejection
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Rest wrist and palm naturally on glass while writing with passive pens.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                Active ({profile.contactPalmMinPx}px)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Natural Fist / Palm Erase</span>
                <p className="text-[11px] text-muted-foreground">
                  Wiping the screen with your fist or side of hand acts as an eraser.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                Active (&gt;{profile.contactFistMinPx}px)
              </span>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Shape Recognition & Auto-Snap
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Hand-drawn circles, triangles, arrows and boxes snap to geometric perfection.
                </p>
              </div>
              <Switch checked={autoSnapEnabled} onCheckedChange={setAutoSnapEnabled} />
            </div>
          </div>
        )}

        {/* Tab 2: Pages */}
        {tab === "pages" && (
          <div className="space-y-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Default Classroom Ruling
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Plain White", bg: "white" as const },
                { label: "Lined Paper", bg: "lined" as const },
                { label: "4-Line English/Hindi", bg: "four-line" as const },
                { label: "Music Staves", bg: "music-staves" as const },
                { label: "Math Grid", bg: "grid" as const },
                { label: "Millimeter Graph", bg: "millimeter-graph" as const },
                { label: "Blackboard Green", bg: "blackboard" as const },
                { label: "Dark Room", bg: "dark" as const },
                { label: "Black", bg: "oled" as const },
              ].map((item) => (
                <button
                  key={item.bg}
                  onClick={() => setBackground(item.bg)}
                  className="flex flex-col items-center justify-center rounded-xl border border-border/80 p-2.5 hover:bg-muted transition-all active:scale-95 text-xs font-bold"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Classroom */}
        {tab === "classroom" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Lock Board (Freeze Pan & Zoom)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Prevents accidental panning and zooming while students solve at the board.
                </p>
              </div>
              <Switch checked={lockBoard} onCheckedChange={setLockBoard} />
            </div>

            <div className="space-y-2 rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">
                  Split Board Multi-User Zones
                </span>
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {splitBoardZones === 1 ? "Full Board" : `${splitBoardZones} Zones`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1, 2, 3, 4].map((z) => (
                  <button
                    key={z}
                    disabled={z > profile.maxSplitZones}
                    onClick={() => setSplitBoardZones(z)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-black transition-all border",
                      splitBoardZones === z
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-border hover:bg-muted disabled:opacity-30",
                    )}
                  >
                    {z === 1 ? "1 (Full)" : `${z} Zones`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Display */}
        {tab === "display" && (
          <div className="space-y-4 py-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                Active Smart Board Screen Size (16:9 4K)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(["55", "65", "75", "86", "98", "110"] as PanelDiagonal[]).map((sizeKey) => {
                  const p = SMART_BOARD_PROFILES[sizeKey];
                  const active = panelSize === sizeKey;
                  return (
                    <button
                      key={sizeKey}
                      onClick={() => setPanelSize(sizeKey)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl p-3 text-xs font-bold border transition-all",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <span className="text-sm font-black">{sizeKey}&quot; Panel</span>
                      <span className="text-[10px] opacity-90 font-medium">
                        {p.widthCm} × {p.heightCm} cm
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {Math.round(p.widthInches)}″ × {Math.round(p.heightInches)}″ ·{" "}
                        {p.minTouchTargetPx}px touch
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  Dedicated Smart Board UI Layout
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Dual mirrored vertical side docks and corner navigation strips.
                </p>
              </div>
              <Switch checked={boardMode} onCheckedChange={setBoardMode} />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Simple Teacher Mode</span>
                <p className="text-[11px] text-muted-foreground">
                  Hides 3D and AI options for teachers who just want writing and teaching.
                </p>
              </div>
              <Switch checked={simpleMode} onCheckedChange={setSimpleMode} />
            </div>

            {/* Indian Classrooms Interface Language */}
            <div className="flex items-center justify-between rounded-2xl border border-border/80 p-3 bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">
                  {t("language")} (App Interface)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  English, हिन्दी (Hindi), मराठी (Marathi) for Indian smart board classrooms.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
                {[
                  { code: "en" as const, label: "English" },
                  { code: "hi" as const, label: "हिन्दी" },
                  { code: "mr" as const, label: "मराठी" },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                      language === l.code
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Language (भाषा) */}
        {tab === "language" && (
          <div className="space-y-4 py-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                {t("language")} (App Interface) / भाषा निवडा
              </span>
              <p className="text-[11px] text-muted-foreground mb-3">
                Switch whiteboard menus, toolbar labels, and dialogs between English, Hindi, and Marathi.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    code: "en" as const,
                    name: "English",
                    native: "English",
                    desc: "Default English interface for all boards",
                  },
                  {
                    code: "hi" as const,
                    name: "Hindi",
                    native: "हिन्दी",
                    desc: "CBSE / NCERT / राज्य बोर्ड",
                  },
                  {
                    code: "mr" as const,
                    name: "Marathi",
                    native: "मराठी",
                    desc: "महाराष्ट्र राज्य मंडळ शाळा",
                  },
                ].map((item) => {
                  const active = language === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLanguage(item.code)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl p-4 text-center border-2 transition-all active:scale-95 cursor-pointer",
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-md font-bold"
                          : "border-border hover:bg-muted/60 text-foreground",
                      )}
                    >
                      <span className="text-lg font-black">{item.native}</span>
                      <span className="text-xs font-semibold opacity-90 mt-0.5">{item.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-1">{item.desc}</span>
                      {active && (
                        <span className="mt-2 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="h-3 w-3 stroke-[3]" /> Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
