import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, Globe, Plus, X } from "lucide-react";
import { useWhiteboard } from "@/lib/whiteboard/store";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LiveCaptionsWidgetProps {
  onClose: () => void;
}

export function LiveCaptionsWidget({ onClose }: LiveCaptionsWidgetProps) {
  const { addObject, pushHistory, camera } = useWhiteboard();
  const { language } = useTranslation();

  const [isListening, setIsListening] = useState(false);
  const [captionText, setCaptionText] = useState<string>("");
  const [historyText, setHistoryText] = useState<string>("");
  const [captionLang, setCaptionLang] = useState<string>(() => {
    if (language === "hi") return "hi-IN";
    if (language === "mr") return "mr-IN";
    return "en-IN";
  });
  const [largeFont, setLargeFont] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech Recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = captionLang;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final) {
        setHistoryText((prev) => (prev + " " + final).trim().slice(-300));
        setCaptionText(final);
      } else if (interim) {
        setCaptionText(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.");
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {}

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [captionLang]);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }

  // Insert current caption to board as a note
  function handleInsertToBoard() {
    const textToInsert = (captionText || historyText).trim();
    if (!textToInsert) {
      toast.error("No speech captured yet");
      return;
    }

    pushHistory();
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800;
    const cx = (screenW / 2 - camera.x) / camera.zoom - 120;
    const cy = (screenH / 2 - camera.y) / camera.zoom - 60;

    addObject({
      id: "caption-" + Math.random().toString(36).slice(2, 9),
      kind: "sticky",
      x: Math.round(cx),
      y: Math.round(cy),
      w: 240,
      h: 120,
      text: textToInsert,
      color: "#fef08a",
    });

    toast.success("Caption added to board as note!");
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-2xl bg-black/85 text-white backdrop-blur-md border border-white/20 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 transition-all">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-2.5 w-2.5 rounded-full",
              isListening ? "bg-emerald-400 animate-pulse" : "bg-zinc-500",
            )}
          />
          <span className="text-xs font-bold tracking-wide flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            Live Classroom Captions
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language selector */}
          <select
            value={captionLang}
            onChange={(e) => setCaptionLang(e.target.value)}
            className="text-[11px] bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-white cursor-pointer"
          >
            <option value="en-IN" className="bg-slate-900 text-white">English (India)</option>
            <option value="hi-IN" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
            <option value="mr-IN" className="bg-slate-900 text-white">मराठी (Marathi)</option>
          </select>

          {/* Font Size Toggle */}
          <button
            type="button"
            onClick={() => setLargeFont((f) => !f)}
            className="px-2 py-0.5 text-[11px] rounded bg-white/10 hover:bg-white/20 font-bold"
            title="Toggle text size"
          >
            {largeFont ? "A" : "A+"}
          </button>

          {/* Add to board */}
          <button
            type="button"
            onClick={handleInsertToBoard}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-semibold"
            title="Add text to board"
          >
            <Plus className="h-3 w-3" />
            <span>Note</span>
          </button>

          {/* Mic Toggle */}
          <button
            type="button"
            onClick={toggleListening}
            className={cn(
              "p-1 rounded-full transition",
              isListening ? "text-emerald-400 hover:bg-white/10" : "text-zinc-400 hover:bg-white/10",
            )}
            title={isListening ? "Mute captions" : "Unmute captions"}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real-time Subtitles Text Area */}
      <div
        className={cn(
          "min-h-[44px] max-h-24 overflow-y-auto leading-relaxed select-text font-medium text-center px-2",
          largeFont ? "text-lg sm:text-xl font-bold text-amber-200" : "text-sm sm:text-base text-zinc-100",
        )}
      >
        {captionText || historyText || (
          <span className="text-zinc-400 italic text-xs">
            {isListening ? "Speak near the microphone to show captions..." : "Microphone paused."}
          </span>
        )}
      </div>
    </div>
  );
}
