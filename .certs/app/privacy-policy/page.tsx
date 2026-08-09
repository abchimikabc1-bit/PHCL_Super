"use client";

import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-100 via-white to-lime-100 text-slate-900">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/settings"
            style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Settings
          </Link>
          <Link
            href="/terms-of-service"
            style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Terms of Service
          </Link>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-600">Effective date: July 2026</p>

          <div className="mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Data We Collect</h2>
              <p>
                PHCL Super may collect account identifiers, order metadata, wallet activity logs, and customer support messages
                to operate marketplace, checkout, and security features.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. How We Use Data</h2>
              <p>
                Data is used to deliver product browsing, order processing, fraud protection, service analytics, and critical
                account security actions such as session validation and suspicious login detection.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Security Controls</h2>
              <p>
                We apply server-side admin session controls, CSRF protection, rate limiting, and audit logging on sensitive
                admin authentication events to reduce unauthorized access risk.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Retention</h2>
              <p>
                Operational records are retained only as long as needed for service quality, legal compliance, and security
                incident response. Temporary security lockout data is automatically pruned.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Contact</h2>
              <p>
                For privacy inquiries, contact support@pihcl.tz.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Legal Basis and Consent</h2>
              <p>
                We process customer and transaction data under contractual necessity, legal obligations, legitimate
                security interests, and explicit consent where required. During registration, users provide voluntary
                consent to Terms and Privacy Policy, and consent metadata is stored for auditability.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. International Data Transfers</h2>
              <p>
                PHCL Super serves users across regions. Where data is transferred outside the user&apos;s jurisdiction,
                we apply reasonable safeguards, access controls, and contractual protections aligned with applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. User Rights</h2>
              <p>
                Subject to applicable law, users may request access, correction, deletion, or restriction of their
                personal data. Users may also object to specific processing activities and withdraw optional marketing
                consent at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">9. Children and Age Limits</h2>
              <p>
                PHCL Super is intended for users aged 18 and above. We do not knowingly collect personal data from
                children. If such data is identified, it will be removed promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">10. Regulatory Requests and Incident Response</h2>
              <p>
                We may disclose data when required by lawful authority, court order, or anti-fraud obligations.
                Security incidents are investigated, documented, and handled under internal response controls.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
