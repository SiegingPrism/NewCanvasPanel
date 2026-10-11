import { useEffect, useRef, useState } from "react";
import { X, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingWidget({
  title,
  onClose,
  initial,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  initial: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
}) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  // Clamp and center on mount or resize
  useEffect(() => {
    function adjust() {
      if (!ref.current) return;
      const w = ref.current.offsetWidth || 320;
      const h = ref.current.offsetHeight || 200;
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const isMobile = screenW < 640;

      setPos((cur) => {
        let x = cur.x;
        let y = cur.y;
        if (isMobile) {
          x = Math.max(8, Math.round((screenW - w) / 2));
        } else {
          x = Math.max(8, Math.min(Math.max(8, screenW - w - 8), cur.x));
        }
        y = Math.max(64, Math.min(Math.max(64, screenH - h - 16), cur.y));
        return { x, y };
      });
    }

    adjust();
    window.addEventListener("resize", adjust);
    return () => window.removeEventListener("resize", adjust);
  }, []);

  useEffect(() => {
    function move(e: PointerEvent) {
      if (!dragRef.current || !ref.current) return;
      const w = ref.current.offsetWidth || 320;
      const h = ref.current.offsetHeight || 200;
      const rawX = e.clientX - dragRef.current.dx;
      const rawY = e.clientY - dragRef.current.dy;
      const clampedX = Math.max(8, Math.min(Math.max(8, window.innerWidth - w - 8), rawX));
      const clampedY = Math.max(60, Math.min(Math.max(60, window.innerHeight - h - 16), rawY));
      setPos({ x: clampedX, y: clampedY });
    }
    function up() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-auto absolute rounded-2xl bg-card shadow-xl ring-1 ring-border max-w-[calc(100vw-16px)] box-border overflow-hidden",
        className,
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex cursor-move items-center justify-between rounded-t-2xl border-b border-border bg-muted/60 px-3 py-2 select-none"
        onPointerDown={(e) => {
          const rect = ref.current!.getBoundingClientRect();
          dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium truncate pr-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">{title}</span>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-accent shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 max-w-full overflow-x-auto">{children}</div>
    </div>
  );
}
