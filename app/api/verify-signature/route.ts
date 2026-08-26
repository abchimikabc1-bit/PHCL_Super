import { NextResponse } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { verifyMessage } from 'ethers';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export async function POST(request: Request) {
  try {
    const { walletAddress, signature } = await request.json();

    if (!walletAddress || !signature) {
      return NextResponse.json({ error: 'Data hazijakamilika' }, { status: 400 });
    }

    const docRef = db.collection('web3_nonces').doc(walletAddress.toLowerCase());
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Nonce haipatikani. Omba mpya.' }, { status: 400 });
    }

    const { nonce, expiresAt } = doc.data()!;
    
    if (new Date() > expiresAt.toDate()) {
      return NextResponse.json({ error: 'Muda wa saini umeisha. Jaribu tena.' }, { status: 400 });
    }

    const recoveredAddress = verifyMessage(nonce, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Uthibitishaji umefeli!' }, { status: 401 });
    }

    await docRef.delete(); // Futa ili isitumiwe tena

    const customToken = await getAuth().createCustomToken(walletAddress.toLowerCase());
    return NextResponse.json({ customToken });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
