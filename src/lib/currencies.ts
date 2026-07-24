export const CURRENCIES = {
  BTC: { symbol: '₿', name: 'Bitcoin', color: 'from-yellow-400 to-yellow-600', icon: '₿', type: 'crypto' },
  ETH: { symbol: 'Ξ', name: 'Ethereum', color: 'from-blue-400 to-blue-600', icon: 'Ξ', type: 'crypto' },
  USDT: { symbol: 'USDT', name: 'Tether USDT', color: 'from-green-400 to-green-600', icon: 'USDT', type: 'crypto' },
  PI: { symbol: 'Π', name: 'Pi Network', color: 'from-purple-400 to-purple-600', icon: 'Π', type: 'crypto' },
  USDC: { symbol: 'USDC', name: 'USD Coin', color: 'from-cyan-400 to-blue-500', icon: 'USDC', type: 'crypto' },
  XRP: { symbol: 'XRP', name: 'Ripple', color: 'from-blue-600 to-blue-800', icon: 'XRP', type: 'crypto' },
  ADA: { symbol: 'ADA', name: 'Cardano', color: 'from-indigo-400 to-indigo-600', icon: 'ADA', type: 'crypto' },
  SOL: { symbol: 'SOL', name: 'Solana', color: 'from-purple-500 to-pink-600', icon: 'SOL', type: 'crypto' },
  DOGE: { symbol: 'DOGE', name: 'Dogecoin', color: 'from-slate-300 to-slate-500', icon: 'DOGE', type: 'crypto' },
  XMR: { symbol: 'XMR', name: 'Monero', color: 'from-orange-600 to-red-600', icon: 'XMR', type: 'crypto' },
  ZEC: { symbol: 'ZEC', name: 'Zcash', color: 'from-rose-400 to-pink-600', icon: 'ZEC', type: 'crypto' },

  USD: { symbol: '$', name: 'US Dollar', color: 'from-emerald-400 to-emerald-600', icon: '$', type: 'fiat' },
  EUR: { symbol: '€', name: 'Euro', color: 'from-blue-500 to-blue-700', icon: '€', type: 'fiat' },
  GBP: { symbol: '£', name: 'British Pound', color: 'from-red-400 to-red-600', icon: '£', type: 'fiat' },
  JPY: { symbol: '¥', name: 'Japanese Yen', color: 'from-red-300 to-red-500', icon: '¥', type: 'fiat' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', color: 'from-red-600 to-red-800', icon: 'CHF', type: 'fiat' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', color: 'from-red-500 to-rose-600', icon: 'C$', type: 'fiat' },
  AUD: { symbol: 'A$', name: 'Australian Dollar', color: 'from-yellow-500 to-orange-600', icon: 'A$', type: 'fiat' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', color: 'from-red-600 to-orange-700', icon: 'S$', type: 'fiat' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar', color: 'from-red-500 to-red-700', icon: 'HK$', type: 'fiat' },
  INR: { symbol: '₹', name: 'Indian Rupee', color: 'from-orange-400 to-orange-600', icon: '₹', type: 'fiat' },
  ZAR: { symbol: 'R', name: 'South African Rand', color: 'from-yellow-600 to-orange-700', icon: 'R', type: 'fiat' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling', color: 'from-slate-600 to-slate-800', icon: 'TSh', type: 'fiat' },
  NTZS: { symbol: 'nTSh', name: 'Digital Tanzanian Shilling', color: 'from-cyan-500 to-sky-700', icon: 'nTSh', type: 'crypto' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling', color: 'from-green-600 to-green-800', icon: 'KSh', type: 'fiat' },
  NGN: { symbol: '₦', name: 'Nigerian Naira', color: 'from-green-700 to-emerald-800', icon: '₦', type: 'fiat' },
  ZWL: { symbol: 'Z$', name: 'Zimbabwean Dollar', color: 'from-yellow-600 to-amber-700', icon: 'Z$', type: 'fiat' }
} as const;

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGE_OPTIONS: readonly Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "sw", name: "Kiswahili", flag: "🇹🇿" },
  { code: "zh", name: "中文 (Chinese)", flag: "🇨🇳" },
  { code: "fr", name: "Français (French)", flag: "🇫🇷" },
  { code: "es", name: "Español (Spanish)", flag: "🇪🇸" },
  { code: "ar", name: "العربية (Arabic)", flag: "🇸🇦" },
  { code: "pt", name: "Português (Portuguese)", flag: "🇧🇷" },
  { code: "de", name: "Deutsch (German)", flag: "🇩🇪" },
  { code: "ja", name: "日本語 (Japanese)", flag: "🇯🇵" },
  { code: "ko", name: "한국어 (Korean)", flag: "🇰🇷" },
  { code: "it", name: "Italiano (Italian)", flag: "🇮🇹" },
  { code: "ru", name: "Русский (Russian)", flag: "🇷🇺" },
  { code: "hi", name: "हिन्दी (Hindi)", flag: "🇮🇳" },
  { code: "vi", name: "Tiếng Việt (Vietnamese)", flag: "🇻🇳" },
  { code: "th", name: "ไทย (Thai)", flag: "🇹🇭" },
  { code: "id", name: "Bahasa Indonesia (Indonesian)", flag: "🇮🇩" }
];

export const LANGUAGES = LANGUAGE_OPTIONS;

export const CURRENCY_RATES: Record<string, number> = {
  BTC: 65420.50,
  ETH: 3450.75,
  USDT: 1.00,
  USDC: 1.00,
  PI: 314159,
  XRP: 2.85,
  ADA: 0.98,
  SOL: 185.42,
  DOGE: 0.32,
  USD: 1.00,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.53,
  SGD: 1.34,
  HKD: 7.81,
  INR: 83.12,
  ZAR: 18.50,
  TZS: 2621.50,
  NTZS: 2621.50,
  KES: 130.45,
  NGN: 1547.50,
  ZWL: 5280.75
};