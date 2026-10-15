import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Plus, Lightbulb, Bot } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import type { ImageObject, StickyNoteObject } from "@/lib/whiteboard/types";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

interface DoodleItem {
  category: string;
  iconIndex: string | number;
  fact: string;
  keyword: string;
}

export function MagicDoodleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const [items, setItems] = useState<DoodleItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DoodleItem | null>(null);

  useEffect(() => {
    if (open && items.length === 0) {
      fetch("/data/doodle_categories_compact.json")
        .then((res) => res.json())
        .then((data: DoodleItem[]) => {
          setItems(data);
          if (data.length > 0) setSelected(data[0]);
        })
        .catch((err) => console.error("Error loading doodle categories:", err));
    }
  }, [open, items.length]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 72); // Show top 72 by default
    const q = query.toLowerCase();
    return items.filter(
      (it) => it.category.toLowerCase().includes(q) || it.keyword.toLowerCase().includes(q),
    );
  }, [items, query]);

  function handleInsert(withFact: boolean) {
    if (!selected) return;
    const screenW = typeof window !== "undefined" ? window.innerWidth : 400;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 600;

    const cx = Math.round((screenW / 2 - camera.x) / camera.zoom - 80);
    const cy = Math.round((screenH / 2 - camera.y) / camera.zoom - 80);

    const img: ImageObject = {
      id: uid(),
      kind: "image",
      x: cx,
      y: cy,
      w: 160,
      h: 160,
      src: `/magic_icons/${selected.iconIndex}.svg`,
    };

    addObject(img);

    if (withFact && selected.fact) {
      const note: StickyNoteObject = {
        id: uid(),
        kind: "sticky",
        x: cx + 180,
        y: cy,
        w: 220,
        h: 180,
        text: `💡 DID YOU KNOW? (${selected.category.toUpperCase()})\n\n${selected.fact}`,
        color: "#fef9c3",
      };
      addObject(note);
    }

    pushHistory();
    onOpenChange(false);
    toast.success(`Inserted ${selected.category} vector icon onto board!`);
  }

  function handleAskAI() {
    if (!selected) return;
    onOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("slate:ask-ai", {
        detail: {
          prompt: `Create a brief, engaging classroom mini-lesson, 3 key concepts, and 2 quick quiz questions about: ${selected.category}.`,
        },
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <span>Magic Pen & Doodle Recognition Library</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            340 hand-drawn recognition categories with vector icons and educational trivia.
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative shrink-0 my-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search doodles (e.g. apple, airplane, bicycle, guitar, sun, robot)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Content split: Left = Grid, Right = Preview Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Icons Grid */}
          <div className="md:col-span-2 overflow-y-auto p-1 border border-border rounded-xl bg-muted/15 grid grid-cols-4 sm:grid-cols-6 gap-2 h-72 md:h-auto">
            {filtered.map((item) => (
              <button
                key={item.category}
                onClick={() => setSelected(item)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center aspect-square ${
                  selected?.category === item.category
                    ? "border-amber-500 bg-amber-500/10 shadow-sm"
                    : "border-border/50 bg-card hover:bg-accent opacity-85"
                }`}
              >
                <img
                  src={`/magic_icons/${item.iconIndex}.svg`}
                  alt={item.category}
                  className="h-8 w-8 object-contain my-auto"
                  loading="lazy"
                />
                <span className="text-[10px] font-medium leading-none truncate w-full mt-1">
                  {item.category}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-muted-foreground">
                No doodles matching "{query}"
              </div>
            )}
          </div>

          {/* Detail Preview Panel */}
          <div className="border border-border rounded-xl bg-card p-3 flex flex-col justify-between overflow-y-auto">
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg border border-border/50">
                  <img
                    src={`/magic_icons/${selected.iconIndex}.svg`}
                    alt={selected.category}
                    className="h-16 w-16 object-contain my-1"
                  />
                  <h4 className="text-sm font-bold text-foreground capitalize mt-1">
                    {selected.category}
                  </h4>
                  <span className="text-[10px] text-muted-foreground">Icon #{selected.iconIndex}</span>
                </div>

                {selected.fact && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-[11px]">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span>Classroom Trivia</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {selected.fact}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center my-auto">Select a doodle to preview</div>
            )}

            {/* Actions */}
            <div className="space-y-1.5 pt-3 border-t border-border mt-3">
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs h-8 gap-1 font-semibold"
                onClick={() => handleInsert(false)}
                disabled={!selected}
              >
                <Plus className="h-3.5 w-3.5" />
                Insert Icon
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 gap-1"
                onClick={() => handleInsert(true)}
                disabled={!selected || !selected?.fact}
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Insert with Trivia Note
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8 gap-1 text-primary hover:text-primary"
                onClick={handleAskAI}
                disabled={!selected}
              >
                <Bot className="h-3.5 w-3.5" />
                Ask Gemini About This
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
