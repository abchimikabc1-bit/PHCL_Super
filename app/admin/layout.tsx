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
      <div className="min-h-screen bg-slate-950">
        {children}
      </div>
    </AdminProvider>
  );
}
