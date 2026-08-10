// app/register/page.tsx
"use client";

import { useState } from "react";
import "./register.css";
import { store } from "../../lib/store";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState<string>("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    // Simple client-side validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setMessage('Invalid email');
      return;
    }
    // Store user (password stored plain for demo, NEVER do this in prod)
    store.users.set(email, { email, password, emailVerified: false, kycCompleted: false });
    // Call OTP API
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setMessage(data.message || 'OTP sent');
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (data.success) {
      // Mark email verified
      const user = store.users.get(email);
      if (user) user.emailVerified = true;
      setMessage('Email verified! You can now complete KYC.');
    } else {
      setMessage(data.error || 'Invalid OTP');
    }
  };

  return (
    <main className="register-page container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Create Account</h1>
      {message && <p className="mb-4 text-center text-amber-500">{message}</p>}
      {step === 'form' && (
        <form onSubmit={handleRegister} className="space-y-4 max-w-md mx-auto">
          <label className="block">
            Email
            <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label className="block">
            Password
            <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <label className="block">
            Confirm Password
            <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </label>
          <button type="submit" className="submit-btn w-full">Register &amp; Send OTP</button>
        </form>
      )}
      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4 max-w-md mx-auto mt-6">
          <label className="block">
            Enter OTP sent to your email
            <input type="text" className="input" value={otp} onChange={e => setOtp(e.target.value)} required />
          </label>
          <button type="submit" className="submit-btn w-full">Verify OTP</button>
        </form>
      )}
    </main>
  );
}
