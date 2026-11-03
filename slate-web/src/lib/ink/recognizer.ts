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
import { ensureHandwritingFont, scriptFor, textFontById } from "./handwritingFonts";
import { useTranslationMetrics } from "./translationMetrics";

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
  /** Lettering style for converted text (id from TEXT_FONTS; "plain" = app font). */
  textFont: string;
};

export type RecognizerStatus =
  | "idle" // not used yet
  | "cloud" // online recognition working
  | "offline" // no internet connection
  | "unavailable" // AI not set up (no key and not signed in)
  | "error"; // last request failed (see lastError)

const SETTINGS_KEY = "slate_ink_settings_v1";
const LANGUAGE_KEY = "slate_ink_language_v1";
const DEFAULTS: InkSettings = { livePreview: true, autoType: false, scratchOut: true, translateLive: false, textFont: "plain" };
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
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...parsed,
        livePreview: typeof parsed.livePreview === "boolean" ? parsed.livePreview : DEFAULTS.livePreview,
        autoType: typeof parsed.autoType === "boolean" ? parsed.autoType : DEFAULTS.autoType,
        scratchOut: typeof parsed.scratchOut === "boolean" ? parsed.scratchOut : DEFAULTS.scratchOut,
        translateLive: typeof parsed.translateLive === "boolean" ? parsed.translateLive : DEFAULTS.translateLive,
        textFont: typeof parsed.textFont === "string" ? parsed.textFont : DEFAULTS.textFont,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
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
  set: (patch: Partial<InkSettings> & { translateTo?: string }) => void;
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

let pendingTranslatePick: ((code: string) => void) | null = null;

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
    const { livePreview, autoType, scratchOut, translateLive, textFont } = { ...get(), ...patch };
    if (patch.textFont) void ensureHandwritingFont(textFontById(patch.textFont).font || undefined);
    if (patch.translateLive || patch.translateTo) {
      const code = patch.translateTo || get().translateTo;
      if (code) void ensureHandwritingFont(scriptFor(code).font);
    }
    if (patch.translateTo) {
      try {
        localStorage.setItem(TRANSLATE_KEY, patch.translateTo);
      } catch {
        /* ignore */
      }
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ livePreview, autoType, scratchOut, translateLive, textFont }));
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
    void ensureHandwritingFont(scriptFor(code).font);
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
    void ensureHandwritingFont(scriptFor(code).font);
    if (cb) {
      cb(code);
      return false;
    }
    set({ translateLive: true });
    try {
      const currentSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...currentSettings, translateLive: true }));
    } catch {}
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

if (typeof window !== "undefined") {
  try {
    const initLang = loadTranslateTo();
    if (initLang) {
      void ensureHandwritingFont(scriptFor(initLang).font);
    }
  } catch {
    /* ignore */
  }
}

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

export type RenderedInk = {
  dataUrl: string;
  bytes: number;
  w: number;
  h: number;
};

/**
 * Draws ink onto an optimized high-contrast canvas for Gemini.
 * Scales word to max 420px (down from 900px), reducing upload payload by ~4-6x.
 * Uses WebP or high-compression format with grayscale strokes.
 */
export function renderInkImage(strokes: InkStroke[], pad = 16): RenderedInk | null {
  if (typeof document === "undefined") return null;
  const b = boundsOf(strokes.flatMap((s) => s.points));
  if (b.w + b.h < 4) return null;

  // Max long side 420px: sharp for Gemini OCR, small upload (< 25KB)
  const maxDim = Math.max(b.w, b.h, 1);
  const scale = Math.min(2.5, Math.max(0.35, 420 / maxDim));
  const canvas = document.createElement("canvas");
  const w = Math.ceil(b.w * scale + pad * 2);
  const h = Math.ceil(b.h * scale + pad * 2);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // High contrast monochrome: pure white background with jet black strokes
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = Math.max(2.5, 2.5 * Math.min(1.2, scale));
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
    if (s.points.length === 1) {
      ctx.lineTo((s.points[0].x - b.x) * scale + pad + 0.1, (s.points[0].y - b.y) * scale + pad);
    }
    ctx.stroke();
  }

  // Prefer WebP or JPEG 80% for tiny payload; fallback to PNG if unsupported
  let dataUrl = "";
  try {
    dataUrl = canvas.toDataURL("image/webp", 0.8);
    if (!dataUrl.startsWith("data:image/webp")) {
      dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    }
  } catch {
    dataUrl = canvas.toDataURL("image/png");
  }
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    dataUrl = canvas.toDataURL("image/png");
  }

  const bytes = Math.round((dataUrl.length * 3) / 4);
  return { dataUrl, bytes, w, h };
}

