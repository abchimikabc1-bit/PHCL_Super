'use client';

import { useEffect } from 'react';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';

export function useCommerceBootstrap(onReady: () => void | (() => void)) {
  useEffect(() => {
    let active = true;
    let cleanup: void | (() => void);

    void refreshCommerceClientCache().finally(() => {
      if (active) {
        cleanup = onReady();
      }
    });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [onReady]);
}