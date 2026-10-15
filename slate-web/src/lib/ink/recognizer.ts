/**
 * Handwriting recognition for Slate — ONLINE ONLY.
 *
 * Every word is read by Gemini (AIEngine.transcribeHandwriting) from a rendered
 * image of the ink. There is no on-device model: nothing to download, every
 * language and script works the same way, and failures are reported (never
 * silently swallowed) so the pen pill can tell the user what went wrong.
 */
import { create } from "zustand";
import { Capacitor } from "@capacitor/core";
import { AIEngine, AIError, aiErrorMessage } from "@/lib/ai/aiEngine";
import { useAISettings } from "@/lib/ai/aiSettingsStore";
import { useAuth } from "@/lib/supabase/authStore";
import { boundsOf, type InkStroke } from "./inkGeometry";
import { scriptFor } from "./handwritingFonts";

// ---------------------------------------------------------------------------
// Language definitions & Indian languages support
// ---------------------------------------------------------------------------

export interface LanguageOption {
  /** Identifier stored in settings (e.g. 'hi-IN', 'ta-IN', 'en-US') */
  code: string;
  /** Short language tag (kept as `mlkitTag` for saved-settings compatibility) */
  mlkitTag: string;
  /** English display name */
  name: string;
  /** Native script name */
  nativeName: string;
  /** Grouping category */
  category: "indian" | "international";
}

