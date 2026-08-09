"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Checkout, MobilePaymentDetails } from '@/components/marketplace/checkout';
import { convertAmount } from '@/components/marketplace/currency-utils';
import { useDisplayCurrency } from '@/hooks/use-display-currency';
import { useLanguage } from '@/hooks/use-language';
import { getAdminSettings } from '@/lib/admin-settings';
import { applyProductStockPurchase, canAddToCart } from '@/lib/admin-product-stock';
import { reconcileCartItemsWithStock } from '@/lib/cart-stock-reconcile';
import { CART_UPDATED_EVENT, CartStorageItem, getCartItems, getCartTotal, setCartItems } from '@/lib/cart-storage';
import { REORDER_SOURCE_KEY, StoredOrder, saveOrder } from '@/lib/order-storage';
import { getPolicyVersions } from '@/lib/policy-compliance';

export default function CheckoutClient() {
  const [items, setItems] = useState<CartStorageItem[]>([]);
  const { language } = useLanguage();
  const isSwahili = language === 'sw';

  const copy = isSwahili
    ? {
        title: 'Malipo',
        subtitle: 'Kamilisha ununuzi wako kwa kutumia USD, TZS, nTZS, au PI.',
        backToCart: 'Rudi Cart',
        continueShopping: 'Endelea Kununua',
        orders: 'Oda',
        displayCurrency: 'Sarafu ya kuonyesha:',
        maintenance: 'Hali ya matengenezo imewashwa. Kukamilisha malipo kumesitishwa kwa sasa na sera ya administrator.',
        orderConfirmed: 'Oda Imethibitishwa',
        orderPlaced: 'Oda yako imewasilishwa kwa mafanikio.',
        orderId: 'Namba ya Oda',
        items: 'Bidhaa',
        payment: 'Malipo',
        viewCart: 'Tazama Cart',
        readyForCheckout: (count: number) => `${count} bidhaa ziko tayari kwa malipo.`,
        shippingDetails: 'Maelezo ya Usafirishaji',
        shippingRequired: 'Sehemu zote zinahitajika kabla ya kukamilisha ununuzi.',
        fullName: 'Jina kamili',
        phone: 'Namba ya simu',
        addressLine: 'Anwani',
        city: 'Jiji',
        country: 'Nchi',
        shippingComplete: 'Taarifa za usafirishaji zimekamilika.',
        shippingIncomplete: 'Tafadhali jaza sehemu zote za usafirishaji.',
        legalConsent: 'Ridhaa ya Kisheria',
        legalConsentNote: 'Ili kukamilisha malipo, mteja lazima akubali sera zote mbili kwa hiari.',
        agreeTermsPrefix: 'Ninakubali',
        terms: 'Masharti ya Huduma',
        agreePrivacyPrefix: 'Ninakubali',
        privacy: 'Sera ya Faragha',
        policyConsentComplete: 'Ridhaa ya sera imekamilika.',
        policyConsentIncomplete: 'Tafadhali kubali sera zote mbili ili kuendelea.',
        emptyCartTitle: 'Cart yako ni tupu.',
        emptyCartBody: 'Ongeza bidhaa kwanza, kisha urudi checkout.',
        goToMarketplace: 'Nenda Marketplace',
        removedBeforeCheckout: (count: number) => `${count} bidhaa zimeondolewa kabla ya checkout kutokana na mabadiliko ya stock`,
        reducedBeforeCheckout: (count: number) => `${count} bidhaa zimepunguzwa idadi hadi stock iliyopo kabla ya checkout`,
        checkoutDisabledMaintenance: 'Checkout imezimwa kwa muda wakati wa matengenezo',
        piDisabledByAdmin: 'Malipo ya PI yamezimwa kwa sasa na admin',
        cartEmpty: 'Cart ni tupu. Ongeza bidhaa kabla ya checkout',
        completeShippingFirst: 'Kamilisha kwanza taarifa za usafirishaji',
        agreePoliciesFirst: 'Lazima ukubali Masharti ya Huduma na Sera ya Faragha kabla ya ununuzi',
        productUnavailable: 'Bidhaa haipatikani',
        unableUpdateStock: 'Imeshindikana kusasisha stock kwa oda hii',
        orderConfirmedToast: (orderId: string) => `Oda ${orderId} imethibitishwa`,
        pausedDuringMaintenance: 'Kukamilisha checkout kumesitishwa wakati wa matengenezo',
        fillShippingBeforeComplete: 'Jaza taarifa za usafirishaji kabla ya kukamilisha ununuzi',
        acceptPoliciesBeforeComplete: 'Kubali Masharti na Faragha kabla ya kukamilisha ununuzi',
        mobileDetailsRequired: 'Kwa malipo ya TZS/nTZS, chagua mtandao wa simu na andika namba sahihi ya malipo.',
        mobileNetworkLabel: 'Mtandao wa Simu',
        paymentPhoneLabel: 'Namba ya Malipo',
        notProvided: 'Haijawekwa',
      }
    : {
        title: 'Checkout',
        subtitle: 'Complete your purchase using USD, TZS, nTZS, or PI.',
        backToCart: 'Back to Cart',
        continueShopping: 'Continue Shopping',
        orders: 'Orders',
        displayCurrency: 'Display currency:',
        maintenance: 'Maintenance mode is active. Checkout completion is currently paused by administrator policy.',
        orderConfirmed: 'Order Confirmed',
        orderPlaced: 'Your order has been placed successfully.',
        orderId: 'Order ID',
        items: 'Items',
        payment: 'Payment',
        viewCart: 'View Cart',
        readyForCheckout: (count: number) => `${count} item(s) ready for checkout.`,
        shippingDetails: 'Shipping Details',
        shippingRequired: 'All fields are required before purchase completion.',
        fullName: 'Full name',
        phone: 'Phone number',
        addressLine: 'Address line',
        city: 'City',
        country: 'Country',
        shippingComplete: 'Shipping profile complete.',
        shippingIncomplete: 'Please complete all shipping fields.',
        legalConsent: 'Legal Consent',
        legalConsentNote: 'To complete checkout, customer must voluntarily accept both policies.',
        agreeTermsPrefix: 'I agree to the',
        terms: 'Terms of Service',
        agreePrivacyPrefix: 'I agree to the',
        privacy: 'Privacy Policy',
        policyConsentComplete: 'Policy consent complete.',
        policyConsentIncomplete: 'Please agree to both policies to continue.',
        emptyCartTitle: 'Your cart is empty.',
        emptyCartBody: 'Add products first, then return to checkout.',
        goToMarketplace: 'Go to Marketplace',
        removedBeforeCheckout: (count: number) => `${count} item(s) were removed before checkout due to stock changes`,
        reducedBeforeCheckout: (count: number) => `${count} item(s) quantity was reduced to available stock before checkout`,
        checkoutDisabledMaintenance: 'Checkout is temporarily disabled during maintenance mode',
        piDisabledByAdmin: 'PI payments are currently disabled by admin',
        cartEmpty: 'Cart is empty. Add items before checkout',
        completeShippingFirst: 'Complete shipping details first',
        agreePoliciesFirst: 'You must agree to Terms of Service and Privacy Policy before purchase',
        productUnavailable: 'Product is unavailable',
        unableUpdateStock: 'Unable to update stock for this order',
        orderConfirmedToast: (orderId: string) => `Order ${orderId} confirmed`,
        pausedDuringMaintenance: 'Checkout completion is paused during maintenance mode',
        fillShippingBeforeComplete: 'Fill shipping details before completing purchase',
        acceptPoliciesBeforeComplete: 'Accept Terms and Privacy Policy before completing purchase',
        mobileDetailsRequired: 'For TZS/nTZS payments, select a mobile network and enter a valid payment phone number.',
        mobileNetworkLabel: 'Mobile Network',
        paymentPhoneLabel: 'Payment Phone',
        notProvided: 'Not provided',
      };
  const { displayCurrency, setCurrency, enabledDisplayCurrencies } = useDisplayCurrency('usd');
  const [recentOrder, setRecentOrder] = useState<StoredOrder | null>(null);
  const [allowPiPayments, setAllowPiPayments] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shipping, setShipping] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    city: '',
    country: '',
  });
  const [checkoutConsent, setCheckoutConsent] = useState({
    agreedToTerms: false,
    agreedToPrivacy: false,
  });
  const [mobilePaymentDetails, setMobilePaymentDetails] = useState<MobilePaymentDetails>({
    network: null,
    phone: '',
  });

  const resolveMobileNetworkLabel = (network: string) => {
    if (network === 'mpesa') return 'M-Pesa';
    if (network === 'tigopesa') return 'Tigo Pesa';
    if (network === 'airtelmoney') return 'Airtel Money';
    if (network === 'halopesa') return 'HaloPesa';
    return network;
  };

  useEffect(() => {
    const sync = () => {
      const current = getCartItems();
      const reconciled = reconcileCartItemsWithStock(current);

      if (reconciled.changes.length > 0) {
        setCartItems(reconciled.items);
        const removedCount = reconciled.changes.filter((change) => change.type === 'removed_unavailable').length;
        const reducedCount = reconciled.changes.filter((change) => change.type === 'reduced_quantity').length;

        if (removedCount > 0) {
          toast.warning(copy.removedBeforeCheckout(removedCount));
        }
        if (reducedCount > 0) {
          toast.warning(copy.reducedBeforeCheckout(reducedCount));
        }
      }

      setItems(reconciled.items);
    };

    sync();
    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const settings = getAdminSettings();
      setAllowPiPayments(settings.allowPiPayments);
      setMaintenanceMode(settings.maintenanceMode);
    };

    syncSettings();
    window.addEventListener('storage', syncSettings);
    return () => window.removeEventListener('storage', syncSettings);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const total = useMemo(() => getCartTotal(items), [items]);
  const policyVersions = useMemo(() => getPolicyVersions(), []);
  const displayTotal = useMemo(
    () => convertAmount(total, 'usd', displayCurrency),
    [total, displayCurrency]
  );

  const shippingValid = useMemo(() => {
    return (
      shipping.fullName.trim().length >= 3 &&
      shipping.phone.trim().length >= 7 &&
      shipping.addressLine1.trim().length >= 6 &&
      shipping.city.trim().length >= 2 &&
      shipping.country.trim().length >= 2
    );
  }, [shipping]);

  const policyConsentValid = checkoutConsent.agreedToTerms && checkoutConsent.agreedToPrivacy;

  const completePurchase = (
    paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi',
    mobileDetails?: MobilePaymentDetails
  ) => {
    if (maintenanceMode) {
      toast.error(copy.checkoutDisabledMaintenance);
      return;
    }

    if (paymentMethod === 'pi' && !allowPiPayments) {
      toast.error(copy.piDisabledByAdmin);
      return;
    }

    if (items.length === 0 || total <= 0) {
      toast.error(copy.cartEmpty);
      return;
    }

    if (!shippingValid) {
      toast.error(copy.completeShippingFirst);
      return;
    }

    if (!policyConsentValid) {
      toast.error(copy.agreePoliciesFirst);
      return;
    }

    const isMobileNetworkPayment = paymentMethod === 'tzs' || paymentMethod === 'ntzs';
    const effectiveMobileDetails = mobileDetails ?? mobilePaymentDetails;
    const normalizedMobilePhone = effectiveMobileDetails.phone.trim().replace(/[\s()-]/g, '');
    const mobileDetailsValid =
      !isMobileNetworkPayment ||
      (!!effectiveMobileDetails.network && /^\+?[0-9]{10,15}$/.test(normalizedMobilePhone));

    if (!mobileDetailsValid) {
      toast.error(copy.mobileDetailsRequired);
      return;
    }

    const preflight = reconcileCartItemsWithStock(items);
    if (preflight.changes.length > 0) {
      setItems(preflight.items);
      setCartItems(preflight.items);

      const removedCount = preflight.changes.filter((change) => change.type === 'removed_unavailable').length;
      const reducedCount = preflight.changes.filter((change) => change.type === 'reduced_quantity').length;

      if (removedCount > 0) {
        toast.warning(copy.removedBeforeCheckout(removedCount));
      }
      if (reducedCount > 0) {
        toast.warning(copy.reducedBeforeCheckout(reducedCount));
      }
    }

    const preflightItems = preflight.items;
    if (preflightItems.length === 0) {
      toast.error(copy.cartEmpty);
      return;
    }

    const preflightTotal = getCartTotal(preflightItems);
    if (preflightTotal <= 0) {
      toast.error(copy.cartEmpty);
      return;
    }

    const stockConflicts = preflightItems
      .map((item) => ({ item, check: canAddToCart(item.id, item.quantity) }))
      .filter(({ check }) => !check.allowed);

    if (stockConflicts.length > 0) {
      const firstConflict = stockConflicts[0];
      toast.error(`${firstConflict.item.name}: ${firstConflict.check.reason || copy.productUnavailable}`);
      return;
    }

    const reorderSourceOrderId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(REORDER_SOURCE_KEY) || undefined
        : undefined;

    const order: StoredOrder = {
      id: `ORD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      itemCount: preflightItems.reduce((sum, item) => sum + item.quantity, 0),
      totalUsd: preflightTotal,
      paymentMethod,
      displayCurrency,
      items: preflightItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      customer: {
        fullName: shipping.fullName.trim(),
        phone: shipping.phone.trim(),
        addressLine1: shipping.addressLine1.trim(),
        city: shipping.city.trim(),
        country: shipping.country.trim(),
      },
      audit: {
        schemaVersion: 4,
        sourceRoute: '/checkout',
        channel: 'web',
        recordedAt: new Date().toISOString(),
        reorderSourceOrderId,
        mobilePayment: isMobileNetworkPayment
          ? {
              network: effectiveMobileDetails.network || 'mpesa',
              phone: normalizedMobilePhone,
            }
          : undefined,
        consent: {
          agreedToTerms: true,
          agreedToPrivacy: true,
          agreedAt: new Date().toISOString(),
          termsVersion: policyVersions.termsVersion,
          privacyVersion: policyVersions.privacyVersion,
        },
      },
    };

    const stockCommit = applyProductStockPurchase(
      preflightItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
      `order:${order.id}`
    );

    if (!stockCommit.success) {
      toast.error(stockCommit.reason || copy.unableUpdateStock);
      return;
    }

    saveOrder(order);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(REORDER_SOURCE_KEY);
    }
    setRecentOrder(order);
    setCartItems([]);
    setItems([]);
    toast.success(copy.orderConfirmedToast(order.id));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-[#101827] to-[#1c1607] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_26%),radial-gradient(circle_at_bottom_center,rgba(245,158,11,0.12),transparent_25%)]" />

      <section className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 ${isMobile ? 'flex-col' : ''}`}>
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 text-sm text-amber-50/85 sm:text-base">
              {copy.subtitle}
            </p>
          </div>
          <div className={`flex flex-wrap gap-2 ${isMobile ? 'w-full flex-col' : ''}`}>
            <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              {copy.backToCart}
            </Link>
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
              {copy.continueShopping}
            </Link>
            <Link href="/orders" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
              {copy.orders}
            </Link>
          </div>
        </div>

        <div className={`mb-4 flex flex-wrap items-center gap-2 text-xs ${isMobile ? 'flex-col items-start gap-3' : ''}`}>
          <span className="text-amber-50/90">{copy.displayCurrency}</span>
          <div className={`flex flex-wrap gap-2 ${isMobile ? 'w-full' : ''}`}>
            {enabledDisplayCurrencies.includes('usd') && (
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'usd' ? 'bg-amber-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
              >
                USD
              </button>
            )}
            {enabledDisplayCurrencies.includes('tzs') && (
              <button
                type="button"
                onClick={() => setCurrency('tzs')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'tzs' ? 'bg-amber-100 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
              >
                TZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('ntzs') && (
              <button
                type="button"
                onClick={() => setCurrency('ntzs')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'ntzs' ? 'bg-cyan-200 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
              >
                nTZS
              </button>
            )}
            {enabledDisplayCurrencies.includes('pi') && (
              <button
                type="button"
                onClick={() => setCurrency('pi')}
                style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }}
                className={`rounded-lg px-3 py-1 font-semibold ${displayCurrency === 'pi' ? 'bg-yellow-300 text-slate-900' : 'bg-slate-800/70 text-amber-100'}`}
              >
                PI
              </button>
            )}
          </div>
        </div>

        {maintenanceMode && (
          <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-100">
            {copy.maintenance}
          </div>
        )}

        {recentOrder ? (
          <div className="rounded-2xl border border-green-300/40 bg-green-500/10 p-6 global-glass">
            <h2 className="text-2xl font-bold text-green-200">{copy.orderConfirmed}</h2>
            <p className="mt-2 text-sm text-green-100">{copy.orderPlaced}</p>
            <div className="mt-4 space-y-2 text-sm text-green-50">
              <p>{copy.orderId}: {recentOrder.id}</p>
              <p>{copy.items}: {recentOrder.itemCount}</p>
              <p>{copy.payment}: {recentOrder.paymentMethod.toUpperCase()}</p>
              {(recentOrder.paymentMethod === 'tzs' || recentOrder.paymentMethod === 'ntzs') && (
                <>
                  <p>
                    {copy.mobileNetworkLabel}:{' '}
                    {recentOrder.audit?.mobilePayment
                      ? resolveMobileNetworkLabel(recentOrder.audit.mobilePayment.network)
                      : copy.notProvided}
                  </p>
                  <p>
                    {copy.paymentPhoneLabel}:{' '}
                    {recentOrder.audit?.mobilePayment?.phone || copy.notProvided}
                  </p>
                </>
              )}
            </div>
            <div className={`mt-5 flex flex-wrap gap-2 ${isMobile ? 'flex-col' : ''}`}>
              <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }} className="rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
                {copy.continueShopping}
              </Link>
              <Link href="/cart" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }} className="rounded-xl bg-slate-800/80 px-4 py-2 text-sm font-semibold text-amber-100">
                {copy.viewCart}
              </Link>
            </div>
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-amber-50/90 global-glass">
              {copy.readyForCheckout(items.length)}
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 global-glass">
              <h2 className="text-lg font-semibold text-amber-50">{copy.shippingDetails}</h2>
              <p className="mt-1 text-xs text-amber-50/80">{copy.shippingRequired}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={shipping.fullName}
                  onChange={(e) => setShipping((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder={copy.fullName}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                />
                <input
                  type="tel"
                  value={shipping.phone}
                  onChange={(e) => setShipping((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={copy.phone}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                />
                <input
                  type="text"
                  value={shipping.addressLine1}
                  onChange={(e) => setShipping((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder={copy.addressLine}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300 sm:col-span-2"
                />
                <input
                  type="text"
                  value={shipping.city}
                  onChange={(e) => setShipping((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder={copy.city}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                />
                <input
                  type="text"
                  value={shipping.country}
                  onChange={(e) => setShipping((prev) => ({ ...prev, country: e.target.value }))}
                  placeholder={copy.country}
                  style={{ minHeight: '44px' }}
                  className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-amber-300"
                />
              </div>
              <p className={`mt-3 text-xs ${shippingValid ? 'text-green-300' : 'text-amber-200'}`}>
                {shippingValid ? copy.shippingComplete : copy.shippingIncomplete}
              </p>
            </div>

            <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-4 global-glass">
              <h2 className="text-lg font-semibold text-amber-50">{copy.legalConsent}</h2>
              <p className="mt-1 text-xs text-amber-50/80">
                {copy.legalConsentNote}
              </p>
              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-start gap-2 text-amber-50">
                  <input
                    type="checkbox"
                    checked={checkoutConsent.agreedToTerms}
                    onChange={(e) =>
                      setCheckoutConsent((prev) => ({
                        ...prev,
                        agreedToTerms: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    {copy.agreeTermsPrefix}{' '}
                    <Link href="/terms-of-service" className="font-semibold underline text-amber-200">
                      {copy.terms}
                    </Link>
                    {' '}
                    (v{policyVersions.termsVersion}).
                  </span>
                </label>
                <label className="flex items-start gap-2 text-amber-50">
                  <input
                    type="checkbox"
                    checked={checkoutConsent.agreedToPrivacy}
                    onChange={(e) =>
                      setCheckoutConsent((prev) => ({
                        ...prev,
                        agreedToPrivacy: e.target.checked,
                      }))
                    }
                    className="mt-1"
                  />
                  <span>
                    {copy.agreePrivacyPrefix}{' '}
                    <Link href="/privacy-policy" className="font-semibold underline text-amber-200">
                      {copy.privacy}
                    </Link>
                    {' '}
                    (v{policyVersions.privacyVersion}).
                  </span>
                </label>
              </div>
              <p className={`mt-3 text-xs ${policyConsentValid ? 'text-green-300' : 'text-amber-200'}`}>
                {policyConsentValid ? copy.policyConsentComplete : copy.policyConsentIncomplete}
              </p>
            </div>

            <Checkout
              darkMode
              total={displayTotal}
              currency={displayCurrency}
              language={isSwahili ? 'sw' : 'en'}
              onMobilePaymentDetailsChange={setMobilePaymentDetails}
              onCompletePurchase={completePurchase}
              canCompletePurchase={shippingValid && policyConsentValid && !maintenanceMode}
              onBlockedPurchase={(reason) => {
                if (reason === 'mobile_details') {
                  toast.error(copy.mobileDetailsRequired);
                  return;
                }

                if (maintenanceMode) {
                  toast.error(copy.pausedDuringMaintenance);
                  return;
                }

                if (!shippingValid) {
                  toast.error(copy.fillShippingBeforeComplete);
                  return;
                }

                toast.error(copy.acceptPoliciesBeforeComplete);
              }}
              allowPiPayments={allowPiPayments}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 sm:p-8 text-center global-glass">
            <p className="text-lg font-semibold text-amber-50">{copy.emptyCartTitle}</p>
            <p className="mt-2 text-sm text-amber-50/85">{copy.emptyCartBody}</p>
            <Link href="/marketplace" style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '8px 16px' }} className="mt-4 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900">
              {copy.goToMarketplace}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
