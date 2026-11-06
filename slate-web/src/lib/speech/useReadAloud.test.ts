import { describe, it, expect } from "vitest";
import { isDevanagari, pickBestVoice } from "./useReadAloud";

describe("Read Aloud voice picker & script detection", () => {
  it("detects Devanagari script accurately", () => {
    expect(isDevanagari("Hello world")).toBe(false);
    expect(isDevanagari("123 + 456")).toBe(false);
    expect(isDevanagari("प्रकाश संश्लेषण")).toBe(true); // Hindi
    expect(isDevanagari("सूर्य नमस्कार")).toBe(true); // Marathi / Hindi
    expect(isDevanagari("CBSE Class 10 विज्ञान")).toBe(true); // Mixed Hinglish
  });

  it("selects Hindi or Marathi voice when Devanagari text is passed", () => {
    const mockVoices = [
      { name: "Google US English", lang: "en-US" },
      { name: "Google UK English", lang: "en-GB" },
      { name: "Google हिन्दी", lang: "hi-IN" },
      { name: "Google मराठी", lang: "mr-IN" },
    ] as SpeechSynthesisVoice[];

    // Devanagari text with Hindi app language
    const hiVoice = pickBestVoice(mockVoices, "नमस्ते बच्चों", "hi");
    expect(hiVoice?.lang).toBe("hi-IN");

    // Devanagari text with Marathi app language
    const mrVoice = pickBestVoice(mockVoices, "शुभ प्रभात", "mr");
    expect(mrVoice?.lang).toBe("mr-IN");

    // English text
    const enVoice = pickBestVoice(mockVoices, "Good morning students", "en");
    expect(enVoice?.lang.startsWith("en")).toBe(true);
  });
});