/**
 * All 22 official Eighth-Schedule Indian languages + English (India),
 * plus popular international languages.
 * Recognition is done online by Gemini, which reads all of these scripts.
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // ---------------- Indian Languages (22 Constitutional + English India) ----------------
  { code: "hi-IN", mlkitTag: "hi", name: "Hindi", nativeName: "हिन्दी", category: "indian" },
  { code: "en-IN", mlkitTag: "en-IN", name: "English (India)", nativeName: "English (India)", category: "indian" },
  { code: "bn-IN", mlkitTag: "bn", name: "Bengali", nativeName: "বাংলা", category: "indian" },
  { code: "te-IN", mlkitTag: "te", name: "Telugu", nativeName: "తెలుగు", category: "indian" },
  { code: "mr-IN", mlkitTag: "mr", name: "Marathi", nativeName: "मराठी", category: "indian" },
  { code: "ta-IN", mlkitTag: "ta", name: "Tamil", nativeName: "தமிழ்", category: "indian" },
  { code: "gu-IN", mlkitTag: "gu", name: "Gujarati", nativeName: "ગુજરાતી", category: "indian" },
  { code: "ur-IN", mlkitTag: "ur", name: "Urdu", nativeName: "اردو", category: "indian" },
  { code: "kn-IN", mlkitTag: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", category: "indian" },
  { code: "or-IN", mlkitTag: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", category: "indian" },
  { code: "ml-IN", mlkitTag: "ml", name: "Malayalam", nativeName: "മലയാളം", category: "indian" },
  { code: "pa-IN", mlkitTag: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", category: "indian" },
  { code: "as-IN", mlkitTag: "as", name: "Assamese", nativeName: "অসমীয়া", category: "indian" },
  { code: "sa-IN", mlkitTag: "sa-Deva-IN", name: "Sanskrit", nativeName: "संस्कृतम्", category: "indian" },
  { code: "mai-IN", mlkitTag: "mai-IN", name: "Maithili", nativeName: "मैथिली", category: "indian" },
  { code: "sat-IN", mlkitTag: "sat", name: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", category: "indian" },
  { code: "ks-IN", mlkitTag: "ks", name: "Kashmiri", nativeName: "كٲشُر", category: "indian" },
  { code: "ne-NP", mlkitTag: "ne", name: "Nepali", nativeName: "नेपाली", category: "indian" },
  { code: "kok-IN", mlkitTag: "kok", name: "Konkani", nativeName: "कोंकणी", category: "indian" },
  { code: "sd-IN", mlkitTag: "sd", name: "Sindhi", nativeName: "سنڌي", category: "indian" },
  { code: "doi-IN", mlkitTag: "doi-Deva", name: "Dogri", nativeName: "डोगरी", category: "indian" },
  { code: "mni-IN", mlkitTag: "mni", name: "Manipuri", nativeName: "ꯃꯤꯇꯩꯂꯣꯟ", category: "indian" },
  { code: "brx-IN", mlkitTag: "brx-Deva", name: "Bodo", nativeName: "बड़ो", category: "indian" },

  // ---------------- International Languages ----------------
  { code: "en-US", mlkitTag: "en-US", name: "American English", nativeName: "English (US)", category: "international" },
  { code: "en-GB", mlkitTag: "en-GB", name: "British English", nativeName: "English (UK)", category: "international" },
  { code: "es-ES", mlkitTag: "es-ES", name: "Spanish", nativeName: "Español", category: "international" },
  { code: "fr-FR", mlkitTag: "fr-FR", name: "French", nativeName: "Français", category: "international" },
  { code: "de-DE", mlkitTag: "de-DE", name: "German", nativeName: "Deutsch", category: "international" },
  { code: "ja", mlkitTag: "ja", name: "Japanese", nativeName: "日本語", category: "international" },
  { code: "zh-CN", mlkitTag: "zh-Hani-CN", name: "Chinese (Simplified)", nativeName: "简体中文", category: "international" },
  { code: "ar", mlkitTag: "ar", name: "Arabic", nativeName: "العربية", category: "international" },
  { code: "pt-BR", mlkitTag: "pt-BR", name: "Portuguese", nativeName: "Português", category: "international" },
  { code: "ru", mlkitTag: "ru", name: "Russian", nativeName: "Русский", category: "international" },
];

export function findLanguage(codeOrLocale?: string | null): LanguageOption {
  if (!codeOrLocale) return SUPPORTED_LANGUAGES[0];
  const norm = codeOrLocale.replace("_", "-").toLowerCase();

  // 1. Direct code match
  const exact = SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === norm);
  if (exact) return exact;

  // 2. Direct mlkitTag match (e.g. "ja", "ru", "sat-Deva")
  const byTag = SUPPORTED_LANGUAGES.find((l) => l.mlkitTag.toLowerCase() === norm);
  if (byTag) return byTag;

  // 3. Base language match (e.g. "ja-JP" -> "ja", "ru-RU" -> "ru")
  const [base] = norm.split("-");
  const byBase = SUPPORTED_LANGUAGES.find(
    (l) =>
      l.code.toLowerCase() === base ||
      l.code.toLowerCase().startsWith(`${base}-`) ||
      l.mlkitTag.toLowerCase() === base,
  );
  if (byBase) return byBase;

  return SUPPORTED_LANGUAGES.find((l) => l.code === "en-US") || SUPPORTED_LANGUAGES[0];
}

export function languageTagFor(locale?: string | null): string {
  if (!locale) return "en-US";
  const norm = locale.replace("_", "-");
  const [base, region] = norm.split("-");
  const lower = (base || "").toLowerCase();
  if (lower === "zh") {
    const r = (region || "").toUpperCase();
    if (r === "TW" || /hant/i.test(norm)) return "zh-Hani-TW";
    if (r === "HK") return "zh-Hani-HK";
    return "zh-Hani-CN";
  }
  if (lower === "ja") return "ja";
  if (lower === "ru") return "ru";
  const exact = region ? `${lower}-${region.toUpperCase()}` : "";
  if (exact === "en-IN") return "en-IN";
  if (exact === "en-GB") return "en-GB";
  if (exact === "en-US") return "en-US";
  if (exact === "hi-IN") return "hi-IN";
  if (lower === "mr") return "mr-IN";
  if (lower === "en" && region) return "en-US";
  const found = findLanguage(locale);
  if (found && found.code !== "en-US" && found.code !== "hi-IN") return found.code;
  if (exact) return "en-US";
  return "en-US";
}

export function deviceLanguageCode(): string {
  if (typeof navigator === "undefined") return "en-US";
  const navLang = navigator.languages?.[0] || navigator.language;
  return findLanguage(navLang).code;
}

// ---------------------------------------------------------------------------
// Settings + status
// ---------------------------------------------------------------------------

export type InkSettings = {
  /** Show the recognised text above your writing; tap it to convert. */
  livePreview: boolean;
  /** Convert writing to typed text automatically when you pause. */
  autoType: boolean;
  /** Scribble over ink to erase it. */
  scratchOut: boolean;
  /** Translate each word as you write it (into `translateTo`). */
  translateLive: boolean;
};

export type RecognizerStatus =
  | "idle" // not used yet
  | "cloud" // online recognition working
  | "offline" // no internet connection
  | "unavailable" // AI not set up (no key and not signed in)
  | "error"; // last request failed (see lastError)

const SETTINGS_KEY = "slate_ink_settings_v1";
const LANGUAGE_KEY = "slate_ink_language_v1";
const DEFAULTS: InkSettings = { livePreview: true, autoType: true, scratchOut: true, translateLive: false };
const TRANSLATE_KEY = "slate_ink_translate_to_v1";

function loadTranslateTo(): string {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(TRANSLATE_KEY) : null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* ignore */
  }
  return "hi-IN";
}

