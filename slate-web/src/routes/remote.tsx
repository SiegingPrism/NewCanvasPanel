import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  Clock,
  Camera,
  Undo2,
  Trash2,
  ArrowDownToLine,
  Wifi,
  Sparkles,
  CheckCircle2,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/remote")({
  component: TeacherRemotePage,
});

export function TeacherRemotePage() {
  const [sessionId, setSessionId] = useState<string>("default");
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string>("Connected");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sid = url.searchParams.get("session") || "default";
    setSessionId(sid);

    const supabase = getSupabase();
    if (supabase && sid !== "default") {
      const ch = supabase.channel(`slate_remote_${sid}`, {
        config: { broadcast: { ack: false, self: false } },
      });
      ch.subscribe();
      channelRef.current = ch;
    }

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, []);

  const sendCommand = (cmd: string, data?: any) => {
    setLastAction(cmd);
    const payload = {
      type: "teacher_remote_command",
      command: cmd,
      data,
      timestamp: Date.now(),
    };

    // 1. Supabase Realtime channel
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "command",
        payload,
      }).catch(() => {});
    }

    // 2. BroadcastChannel fallback
    try {
      const bc = new BroadcastChannel(`slate_remote_${sessionId}`);
      bc.postMessage(payload);
      bc.close();
    } catch {}

    // 3. LocalStorage fallback
    try {
      localStorage.setItem(`slate_remote_cmd_${sessionId}`, JSON.stringify(payload));
    } catch {}

    // Haptic feedback if available on mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  const handleToggleLaser = () => {
    const next = !laserActive;
    setLaserActive(next);
    sendCommand(next ? "laser_on" : "laser_off");
  };

  const handleToggleTimer = () => {
    const next = !timerRunning;
    setTimerRunning(next);
    sendCommand(next ? "timer_start" : "timer_pause");
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      sendCommand("insert_photo", {
        dataUrl,
        fileName: file.name,
      });
      setPhotoUploading(false);
      toast.success("Photo sent to smart board!");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-md mx-auto select-none space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 grid place-items-center text-indigo-400 font-bold">
            <Wifi className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight">Teacher Remote</h1>
            <p className="text-xs text-slate-400">Classroom Board Control</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
            ● Active
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{lastAction}</p>
        </div>
      </header>

      {/* Main Slide Navigation Controls (Thumb Friendly) */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Slide & Page Navigation
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => sendCommand("page_prev")}
            className="h-24 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all text-base font-bold shadow-lg"
          >
            <ChevronLeft className="h-8 w-8 text-sky-400" />
            Previous Page
          </Button>

          <Button
            onClick={() => sendCommand("page_next")}
            className="h-24 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-base font-bold shadow-lg shadow-indigo-600/30"
          >
            <ChevronRight className="h-8 w-8 text-white" />
            Next Page
          </Button>
        </div>

        <Button
          onClick={() => sendCommand("page_new")}
          variant="outline"
          className="w-full h-12 rounded-xl border-slate-800 bg-slate-900/60 text-slate-300 font-semibold gap-2 hover:bg-slate-800"
        >
          <Plus className="h-5 w-5 text-indigo-400" />
          Add Blank Slide
        </Button>
      </div>

      {/* Classroom Tools: Laser, Timer, Camera */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Classroom Tools
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* Laser Pointer */}
          <Button
            onClick={handleToggleLaser}
            className={`h-20 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 font-bold ${
              laserActive
                ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/40"
                : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
            }`}
          >
            <Flame className={`h-6 w-6 ${laserActive ? "text-white" : "text-rose-400"}`} />
            {laserActive ? "Laser Active (ON)" : "Turn On Laser"}
          </Button>

          {/* Classroom Timer Start/Pause */}
          <Button
            onClick={handleToggleTimer}
            className={`h-20 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 font-bold ${
              timerRunning
                ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/40"
                : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
            }`}
          >
            {timerRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 text-amber-400" />}
            {timerRunning ? "Pause Timer" : "Start Timer"}
          </Button>
        </div>

        {/* Quick Send Photo from Camera */}
        <div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handlePhotoCapture}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={photoUploading}
            className="w-full h-14 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold gap-2.5 shadow-lg shadow-teal-600/25 active:scale-98 transition-all"
          >
            <Camera className="h-6 w-6" />
            {photoUploading ? "Sending Photo..." : "Snap & Send Photo to Big Board"}
          </Button>
          <p className="text-[11px] text-slate-500 text-center mt-1">
            Photograph student notebook or textbook page to project onto the board
          </p>
        </div>
      </div>

      {/* Fast Board Actions */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Board Actions
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => sendCommand("undo")}
            className="h-11 rounded-xl border-slate-800 bg-slate-900 text-slate-200 text-xs font-bold gap-1 hover:bg-slate-800"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </Button>

          <Button
            variant="outline"
            onClick={() => sendCommand("lower_board")}
            className="h-11 rounded-xl border-slate-800 bg-slate-900 text-slate-200 text-xs font-bold gap-1 hover:bg-slate-800"
          >
            <ArrowDownToLine className="h-4 w-4 text-sky-400" />
            Reach
          </Button>

          <Button
            variant="outline"
            onClick={() => sendCommand("clear")}
            className="h-11 rounded-xl border-rose-900/40 bg-rose-950/20 text-rose-400 text-xs font-bold gap-1 hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
