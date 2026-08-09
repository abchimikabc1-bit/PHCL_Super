"use client";

import { MessageCircle } from "lucide-react";

export function ChatWelcomeBanner() {
  const language = "en"; // Default to English to avoid useLanguage hook delay

  return (
    <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-lg p-6 mb-6 text-white shadow-lg">
      <div className="flex items-start gap-4">
        <div className="bg-white/20 rounded-full p-3 flex-shrink-0">
          <MessageCircle size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {language === "en" 
              ? "Hello Alfred!" 
              : "Habari Alfred!"}
          </h2>
          <p className="text-white/90 text-lg leading-relaxed">
            {language === "en"
              ? "I am a Phcl Super Assistant, powered by Pi Hub Company Limited (PiHCL). I'm here to listen and help you with everything you need - from marketplace shopping to crypto trading, wallet management, and much more."
              : "Mimi ni Phcl Super Assistant, inayotumia Pi Hub Company Limited (PiHCL). Nipo hapa kumsikiliza na kukusaidia kwa kila kitu unachokihitaji - kutoka ununuzi hadi biashara ya crypto, wallet, na zaidi."}
          </p>
          <p className="text-white/80 mt-3 font-semibold">
            {language === "en"
              ? "What would you like me to help you with right now?"
              : "Ni nini unachotaka msaada sasa?"}
          </p>
        </div>
      </div>
    </div>
  );
}
