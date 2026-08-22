import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/user-profile';

// 1. GET REQUEST: Inaruhusu PHCL_App kusoma wasifu na salio la mtumiaji kwa kutumia UID
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');

  if (!uid || !db) {
    return NextResponse.json({ error: 'UID ya mtumiaji inahitajika!' }, { status: 400 });
  }

  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'Mtumiaji hajapatikana!' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: userDoc.data() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST REQUEST: Inaruhusu PHCL_App kukata au kuongeza salio la mteja salama kiserver (kama akilipia huduma)
export async function POST(request: Request) {
  try {
    const { uid, currency, amount, type } = await request.json();

    if (!uid || !currency || !amount || !db) {
      return NextResponse.json({ error: 'Vigezo vyote vinahitajika!' }, { status: 400 });
    }

    // Amua ikiwa ni kuongeza salio (credit) au kukata salio (debit/payment)
    const change = type === 'credit' ? amount : -amount;
    const userRef = doc(db, 'users', uid);

    // Tekeleza mabadiliko ya salio kiserver kwa kutumia increment
    await updateDoc(userRef, {
      [`balances.${currency}`]: increment(change),
      updatedAt: serverTimestamp()
    });

    return NextResponse.json({ success: true, message: 'Salio la mteja limesasishwa kikamilifu kwenye Firestore!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
