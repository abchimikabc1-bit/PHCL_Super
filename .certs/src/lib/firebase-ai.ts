import { initializeApp } from "firebase/app";
import { getAI, getTemplateGenerativeModel, GoogleAIBackend } from "firebase/ai";

// Usanidi wako thabiti wa Firebase
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
// Firebase AI expects template request options, so we keep the call shape valid
// and let the configured template define the actual prompt behavior.
export const phclAgent = getTemplateGenerativeModel(ai, {});
