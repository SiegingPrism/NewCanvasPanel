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
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase/client";

export const Route = createFileRoute("/remote")({
  component: TeacherRemotePage,
});

export function TeacherRemotePage() {
  const [sessionId, setSessionId] = useState<string>("default");
  const [pin, setPin] = useState<string>("");
  const [pinInput, setPinInput] = useState<string>("");
  const [deviceId] = useState(() => {
    try {
      const stored = sessionStorage.getItem("slate_remote_device_id");
      if (stored) return stored;
      const id = `phone_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("slate_remote_device_id", id);
      return id;
    } catch {
      return `phone_${Math.random().toString(36).slice(2, 8)}`;
    }
  });
  const [isPaired, setIsPaired] = useState<boolean>(false);
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [photoUploading, setPhotoUploading] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string>("Connecting");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sid = url.searchParams.get("session") || "default";
    const p = url.searchParams.get("pin") || "";
    setSessionId(sid);
    if (p) {
      setPin(p);
      setPinInput(p);
    }

    const supabase = getSupabase();
    if (supabase && sid !== "default") {
      const ch = supabase.channel(`slate_remote_${sid}`, {
        config: { broadcast: { ack: false, self: false } },
      });

      ch.on("broadcast", { event: "ack" }, (msg: any) => {
        if (msg.payload?.type === "pair_confirmed") {
          setIsPaired(true);
          setLastAction("Paired & Ready");
          toast.success("Paired securely with Smart Board!");
        } else if (msg.payload?.type === "pair_rejected") {
          setIsPaired(false);
          toast.error(msg.payload?.reason || "Pairing rejected by smart board.");
        } else if (msg.payload?.type === "photo_confirmed") {
          setPhotoUploading(false);
          toast.success("Photo confirmed & projected on board!");
        }
      });

      ch.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          if (p) {
            // If PIN was in params, auto-try pair
            ch.send({
              type: "broadcast",
              event: "command",
              payload: {
                type: "teacher_remote_command",
                command: "pair",
                pin: p,
                deviceId,
                timestamp: Date.now(),
              },
            }).catch(() => {});
          }
        }
      });

      channelRef.current = ch;
    }

    return () => {
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, [deviceId]);

  const handlePairSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim();
    if (cleanPin.length !== 4) {
      toast.error("Please enter the 4-digit PIN shown on the board.");
      return;
    }
    setPin(cleanPin);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "command",
        payload: {
          type: "teacher_remote_command",
          command: "pair",
          pin: cleanPin,
          deviceId,
          timestamp: Date.now(),
        },
      }).catch(() => {});
      toast.info("Sending pairing request to smart board...");
    } else {
      toast.error("Connecting to smart board... please try again.");
    }
  };

  const sendCommand = (cmd: string, data?: any) => {
    if (!isPaired) {
      toast.error("Please pair with the smart board first.");
      return;
    }
    setLastAction(cmd);
    const payload = {
      type: "teacher_remote_command",
      command: cmd,
      pin,
      deviceId,
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
      const rawDataUrl = reader.result as string;

      // Downscale photo to max 1280px JPEG (< 150 KB) to fit within Supabase Realtime limits
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.72);
        const photoId = `photo_${Date.now()}`;

        sendCommand("insert_photo", {
          photoId,
          dataUrl: compressedDataUrl,
          fileName: file.name,
        });

        // 5s fallback confirmation if board offline
        setTimeout(() => {
          setPhotoUploading(false);
        }, 5000);

        if (fileInputRef.current) fileInputRef.current.value = "";
      };
      img.src = rawDataUrl;
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
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
              isPaired
                ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800/80"
                : "text-amber-400 bg-amber-950/60 border border-amber-800/80"
            }`}
          >
            {isPaired ? "● Paired" : "○ Unpaired"}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{lastAction}</p>
        </div>
      </header>

      {!isPaired ? (
        <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 py-8 animate-in fade-in-50">
          <div className="h-20 w-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 grid place-items-center text-indigo-400 shadow-inner">
            <Lock className="h-10 w-10 text-indigo-400" />
          </div>

          <div className="space-y-2 max-w-xs">
            <h2 className="text-xl font-black text-slate-100">
              Enter Smart Board PIN
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter the 4-digit PIN displayed on your smart board screen to pair and control the presentation.
            </p>
          </div>

          <form onSubmit={handlePairSubmit} className="w-full max-w-xs space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full text-center text-4xl font-mono font-bold tracking-widest py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-indigo-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
              autoFocus
            />

            <Button
              type="submit"
              disabled={pinInput.trim().length !== 4}
              className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-base shadow-lg shadow-indigo-600/30"
            >
              Pair Remote &amp; Control Board
            </Button>
          </form>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

