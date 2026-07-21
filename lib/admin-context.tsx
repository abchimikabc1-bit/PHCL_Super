'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type LoginResult = {
  success: boolean;
  message?: string;
};

type SessionDebug = {
  hasSession: boolean;
  sessionAgeMs: number | null;
  expiresInMs: number | null;
};

type AdminUserLike = {
  name?: string;
  email?: string;
} | null;

type SessionInfo = {
  sessionId?: string;
  email: string;
  role: 'admin';
  issuedAt: string;
  expiresAt: string;
  idleExpiresAt: string;
};

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => void;
  sessionDebug: SessionDebug;
  adminUser: AdminUserLike;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      const ok = response.ok;
      const data = await response.json().catch(() => null);
      setIsAuthenticated(ok);
      setSessionInfo(ok ? (data?.session as SessionInfo) ?? null : null);

      if (!ok) {
        setError(null);
      }

      return ok;
    } catch {
      setIsAuthenticated(false);
      setError('Failed to verify session.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setError(null);

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message = data?.message || 'Login failed. Please try again.';
        setIsAuthenticated(false);
        setSessionInfo(null);
        setError(message);
        return { success: false, message };
      }

      setIsAuthenticated(true);
      setSessionInfo((data?.session as SessionInfo) ?? null);
      setError(null);
      return { success: true, message: data?.message || 'Login successful.' };
    } catch {
      const message = 'Network error. Please try again.';
      setIsAuthenticated(false);
      setSessionInfo(null);
      setError(message);
      return { success: false, message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setSessionInfo(null);
      setError(null);
    }
  }, []);

  const refreshSession = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const sessionDebug: SessionDebug = {
    hasSession: isAuthenticated,
    sessionAgeMs: sessionInfo?.issuedAt ? Date.now() - Date.parse(sessionInfo.issuedAt) : null,
    expiresInMs: sessionInfo?.idleExpiresAt ? Date.parse(sessionInfo.idleExpiresAt) - Date.now() : null,
  };

  const adminUser: AdminUserLike = sessionInfo ? { email: sessionInfo.email, name: 'Administrator' } : null;

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const value: AdminContextType = {
    isAuthenticated,
    isLoading,
    refreshSession,
    sessionDebug,
    adminUser,
    login,
    logout,
    checkAuth,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }

  return context;
}