import { initializeApp } from "firebase/app";
import { getAI, getTemplateGenerativeModel, GoogleAIBackend } from "firebase/ai";

// Usanidi thabiti wa mradi wako wa Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 1. Kuanzisha Firebase App kienyeji
const app = initializeApp(firebaseConfig);

// 2. Kuanzisha huduma ya salama ya AI Logic ya Firebase
const ai = getAI(app, { backend: new GoogleAIBackend() });

// 3. Kuchukua ile Template yetu ya ushindi tuliyoiunda kule kwenye Console
export const phclAgent = getTemplateGenerativeModel(ai, {
  name: "you-are-the-official-phcl-super-ai-assistant-you-are-friendly-p"
} as any);
// 4. Kazi isiyo na gharama (no-cost) ya kusoma maandishi yoyote kwa sauti
export function speakText(text: string, lang: 'sw' | 'en' = 'en') {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Zima sauti yoyote inayocheza sasa hivi kwanza kuzuia fujo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Kuweka lugha sahihi (Kiswahili cha Tanzania au Kiingereza)
    utterance.lang = lang === 'sw' ? 'sw-TZ' : 'en-US';
    utterance.rate = 1.0; // Kasi ya kawaida ya kuongea
    utterance.pitch = 1.0; // Sauti ya asili ya kibinadamu

    window.speechSynthesis.speak(utterance);
  }
}
