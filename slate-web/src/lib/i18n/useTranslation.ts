import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, type AppLanguage, type TranslationDictionary } from "./translations";

interface LanguageState {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "slate_app_language_v1",
    },
  ),
);

export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const t = translations[language] || translations.en;

  return {
    language,
    setLanguage,
    t: (key: keyof TranslationDictionary): string => {
      return t[key] || translations.en[key] || String(key);
    },
    raw: t,
  };
}
