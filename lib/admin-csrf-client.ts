'use client';

const ADMIN_CSRF_COOKIE_NAME = 'admin_csrf';

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;

  const cookiePair = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));

  return cookiePair ? decodeURIComponent(cookiePair.slice(name.length + 1)) : null;
};

export const getAdminCsrfToken = async (): Promise<string | null> => {
  const existing = readCookie(ADMIN_CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    await fetch('/api/admin/auth', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include',
    });
  } catch {
    return null;
  }

  return readCookie(ADMIN_CSRF_COOKIE_NAME);
};
