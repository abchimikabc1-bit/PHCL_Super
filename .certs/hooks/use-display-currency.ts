"use client";

import { useEffect, useState } from 'react';
import { getAdminSettings } from '@/lib/admin-settings';
import { getAdminCurrencyConfig } from '@/lib/admin-currency-rates';

export type DisplayCurrency = 'usd' | 'tzs' | 'ntzs' | 'pi';

const STORAGE_KEY = 'phcl-display-currency';

const getEnabledDisplayCurrencies = (): DisplayCurrency[] => {
  const fallback: DisplayCurrency[] = ['usd', 'tzs', 'ntzs', 'pi'];

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const config = getAdminCurrencyConfig();
    const allowed = config.managed
      .filter((entry) => entry.enabled)
      .map((entry) => entry.code.toLowerCase())
      .filter((code): code is DisplayCurrency => code === 'usd' || code === 'tzs' || code === 'ntzs' || code === 'pi');

    const unique = Array.from(new Set(allowed));
    return unique.length > 0 ? unique : fallback;
  } catch {
    return fallback;
  }
};

export function useDisplayCurrency(defaultCurrency: DisplayCurrency = 'usd') {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(defaultCurrency);
  const [enabledDisplayCurrencies, setEnabledDisplayCurrencies] = useState<DisplayCurrency[]>([
    'usd',
    'tzs',
    'ntzs',
    'pi',
  ]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enabledCurrencies = getEnabledDisplayCurrencies();
    setEnabledDisplayCurrencies(enabledCurrencies);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      let adminDefault: DisplayCurrency = defaultCurrency;
      try {
        adminDefault = getAdminSettings().defaultDisplayCurrency;
      } catch {
        adminDefault = defaultCurrency;
      }

      const fallbackCurrency = enabledCurrencies.includes(adminDefault)
        ? adminDefault
        : enabledCurrencies[0] || defaultCurrency;

      const nextCurrency: DisplayCurrency =
        saved === 'usd' || saved === 'tzs' || saved === 'ntzs' || saved === 'pi'
          ? enabledCurrencies.includes(saved)
            ? saved
            : fallbackCurrency
          : fallbackCurrency;

      setDisplayCurrency(nextCurrency);
      localStorage.setItem(STORAGE_KEY, nextCurrency);
    } catch {
      // Ignore storage access failures.
    } finally {
      setReady(true);
    }
  }, [defaultCurrency]);

  const setCurrency = (currency: DisplayCurrency) => {
    const enabledCurrencies = getEnabledDisplayCurrencies();
    if (!enabledCurrencies.includes(currency)) {
      return;
    }

    setDisplayCurrency(currency);
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // Ignore storage access failures.
    }
  };

  return {
    displayCurrency,
    setCurrency,
    enabledDisplayCurrencies,
    ready,
  };
}
