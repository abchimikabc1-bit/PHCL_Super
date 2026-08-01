import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
    const db = getFirestore();
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