'use client';

import { useEffect, useState } from 'react';
import type { CommerceStatePayload } from '@/lib/commerce-sync';
import { hydrateCommerceStateFromServer } from '@/lib/commerce-sync';
import { getCartItems } from '@/lib/cart-storage';
import { getAdminCurrencyAudit, getAdminCurrencyConfig } from '@/lib/admin-currency-rates';
import { getAdminLanguageAudit, getAdminLanguageConfig } from '@/lib/admin-language-settings';
import { getCustomerOverrideMap, getDeliveredAtMap, getOrderStatusAudit, getOrderStatusMap } from '@/lib/admin-order-meta-storage';
import { getAdminSettings, getAdminSettingsAudit } from '@/lib/admin-settings';
import { getOrders } from '@/lib/order-storage';
import { getWalletLedger, getWalletSnapshot } from '@/lib/wallet-storage';

const buildLocalFallback = (): CommerceStatePayload => ({
  cartItems: getCartItems(),
  adminSettings: getAdminSettings(),
  adminSettingsAudit: getAdminSettingsAudit(),
  currencyConfig: getAdminCurrencyConfig(),
  currencyAudit: getAdminCurrencyAudit(),
  languageConfig: getAdminLanguageConfig(),
  languageAudit: getAdminLanguageAudit(),
  orders: getOrders(),
  walletSnapshot: getWalletSnapshot(),
  walletLedger: getWalletLedger(),
  orderStatusMap: getOrderStatusMap(),
  orderStatusAudit: getOrderStatusAudit(),
  customerOverrideMap: getCustomerOverrideMap(),
  deliveredAtMap: getDeliveredAtMap(),
});

export function useCommerceSnapshot() {
  const [snapshot, setSnapshot] = useState<CommerceStatePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setSnapshot(buildLocalFallback());

    void hydrateCommerceStateFromServer()
      .then((serverSnapshot) => {
        if (!active) return;
        setSnapshot(serverSnapshot || buildLocalFallback());
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { snapshot, isLoading, refreshLocalFallback: () => setSnapshot(buildLocalFallback()) };
}