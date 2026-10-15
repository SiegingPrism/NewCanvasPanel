/**
 * Handwriting-style lettering for every script Slate can translate into.
 *
 * Translations are placed on the board as text drawn in a handwriting font that
 * matches the target script (Kalam for Devanagari, Kavivanar for Tamil, Gulzar
 * for Urdu…), so they look written by hand but stay editable and searchable.
 * Fonts come from Google Fonts on first use (translation is online anyway).
 */

export type ScriptInfo = {
  /** Script name given to the AI so it writes the translation in the right script. */
  script: string;
  /** Handwriting-style Google Font for this script. */
  font: string;
  /** System fallbacks if the font can't load. */
  fallback: string;
};

const SCRIPTS: Record<string, ScriptInfo> = {
  latin: { script: "Latin", font: "Caveat", fallback: '"Segoe Print", "Bradley Hand", cursive' },
  cyrillic: { script: "Cyrillic", font: "Caveat", fallback: "cursive" },
  devanagari: { script: "Devanagari", font: "Kalam", fallback: '"Noto Sans Devanagari"' },
  bengali: { script: "Bengali–Assamese", font: "Galada", fallback: '"Noto Sans Bengali"' },
  gurmukhi: { script: "Gurmukhi", font: "Baloo Paaji 2", fallback: '"Noto Sans Gurmukhi"' },
  gujarati: { script: "Gujarati", font: "Mogra", fallback: '"Noto Sans Gujarati"' },
  odia: { script: "Odia", font: "Baloo Bhaina 2", fallback: '"Noto Sans Oriya"' },
  tamil: { script: "Tamil", font: "Kavivanar", fallback: '"Noto Sans Tamil"' },
  telugu: { script: "Telugu", font: "Gurajada", fallback: '"Noto Sans Telugu"' },
  kannada: { script: "Kannada", font: "Baloo Tamma 2", fallback: '"Noto Sans Kannada"' },
  malayalam: { script: "Malayalam", font: "Baloo Chettan 2", fallback: '"Noto Sans Malayalam"' },
  nastaliq: { script: "Perso-Arabic (Nastaliq)", font: "Gulzar", fallback: '"Noto Nastaliq Urdu", "Noto Sans Arabic"' },
  arabic: { script: "Arabic", font: "Aref Ruqaa", fallback: '"Noto Sans Arabic"' },
  olchiki: { script: "Ol Chiki", font: "Noto Sans Ol Chiki", fallback: "sans-serif" },
  meetei: { script: "Meetei Mayek", font: "Noto Sans Meetei Mayek", fallback: "sans-serif" },
  japanese: { script: "Japanese (kana and kanji)", font: "Yomogi", fallback: '"Noto Sans JP"' },
  chinese: { script: "Simplified Chinese characters", font: "Ma Shan Zheng", fallback: '"Noto Sans SC"' },
};

/** Base language → script. */
const LANGUAGE_SCRIPT: Record<string, keyof typeof SCRIPTS> = {
  en: "latin",
  es: "latin",
  fr: "latin",
  de: "latin",
  pt: "latin",
  ru: "cyrillic",
  hi: "devanagari",
  mr: "devanagari",
  ne: "devanagari",
  sa: "devanagari",
  mai: "devanagari",
  kok: "devanagari",
  doi: "devanagari",
  brx: "devanagari",
  bn: "bengali",
  as: "bengali",
  pa: "gurmukhi",
  gu: "gujarati",
  or: "odia",
  ta: "tamil",
  te: "telugu",
  kn: "kannada",
  ml: "malayalam",
  ur: "nastaliq",
  ks: "nastaliq",
  sd: "nastaliq",
  sat: "olchiki",
  mni: "meetei",
  ja: "japanese",
  zh: "chinese",
  ar: "arabic",
};

export function scriptFor(languageCode: string): ScriptInfo {
  const base = (languageCode || "en").toLowerCase().split("-")[0];
  return SCRIPTS[LANGUAGE_SCRIPT[base] ?? "latin"];
}

/** CSS / canvas font-family stack for a handwriting font. */
export function fontStack(font: string | undefined): string {
  if (!font) return "system-ui, -apple-system, sans-serif";
  const info = Object.values(SCRIPTS).find((s) => s.font === font);
  return `"${font}", ${info?.fallback ?? "cursive"}, system-ui, sans-serif`;
}

/** Handwriting fonts render a little smaller than system text at the same size. */
export function handwritingScale(font: string | undefined): number {
  return font === "Caveat" ? 1.3 : font === "Gurajada" ? 1.4 : 1.1;
}

const requested = new Map<string, Promise<boolean>>();
const loaded = new Set<string>();

/** Loads a handwriting font (once). Resolves true when it's ready to draw on the canvas. */
export function ensureHandwritingFont(font: string | undefined, sample = "Aa"): Promise<boolean> {
  if (!font || typeof document === "undefined") return Promise.resolve(false);
  if (loaded.has(font)) return Promise.resolve(true);
  const existing = requested.get(font);
  if (existing) return existing;
  const p = (async () => {
    try {
      const id = `hwfont-${font.replace(/\s+/g, "-").toLowerCase()}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}&display=swap`;
        document.head.appendChild(link);
        await new Promise<void>((resolve) => {
          link.onload = () => resolve();
          link.onerror = () => resolve();
          setTimeout(resolve, 6000);
        });
      }
      await document.fonts.load(`32px "${font}"`, sample);
      loaded.add(font);
      return true;
    } catch {
      return false;
    }
  })();
  requested.set(font, p);
  return p;
}

/** True when the font is already usable (so the canvas can draw it without waiting). */
export function handwritingFontReady(font: string | undefined): boolean {
  if (!font || typeof document === "undefined") return true;
  return loaded.has(font);
}
