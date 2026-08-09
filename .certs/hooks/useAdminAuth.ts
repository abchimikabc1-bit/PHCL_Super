// Admin authentication hook
'use client';

import { useCallback, useEffect, useState } from 'react';

interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  name: string;
}

interface AdminSessionDebug {
  hasSession: boolean;
  sessionAgeMs: number | null;
  expiresInMs: number | null;
  lastCheckAt: string;
}

const ADMIN_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

interface AuthResponse {
  authenticated: boolean;
  message?: string;
  user?: AdminUser;
  session?: {
    ageMs: number;
    expiresInMs: number;
  };
}

export interface AdminLoginResult {
  success: boolean;
  message?: string;
  statusCode?: number;
}

const CSRF_COOKIE_NAME = 'admin_csrf';

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePair = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  if (!cookiePair) {
    return null;
  }

  return decodeURIComponent(cookiePair.substring(name.length + 1));
};

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionDebug, setSessionDebug] = useState<AdminSessionDebug>({
    hasSession: false,
    sessionAgeMs: null,
    expiresInMs: null,
    lastCheckAt: new Date().toISOString(),
  });

  const rehydrateSession = useCallback(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/admin/auth', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          setAdminUser(null);
          setIsAuthenticated(false);
          setSessionDebug({
            hasSession: false,
            sessionAgeMs: null,
            expiresInMs: null,
            lastCheckAt: new Date().toISOString(),
          });
          return;
        }

        const payload = (await response.json()) as AuthResponse;
        if (!payload.authenticated || !payload.user || !payload.session) {
          setAdminUser(null);
          setIsAuthenticated(false);
          setSessionDebug({
            hasSession: false,
            sessionAgeMs: null,
            expiresInMs: null,
            lastCheckAt: new Date().toISOString(),
          });
          return;
        }

        setAdminUser(payload.user);
        setIsAuthenticated(true);
        setSessionDebug({
          hasSession: true,
          sessionAgeMs: payload.session.ageMs,
          expiresInMs: payload.session.expiresInMs,
          lastCheckAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Session check error:', err);
        setAdminUser(null);
        setIsAuthenticated(false);
        setSessionDebug({
          hasSession: false,
          sessionAgeMs: null,
          expiresInMs: null,
          lastCheckAt: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();
  }, []);

  const ensureCsrfToken = useCallback(async (): Promise<string | null> => {
    const existing = readCookie(CSRF_COOKIE_NAME);
    if (existing) {
      return existing;
    }

    try {
      await fetch('/api/admin/auth', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });
    } catch {
      // No-op: caller handles missing token result.
    }

    return readCookie(CSRF_COOKIE_NAME);
  }, []);

  const refreshSession = useCallback(() => {
    setIsLoading(true);
    rehydrateSession();
  }, [rehydrateSession]);

  // Check if already logged in
  useEffect(() => {
    rehydrateSession();

    // Failsafe: never allow admin loading state to hang indefinitely.
    const loadingGuard = window.setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      window.clearTimeout(loadingGuard);
    };
  }, [rehydrateSession]);

  const login = useCallback(
    async (email: string, password: string): Promise<AdminLoginResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const csrfToken = await ensureCsrfToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken;
        }

        const response = await fetch('/api/admin/auth', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const payload = (await response.json()) as AuthResponse;

        if (response.status === 403 && payload.message?.toLowerCase().includes('csrf')) {
          const refreshedToken = await ensureCsrfToken();
          if (refreshedToken) {
            const retryResponse = await fetch('/api/admin/auth', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': refreshedToken,
              },
              credentials: 'include',
              body: JSON.stringify({ email, password }),
            });

            const retryPayload = (await retryResponse.json()) as AuthResponse;
            if (
              retryResponse.ok &&
              retryPayload.authenticated &&
              retryPayload.user &&
              retryPayload.session
            ) {
              setAdminUser(retryPayload.user);
              setIsAuthenticated(true);
              setError(null);
              setSessionDebug({
                hasSession: true,
                sessionAgeMs: retryPayload.session.ageMs,
                expiresInMs: retryPayload.session.expiresInMs || ADMIN_TIMEOUT,
                lastCheckAt: new Date().toISOString(),
              });
              return { success: true, statusCode: retryResponse.status };
            }

            const retryMessage = retryPayload.message || 'Invalid email or password';
            setError(retryMessage);
            setIsAuthenticated(false);
            return {
              success: false,
              message: retryMessage,
              statusCode: retryResponse.status,
            };
          }
        }

        if (!response.ok || !payload.authenticated || !payload.user || !payload.session) {
          const failureMessage = payload.message || 'Invalid email or password';
          setError(failureMessage);
          setIsAuthenticated(false);
          return {
            success: false,
            message: failureMessage,
            statusCode: response.status,
          };
        }

        setAdminUser(payload.user);
        setIsAuthenticated(true);
        setError(null);
        setSessionDebug({
          hasSession: true,
          sessionAgeMs: payload.session.ageMs,
          expiresInMs: payload.session.expiresInMs || ADMIN_TIMEOUT,
          lastCheckAt: new Date().toISOString(),
        });

        return { success: true, statusCode: response.status };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Login failed';
        setError(errorMsg);
        setIsAuthenticated(false);
        return {
          success: false,
          message: errorMsg,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [ensureCsrfToken]
  );

  const logout = useCallback(() => {
    setIsLoading(true);
    const executeLogout = async () => {
      try {
        const csrfToken = await ensureCsrfToken();
        await fetch('/api/admin/auth', {
          method: 'DELETE',
          headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
          credentials: 'include',
        });
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        setAdminUser(null);
        setIsAuthenticated(false);
        setError(null);
        setSessionDebug({
          hasSession: false,
          sessionAgeMs: null,
          expiresInMs: null,
          lastCheckAt: new Date().toISOString(),
        });
        setIsLoading(false);
      }
    };

    void executeLogout();
  }, [ensureCsrfToken]);

  const isAdmin = useCallback(() => {
    return isAuthenticated && adminUser?.role === 'super_admin';
  }, [isAuthenticated, adminUser]);

  return {
    isAuthenticated,
    adminUser,
    isLoading,
    error,
    login,
    logout,
    isAdmin,
    refreshSession,
    sessionDebug,
  };
}
// ...existing code...

function mapAuthError(status: number, body?: { code?: string; message?: string }) {
  if (status === 429) return body?.message || "Too many attempts. Try again later."
  if (status === 403) return "Security token invalid. Refresh and try again."
  if (status === 401 && body?.code === "SESSION_EXPIRED") return "Session expired. Please login again."
  if (status === 401) return "Invalid email or password."
  return body?.message || "Login failed. Please try again."
}

// ...existing code...
