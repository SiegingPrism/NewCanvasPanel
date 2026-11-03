import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Mic, MicOff, AlertTriangle, ShieldCheck, Bell } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type TrafficState = "red" | "yellow" | "green";

export function ClassroomManagerWidget() {
  const [traffic, setTraffic] = useState<TrafficState>("green");
  const [micActive, setMicActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0); // 0 to 100
  const [threshold, setThreshold] = useState(70);
  const [noiseAlert, setNoiseAlert] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let animId: number;
      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalized = Math.min(100, Math.round((average / 128) * 100));
        setVolumeLevel(normalized);

        if (normalized > threshold) {
          setNoiseAlert(true);
        } else {
          setNoiseAlert(false);
        }

        animId = requestAnimationFrame(checkVolume);
      };

      setMicActive(true);
      checkVolume();
    } catch (err) {
      console.warn("Classroom mic access failed:", err);
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setMicActive(false);
    setVolumeLevel(0);
    setNoiseAlert(false);
  };

  useEffect(() => {
    return () => {
      stopMic();
    };
  }, []);

  return (
    <div className="w-80 select-none space-y-4 p-1">
      {/* 1. Behavior Traffic Light */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classroom Mode</p>
        <div className="flex items-center justify-between rounded-2xl bg-card border border-border p-3 shadow-inner">
          {/* Red Light */}
          <button
            onClick={() => setTraffic("red")}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <div
              className={cn(
                "h-14 w-14 rounded-full border-2 transition-all flex items-center justify-center",
                traffic === "red"
                  ? "bg-rose-500 border-white shadow-[0_0_24px_rgba(244,63,94,0.8)] scale-105"
                  : "bg-rose-950/40 border-rose-900/60 opacity-40 hover:opacity-75"
              )}
            >
              <span className="text-[10px] font-black text-white">QUIET</span>
            </div>
            <span className={cn("text-[10px] font-bold", traffic === "red" ? "text-rose-500" : "text-muted-foreground")}>
              Silence
            </span>
          </button>

          {/* Yellow Light */}
          <button
            onClick={() => setTraffic("yellow")}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <div
              className={cn(
                "h-14 w-14 rounded-full border-2 transition-all flex items-center justify-center",
                traffic === "yellow"
                  ? "bg-amber-400 border-white shadow-[0_0_24px_rgba(251,191,36,0.8)] scale-105"
                  : "bg-amber-950/40 border-amber-900/60 opacity-40 hover:opacity-75"
              )}
            >
              <span className="text-[10px] font-black text-slate-900">WHISPER</span>
            </div>
            <span className={cn("text-[10px] font-bold", traffic === "yellow" ? "text-amber-500" : "text-muted-foreground")}>
              Pairs
            </span>
          </button>

          {/* Green Light */}
          <button
            onClick={() => setTraffic("green")}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <div
              className={cn(
                "h-14 w-14 rounded-full border-2 transition-all flex items-center justify-center",
                traffic === "green"
                  ? "bg-emerald-500 border-white shadow-[0_0_24px_rgba(16,185,129,0.8)] scale-105"
                  : "bg-emerald-950/40 border-emerald-900/60 opacity-40 hover:opacity-75"
              )}
            >
              <span className="text-[10px] font-black text-white">GROUP</span>
            </div>
            <span className={cn("text-[10px] font-bold", traffic === "green" ? "text-emerald-500" : "text-muted-foreground")}>
              Discussion
            </span>
          </button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* 2. Audio Noise Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Classroom Noise Meter</p>
          <button
            onClick={micActive ? stopMic : startMic}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all",
              micActive ? "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20" : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {micActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {micActive ? "Stop Meter" : "Start Mic"}
          </button>
        </div>

        {micActive ? (
          <div className="space-y-2 rounded-xl bg-card border border-border p-3 shadow-inner">
            {/* Realtime Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Room Noise</span>
                <span className={cn("font-bold font-mono", noiseAlert ? "text-rose-500 animate-pulse" : "text-foreground")}>
                  {volumeLevel} dB
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-75",
                    volumeLevel > threshold
                      ? "bg-rose-500"
                      : volumeLevel > threshold * 0.7
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${volumeLevel}%` }}
                />
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Alert Limit:</span>
                <span>{threshold}%</span>
              </div>
              <Slider
                value={[threshold]}
                min={30}
                max={95}
                step={5}
                onValueChange={([v]) => setThreshold(v)}
              />
            </div>

            {noiseAlert && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-2 text-rose-500 animate-bounce text-xs font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Classroom is getting too loud!</span>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            Tap &apos;Start Mic&apos; to monitor room decibels live on the board.
          </div>
        )}
      </div>
    </div>
  );
}

