import React, { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface BoardHelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen "what is everything?" overlay for Board mode.
 * Shows plain-language cards next to each area of the screen, plus keyboard & clicker shortcuts.
 * Tap anywhere or press Esc to close.
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
    "absolute max-w-sm rounded-2xl bg-card text-card-foreground border-2 border-primary shadow-2xl p-4 text-sm leading-relaxed";
  const heading = "text-base font-bold mb-1 text-primary";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help: what each part of the board does and keyboard shortcuts"
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-[60] bg-black/60 backdrop-blur-[2px] select-none overflow-y-auto"
    >
      {/* Top bar */}
      <div className={`${card} top-20 left-1/2 -translate-x-1/2 text-center`}>
        <p className={heading}>Top bar</p>
        <p>Board title, page backgrounds & grids, Present mode, and main menu.</p>
      </div>

      {/* Left dock */}
      <div className={`${card} left-32 top-1/2 -translate-y-1/2`}>
        <p className={heading}>Side Tools (Move, Pen, Text...)</p>
        <p>
          <b>Move</b> (pan), <b>Pen</b> (12 styles), <b>Highlight</b>, <b>Eraser</b> (part, whole, ink only), <b>Select</b> (tap & lasso), <b>Text</b>, and <b>Shapes</b>.
        </p>
        <p className="mt-1.5">
          <b>Tap any tool a second time</b> to open colors, thickness, handwriting, and full shapes.
        </p>
        <p className="mt-1.5">
          <b>More</b> opens classroom timers, student picker, dice, periodic table, math grapher, and AI tools.
        </p>
      </div>

      {/* Center Shortcuts & Gestures Card */}
      <div className={`${card} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md hidden md:block`}>
        <div className="flex items-center gap-2 mb-1.5 text-primary">
          <Keyboard className="h-5 w-5" />
          <p className="text-base font-bold">Gestures & Shortcuts</p>
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Touch gestures & USB keyboard / presenter clicker shortcuts:
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div><b className="font-mono bg-muted px-1 rounded">P / H / E</b> Pen / Highlight / Eraser</div>
          <div><b className="font-mono bg-muted px-1 rounded">V / T / S</b> Select / Text / Shapes</div>
          <div><b className="font-mono bg-muted px-1 rounded">L</b> Laser pointer</div>
          <div><b className="font-mono bg-muted px-1 rounded">Space + drag</b> Move the board</div>
          <div><b className="font-mono bg-muted px-1 rounded">1, 2, 3, 4</b> Quick colours</div>
          <div><b className="font-mono bg-muted px-1 rounded">+ / - / F / 0</b> Zoom in / out / fit / 100%</div>
          <div><b className="font-mono bg-muted px-1 rounded">PgUp / PgDn</b> Slide clicker navigation</div>
          <div><b className="font-mono bg-muted px-1 rounded">Ctrl+Z / Y</b> Undo / Redo</div>
          <div><b className="font-mono bg-muted px-1 rounded">Delete</b> Remove selection</div>
          <div><b className="font-mono bg-muted px-1 rounded">Ctrl+D</b> Duplicate selection</div>
        </div>
        <div className="mt-2.5 pt-2 border-t border-border text-xs">
          <b>Wipe with palm or fist</b> to erase. <b>Hold still</b> for radial menu. Multiple students can write simultaneously!
        </div>
      </div>

      {/* Right dock notice */}
      <div className={`${card} right-32 top-1/2 -translate-y-1/2 hidden xl:block`}>
        <p className={heading}>Right-side Dock</p>
        <p>Identical tools for teachers or students standing on the right side of the smart board.</p>
      </div>

      {/* Bottom-left corner */}
      <div className={`${card} left-4 bottom-24`}>
        <p className={heading}>Undo, Clear & Board</p>
        <p>
          <b>Undo & Redo</b> with history. <b>Clear</b> wipes the canvas with instant undo.
        </p>
        <p className="mt-1">
          <b>Board button</b> holds reachability lower, freeze lock, screen size (55&quot;–110&quot;), handedness, and lesson save/export.
        </p>
      </div>

      {/* Bottom-right corner */}
      <div className={`${card} right-4 bottom-24`}>
        <p className={heading}>Laser, Zoom & Pages</p>
        <p>
          <b>Laser</b> points without drawing. <b>Zoom</b> (+, -, fit all, 100%).
        </p>
        <p className="mt-1">
          <b>Pages</b>: Back/Forward, tap <b>Pages</b> for the slide sorter, or tap <b>+ New</b> for lined/grid/music templates.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-6 flex h-14 items-center gap-2 rounded-2xl bg-primary px-5 text-base font-bold text-primary-foreground shadow-xl active:scale-95 cursor-pointer"
      >
        <X className="h-5 w-5" />
        Got it
      </button>
    </div>
  );
}
