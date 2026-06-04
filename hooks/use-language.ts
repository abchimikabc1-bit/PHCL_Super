"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/translations";
import { translations, LANGUAGE_OPTIONS } from "@/lib/translations";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Simplified: only check localStorage, don't validate against 16 languages every time
    try {
      const saved = localStorage.getItem("phcl-language");
      if (saved === "sw" || saved === "zh" || saved === "fr" || saved === "de") {
        setLanguage(saved as Language);
      }
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
    setMounted(true);
  }, []);

  const switchLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("phcl-language", lang);
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    try {
      return translations[language]?.[key as keyof typeof translations[Language]] || key;
    } catch {
      return key;
    }
  };

  return {
    language,
    switchLanguage,
    t,
    mounted,
    availableLanguages: LANGUAGE_OPTIONS,
  };
}
