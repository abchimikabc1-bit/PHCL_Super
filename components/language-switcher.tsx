"use client";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { translations } from "@/lib/translations";

export function LanguageSwitcher() {
  const { language, switchLanguage } = useLanguage();

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => switchLanguage("en")}
        variant={language === "en" ? "default" : "outline"}
        size="sm"
        className={language === "en" ? "bg-purple-600 hover:bg-purple-700" : ""}
      >
        English
      </Button>
      <Button
        onClick={() => switchLanguage("sw")}
        variant={language === "sw" ? "default" : "outline"}
        size="sm"
        className={language === "sw" ? "bg-purple-600 hover:bg-purple-700" : ""}
      >
        Kiswahili
      </Button>
    </div>
  );
}
