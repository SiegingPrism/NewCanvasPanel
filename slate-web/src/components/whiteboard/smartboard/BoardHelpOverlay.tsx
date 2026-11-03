import React, { useEffect } from "react";
import { X } from "lucide-react";

interface BoardHelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen "what is everything?" overlay for Board mode.
 * Shows a plain-language card next to each area of the screen. Tap anywhere to close.
 */
export function BoardHelpOverlay({ open, onClose }: BoardHelpOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const card =
    "absolute max-w-sm rounded-2xl bg-card text-card-foreground border-2 border-primary shadow-2xl p-5 text-base leading-relaxed";
  const heading = "text-lg font-bold mb-1.5 text-primary";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help: what each part of the board does"
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-[60] bg-black/55 backdrop-blur-[1px] select-none"
    >
      {/* Top bar */}
      <div className={`${card} top-24 left-1/2 -translate-x-1/2 text-center`}>
        <p className={heading}>Top bar</p>
        <p>Board name, backgrounds and paper, Present mode, and the main menu.</p>
      </div>

      {/* Left dock */}
      <div className={`${card} left-32 top-1/2 -translate-y-1/2`}>
        <p className={heading}>Tools (both sides)</p>
        <p>
          Pen, Highlight, Eraser, Select and Shapes. <b>Tap a tool again</b> for colours, sizes and shapes.
        </p>
        <p className="mt-2">
          <b>Lower</b> brings the top of the board within reach. <b>Lock</b> stops accidental zooming.{" "}
          <b>More</b> opens timers, maps, geometry and other classroom tools.
        </p>
      </div>

      {/* Middle */}
      <div className={`${card} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block`}>
        <p className={heading}>On the board</p>
        <p>
          <b>Press and hold</b> anywhere for quick tools right under your hand.
        </p>
        <p className="mt-2">
          <b>Wipe with your palm or fist</b> to erase. Several people can write at the same time.
        </p>
      </div>

      {/* Right dock (short note, the left card explains the tools) */}
      <div className={`${card} right-32 top-1/2 -translate-y-1/2 hidden xl:block`}>
        <p className={heading}>Same tools on this side</p>
        <p>Use whichever side you are standing at.</p>
      </div>

      {/* Bottom-left corner */}
      <div className={`${card} left-4 bottom-28`}>
        <p className={heading}>Undo, Redo, Clear</p>
        <p>
          <b>Clear</b> empties this page. Tap <b>Undo</b> to bring it back. The board button holds screen size, Simple
          mode and lesson files.
        </p>
      </div>

      {/* Bottom-right corner */}
      <div className={`${card} right-4 bottom-28`}>
        <p className={heading}>Pages</p>
        <p>
          Go back and forward, see <b>all pages</b> at once, or add a <b>new</b> page.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 flex h-16 items-center gap-2 rounded-2xl bg-primary px-6 text-lg font-bold text-primary-foreground shadow-xl active:scale-95"
      >
        <X className="h-6 w-6" />
        Got it
      </button>
    </div>
  );
}
