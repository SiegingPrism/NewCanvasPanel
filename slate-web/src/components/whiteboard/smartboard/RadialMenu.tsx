import React, { useEffect, useRef } from "react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { Pen, Highlighter, Eraser, Undo2, MousePointer2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadialMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
}

const QUICK_COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a"];

export function RadialMenu({ position, onClose }: RadialMenuProps) {
  const { tool, setTool, setColor, undo } = useWhiteboard();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [onClose]);

  if (!position) return null;

  // Clamp position so the menu doesn't overflow screen boundaries
  const menuRadius = 110;
  const clampedX = Math.max(
    menuRadius + 20,
    Math.min(window.innerWidth - menuRadius - 20, position.x),
  );
  const clampedY = Math.max(
    menuRadius + 20,
    Math.min(window.innerHeight - menuRadius - 20, position.y),
  );

  const items = [
    {
      label: "Pen",
      icon: <Pen className="h-5 w-5" />,
      action: () => {
        setTool("pen");
        onClose();
      },
      active: tool === "pen",
      angle: -90, // Top
    },
    {
      label: "Highlighter",
      icon: <Highlighter className="h-5 w-5" />,
      action: () => {
        setTool("highlighter");
        onClose();
      },
      active: tool === "highlighter",
      angle: -40,
    },
    {
      label: "Eraser",
      icon: <Eraser className="h-5 w-5" />,
      action: () => {
        setTool("eraser-object");
        onClose();
      },
      active: tool === "eraser-object" || tool === "eraser-pixel",
      angle: 15,
    },
    {
      label: "Select",
      icon: <MousePointer2 className="h-5 w-5" />,
      action: () => {
        setTool("select");
        onClose();
      },
      active: tool === "select",
      angle: 70,
    },
    {
      label: "Undo",
      icon: <Undo2 className="h-5 w-5" />,
      action: () => {
        undo();
        onClose();
      },
      active: false,
      angle: 135,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="pointer-events-auto select-none absolute z-50 animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Center Close / Pin Button */}
      <button
        onClick={onClose}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-card/95 text-foreground shadow-2xl border-2 border-border/80 backdrop-blur-md active:scale-90 transition-transform"
        title="Close radial menu"
      >
        <X className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Main Radial Tool Buttons */}
      {items.map((item) => {
        const rad = (item.angle * Math.PI) / 180;
        const x = Math.cos(rad) * 78;
        const y = Math.sin(rad) * 78;

        return (
          <button
            key={item.label}
            onClick={item.action}
            className={cn(
              "absolute flex h-13 w-13 flex-col items-center justify-center rounded-full shadow-xl backdrop-blur-md border border-border/80 transition-all active:scale-90",
              item.active
                ? "bg-primary text-primary-foreground ring-2 ring-primary/40 font-bold"
                : "bg-card/95 text-foreground hover:bg-muted",
            )}
            style={{
              left: `calc(50% + ${x}px - 26px)`,
              top: `calc(50% + ${y}px - 26px)`,
            }}
            title={item.label}
          >
            {item.icon}
          </button>
        );
      })}

      {/* Radial Quick Colors Ring (Left side arc) */}
      {QUICK_COLORS.map((col, idx) => {
        const angle = 180 + idx * 30; // 180, 210, 240, 270 degrees
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * 80;
        const y = Math.sin(rad) * 80;

        return (
          <button
            key={col}
            onClick={() => {
              setColor(col);
              setTool("pen");
              onClose();
            }}
            className="absolute h-9 w-9 rounded-full shadow-lg border-2 border-white/80 active:scale-90 transition-transform"
            style={{
              backgroundColor: col,
              left: `calc(50% + ${x}px - 18px)`,
              top: `calc(50% + ${y}px - 18px)`,
            }}
            title={`Color ${col}`}
          />
        );
      })}
    </div>
  );
}
