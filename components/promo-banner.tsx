"use client";

import { AlertCircle, TrendingUp, Shield, Zap } from "lucide-react";

export type PromoBannerType = "security" | "health" | "performance" | "feature" | "tip";

interface PromoBannerProps {
  type: PromoBannerType;
  title?: string;
  description?: string;
  custom?: boolean;
}

const BANNER_CONFIG = {
  security: {
    en: {
      title: "Security Tip",
      description: "Enable two-factor authentication (fingerprint or face recognition) to protect your account from unauthorized access.",
      icon: Shield,
      color: "from-blue-50 to-blue-100 border-blue-200",
      textColor: "text-blue-900",
    },
    sw: {
      title: "Kidogo cha Usalama",
      description: "Wezesha uthibitisho wa awali mbili (kidole au uso) ili kulindu akaunti yako kutokana na mabadiliko yasiyofaa.",
      icon: Shield,
      color: "from-blue-50 to-blue-100 border-blue-200",
      textColor: "text-blue-900",
    },
  },
  health: {
    en: {
      title: "Healthy Finances",
      description: "Set price alerts on your favorite cryptocurrencies. This helps you make informed decisions without constantly checking prices.",
      icon: Zap,
      color: "from-green-50 to-green-100 border-green-200",
      textColor: "text-green-900",
    },
    sw: {
      title: "Fedha Nzuri",
      description: "Weka onyo la bei kwa crypto unayopenda. Hii inakusaidia kufanya maamuzi mazuri bila kuangalia bei kila wakati.",
      icon: Zap,
      color: "from-green-50 to-green-100 border-green-200",
      textColor: "text-green-900",
    },
  },
  performance: {
    en: {
      title: "Performance Boost",
      description: "Use the currency converter to compare prices across different crypto pairs and find the best trading opportunities.",
      icon: TrendingUp,
      color: "from-purple-50 to-purple-100 border-purple-200",
      textColor: "text-purple-900",
    },
    sw: {
      title: "Kuboresha Utendaji",
      description: "Tumia kibadilishi cha sarafu kulinganisha bei kwa jozi tofauti za crypto na tafuta furaha za biashara.",
      icon: TrendingUp,
      color: "from-purple-50 to-purple-100 border-purple-200",
      textColor: "text-purple-900",
    },
  },
  feature: {
    en: {
      title: "Smart Feature",
      description: "Your portfolio automatically tracks all your holdings. View real-time value across all supported cryptocurrencies.",
      icon: AlertCircle,
      color: "from-orange-50 to-orange-100 border-orange-200",
      textColor: "text-orange-900",
    },
    sw: {
      title: "Kipengele Kina Akili",
      description: "Portfolio yako inatukumbuka vitu vyote vya kubaki. Tazama thamani ya hivi karibuni kwa crypto zote.",
      icon: AlertCircle,
      color: "from-orange-50 to-orange-100 border-orange-200",
      textColor: "text-orange-900",
    },
  },
  tip: {
    en: {
      title: "Money Tip",
      description: "Diversify your crypto portfolio across multiple cryptocurrencies. This reduces risk and increases potential gains.",
      icon: Zap,
      color: "from-indigo-50 to-indigo-100 border-indigo-200",
      textColor: "text-indigo-900",
    },
    sw: {
      title: "Kidogo cha Fedha",
      description: "Sambaza crypto portfolio yako kwa crypto nyingi. Hii inapunguza hatari na kuongeza faida zinazowezekana.",
      icon: Zap,
      color: "from-indigo-50 to-indigo-100 border-indigo-200",
      textColor: "text-indigo-900",
    },
  },
};

export default function PromoBanner({ type, title, description, custom }: PromoBannerProps) {
  const language = "en"; // Default to English to avoid useLanguage hook delay
  const config = BANNER_CONFIG[type];
  const content = config[language === "en" ? "en" : "sw"];
  const IconComponent = content.icon;

  return (
    <div className={`bg-gradient-to-r ${content.color} border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300`}>
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 mt-1">
          <IconComponent className={`w-5 h-5 ${content.textColor}`} />
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${content.textColor} mb-1`}>
            {custom ? title : content.title}
          </h4>
          <p className={`text-sm ${content.textColor} opacity-90`}>
            {custom ? description : content.description}
          </p>
        </div>
      </div>
    </div>
  );
}