function loadSettings(): InkSettings {
  try {
    const MIGRATION_KEY = "slate_ink_autotype_v3_fixed";
    if (typeof localStorage !== "undefined" && !localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(MIGRATION_KEY, "1");
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const fixed = { ...DEFAULTS, ...parsed, autoType: true, livePreview: true };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(fixed));
      return fixed;
    }
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...parsed,
        livePreview: true,
        autoType: typeof parsed.autoType === "boolean" ? parsed.autoType : true,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS, livePreview: true, autoType: true };
}

function loadLanguage(): string {
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem(LANGUAGE_KEY) : null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch {
    /* ignore */
  }
  return deviceLanguageCode();
}


type InkState = InkSettings & {
  status: RecognizerStatus;
  /** Plain-language reason the last recognition failed (null when it worked). */
  lastError: string | null;
  language: string;
  langVersion: number;
  langPickerOpen: boolean;
  /** Language translations are written in. */
  translateTo: string;
  translatePickerOpen: boolean;
  /** True when opened for a one-off selection translation rather than changing live writing settings */
  translatePickerForSelection: boolean;
  set: (patch: Partial<InkSettings>) => void;
  setTranslateTo: (code: string) => void;
  /** Chooses translation language; returns true if live translation setting changed, false if handled by selection callback */
  chooseTranslateLanguage: (code: string) => boolean;
  /** Opens the "Translate into…" picker; `onPick` runs once with the chosen language. */
  openTranslatePicker: (onPick?: (code: string) => void) => void;
  closeTranslatePicker: () => void;
  setLanguage: (code: string) => void;
  setLangPickerOpen: (open: boolean) => void;
  setStatus: (s: RecognizerStatus) => void;
};

export const useInk = create<InkState>((set, get) => ({
  ...loadSettings(),
  status: "idle",
  lastError: null,
  language: loadLanguage(),
  langVersion: 0,
  langPickerOpen: false,
  translateTo: loadTranslateTo(),
  translatePickerOpen: false,
  translatePickerForSelection: false,
  set: (patch) => {
    set(patch);
    const { livePreview, autoType, scratchOut, translateLive } = { ...get(), ...patch };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ livePreview, autoType, scratchOut, translateLive }));
    } catch {
      /* ignore */
    }
  },
  setLanguage: (code) => {
    set((s) => ({ language: code, langVersion: (s.langVersion || 0) + 1 }));
    try {
      localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      /* ignore */
    }
  },
  setLangPickerOpen: (langPickerOpen) => set({ langPickerOpen }),
  setStatus: (status) => set({ status }),
  setTranslateTo: (code) => {
    set((s) => ({ translateTo: code, translatePickerOpen: false, translatePickerForSelection: false, langVersion: (s.langVersion || 0) + 1 }));
    try {
      localStorage.setItem(TRANSLATE_KEY, code);
    } catch {
      /* ignore */
    }
    const cb = pendingTranslatePick;
    pendingTranslatePick = null;
    cb?.(code);
  },
  chooseTranslateLanguage: (code) => {
    const cb = pendingTranslatePick;
    pendingTranslatePick = null;
    set({ translatePickerOpen: false, translatePickerForSelection: false });
    if (cb) {
      cb(code);
      return false;
    }
    get().setTranslateTo(code);
    return true;
  },
  openTranslatePicker: (onPick) => {
    pendingTranslatePick = onPick ?? null;
    set({ translatePickerOpen: true, translatePickerForSelection: !!onPick });
  },
  closeTranslatePicker: () => {
    pendingTranslatePick = null;
    set({ translatePickerOpen: false, translatePickerForSelection: false });
  },
}));

let pendingTranslatePick: ((code: string) => void) | null = null;

// ---------------------------------------------------------------------------
// Online engine (Gemini)
// ---------------------------------------------------------------------------

