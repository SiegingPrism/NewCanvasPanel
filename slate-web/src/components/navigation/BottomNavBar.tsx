import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Home, LayoutGrid, Sparkles, Library as LibraryIcon, Settings } from "lucide-react";
import { AISheet } from "@/components/whiteboard/AISheet";
import { cn } from "@/lib/utils";

export type BottomNavTab = "home" | "boards" | "ai" | "library" | "settings";

interface BottomNavBarProps {
  activeTab?: BottomNavTab;
  onOpenAI?: () => void;
  onOpenSettings?: () => void;
  boardId?: string;
  className?: string;
}

export function BottomNavBar({
  activeTab = "home",
  onOpenAI,
  onOpenSettings,
  boardId,
  className,
}: BottomNavBarProps) {
  const [internalAIOpen, setInternalAIOpen] = useState(false);

  const handleAIClick = () => {
    if (onOpenAI) {
      onOpenAI();
    } else {
      setInternalAIOpen(true);
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 pt-2 pb-[max(0.75rem,var(--sab,env(safe-area-inset-bottom,0.5rem)))] shadow-lg select-none",
          className,
        )}
      >
        <Link
          to="/"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] transition",
            activeTab === "home"
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          <Home className={cn("h-5 w-5", activeTab === "home" && "stroke-[2.5]")} />
          <span>Home</span>
        </Link>

        <Link
          to="/library"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] transition",
            activeTab === "boards"
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className={cn("h-5 w-5", activeTab === "boards" && "stroke-[2.5]")} />
          <span>Boards</span>
        </Link>

        <button
          type="button"
          onClick={handleAIClick}
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] transition cursor-pointer active:scale-95",
            activeTab === "ai"
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          <Sparkles className={cn("h-5 w-5", activeTab === "ai" && "text-primary stroke-[2.5]")} />
          <span>AI Assistant</span>
        </button>

        <Link
          to="/notes"
          className={cn(
            "flex flex-col items-center gap-1 text-[11px] transition",
            activeTab === "library"
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground hover:text-foreground",
          )}
        >
          <LibraryIcon className={cn("h-5 w-5", activeTab === "library" && "stroke-[2.5]")} />
          <span>Library</span>
        </Link>

        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className={cn(
              "flex flex-col items-center gap-1 text-[11px] transition cursor-pointer active:scale-95",
              activeTab === "settings"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings className={cn("h-5 w-5", activeTab === "settings" && "stroke-[2.5]")} />
            <span>Profile</span>
          </button>
        ) : (
          <Link
            to="/profile"
            className={cn(
              "flex flex-col items-center gap-1 text-[11px] transition",
              activeTab === "settings"
                ? "font-bold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            <Settings className={cn("h-5 w-5", activeTab === "settings" && "stroke-[2.5]")} />
            <span>Profile</span>
          </Link>
        )}
      </nav>

      {!onOpenAI && (
        <AISheet
          open={internalAIOpen}
          onOpenChange={setInternalAIOpen}
          boardId={boardId}
        />
      )}
    </>
  );
}
