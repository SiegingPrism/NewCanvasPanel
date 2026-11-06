import { describe, it, expect } from "vitest";
import { translations, type AppLanguage } from "./translations";

describe("i18n Translations (English, Hindi, Marathi)", () => {
  const languages: AppLanguage[] = ["en", "hi", "mr"];
  const englishKeys = Object.keys(translations.en) as Array<keyof typeof translations.en>;

  languages.forEach((lang) => {
    it(`supports complete dictionary for ${lang}`, () => {
      const dict = translations[lang];
      expect(dict).toBeDefined();

      // Ensure every single key present in English also exists and is non-empty in Hindi & Marathi
      englishKeys.forEach((key) => {
        expect(dict[key], `Missing key "${key}" in ${lang}`).toBeDefined();
        expect(typeof dict[key]).toBe("string");
        expect(dict[key].trim().length).toBeGreaterThan(0);
      });
    });
  });

  it("provides Devanagari script for Hindi and Marathi translations", () => {
    // Check specific Indian school terms
    expect(translations.hi.endClass).toBe("कक्षा समाप्त");
    expect(translations.mr.endClass).toBe("वर्ग समाप्त");

    expect(translations.hi.docCamera).toBe("दस्तावेज़ कैमरा");
    expect(translations.mr.docCamera).toBe("दस्तऐवज कॅमेरा");

    expect(translations.hi.lessonReplay).toBe("पाठ रीप्ले");
    expect(translations.mr.lessonReplay).toBe("धडा रीप्ले");
  });
});

