'use client';

import { useEffect } from 'react';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';

export function useCommerceBootstrap(onReady: () => void, deps: unknown[] = []) {
  useEffect(() => {
    let active = true;

    void refreshCommerceClientCache().finally(() => {
      if (active) {
        onReady();
      }
    });

    return () => {
      active = false;
    };
  }, deps);
}