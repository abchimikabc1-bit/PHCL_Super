// app/kyc/page.tsx
"use client";

import { useState } from "react";
import { useLanguage } from '@/hooks/use-language';
import "./kyc.css";
import { store } from "../../lib/store";

export default function KycPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("");
  const [completed, setCompleted] = useState(false);
  const { language } = useLanguage();
  const isSw = language === 'sw';

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [errors, setErrors] = useState<{[key:string]: string}>({});

  const validate = () => {
    const newErrors: {[key:string]: string} = {};
    // Name must contain at least three words (two spaces)
    if (fullName.trim().split(/\s+/).length < 3) {
      newErrors.fullName = isSw ? 'Jina lagundu lazima liwe na maneno matatu' : 'Full name must contain at least three words';
    }
    // Simple Tanzanian phone validation (+255 or 0 followed by 9 digits)
    const phoneRegex = /^(\+?255|0)\d{9}$/;
    if (!phoneRegex.test(phone)) {
      newErrors.phone = isSw ? 'Namba ya simu si sahihi' : 'Invalid phone number format';
    }
    if (!email) {
      newErrors.email = isSw ? 'Barua pepe lazima iingizwe' : 'Email is required';
    }
    if (!country) {
      newErrors.country = isSw ? 'Nchi lazima iingizwe' : 'Country is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const user = store.users.get(email);
    if (!user) {
      setStatus(isSw ? 'Mtumiaji hakupatikana' : 'User not found');
      return;
    }
    if (!user.emailVerified) {
      setStatus(isSw ? 'Barua pepe haijathibitishwa' : 'Email not verified yet');
      return;
    }
    // Mark KYC as completed
    user.kycCompleted = true;
    setCompleted(true);
    setStatus(isSw ? 'KYC imethibitishwa! 🎉' : 'KYC verification completed! 🎉');
  };

  return (
    <main className="kyc-page container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">KYC Liveness Verification</h1>
      <form onSubmit={handleStart} className="max-w-md mx-auto space-y-6">
        {/* Full Name */}
        <label className="block">
          {isSw ? 'Jina Kamili' : 'Full Name'}
          <input
            type="text"
            className="input"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
        </label>
        {/* Phone */}
        <label className="block">
          {isSw ? 'Namba ya Simu' : 'Phone Number'}
          <input
            type="tel"
            className="input"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </label>
        {/* Email */}
        <label className="block">
          {isSw ? 'Barua Pepe' : 'Email'}
          <input
            type="email"
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </label>
        {/* Country */}
        <label className="block">
          {isSw ? 'Nchi' : 'Country'}
          <input
            type="text"
            className="input"
            value={country}
            onChange={e => setCountry(e.target.value)}
            required
          />
          {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
        </label>
        <button type="submit" className="submit-btn w-full" disabled={Object.keys(errors).length > 0}>
          {isSw ? 'Anza KYC' : 'Start KYC'}
        </button>
      </form>
      {status && <p className="mt-4 text-center text-amber-500">{status}</p>}
      {completed && (
        <p className="mt-2 text-center text-green-400">Your account is now KYC‑verified.</p>
      )}
    </main>
  );
}