export type Recognition = {
  /** What to place on the board: the reading, or the translation in translate mode. */
  text: string;
  alternatives: string[];
  source: "cloud";
  /** Translate mode: the handwriting as written, its language, and the target language code. */
  original?: string;
  fromLanguage?: string;
  translatedTo?: string;
};

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Dev builds only: lets automated UI tests stand in for Gemini. */
type DevRecognizer = (s: InkStroke[], o: { translateTo?: string }) => Promise<string | null>;
function devHook(): DevRecognizer | undefined {
  if (!import.meta.env?.DEV || typeof window === "undefined") return undefined;
  return (window as unknown as { __slateInkRecognizer?: DevRecognizer }).__slateInkRecognizer;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/** Is AI set up (a Gemini key, or signed in for the server proxy)? */
function aiConfigured(): boolean {
  if (useAISettings.getState().getApiKey()) return true;
  try {
    return Boolean(useAuth.getState().session?.access_token);
  } catch {
    return false;
  }
}

/** Can handwriting be recognised right now? */
export function recognitionAvailable(): boolean {
  if (devHook()) return true;
  return aiConfigured();
}

/** Draws ink onto a white PNG for Gemini. */
export function renderInkPng(strokes: InkStroke[], pad = 24): string | null {
  if (typeof document === "undefined") return null;
  const b = boundsOf(strokes.flatMap((s) => s.points));
  if (b.w + b.h < 4) return null;
  // Normalise so the word fills ~900px on its long side — sharp for the model, small upload
  const scale = Math.min(4, Math.max(0.25, 900 / Math.max(b.w, b.h, 1)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(b.w * scale + pad * 2);
  canvas.height = Math.ceil(b.h * scale + pad * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, 3 * Math.min(1.5, scale));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    if (!s.points.length) continue;
    ctx.beginPath();
    s.points.forEach((p, i) => {
      const x = (p.x - b.x) * scale + pad;
      const y = (p.y - b.y) * scale + pad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (s.points.length === 1) ctx.lineTo((s.points[0].x - b.x) * scale + pad + 0.1, (s.points[0].y - b.y) * scale + pad);
    ctx.stroke();
  }
  return canvas.toDataURL("image/png");
}

const RECOGNITION_TIMEOUT_MS = 20000;
const cache = new Map<string, Recognition>();
const inFlight = new Map<string, Promise<Recognition | null>>();

function cacheKey(strokes: InkStroke[], translateTo?: string) {
  const lang = useInk.getState().language;
  return `${lang}>${translateTo ?? ""}::` + strokes.map((s) => `${s.id}:${s.points.length}`).join("|");
}

function fail(status: RecognizerStatus, message: string): null {
  useInk.setState({ status, lastError: message });
  return null;
}

/**
 * Recognise a group of strokes (one word or line) online with Gemini.
 * Returns null when nothing could be read; the reason is in useInk().lastError.
 * Identical requests share one network call, and results are cached.
 */
export async function recognizeInk(
  strokes: InkStroke[],
  opts: { preContext?: string; translateTo?: string } = {},
): Promise<Recognition | null> {
  if (!strokes.length) return null;
  const translateTo = opts.translateTo;
  const key = cacheKey(strokes, translateTo);
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<Recognition | null> => {
    const hook = devHook();
    let text: string | null = null;
    let original: string | undefined;
    let fromLanguage: string | undefined;
    if (hook) {
      text = await hook(strokes, { translateTo });
      if (!text) return fail("error", "Couldn't read that — try writing a little larger.");
    } else {
      if (!isOnline()) return fail("offline", "You're offline — handwriting needs internet.");
      if (!aiConfigured()) return fail("unavailable", "AI isn't set up — sign in or add a Gemini key in Settings.");
      const png = renderInkPng(strokes);
      if (!png) return null;
      const lang = findLanguage(useInk.getState().language);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AIError("timeout", "The AI took too long to read your writing.")), RECOGNITION_TIMEOUT_MS),
      );
      try {
        if (translateTo) {
          // One request: read the handwriting and translate it into the target language/script
          const target = findLanguage(translateTo);
          const r = await Promise.race([
            AIEngine.translateHandwriting(png, `${target.name} (${target.nativeName})`, scriptFor(target.code).script, {
              timeoutMs: 15000,
            }),
            timeout,
          ]);
          text = r.translation;
          original = r.source;
          fromLanguage = r.sourceLanguage;
        } else {
          text = await Promise.race([
            AIEngine.transcribeHandwriting(png, `${lang.name} (${lang.nativeName})`, { timeoutMs: 15000 }),
            timeout,
          ]);
        }
      } catch (err) {
        const code = err instanceof AIError ? err.code : "";
        if (code === "bad_response") return fail("error", "Couldn't read that — try writing a little larger.");
        if (code === "offline") return fail("offline", "You're offline — handwriting needs internet.");
        return fail("error", aiErrorMessage(err));
      }
    }
    const clean = (text || "").replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!clean) return fail("error", "Couldn't read that — try writing a little larger.");
    const out: Recognition = {
      text: clean,
      alternatives: [],
      source: "cloud",
      ...(translateTo ? { original: original || undefined, fromLanguage, translatedTo: translateTo } : {}),
    };
    useInk.setState({ status: "cloud", lastError: null });
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    cache.set(key, out);
    return out;
  })();

  inFlight.set(key, run);
  try {
    return await run;
  } finally {
    inFlight.delete(key);
  }
}

/** For tests. */
export function __resetRecognizer() {
  cache.clear();
  inFlight.clear();
}
