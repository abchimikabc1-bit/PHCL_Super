"use client";

import { useState, useEffect } from "react";
import type { Language } from "@/lib/translations";
import { translations, LANGUAGE_OPTIONS } from "@/lib/translations";
import { getAdminLanguageConfig } from "@/lib/admin-language-settings";

type LanguageOption = (typeof LANGUAGE_OPTIONS)[number];

const ALL_LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map((entry) => entry.code));

const isLanguage = (value: string): value is Language => {
  return ALL_LANGUAGE_CODES.has(value as Language);
};

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([...LANGUAGE_OPTIONS]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const adminConfig = getAdminLanguageConfig();
      const enabledLanguages = adminConfig.enabledLanguages.filter(isLanguage);
      const supportedEnabled = enabledLanguages.length > 0 ? enabledLanguages : (["en"] as Language[]);

      const filteredOptions = LANGUAGE_OPTIONS.filter((entry) =>
        supportedEnabled.includes(entry.code as Language)
      );
      setAvailableLanguages(filteredOptions.length > 0 ? filteredOptions : [LANGUAGE_OPTIONS[0]]);

      const adminDefault =
        isLanguage(adminConfig.defaultLanguage) &&
        supportedEnabled.includes(adminConfig.defaultLanguage)
          ? adminConfig.defaultLanguage
          : supportedEnabled[0];

      const saved = localStorage.getItem("phcl-language");
      const nextLanguage =
        saved && isLanguage(saved) && supportedEnabled.includes(saved)
          ? saved
          : adminDefault;

      setLanguage(nextLanguage);
      localStorage.setItem("phcl-language", nextLanguage);
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
    setMounted(true);
  }, []);

  const switchLanguage = (lang: Language) => {
    if (!availableLanguages.some((entry) => entry.code === lang)) {
      return;
    }

    setLanguage(lang);
    try {
      localStorage.setItem("phcl-language", lang);
    } catch (e) {
      // Silently fail if localStorage unavailable
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language]?.[key] ?? key;
  };

  return {
    language,
    switchLanguage,
    t,
    mounted,
    availableLanguages,
  };
}
