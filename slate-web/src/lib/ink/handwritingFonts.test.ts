import { describe, it, expect } from "vitest";
import { scriptFor, fontStack } from "./handwritingFonts";
import { SUPPORTED_LANGUAGES } from "./recognizer";

describe("handwriting fonts for translation", () => {
  it.each([
    ["hi-IN", "Devanagari", "Kalam"],
    ["mr-IN", "Devanagari", "Kalam"],
    ["ta-IN", "Tamil", "Kavivanar"],
    ["bn-IN", "Bengali–Assamese", "Galada"],
    ["ur-IN", "Perso-Arabic (Nastaliq)", "Gulzar"],
    ["en-US", "Latin", "Caveat"],
    ["ru", "Cyrillic", "Caveat"],
    ["ja", "Japanese (kana and kanji)", "Yomogi"],
  ])("%s → %s in %s", (code, script, font) => {
    expect(scriptFor(code).script).toBe(script);
    expect(scriptFor(code).font).toBe(font);
  });

  it("every language in the picker has a script and font", () => {
    for (const l of SUPPORTED_LANGUAGES) {
      const s = scriptFor(l.code);
      expect(s.font, l.code).toBeTruthy();
      // only English-family languages and Latin-script European ones should fall back to Latin
      if (s.font === "Caveat")
        expect(["en", "es", "fr", "de", "pt", "ru"]).toContain(l.code.split("-")[0]);
    }
  });

  it("builds a font stack with fallbacks", () => {
    expect(fontStack("Kalam")).toMatch(/^"Kalam", .*Noto Sans Devanagari/);
    expect(fontStack(undefined)).toContain("system-ui");
  });

  it("safely handles failed font loading and allows clearing failed cache", async () => {
    const { clearFailedFonts, ensureHandwritingFont } = await import("./handwritingFonts");
    expect(typeof clearFailedFonts).toBe("function");
    // Undefined font returns false without throwing
    const res = await ensureHandwritingFont(undefined);
    expect(res).toBe(false);

    // clearFailedFonts can be called at any time (e.g. online reconnect)
    expect(() => clearFailedFonts()).not.toThrow();
  });
});
