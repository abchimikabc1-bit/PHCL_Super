"use client";

import PromoBanner from "./promo-banner";

interface PromoSectionProps {
  page: "wallet" | "trading" | "marketplace" | "profile" | "security" | "chat" | "converter";
}

export default function PromoSection({ page }: PromoSectionProps) {
  // Removed useLanguage hook to prevent slow initialization
  const language = "en"; // Default language

  const promotions = {
    wallet: [
      { type: "security" as const, delay: "0ms" },
      { type: "health" as const, delay: "100ms" },
    ],
    trading: [
      { type: "performance" as const, delay: "0ms" },
      { type: "tip" as const, delay: "100ms" },
    ],
    marketplace: [
      { type: "feature" as const, delay: "0ms" },
      { type: "health" as const, delay: "100ms" },
    ],
    profile: [
      { type: "security" as const, delay: "0ms" },
    ],
    security: [
      { type: "security" as const, delay: "0ms" },
      { type: "tip" as const, delay: "100ms" },
    ],
    chat: [
      { type: "feature" as const, delay: "0ms" },
    ],
    converter: [
      { type: "performance" as const, delay: "0ms" },
      { type: "tip" as const, delay: "100ms" },
    ],
  };

  const promos = promotions[page] || [];

  return (
    <div className="space-y-3 mb-8">
      {promos.map((promo, idx) => (
        <div
          key={idx}
          style={{ animation: `fadeIn 0.5s ease-out forwards`, animationDelay: promo.delay }}
          className="opacity-0"
        >
          <PromoBanner type={promo.type} />
        </div>
      ))}
    </div>
  );
}
