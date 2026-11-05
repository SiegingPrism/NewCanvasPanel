import React from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import type { PageBackground } from "@/lib/whiteboard/types";
import type { TemplateKey } from "@/lib/whiteboard/templates";
import {
  FileText,
  AlignJustify,
  Grid,
  PenTool,
  Music,
  MapPin,
  Copy,
  Presentation,
  BookOpen,
  FlaskConical,
  ListChecks,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PAGE_BACKGROUNDS: {
  id: PageBackground;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { id: "white", label: "Blank", icon: FileText, desc: "Empty canvas" },
  { id: "lined", label: "Lined", icon: AlignJustify, desc: "Ruled notebook" },
  { id: "grid", label: "Squared", icon: Grid, desc: "Math grid" },
  { id: "four-line", label: "4-Line", icon: PenTool, desc: "Language handwriting" },
  { id: "music-staves", label: "Music", icon: Music, desc: "5-line staves" },
  { id: "world-map", label: "Map", icon: MapPin, desc: "World map outline" },
];

const TEMPLATE_SHORTCUTS: {
  key: TemplateKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { key: "cornell", label: "Cornell Notes", icon: BookOpen, desc: "Cues, notes & summary" },
  { key: "lab-report", label: "Lab Report", icon: FlaskConical, desc: "Hypothesis, method & results" },
  { key: "kwl", label: "KWL Chart", icon: ListChecks, desc: "Know · Want · Learned" },
  { key: "drafting-3d", label: "3D Drafting", icon: Box, desc: "3D isometric grid" },
];

export interface NewPagePickerContentProps {
  onClose: () => void;
  onOpenDocImport?: () => void;
  isDark?: boolean;
}

export function NewPagePickerContent({ onClose, onOpenDocImport, isDark }: NewPagePickerContentProps) {
  const { addPage, duplicatePage, addPageWithTemplate, pages, activePageId } = useWhiteboard();
  const activePageIdx = Math.max(0, pages.findIndex((p) => p.id === activePageId));

  const handleSelectBackground = (bg: PageBackground, label: string) => {
    addPage(bg);
    toast.success(`Added ${label} page`);
    onClose();
  };

  const handleDuplicate = () => {
    duplicatePage();
    toast.success(`Duplicated Page ${activePageIdx + 1}`);
    onClose();
  };

  const handleSelectTemplate = (key: TemplateKey, label: string) => {
    addPageWithTemplate(key);
    toast.success(`Added ${label} template page`);
    onClose();
  };

  return (
    <div className="space-y-3">
      {/* Background Options */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          New Page Style
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PAGE_BACKGROUNDS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectBackground(item.id, item.label)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-border/70 hover:bg-muted active:scale-95 transition text-center",
                  isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-muted text-foreground"
                )}
                title={item.desc}
              >
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cn("h-px w-full", isDark ? "bg-slate-800" : "bg-border/60")} />

      {/* Duplicate & Templates */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Saved Page & Templates
        </p>

        {/* Duplicate Current Page Button */}
        <button
          type="button"
          onClick={handleDuplicate}
          className={cn(
            "flex w-full items-center gap-2.5 p-2 rounded-xl border border-border/70 hover:bg-muted active:scale-[0.98] transition mb-2 text-left",
            isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-muted text-foreground"
          )}
        >
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Copy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold">Duplicate Page {activePageIdx + 1}</div>
            <div className="text-[10px] text-muted-foreground truncate">Copy all drawings & notes to a new page</div>
          </div>
        </button>

        {/* 2x2 grid for Cornell, Lab Report, KWL, 3D Drafting */}
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_SHORTCUTS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleSelectTemplate(t.key, t.label)}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl border border-border/70 hover:bg-muted active:scale-95 transition text-left",
                  isDark ? "hover:bg-slate-800 text-slate-100" : "hover:bg-muted text-foreground"
                )}
                title={t.desc}
              >
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {onOpenDocImport && (
        <>
          <div className={cn("h-px w-full", isDark ? "bg-slate-800" : "bg-border/60")} />
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDocImport();
            }}
            className="flex w-full items-center justify-center gap-2 p-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-semibold transition active:scale-[0.98]"
          >
            <Presentation className="h-4 w-4" />
            <span>Import Slides (.pptx / .pdf)</span>
          </button>
        </>
      )}
    </div>
  );
}