/** Draws ink onto a white image for Gemini. Backward-compatible wrapper. */
export function renderInkPng(strokes: InkStroke[], pad = 16): string | null {
  const rendered = renderInkImage(strokes, pad);
  return rendered ? rendered.dataUrl : null;
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

export type RecognizeInkOptions = {
  preContext?: string;
  translateTo?: string;
  signal?: AbortSignal;
  penLiftedAt?: number;
  prefix?: string;
};

/**
 * Recognise a group of strokes (one word or line) online with Gemini.
 * Returns null when nothing could be read; the reason is in useInk().lastError.
 * Identical requests share one network call, and results are cached.
 */
export async function recognizeInk(
  strokes: InkStroke[],
  opts: RecognizeInkOptions = {},
): Promise<Recognition | null> {
  if (!strokes.length) return null;
  const translateTo = opts.translateTo;
  const key = cacheKey(strokes, translateTo);
  const cached = cache.get(key);
  if (cached) {
    if (opts.penLiftedAt) {
      useTranslationMetrics.getState().recordMetric({
        id: key,
        penLiftedAt: opts.penLiftedAt,
        requestSentAt: Date.now(),
        replyReceivedAt: Date.now(),
        uiRenderedAt: Date.now(),
        totalLatencyMs: Date.now() - opts.penLiftedAt,
        pauseWaitMs: Math.max(0, Date.now() - opts.penLiftedAt),
        networkLatencyMs: 0,
        imageBytes: 0,
        imageDimensions: { w: 0, h: 0 },
        sourceText: cached.original || cached.text,
        translatedText: cached.text,
        targetLanguage: translateTo,
        cached: true,
      });
    }
    return cached;
  }
  const pending = inFlight.get(key);
  if (pending) return pending;

  const run = (async (): Promise<Recognition | null> => {
    const hook = devHook();
    let text: string | null = null;
    let original: string | undefined;
    let fromLanguage: string | undefined;
    let alternatives: string[] = [];
    const requestSentAt = Date.now();
    let imgBytes = 0;
    let imgW = 0;
    let imgH = 0;

    if (hook) {
      text = await hook(strokes, { translateTo });
      if (!text) return fail("error", "Couldn't read that — try writing a little larger.");
    } else {
      if (!isOnline()) return fail("offline", "You're offline — handwriting needs internet.");
      if (!aiConfigured()) return fail("unavailable", "AI isn't set up — sign in or add a Gemini key in Settings.");
      const rendered = renderInkImage(strokes);
      if (!rendered) {
        return null;
      }
      imgBytes = rendered.bytes;
      imgW = rendered.w;
      imgH = rendered.h;

      const lang = findLanguage(useInk.getState().language);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new AIError("timeout", "The AI took too long to read your writing.")), RECOGNITION_TIMEOUT_MS),
      );
      try {
        if (translateTo) {
          // One request: read the handwriting and translate it into the target language/script
          const target = findLanguage(translateTo);
          const r = await Promise.race([
            AIEngine.translateHandwriting(
              rendered.dataUrl,
              `${target.name} (${target.nativeName})`,
              scriptFor(target.code).script,
              {
                timeoutMs: 15000,
                signal: opts.signal,
                context: opts.preContext,
                prefix: opts.prefix,
                thinkingBudget: 0,
              },
            ),
            timeout,
          ]);
          text = r.translation;
          original = r.source;
          fromLanguage = r.sourceLanguage;
          alternatives = r.alternatives || [];
        } else {
          text = await Promise.race([
            AIEngine.transcribeHandwriting(rendered.dataUrl, `${lang.name} (${lang.nativeName})`, {
              timeoutMs: 15000,
              signal: opts.signal,
              thinkingBudget: 0,
            }),
            timeout,
          ]);
        }
      } catch (err) {
        console.error("[recognizeInk error]", err);
        if (opts.signal?.aborted || (err instanceof AIError && err.code === "aborted")) {
          return null;
        }
        const code = err instanceof AIError ? err.code : "";
        if (code === "bad_response") {
          useInk.setState({ status: "idle", lastError: null });
          return null;
        }
        if (code === "offline") return fail("offline", "You're offline — handwriting needs internet.");
        return fail("error", aiErrorMessage(err));
      }
    }
    const clean = (text || "").replace(/^["'`]+|["'`]+$/g, "").trim();
    if (!clean || /^\[unreadable\]$/i.test(clean)) {
      useInk.setState({ status: "idle", lastError: null });
      return null;
    }
    const out: Recognition = {
      text: clean,
      alternatives,
      source: "cloud",
      ...(translateTo ? { original: original || undefined, fromLanguage, translatedTo: translateTo } : {}),
    };

    const replyReceivedAt = Date.now();
    const penLiftedAt = opts.penLiftedAt || requestSentAt;
    useTranslationMetrics.getState().recordMetric({
      id: key,
      penLiftedAt,
      requestSentAt,
      replyReceivedAt,
      uiRenderedAt: replyReceivedAt,
      totalLatencyMs: replyReceivedAt - penLiftedAt,
      pauseWaitMs: Math.max(0, requestSentAt - penLiftedAt),
      networkLatencyMs: replyReceivedAt - requestSentAt,
      imageBytes: imgBytes,
      imageDimensions: { w: imgW, h: imgH },
      sourceText: original || clean,
      translatedText: clean,
      targetLanguage: translateTo,
    });

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
