import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = Object.values(firebaseConfig).every(Boolean)
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined as any;

interface OrderData {
  items: any[];
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentDetails?: {
    network: string | null;
    phone: string;
  };
  createdAt?: any;
}

export async function submitOrder(orderData: OrderData) {
  try {
    if (!app) {
      return { success: false, error: 'Firestore is not configured.' };
    }
    const db = getFirestore(app);
    const ordersRef = collection(db, 'orders');
    
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      status: 'pending_payment',
      createdAt: serverTimestamp(),
    });

    return { success: true, orderId: docRef.id };
  } catch (error: any) {
    console.error('Kosa wakati wa kuhifadhi oda:', error);
    return { success: false, error: error.message };
  }
}