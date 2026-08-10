// pages/api/send-otp.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { store } from '../../lib/store';

/** Simple OTP generator */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6‑digit
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  const { email } = req.body as { email: string };
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }
  const otp = generateOtp();
  // Store OTP temporarily (expires after 5 minutes in a real app)
  store.pendingOtps.set(email, otp);
  // Placeholder: log OTP to console (replace with real email service)
  console.log(`🔐 OTP for ${email}: ${otp}`);
  return res.status(200).json({ message: 'OTP sent (see console)' });
}
