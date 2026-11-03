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

/**
 * Lettering styles for handwriting → text conversion (Latin script).
 * `font: ""` is the plain app font. `scale` evens out each font's optical size
 * so converted text comes out about as tall as the writing it replaces.
 */
export type TextFontOption = { id: string; label: string; font: string; scale: number };
export const TEXT_FONTS: TextFontOption[] = [
  { id: "plain", label: "Plain", font: "", scale: 1 },
  { id: "caveat", label: "Caveat", font: "Caveat", scale: 1.3 },
  { id: "patrick", label: "Patrick Hand", font: "Patrick Hand", scale: 1.15 },
  { id: "kalam", label: "Kalam", font: "Kalam", scale: 1.1 },
  { id: "indie", label: "Indie Flower", font: "Indie Flower", scale: 1.1 },
  { id: "shadows", label: "Shadows Into Light", font: "Shadows Into Light", scale: 1.15 },
  { id: "gochi", label: "Gochi Hand", font: "Gochi Hand", scale: 1.15 },
  { id: "architects", label: "Architects Daughter", font: "Architects Daughter", scale: 1.05 },
  { id: "dancing", label: "Dancing Script", font: "Dancing Script", scale: 1.25 },
  { id: "marker", label: "Permanent Marker", font: "Permanent Marker", scale: 1.0 },
];

export function textFontById(id: string | undefined): TextFontOption {
  return TEXT_FONTS.find((f) => f.id === id) ?? TEXT_FONTS[0];
}

/** True when every letter is Latin, so a Latin-only lettering font can draw it. */
export function isLatinText(text: string): boolean {
  return !/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(text);
}

/** CSS / canvas font-family stack for a handwriting font. */
export function fontStack(font: string | undefined): string {
  if (!font) return "system-ui, -apple-system, sans-serif";
  const info = Object.values(SCRIPTS).find((s) => s.font === font);
  return `"${font}", ${info?.fallback ?? "cursive"}, system-ui, sans-serif`;
}

/** Handwriting fonts render a little smaller than system text at the same size. */
export function handwritingScale(font: string | undefined): number {
  const opt = TEXT_FONTS.find((f) => f.font && f.font === font);
  if (opt) return opt.scale;
  return font === "Gurajada" ? 1.4 : 1.1;
}

const requested = new Map<string, Promise<boolean>>();
const loaded = new Set<string>();
const failedFonts = new Map<string, number>();

/** Cooldown before retrying a failed font fetch (unless forced or online event fires). */
const FAILED_COOLDOWN_MS = 6000;

/** Clears failed font cache so all pending/failed handwriting fonts can be retried immediately. */
export function clearFailedFonts(): void {
  for (const font of failedFonts.keys()) {
    requested.delete(font);
  }
  failedFonts.clear();
}

// When internet comes back online, clear failed fonts and notify canvas to retry loading
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    clearFailedFonts();
    window.dispatchEvent(new CustomEvent("slate:fonts-retry"));
  });
}

/** Loads a handwriting font. Resolves true when it's ready to draw on the canvas. */
export function ensureHandwritingFont(
  font: string | undefined,
  sample = "Aa",
  forceRetry = false,
): Promise<boolean> {
  if (!font || typeof document === "undefined") return Promise.resolve(false);
  if (loaded.has(font)) return Promise.resolve(true);

  if (!forceRetry) {
    const lastFailed = failedFonts.get(font);
    if (lastFailed && Date.now() - lastFailed < FAILED_COOLDOWN_MS) {
      return Promise.resolve(false);
    }
    const existing = requested.get(font);
    if (existing) return existing;
  }

  const p = (async () => {
    const id = `hwfont-${font.replace(/\s+/g, "-").toLowerCase()}`;
    let linkAdded = false;
    try {
      let link = document.getElementById(id) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}&display=swap`;
        document.head.appendChild(link);
        linkAdded = true;
        const loadedOk = await new Promise<boolean>((resolve) => {
          if (!link) return resolve(false);
          link.onload = () => resolve(true);
          link.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 6000);
        });
        if (!loadedOk) {
          throw new Error(`Failed to fetch stylesheet for font "${font}"`);
        }
      }
      await document.fonts.load(`32px "${font}"`, sample);
      if (document.fonts.check && !document.fonts.check(`32px "${font}"`, sample)) {
        await document.fonts.ready;
      }
      loaded.add(font);
      failedFonts.delete(font);
      requested.delete(font);
      return true;
    } catch {
      // If font fetch failed, remove the broken <link> tag so future retries re-fetch cleanly
      if (linkAdded) {
        const link = document.getElementById(id);
        link?.remove();
      }
      failedFonts.set(font, Date.now());
      requested.delete(font); // Do NOT cache the failed promise forever
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

