// lib/store.ts
interface User {
  email: string;
  password: string; // In a production app this would be a hashed value
  emailVerified: boolean;
  kycCompleted: boolean;
}

/**
 * Simple in‑memory store used for the demo.
 * It holds registered users, pending OTP codes and KYC status.
 */
export const store = {
  users: new Map<string, User>(), // key = email
  pendingOtps: new Map<string, string>(), // email -> OTP code
};
