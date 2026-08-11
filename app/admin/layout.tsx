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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_32%),linear-gradient(145deg,#0b1020_0%,#0f172a_55%,#090d16_100%)]">
        <div className="mx-auto min-h-screen max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </AdminProvider>
  );
}