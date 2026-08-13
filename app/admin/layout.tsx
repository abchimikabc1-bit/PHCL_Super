import type { Metadata } from 'next';
import { AdminProvider } from '@/lib/admin-context';

export const metadata: Metadata = {
  title: 'PHCL Super - Admin Panel',
  description: 'Administrator control panel for PHCL Super',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminProvider>
      <div className="min-h-screen bg-[#0b1720] text-white">
        <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 lg:px-6">
          <div className="rounded-[28px] border border-white/15 bg-white/5 shadow-[0_18px_60px_rgba(15,23,42,0.36)] backdrop-blur-2xl">
            {children}
          </div>
        </div>
      </div>
    </AdminProvider>
  );
}
