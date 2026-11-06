import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "../i18n/useTranslation";
import { toast } from "sonner";

export function isDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export function pickBestVoice(voices: SpeechSynthesisVoice[], text: string, appLang: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const hasDevanagari = isDevanagari(text);

  if (hasDevanagari) {
    if (appLang === "mr") {
      const mrVoice = voices.find((v) => v.lang.toLowerCase().startsWith("mr"));
      if (mrVoice) return mrVoice;
    }
    const hiVoice = voices.find((v) => v.lang.toLowerCase().startsWith("hi"));
    if (hiVoice) return hiVoice;
  }

  // English fallback: prefer en-IN or default
  const inVoice = voices.find((v) => v.lang.toLowerCase() === "en-in");
  if (inVoice) return inVoice;

  const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return enVoice || voices[0] || null;
}

export function useReadAloud() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const appLang = useLanguageStore((s) => s.language);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text || text.trim().length === 0) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        toast.error("Text-to-speech is not supported on this browser.");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      const voice = pickBestVoice(voices, text, appLang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = isDevanagari(text) ? (appLang === "mr" ? "mr-IN" : "hi-IN") : "en-IN";
      }

      utterance.rate = 0.95; // Slightly clearer rate for classroom acoustic environments

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error", e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [voices, appLang],
  );

  return { speak, stop, isSpeaking };
}
