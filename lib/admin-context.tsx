// src/lib/admin-context.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  login: (
    email: string,
    password: string
  ) => Promise<LoginResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AdminContext =
  createContext<AdminContextType | undefined>(
    undefined
  );

export function AdminProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [sessionInfo, setSessionInfo] =
    useState<SessionInfo | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/admin/auth',
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setIsAuthenticated(false);
        setSessionInfo(null);
        return false;
      }

      setIsAuthenticated(true);
      setSessionInfo(
        (data?.session as SessionInfo) ?? null
      );

      return true;
    } catch (error) {
      console.error(
        'Admin session verification failed:',
        error
      );

      setIsAuthenticated(false);
      setSessionInfo(null);

      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<LoginResult> => {
      try {
        const response = await fetch(
          '/api/admin/auth',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          }
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          setIsAuthenticated(false);
          setSessionInfo(null);

          return {
            success: false,
            message:
              data?.message ||
              'Login failed. Please try again.',
          };
        }

        setIsAuthenticated(true);

        setSessionInfo(
          (data?.session as SessionInfo) ?? null
        );

        return {
          success: true,
          message:
            data?.message ||
            'Login successful.',
        };
      } catch (error) {
        console.error(
          'Admin login failed:',
          error
        );

        setIsAuthenticated(false);
        setSessionInfo(null);

        return {
          success: false,
          message:
            'Network error. Please try again.',
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
      });
    } catch (error) {
      console.error(
        'Admin logout failed:',
        error
      );
    } finally {
      setIsAuthenticated(false);
      setSessionInfo(null);
    }
  }, []);

  const refreshSession = useCallback(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const sessionDebug: SessionDebug = {
    hasSession: isAuthenticated,

    sessionAgeMs: sessionInfo?.issuedAt
      ? Date.now() -
        Date.parse(sessionInfo.issuedAt)
      : null,

    expiresInMs:
      sessionInfo?.idleExpiresAt
        ? Date.parse(
            sessionInfo.idleExpiresAt
          ) - Date.now()
        : null,
  };

  const adminUser: AdminUserLike =
    sessionInfo
      ? {
          email: sessionInfo.email,
          name: 'Administrator',
        }
      : null;

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

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error(
      'useAdmin must be used within AdminProvider'
    );
  }

  return context;
}