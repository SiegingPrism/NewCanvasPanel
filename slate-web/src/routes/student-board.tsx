import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { Pen, Eraser, RotateCcw, Send, CheckCircle2, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/student-board")({
  component: StudentMiniBoardPage,
});

export function StudentMiniBoardPage() {
  const [sessionId, setSessionId] = useState<string>("default");
  const [studentName, setStudentName] = useState<string>("");
  const [rollNo, setRollNo] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
  const [penColor, setPenColor] = useState<string>("#1e293b"); // Slate dark
  const [strokeWidth, setStrokeWidth] = useState<number>(4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<any>(null);

  // Initialize session & student profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sid = url.searchParams.get("session") || "default";
    setSessionId(sid);

    try {
      const savedName = localStorage.getItem("slate_student_name");
      const savedRoll = localStorage.getItem("slate_student_roll");
      if (savedName) setStudentName(savedName);
      if (savedRoll) setRollNo(savedRoll);
    } catch {}

    // Setup Realtime connection to smart board
    const supabase = getSupabase();
    if (supabase && sid !== "default") {
      const ch = supabase.channel(`slate_mini_board_${sid}`, {
        config: { broadcast: { ack: false, self: false } },
      });
      ch.subscribe();
      channelRef.current = ch;
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // Set up canvas resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = Math.max(380, window.innerHeight - 280);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasCoords(e);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : penColor;
    ctx.lineWidth = activeTool === "eraser" ? 24 : strokeWidth;
    ctx.arc(lastPointRef.current.x, lastPointRef.current.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    setSubmitted(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPoint = getCanvasCoords(e);
    ctx.beginPath();
    ctx.strokeStyle = activeTool === "eraser" ? "#ffffff" : penColor;
    ctx.lineWidth = activeTool === "eraser" ? 24 : strokeWidth;
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setSubmitted(false);
    toast("Board cleared");
  };

  const handleSubmit = useCallback(async () => {
    if (!studentName.trim()) {
      toast.error("Please enter your name before submitting!");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scale drawing to max 800x600 JPEG (< 50 KB) to ensure safe transmission under Realtime 256 KB limits
    const maxDim = 800;
    const ratio = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
    const targetW = Math.round(canvas.width * ratio);
    const targetH = Math.round(canvas.height * ratio);

    const offscreen = document.createElement("canvas");
    offscreen.width = targetW;
    offscreen.height = targetH;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, targetW, targetH);
    offCtx.drawImage(canvas, 0, 0, targetW, targetH);

    const dataUrl = offscreen.toDataURL("image/jpeg", 0.78);
    const payload = {
      type: "mini_board_submit",
      sessionId,
      studentName: studentName.trim(),
      rollNo: rollNo.trim() || undefined,
      imageData: dataUrl,
      timestamp: Date.now(),
    };

    // Save student details
    try {
      localStorage.setItem("slate_student_name", studentName.trim());
      if (rollNo.trim()) localStorage.setItem("slate_student_roll", rollNo.trim());
    } catch {}

    // 1. Supabase Realtime broadcast
    if (channelRef.current) {
      try {
        await channelRef.current.send({
          type: "broadcast",
          event: "submit",
          payload,
        });
      } catch (e) {
        console.warn("Realtime broadcast failed, using local broadcast fallback", e);
      }
    }

    // 2. BroadcastChannel fallback (same origin / local testing)
    try {
      const bc = new BroadcastChannel(`slate_mini_board_${sessionId}`);
      bc.postMessage(payload);
      bc.close();
    } catch {}

    // 3. LocalStorage event fallback
    try {
      localStorage.setItem(`slate_mini_board_submission_${sessionId}`, JSON.stringify(payload));
    } catch {}

    setSubmitted(true);
    toast.success("Answer sent to teacher's big board!");
  }, [studentName, rollNo, sessionId]);

  const colors = [
    { label: "Black", hex: "#0f172a" },
    { label: "Blue", hex: "#2563eb" },
    { label: "Red", hex: "#dc2626" },
    { label: "Green", hex: "#16a34a" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-3 max-w-lg mx-auto select-none">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 grid place-items-center text-indigo-400 font-bold">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight">Mini Whiteboard</h1>
            <p className="text-[11px] text-slate-400">Draw answer & send to big screen</p>
          </div>
        </div>
        {submitted && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-4 w-4" />
            <span>Sent</span>
          </div>
        )}
      </header>

      {/* Student Identity inputs */}
      <div className="grid grid-cols-3 gap-2 py-2.5">
        <div className="col-span-2 relative">
          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Your Name"
            className="pl-8 h-9 text-xs bg-slate-900 border-slate-800 rounded-xl"
          />
        </div>
        <div>
          <Input
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            placeholder="Roll / No."
            className="h-9 text-xs bg-slate-900 border-slate-800 rounded-xl"
          />
        </div>
      </div>

      {/* Drawing Canvas Area */}
      <div className="flex-1 w-full bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-slate-700 relative touch-none my-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none cursor-crosshair block"
        />
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between gap-1.5 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTool === "pen" ? "default" : "secondary"}
            onClick={() => setActiveTool("pen")}
            className="h-9 px-3 gap-1 rounded-xl text-xs font-semibold"
          >
            <Pen className="h-3.5 w-3.5" />
            Pen
          </Button>
          <Button
            size="sm"
            variant={activeTool === "eraser" ? "default" : "secondary"}
            onClick={() => setActiveTool("eraser")}
            className="h-9 px-3 gap-1 rounded-xl text-xs font-semibold"
          >
            <Eraser className="h-3.5 w-3.5" />
            Eraser
          </Button>

          {/* Color dots */}
          {activeTool === "pen" && (
            <div className="flex items-center gap-1 ml-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setPenColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    penColor === c.hex ? "scale-110 ring-2 ring-white" : "opacity-70"
                  }`}
                  aria-label={c.label}
                />
              ))}
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
          className="h-9 px-2.5 text-xs text-rose-400 border-rose-900/40 hover:bg-rose-950/30 rounded-xl"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Big Submit Button */}
      <Button
        onClick={handleSubmit}
        className="h-12 w-full gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 active:scale-98 transition-all"
      >
        <Send className="h-4 w-4" />
        {submitted ? "Update & Re-Submit to Board" : "Submit Answer to Big Board"}
      </Button>
    </div>
  );
}

