// pages/api/verify-otp.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { store } from '../../lib/store';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }
  const { email, otp } = req.body as { email: string; otp: string };
  if (!email || !otp) {
    return res.status(400).json({ success: false, error: 'Email and OTP required' });
  }
  const stored = store.pendingOtps.get(email);
  if (stored && stored === otp) {
    store.pendingOtps.delete(email);
    const user = store.users.get(email);
    if (user) user.emailVerified = true;
    return res.status(200).json({ success: true, message: 'OTP verified' });
  }
  return res.status(400).json({ success: false, error: 'Invalid OTP' });
}
