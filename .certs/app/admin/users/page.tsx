'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/lib/admin-context';
import { StoredOrder, getOrders } from '@/lib/order-storage';

type UserStatus = 'active' | 'review' | 'blocked';

interface AdminUserView {
  id: string;
  name: string;
  phone: string;
  country: string;
  orders: number;
  totalUsd: number;
}

interface UserStatusAuditEvent {
  id: string;
  userId: string;
  userName: string;
  from: UserStatus;
  to: UserStatus;
  actor: string;
  changedAt: string;
}

const USER_STATUS_KEY = 'phcl_admin_user_statuses';
const USER_STATUS_AUDIT_KEY = 'phcl_admin_user_status_audit';

const getUserStatuses = (): Record<string, UserStatus> => {
  try {
    const raw = localStorage.getItem(USER_STATUS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, UserStatus>;
  } catch {
    return {};
  }
};

const saveUserStatuses = (statuses: Record<string, UserStatus>) => {
  localStorage.setItem(USER_STATUS_KEY, JSON.stringify(statuses));
};

const getUserStatusAudit = (): UserStatusAuditEvent[] => {
  try {
    const raw = localStorage.getItem(USER_STATUS_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is UserStatusAuditEvent => {
        if (!entry || typeof entry !== 'object') return false;
        const row = entry as UserStatusAuditEvent;
        return (
          typeof row.id === 'string' &&
          typeof row.userId === 'string' &&
          typeof row.userName === 'string' &&
          (row.from === 'active' || row.from === 'review' || row.from === 'blocked') &&
          (row.to === 'active' || row.to === 'review' || row.to === 'blocked') &&
          typeof row.actor === 'string' &&
          typeof row.changedAt === 'string'
        );
      })
      .slice(0, 200);
  } catch {
    return [];
  }
};

const saveUserStatusAudit = (events: UserStatusAuditEvent[]) => {
  localStorage.setItem(USER_STATUS_AUDIT_KEY, JSON.stringify(events.slice(0, 200)));
};

const getAdminActorName = (): string => {
  try {
    const raw = localStorage.getItem('phcl_admin_session');
    if (!raw) return 'admin';
    const parsed = JSON.parse(raw) as { user?: { name?: unknown; email?: unknown } };
    if (typeof parsed?.user?.name === 'string' && parsed.user.name.trim()) return parsed.user.name.trim();
    if (typeof parsed?.user?.email === 'string' && parsed.user.email.trim()) return parsed.user.email.trim();
    return 'admin';
  } catch {
    return 'admin';
  }
};

const deriveUsers = (orders: StoredOrder[]): AdminUserView[] => {
  const map = new Map<string, AdminUserView>();

  for (const order of orders) {
    if (!order.customer) continue;
    const key = `${order.customer.fullName.toLowerCase()}|${order.customer.phone}`;
    const existing = map.get(key);
    if (existing) {
      existing.orders += 1;
      existing.totalUsd += order.totalUsd;
    } else {
      map.set(key, {
        id: key,
        name: order.customer.fullName,
        phone: order.customer.phone,
        country: order.customer.country,
        orders: 1,
        totalUsd: order.totalUsd,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalUsd - a.totalUsd);
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshSession, sessionDebug } = useAdmin();
  const [loadingGuardElapsed, setLoadingGuardElapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({});
  const [auditEvents, setAuditEvents] = useState<UserStatusAuditEvent[]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    if (isAuthenticated) {
      setUsers(deriveUsers(getOrders()));
      setStatuses(getUserStatuses());
      setAuditEvents(getUserStatusAudit());
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoadingGuardElapsed(true), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const loadingActive = isLoading && !loadingGuardElapsed;

  const sessionAgeMinutes =
    sessionDebug.sessionAgeMs !== null ? Math.floor(sessionDebug.sessionAgeMs / 60000) : null;
  const sessionExpiresMinutes =
    sessionDebug.expiresInMs !== null ? Math.floor(sessionDebug.expiresInMs / 60000) : null;

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(term) ||
        user.phone.toLowerCase().includes(term) ||
        user.country.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const hasUsers = users.length > 0;
  const hasFilteredUsers = filteredUsers.length > 0;

  const setStatus = (id: string, status: UserStatus) => {
    const previous = statuses[id] || 'active';
    if (previous === status) return;

    const next = { ...statuses, [id]: status };
    setStatuses(next);
    saveUserStatuses(next);

    const user = users.find((entry) => entry.id === id);
    const event: UserStatusAuditEvent = {
      id: `${Date.now()}-${id}`,
      userId: id,
      userName: user?.name || id,
      from: previous,
      to: status,
      actor: getAdminActorName(),
      changedAt: new Date().toISOString(),
    };

    const nextAudit = [event, ...auditEvents].slice(0, 200);
    setAuditEvents(nextAudit);
    saveUserStatusAudit(nextAudit);

    toast.success(`User status updated to ${status}`);
  };

  if (loadingActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-purple-200">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (isLoading && loadingGuardElapsed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="w-full max-w-lg rounded-xl border border-amber-300/30 bg-amber-500/10 p-5 text-amber-100">
          <h1 className="text-lg font-semibold">Admin Session Recovery</h1>
          <p className="mt-2 text-sm text-amber-100/85">User module session hydrate is delayed. Trigger manual recheck.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshSession}
              style={{ minHeight: '44px' }}
              className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-900"
            >
              Force Session Rehydrate
            </button>
            <Link href="/admin/login" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="rounded-lg bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-sm text-slate-400 mt-1">Customer governance sourced from verified order activity</p>
          </div>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300" data-testid="admin-users-session-debug">
          Session Debug: hasSession={sessionDebug.hasSession ? 'yes' : 'no'} • age={sessionAgeMinutes ?? 'n/a'}m • expiresIn={sessionExpiresMinutes ?? 'n/a'}m
          <button
            type="button"
            onClick={refreshSession}
            data-testid="admin-users-rehydrate"
            className="ml-3 rounded bg-slate-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-600"
          >
            Rehydrate Now
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search user by name, phone, or country"
            data-testid="admin-users-search"
            className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4" data-testid="admin-users-audit-panel">
          <p className="text-sm font-semibold text-white">Recent Status Changes</p>
          {auditEvents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400" data-testid="admin-users-audit-empty">
              No status changes recorded yet.
            </p>
          ) : (
            <div className="mt-3 space-y-2" data-testid="admin-users-audit-list">
              {auditEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="rounded border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                  <p>
                    <span className="font-semibold text-white">{event.userName}</span> changed from{' '}
                    <span className="font-semibold">{event.from}</span> to <span className="font-semibold">{event.to}</span>
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    by {event.actor} • {new Date(event.changedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 overflow-x-auto" data-testid="admin-users-table-wrap">
          <table className="w-full text-sm text-slate-300" data-testid="admin-users-table">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-left">Orders</th>
                <th className="px-3 py-2 text-left">Total USD</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {!hasUsers ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-slate-400" colSpan={5} data-testid="admin-users-empty-no-records">
                    No customer records yet. Users will appear here after verified checkout orders are created.
                  </td>
                </tr>
              ) : !hasFilteredUsers ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-slate-400" colSpan={5} data-testid="admin-users-empty-no-search-results">
                    No users match your search. Try a different name, phone, or country.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                const status = statuses[user.id] || 'active';
                return (
                  <tr key={user.id} className="border-b border-white/5" data-testid={`admin-users-row-${user.id}`}>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.phone}</p>
                    </td>
                    <td className="px-3 py-2">{user.country}</td>
                    <td className="px-3 py-2">{user.orders}</td>
                    <td className="px-3 py-2">$ {user.totalUsd.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(['active', 'review', 'blocked'] as UserStatus[]).map((entry) => (
                          <button
                            key={entry}
                            type="button"
                            onClick={() => setStatus(user.id, entry)}
                            data-testid={`admin-users-status-${entry}-${user.id}`}
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              status === entry
                                ? entry === 'active'
                                  ? 'bg-emerald-400 text-slate-900'
                                  : entry === 'review'
                                  ? 'bg-amber-300 text-slate-900'
                                  : 'bg-rose-400 text-slate-900'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {entry}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
