import { describe, it, expect, beforeAll } from "vitest";
import { AIEngine } from "./aiEngine";
import { useAISettings } from "./aiSettingsStore";
import { findLanguage, recognizeInk } from "../ink/recognizer";
import { scriptFor } from "../ink/handwritingFonts";
import fs from "node:fs";

describe("Live Language Converter & Translation", () => {
  const apiKey =
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    (import.meta.env?.VITE_GEMINI_API_KEY as string);

  beforeAll(() => {
    if (apiKey) {
      useAISettings.setState({
        geminiKey: apiKey,
        getApiKey: () => apiKey,
      });
    }
  });

  it("has valid Gemini API key configured", () => {
    expect(useAISettings.getState().getApiKey()).toBeTruthy();
  });

  it("converts text to Hindi (हिन्दी) in Devanagari script", async () => {
    const target = findLanguage("hi-IN");
    const { script } = scriptFor(target.code);
    const result = await AIEngine.translateText(
      "Hello, nice to meet you",
      `${target.name} (${target.nativeName})`,
      script,
    );

    console.log("English -> Hindi Result:", result);
    expect(result.translation).toBeTruthy();
    // Check for Devanagari script range: [\u0900-\u097F]
    expect(/[\u0900-\u097F]/.test(result.translation)).toBe(true);
  }, 20000);

  it("converts text to multiple regional and world languages", async () => {
    const testCases = [
      { code: "ta-IN", regex: /[\u0B80-\u0BFF]/, name: "Tamil" },
      { code: "gu-IN", regex: /[\u0A80-\u0AFF]/, name: "Gujarati" },
      { code: "es-ES", regex: /[a-zA-ZáéíóúñÁÉÍÓÚÑ]/, name: "Spanish" },
      { code: "fr-FR", regex: /[a-zA-Zàâäéèêëîïôöùûüç]/, name: "French" },
    ];

    for (const tc of testCases) {
      const target = findLanguage(tc.code);
      const { script } = scriptFor(target.code);
      const result = await AIEngine.translateText(
        "Welcome",
        `${target.name} (${target.nativeName})`,
        script,
      );
      console.log(`English -> ${tc.name} Result:`, result.translation);
      expect(result.translation).toBeTruthy();
      expect(tc.regex.test(result.translation)).toBe(true);
    }
  }, 120000);

  it("converts handwritten cursive 'Hello' (user image) to Hindi", async () => {
    const imagePath =
      "/Users/ishanibassin/.gemini/antigravity-ide/brain/dddd62ef-170c-48d9-b358-1dcc474a75f3/.user_uploaded/media_1792162507459.png";
    if (!fs.existsSync(imagePath)) {
      console.warn("User image not found at path, skipping");
      return;
    }

    const imgBuffer = fs.readFileSync(imagePath);
    const dataUrl = `data:image/png;base64,${imgBuffer.toString("base64")}`;

    const target = findLanguage("hi-IN");
    const { script } = scriptFor(target.code);

    const result = await AIEngine.translateHandwriting(
      dataUrl,
      `${target.name} (${target.nativeName})`,
      script,
    );

    console.log("Handwritten 'Hello' -> Hindi Result:", result);
    expect(result.source.toLowerCase()).toContain("hello");
    expect(result.translation).toBeTruthy();
    // Verify Hindi translation in Devanagari script (e.g. नमस्ते / हैलो)
    expect(/[\u0900-\u097F]/.test(result.translation)).toBe(true);
  }, 25000);
});
