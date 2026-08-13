import { NextRequest, NextResponse } from 'next/server';
import { saveServerCommerceSnapshot, getServerCommerceSnapshot } from '@/lib/server-commerce-store';
import type { StoredOrder } from '@/lib/order-storage';
import { createPaymentSession, type CheckoutPaymentMethod } from '@/lib/payment-gateway';
import { getLiveCryptoUsdRates } from '@/lib/live-crypto-rates';
import {
  normalizeEmailAddress,
  normalizePhoneNumber,
  sendEmailMessage,
  sendSmsMessage,
  type NotificationDispatchResult,
} from '@/lib/server-notifications';

type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CheckoutPayload = {
  paymentMethod: CheckoutPaymentMethod;
  displayCurrency: 'usd' | 'tzs' | 'ntzs' | 'pi';
  totalUsd: number;
  items: CheckoutItem[];
  customer: {
    fullName: string;
    email?: string;
    phone: string;
    addressLine1: string;
    city: string;
    country: string;
  };
  policyConsent?: {
    termsVersion?: string;
    privacyVersion?: string;
  };
  mobilePayment?: {
    network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';
    phone: string;
  };
};

const MAX_ITEMS = 120;
const MAX_ORDERS = 25;
const VALID_PAYMENT_METHODS = new Set<CheckoutPaymentMethod>(['usd', 'tzs', 'ntzs', 'pi']);
const VALID_DISPLAY_CURRENCIES = new Set(['usd', 'tzs', 'ntzs', 'pi']);
const VALID_NETWORKS = new Set(['mpesa', 'tigopesa', 'airtelmoney', 'halopesa']);

const trimText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const roundMoney = (value: number): number => Number(value.toFixed(2));

