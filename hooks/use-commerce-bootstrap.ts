'use client';

import { type DependencyList, useEffect } from 'react';
import { refreshCommerceClientCache } from '@/lib/commerce-client-cache';

export function useCommerceBootstrap(onReady: () => void, deps: DependencyList = []) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onReady, ...deps]);
}