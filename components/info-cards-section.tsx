"use client";

import { useLanguage } from "@/hooks/use-language";
import { Shield, TrendingUp, Zap, Lock } from "lucide-react";

export default function InfoCardsSection() {
  const { language } = useLanguage();

  const cards = [
    {
      icon: Shield,
      titleEn: "Secure & Safe",
      titleSw: "Salama",
      descEn: "Enterprise-grade security with 256-bit encryption and 2FA protection",
      descSw: "Usalama wa daraja la biashara kwa kukamatia 256-bit",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: TrendingUp,
      titleEn: "Best Rates",
      titleSw: "Bei Nzuri",
      descEn: "Competitive prices and real-time market data for smart trading",
      descSw: "Bei zinazofanana na data halisi ya soko",
      color: "from-green-500 to-green-600",
    },
    {
      icon: Zap,
      titleEn: "Fast Transactions",
      titleSw: "Haraka",
      descEn: "Instant deposits and withdrawals with minimal fees",
      descSw: "Ukamataji haraka na kila kitu kwa muda mfupi",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Lock,
      titleEn: "24/7 Support",
      titleSw: "Msaada Kila Saa",
      descEn: "Round-the-clock customer support in English and Swahili",
      descSw: "Msaada kila saa kwa Kiswahili na Kielezi",
      color: "from-orange-500 to-orange-600",
    },
  ];

  return (
    <section className="py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-2">
          {language === "en" ? "Why Choose PHCL" : "Kwa Nini Chagua PHCL"}
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          {language === "en" 
            ? "Everything you need for cryptocurrency trading and management"
            : "Kila kitu unachohitaji kwa biashara na usimamizi wa crypto"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`bg-gradient-to-br ${card.color} text-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 duration-300`}
              >
                <Icon className="w-8 h-8 mb-4 opacity-90" />
                <h3 className="font-bold text-lg mb-2">
                  {language === "en" ? card.titleEn : card.titleSw}
                </h3>
                <p className="text-sm opacity-90">
                  {language === "en" ? card.descEn : card.descSw}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
