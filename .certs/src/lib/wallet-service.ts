import { getFirestore, doc, runTransaction, collection, getDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';

// Usanidi thabiti wa mradi wako vya Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// KIKOMO CHA KODI: Kodi ya asilimia 2% ya kila muamala wa utoaji/utumaji kwa ajili ya TRA (2% transaction tax)
const TRANSACTION_TAX_RATE = 0.02; 

// 1. Kazi ya kusoma Salio la Mtumiaji (Get Wallet Balance)
export async function getUserWalletBalance(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().balances;
    } else {
      return { pi: 0, tzs: 0, usdt: 0, btc: 0 };
    }
  } catch (error) {
    console.error("Kosa la kusoma Salio:", error);
    throw error;
  }
}

// 2. Kazi thabiti na ya kiutii wa kodi ya kufanya Muamala (Tax-Compliant Transaction Ledger)
export async function executeWalletTransaction(
  userId: string,
  type: 'send' | 'receive' | 'swap' | 'withdraw',
  amount: number,
  currency: 'pi' | 'tzs' | 'usdt' | 'btc'
) {
  const userRef = doc(db, 'users', userId);
  const txColRef = collection(db, 'transactions');

  try {
    // Tunatumia runTransaction kuhakikisha usalama wa asilimia 100 wa miamala na kodi (No double spending)
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      
      let currentBalances = { pi: 0, tzs: 0, usdt: 0, btc: 0 };
      let isTaxExempt = false; // Chaguo la asili la mteja kulipa kodi

      if (userSnap.exists()) {
        currentBalances = userSnap.data().balances || currentBalances;
        isTaxExempt = userSnap.data().isTaxExempt || false; // Soma kama amesamehewa kodi kule kwenye Console!
      }

      let taxAmount = 0;
      let totalDeduction = amount;
      let netAmount = amount;

      // 1. Kupiga hesabu ya kodi kiotomatiki kwa miamala ya utoaji (Kama hajasamehewa kodi)
      if (type === 'send' || type === 'withdraw') {
        taxAmount = isTaxExempt ? 0 : amount * TRANSACTION_TAX_RATE; // Kama amesamehewa kodi, kodi ni 0!
        totalDeduction = amount + taxAmount; // Jumla inayokatwa kwenye balansi
        netAmount = amount; // Kiasi kinachomfikia mteja/benki
      }

      // Kuhakiki salio la kutosha (pamoja na kodi)
      let currentBalance = currentBalances[currency];
      if (type === 'send' || type === 'withdraw') {
        if (currentBalance < totalDeduction) {
          throw new Error(isTaxExempt 
            ? `Salio lako halitoshi! Unahitaji angalau ${totalDeduction} kukamilisha muamala huu.`
            : `Salio lako halitoshi! Unahitaji angalau ${totalDeduction} (ikijumuisha kodi ya ${taxAmount}) kukamilisha muamala huu.`
          );
        }
        currentBalance -= totalDeduction;
      } else if (type === 'receive') {
        currentBalance += amount;
      }

      // Kutayarisha balansi mpya
      const updatedBalances = {
        ...currentBalances,
        [currency]: currentBalance
      };

      // A. Kusasisha salio jipya la Mtumiaji kwanza kwenye database
      transaction.set(userRef, { balances: updatedBalances }, { merge: true });

      // B. Kurekodi muamala na kodi kielektroniki kwenye Daftari la Miamala (Tax-Compliant Ledger)
      const newTxRef = doc(txColRef);
      transaction.set(newTxRef, {
        userId,
        type,
        amount: netAmount,       // Kiasi kilichotumwa/kutolewa halisi
        taxAmount,               // Kiasi cha kodi kilichozuiliwa kwa ajili ya TRA
        totalDeduction,          // Jumla ya kiasi kilichopungua kwenye balansi
        currency,
        status: 'completed',
        taxStatus: isTaxExempt ? 'exempt' : (type === 'send' || type === 'withdraw' ? 'pending_remittance' : 'exempt'), // weka 'exempt' kama amesamehewa
        timestamp: new Date()
      });
    });

    return { success: true, message: "Muamala na kodi vimekamilika kwa mafanikio makubwa!" };
  } catch (error: any) {
    console.error("Muamala umefeli:", error);
    return { success: false, message: error.message || "Hitilafu imetokea wakati wa muamala." };
  }
}
