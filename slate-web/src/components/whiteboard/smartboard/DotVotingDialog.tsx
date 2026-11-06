import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Vote, Sparkles, Check, RotateCcw, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { StickyNoteObject } from "@/lib/whiteboard/types";

interface DotVotingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BrainstormIdea = {
  id: string;
  text: string;
  votes: number;
  color?: string;
};

export function DotVotingDialog({ open, onOpenChange }: DotVotingDialogProps) {
  const { pages, activePageId, setPages } = useWhiteboard();
  const page = pages.find((p) => p.id === activePageId);

  // Extract sticky notes from active page
  const stickiesOnBoard = (page?.objects.filter((o) => o.kind === "sticky") || []) as StickyNoteObject[];

  const [ideas, setIdeas] = useState<BrainstormIdea[]>(() => {
    if (stickiesOnBoard.length > 0) {
      return stickiesOnBoard.map((s) => ({
        id: s.id,
        text: s.text || "Classroom Idea",
        votes: 0,
        color: s.color || "#fef08a",
      }));
    }
    return [
      { id: "1", text: "Solar panels on school rooftop", votes: 0, color: "#fef08a" },
      { id: "2", text: "Rainwater harvesting in science garden", votes: 0, color: "#bae6fd" },
      { id: "3", text: "Weekly zero-waste plastic collection", votes: 0, color: "#bbf7d0" },
      { id: "4", text: "Tree plantation drive with community", votes: 0, color: "#fed7aa" },
    ];
  });

  const [newIdeaText, setNewIdeaText] = useState("");
  const [dotsRemaining, setDotsRemaining] = useState(3);

  const handleCastDot = (ideaId: string) => {
    if (dotsRemaining <= 0) {
      toast.info("All 3 dot votes used! Reset or submit votes.");
      return;
    }
    setIdeas((prev) =>
      prev.map((item) => (item.id === ideaId ? { ...item, votes: item.votes + 1 } : item)),
    );
    setDotsRemaining((r) => r - 1);
    toast.success("Dot vote recorded!");
  };

  const handleRemoveDot = (ideaId: string) => {
    setIdeas((prev) =>
      prev.map((item) => (item.id === ideaId ? { ...item, votes: Math.max(0, item.votes - 1) } : item)),
    );
    setDotsRemaining((r) => Math.min(3, r + 1));
  };

  const handleAddIdea = () => {
    if (!newIdeaText.trim()) return;
    const newIdea: BrainstormIdea = {
      id: `idea-${Math.random().toString(36).slice(2, 9)}`,
      text: newIdeaText.trim(),
      votes: 0,
      color: "#fef08a",
    };
    setIdeas((prev) => [...prev, newIdea]);
    setNewIdeaText("");
    toast.success("New brainstorming idea added!");
  };

  const handleSaveToBoard = () => {
    if (!page) return;
    // Update sticky notes on canvas with vote badges
    const updatedObjects = page.objects.map((obj) => {
      if (obj.kind === "sticky") {
        const matching = ideas.find((i) => i.id === obj.id);
        if (matching && matching.votes > 0) {
          const baseText = obj.text.replace(/\s*\[⭐ \d+ votes\]$/, "");
          return {
            ...obj,
            text: `${baseText} [⭐ ${matching.votes} votes]`,
          };
        }
      }
      return obj;
    });

    setPages(
      pages.map((p) => (p.id === activePageId ? { ...p, objects: updatedObjects } : p)),
    );
    toast.success("Vote badges written to whiteboard sticky notes!");
    onOpenChange(false);
  };

  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 bg-card border shadow-2xl flex flex-col max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-foreground">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Vote className="h-6 w-6" />
              </span>
              <span>Sticky-Note Brainstorm & Dot Voting (वोटिंग)</span>
            </DialogTitle>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
              <span>Dots Remaining:</span>
              <span className="text-sm font-mono">{dotsRemaining} / 3</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Students and teachers allocate 3 colored dot votes to prioritize the strongest classroom ideas.
          </p>
        </DialogHeader>

        {/* Add Idea Bar */}
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newIdeaText}
            onChange={(e) => setNewIdeaText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddIdea()}
            placeholder="Add new sticky-note idea..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button
            size="sm"
            onClick={handleAddIdea}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" /> Add Idea
          </Button>
        </div>

        {/* Ideas Grid with Dot Voting */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 pr-1">
          {sortedIdeas.map((idea) => (
            <div
              key={idea.id}
              className="p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all hover:border-primary/40"
              style={{ backgroundColor: idea.color || "#fef08a" }}
            >
              <div className="text-sm font-semibold text-slate-900 leading-snug">
                {idea.text}
              </div>

              <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: idea.votes }).map((_, i) => (
                    <span
                      key={i}
                      className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs animate-in zoom-in-75"
                    >
                      •
                    </span>
                  ))}
                  {idea.votes === 0 && (
                    <span className="text-[11px] text-slate-500 font-medium">0 dots</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleRemoveDot(idea.id)}
                    disabled={idea.votes <= 0}
                    className="p-1 rounded bg-black/10 hover:bg-black/20 text-slate-800 disabled:opacity-30 text-xs font-bold"
                    title="Remove 1 dot"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleCastDot(idea.id)}
                    disabled={dotsRemaining <= 0}
                    className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs disabled:opacity-40 flex items-center gap-1 shadow-xs"
                    title="Vote with dot"
                  >
                    + Dot
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIdeas((prev) => prev.map((i) => ({ ...i, votes: 0 })));
              setDotsRemaining(3);
            }}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Votes
          </Button>

          <Button
            onClick={handleSaveToBoard}
            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <Check className="h-4 w-4" /> Save Vote Badges to Board
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