const normalizeItems = (raw: unknown): CheckoutItem[] => {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const id = trimText(row.id, 80);
      const name = trimText(row.name, 140);
      const price = Number(row.price);
      const quantity = Math.floor(Number(row.quantity));
      const image = trimText(row.image, 600) || undefined;

      if (!id || !name || !Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        return null;
      }

      return {
        id,
        name,
        price: roundMoney(price),
        quantity: Math.min(999, quantity),
        image,
      };
    })
    .filter((item): item is CheckoutItem => !!item)
    .slice(0, MAX_ITEMS);
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutPayload;

    if (!VALID_PAYMENT_METHODS.has(body.paymentMethod)) {
      return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
    }

    if (!VALID_DISPLAY_CURRENCIES.has(body.displayCurrency)) {
      return NextResponse.json({ success: false, error: 'Invalid display currency' }, { status: 400 });
    }

    const items = normalizeItems(body.items);
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'Order must include at least one valid item' }, { status: 400 });
    }

    const fullName = trimText(body.customer?.fullName, 120);
    const phone = normalizePhoneNumber(body.customer?.phone || '');
    const email = body.customer?.email ? normalizeEmailAddress(body.customer.email) : null;
    const addressLine1 = trimText(body.customer?.addressLine1, 200);
    const city = trimText(body.customer?.city, 80);
    const country = trimText(body.customer?.country, 80);

    if (!fullName || !phone || !addressLine1 || !city || !country) {
      return NextResponse.json({ success: false, error: 'Customer details are incomplete' }, { status: 400 });
    }

    const totalUsd = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    if (!Number.isFinite(totalUsd) || totalUsd <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid order total' }, { status: 400 });
    }

    const claimedTotal = roundMoney(Number(body.totalUsd));
    if (!Number.isFinite(claimedTotal) || Math.abs(claimedTotal - totalUsd) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Order total mismatch', totals: { claimedTotal, computedTotal: totalUsd } },
        { status: 400 }
      );
    }

    let mobilePayment:
      | {
          network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';
          phone: string;
        }
      | undefined;

    if (body.paymentMethod === 'tzs' || body.paymentMethod === 'ntzs') {
      const network = trimText(body.mobilePayment?.network, 20) as CheckoutPayload['mobilePayment']['network'];
      const mobilePhone = normalizePhoneNumber(body.mobilePayment?.phone || '');
      if (!VALID_NETWORKS.has(network) || !mobilePhone) {
        return NextResponse.json({ success: false, error: 'Valid mobile payment details are required' }, { status: 400 });
      }

      mobilePayment = { network, phone: mobilePhone };
    }

    const liveRates = await getLiveCryptoUsdRates();
    const piUsdRate = liveRates.rates.PI;
    const orderId = `ORD-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const requestUrl = new URL(request.url);
    const payment = await createPaymentSession({
      orderId,
      paymentMethod: body.paymentMethod,
      totalUsd,
      phoneNumber: phone,
      mobileNetwork: mobilePayment?.network,
      piUsdRate,
      customerEmail: email,
      successUrl: `${requestUrl.origin}/checkout?orderId=${encodeURIComponent(orderId)}&payment=success`,
      cancelUrl: `${requestUrl.origin}/checkout?orderId=${encodeURIComponent(orderId)}&payment=cancelled`,
    });

    const order: StoredOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalUsd,
      paymentMethod: body.paymentMethod,
      displayCurrency: body.displayCurrency,
      items,
      customer: {
        fullName,
        email: email || undefined,
        phone,
        addressLine1,
        city,
        country,
      },
      audit: {
        schemaVersion: 4,
        sourceRoute: '/checkout',
        channel: 'web',
        recordedAt: new Date().toISOString(),
        paymentTransactionId: payment.paymentTransactionId,
        paymentSessionId: payment.paymentSessionId,
        paymentProvider: payment.provider,
        paymentStatus: payment.status,
        mobilePayment,
        consent: {
          agreedToTerms: true,
          agreedToPrivacy: true,
          agreedAt: new Date().toISOString(),
          termsVersion: trimText(body.policyConsent?.termsVersion, 40) || 'unknown',
          privacyVersion: trimText(body.policyConsent?.privacyVersion, 40) || 'unknown',
        },
      },
    };

    const snapshot = getServerCommerceSnapshot();
    saveServerCommerceSnapshot({
      orders: [order, ...snapshot.orders].slice(0, MAX_ORDERS),
    });

    const notifications: NotificationDispatchResult[] = [];
    const orderSummary = items.map((item) => `${item.quantity}x ${item.name}`).join(', ');
    const adminEmail = normalizeEmailAddress(process.env.ADMIN_EMAIL || '');

    if (email) {
      notifications.push(
        await sendEmailMessage({
          to: email,
          subject: `PHCL Super order ${order.id} received`,
          text: `Order ${order.id} has been received.\nPayment reference: ${payment.paymentTransactionId}\nItems: ${orderSummary}\nAmount: $${totalUsd.toFixed(2)} USD`,
        })
      );
    }

    if (adminEmail && adminEmail !== email) {
      notifications.push(
        await sendEmailMessage({
          to: adminEmail,
          subject: `New PHCL order ${order.id}`,
          text: `New order from ${fullName}.\nPhone: ${phone}\nPayment method: ${body.paymentMethod.toUpperCase()}\nReference: ${payment.paymentTransactionId}\nItems: ${orderSummary}`,
        })
      );
    }

    notifications.push(
      await sendSmsMessage({
        to: phone,
        message: `PHCL order ${order.id} received. Ref ${payment.paymentTransactionId}. Amount USD ${totalUsd.toFixed(2)}.`,
      })
    );

    return NextResponse.json({
      success: true,
      order,
      payment,
      quote: {
        source: liveRates.source,
        piUsdRate: Number.isFinite(piUsdRate) ? piUsdRate : null,
        fetchedAt: liveRates.fetchedAt,
      },
      notifications,
    });
  } catch (error) {
    console.error('Failed to submit checkout order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit checkout order',
      },
      { status: 500 }
    );
  }
}
