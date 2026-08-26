import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp(); // App Hosting inasoma Service Account kiotomatiki
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();
    if (!walletAddress) {
      return NextResponse.json({ error: 'Anwani ya pochi inahitajika' }, { status: 400 });
    }

    const nonce = `Karibu PHCL Super! Thibitisha umiliki wa pochi yako kwa kusaini namba hii ya siri: ${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Dakika 5

    await db.collection('web3_nonces').doc(walletAddress.toLowerCase()).set({
      nonce,
      expiresAt,
    });

    return NextResponse.json({ nonce });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
