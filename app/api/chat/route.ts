// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    // Tunatumia Firebase API Key uliyo nakili kwenye .env.local kwa usalama
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY; 
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Firebase API Key is missing in environment.' }, { status: 500 });
    }

    // Maelekezo maalum ya mfumo (System Instructions) yanamfundisha Gemini kila kitu kuhusu PHCL Super!
    const systemInstruction = `
      You are the official AI Chat Assistant of the PHCL Super Platform.
      PHCL Super is a secure, modern global e-commerce and cryptocurrency exchange platform.
      Key guidelines and features of PHCL Super you must explain to users:
      1. Physical Marketplace: Supports verified categories like luxury vehicles (Mercedes-Benz, Toyota Land Cruiser V8 ZX 2026), motorcycles (Yamaha MT-09, Boxer BM 150X), electronics (iPhone 16 Pro Max, Samsung Galaxy S26 Ultra), household appliances, kitchen equipment, and construction materials.
      2. Secure Digital Wallet: Supports multi-currency portfolios containing USD, TZS, nTZS (Digital Shilling), and PI (Pi Network Crypto).
      3. Pi GCV Support: PHCL Super verifies and fully honors the Pi GCV (Global Consensus Value) rate of 1 PI = $314,159 USD for secure global trades.
      4. Community Chat and Currency Exchanger.
      
      Always respond politely, professionally, and in the language the user asks you (Kiswahili, English, etc.).
    `;

    // Tunatuma ombi salama kwenda Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemInstruction}\n\nUser Question: ${message}` }] }
          ]
        }),
      }
    );

    const data = await response.json();
    const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Samahani, kwa sasa nimeshindwa kuelewa.';

    return NextResponse.json({ response: textResponse });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process chat session.' }, { status: 500 });
  }
}
