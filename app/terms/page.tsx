// app/terms/page.tsx
"use client";

import "./terms.css";

export default function TermsPage() {
  return (
    <main className="terms-page container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6 text-center">Terms of Service</h1>
      <nav className="text-sm mb-4">
        <a href="/" className="text-amber-300 hover:underline">⬅️ Home</a>
        <span className="mx-2">|</span>
        <a href="/security" className="text-amber-300 hover:underline">Security Notice</a>
      </nav>
      <section className="mb-6">
        <p className="text-amber-200 bg-amber-900/30 p-4 rounded">
          🛡️ <strong>Important Security Notice:</strong> All transactions are protected by our escrow vaults. Funds are released only after buyer confirmation.
        </p>
      </section>
      <ol className="list-decimal list-inside space-y-4">
        <li>
          <h2 className="text-2xl font-semibold mb-2">General Use Conditions</h2>
          <p>By accessing PHCL Super you agree to comply with these international terms that protect both buyers and sellers. Our platform operates under AES‑256‑GCM data protection and biometric liveness verification.</p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold mb-2">Escrow Protection Protocol</h2>
          <ul className="list-disc list-inside ml-4">
            <li><strong>Hold Vault:</strong> Payments via M‑Pay, PayPal, Visa, Bank Transfer or Pi Coin are securely held.</li>
            <li><strong>Release of Funds:</strong> Funds are released once the buyer confirms receipt of the product.</li>
            <li><strong>100% Refund:</strong> If the product is not received or does not match the description, the buyer receives a full refund.</li>
          </ul>
        </li>
        <li>
          <h2 className="text-2xl font-semibold mb-2">Inventory Management (Admin Only)</h2>
          <p>All product additions, removals and seller verification are performed exclusively by admin accounts.</p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold mb-2">Currency Rates &amp; Exchange</h2>
          <p>We use the Pi Network GCV Standard: 1 Pi Coin = $314,159 USD and 1 USD = 2,700 TZS. All rates are applied automatically.</p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold mb-2">Dispute Resolution</h2>
          <p>Disputes are handled by our legal team and a multilingual AI assistant within 24 hours, based on transaction receipts and tracking data.</p>
        </li>
        <li>
          <h2 className="text-2xl font-semibold mb-2">Executive Leadership &amp; Official Contacts</h2>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>👑 CEO: Wilyfred John Gallaba – Phone: +255 655 599 555</li>
            <li>🌐 Ecosystem &amp; Blockchain Director: Alfred Benard Chimika – Phone: +255 693 863 356</li>
            <li>📢 CMO: Abdalah Juma Hamiss – Phone: +255 784 825 979</li>
            <li>✉️ Official Emails: Security &amp; Admin: <a href="mailto:admin@phclsuper.com" className="underline">admin@phclsuper.com</a> – Public Inquiries: <a href="mailto:pihubcompany@gmail.com" className="underline">pihubcompany@gmail.com</a></li>
          </ul>
        </li>
      </ol>
      <footer className="mt-8 text-center text-sm text-gray-400">
        © 2026 PHCL Super International Security &amp; Escrow Marketplace. All rights reserved.
      </footer>
    </main>
  );
}
