import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  Type,
  Palette,
  Check,
  Sparkles,
  Contrast,
} from "lucide-react";
import { toast } from "sonner";
import { useWhiteboard } from "@/lib/whiteboard/store";

export interface AccessibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OKABE_ITO_PALETTE = [
  { name: "Black", hex: "#000000", safeFor: "All students" },
  { name: "Orange", hex: "#e69f00", safeFor: "Color-blind safe" },
  { name: "Sky Blue", hex: "#56b4e9", safeFor: "Color-blind safe" },
  { name: "Bluish Green", hex: "#009e73", safeFor: "Color-blind safe" },
  { name: "Yellow", hex: "#f0e442", safeFor: "Color-blind safe" },
  { name: "Blue", hex: "#0072b2", safeFor: "Color-blind safe" },
  { name: "Vermilion", hex: "#d55e00", safeFor: "Color-blind safe" },
  { name: "Reddish Purple", hex: "#cc79a7", safeFor: "Color-blind safe" },
];

export function AccessibilityDialog({ open, onOpenChange }: AccessibilityDialogProps) {
  const { setBackground, setColor } = useWhiteboard();

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem("slate_a11y_high_contrast") === "true";
    } catch {}
    return false;
  });

  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => {
    try {
      return localStorage.getItem("slate_a11y_dyslexic_font") === "true";
    } catch {}
    return false;
  });

  const [colorblindPaletteActive, setColorblindPaletteActive] = useState<boolean>(() => {
    try {
      return localStorage.getItem("slate_a11y_colorblind_palette") === "true";
    } catch {}
    return false;
  });

  // Ensure DOM classes reflect persisted state
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast-mode");
    } else {
      document.documentElement.classList.remove("high-contrast-mode");
    }
    if (dyslexicFont) {
      document.documentElement.classList.add("dyslexia-font-active");
    } else {
      document.documentElement.classList.remove("dyslexia-font-active");
    }
  }, [highContrast, dyslexicFont]);

  const handleToggleHighContrast = (checked: boolean) => {
    setHighContrast(checked);
    try {
      localStorage.setItem("slate_a11y_high_contrast", String(checked));
    } catch {}

    if (checked) {
      document.documentElement.classList.add("high-contrast-mode");
      setBackground("blackboard");
      setColor("#facc15"); // High-visibility bright yellow
      toast.success("High-Contrast Mode enabled (Yellow on Dark)");
    } else {
      document.documentElement.classList.remove("high-contrast-mode");
      setBackground("white");
      setColor("#0f172a");
      toast("High-Contrast Mode disabled");
    }
  };

  const handleToggleDyslexicFont = (checked: boolean) => {
    setDyslexicFont(checked);
    try {
      localStorage.setItem("slate_a11y_dyslexic_font", String(checked));
    } catch {}

    if (checked) {
      document.documentElement.classList.add("dyslexia-font-active");
      toast.success("Dyslexia-friendly typography enabled (high legibility)");
    } else {
      document.documentElement.classList.remove("dyslexia-font-active");
      toast("Standard typography restored");
    }
  };

  const handleApplyColorblindColor = (hex: string, name: string) => {
    setColor(hex);
    setColorblindPaletteActive(true);
    try {
      localStorage.setItem("slate_a11y_colorblind_palette", "true");
    } catch {}
    toast.success(`Selected ${name} (${hex}) — safe for all forms of color blindness`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-3xl bg-card border shadow-2xl">
        <DialogHeader className="pb-3 border-b flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Eye className="h-6 w-6" />
            </span>
            <div>
              <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                Classroom Accessibility Options
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Support low-vision, dyslexic, and color-blind students in every period.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* 1. High Contrast Mode */}
          <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Contrast className="h-5 w-5 text-amber-500" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">High-Contrast Mode</h4>
                  <p className="text-xs text-muted-foreground">
                    Deep dark background with high-visibility bright yellow ink for low-vision students.
                  </p>
                </div>
              </div>
              <Switch
                checked={highContrast}
                onCheckedChange={handleToggleHighContrast}
                aria-label="Toggle High-Contrast Mode"
              />
            </div>
          </div>

          {/* 2. Dyslexia-Friendly Font */}
          <div className="p-4 rounded-2xl border bg-card/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Type className="h-5 w-5 text-indigo-500" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Dyslexia-Friendly Font</h4>
                  <p className="text-xs text-muted-foreground">
                    Switches text, labels and cards to high-legibility letterforms with weighted bottoms.
                  </p>
                </div>
              </div>
              <Switch
                checked={dyslexicFont}
                onCheckedChange={handleToggleDyslexicFont}
                aria-label="Toggle Dyslexia-Friendly Font"
              />
            </div>
          </div>

          {/* 3. Colorblind-Safe Pen Palette (Okabe-Ito) */}
          <div className="p-4 rounded-2xl border bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Palette className="h-5 w-5 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Colorblind-Safe Pen Palette (Okabe-Ito)</h4>
                  <p className="text-xs text-muted-foreground">
                    Scientifically proven 8-color palette easily distinguishable under Deuteranopia, Protanopia & Tritanopia.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {OKABE_ITO_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => handleApplyColorblindColor(c.hex, c.name)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-border hover:border-slate-400 bg-background transition-all active:scale-95 text-left"
                >
                  <span
                    style={{ backgroundColor: c.hex }}
                    className="h-6 w-6 rounded-lg shrink-0 border border-black/10 shadow-sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{c.hex}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
