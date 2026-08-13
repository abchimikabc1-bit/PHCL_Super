import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerCommerceSnapshot, saveServerCommerceSnapshot } from '@/lib/server-commerce-store';
import type { StoredOrder } from '@/lib/order-storage';

const getStripeClient = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
};

const getWebhookSecret = (): string => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return webhookSecret;
};

const normalizeOrderId = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const updateStoredOrder = (
  predicate: (order: StoredOrder) => boolean,
  updater: (order: StoredOrder) => StoredOrder
): boolean => {
  const snapshot = getServerCommerceSnapshot();
  const index = snapshot.orders.findIndex(predicate);
  if (index < 0) {
    return false;
  }

  const nextOrders = [...snapshot.orders];
  nextOrders[index] = updater(nextOrders[index]);
  saveServerCommerceSnapshot({ orders: nextOrders });
  return true;
};

const withStripeAudit = (
  order: StoredOrder,
  patch: Partial<NonNullable<StoredOrder['audit']>>
): StoredOrder => ({
  ...order,
  audit: {
    schemaVersion: order.audit?.schemaVersion ?? 4,
    sourceRoute: order.audit?.sourceRoute ?? '/checkout',
    channel: order.audit?.channel ?? 'web',
    recordedAt: order.audit?.recordedAt ?? order.createdAt,
    ...order.audit,
    ...patch,
  },
});

const handleCheckoutSessionEvent = (event: Stripe.Event, session: Stripe.Checkout.Session): boolean => {
  const orderId = normalizeOrderId(session.metadata?.orderId);
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
  const paymentStatus =
    session.payment_status === 'paid'
      ? 'paid'
      : event.type === 'checkout.session.async_payment_failed'
        ? 'failed'
        : 'pending';

  return updateStoredOrder(
    (order) =>
      order.id === orderId ||
      order.audit?.paymentSessionId === session.id ||
      (!!paymentIntentId && order.audit?.paymentTransactionId === paymentIntentId),
    (order) => {
      if (order.audit?.paymentWebhookEventId === event.id) {
        return order;
      }

      return withStripeAudit(order, {
        paymentProvider: 'stripe',
        paymentStatus,
        paymentSessionId: session.id,
        paymentTransactionId: paymentIntentId || order.audit?.paymentTransactionId,
        paymentReceivedAt:
          paymentStatus === 'paid' ? new Date().toISOString() : order.audit?.paymentReceivedAt,
        paymentFailureReason:
          paymentStatus === 'failed' ? 'Stripe reported that the checkout payment failed.' : undefined,
        paymentWebhookEventId: event.id,
      });
    }
  );
};

const handlePaymentIntentFailed = (event: Stripe.Event, intent: Stripe.PaymentIntent): boolean => {
  const orderId = normalizeOrderId(intent.metadata?.orderId);
  const failureReason =
    intent.last_payment_error?.message ||
    intent.cancellation_reason ||
    'Stripe reported that the payment intent failed.';

  return updateStoredOrder(
    (order) => order.id === orderId || order.audit?.paymentTransactionId === intent.id,
    (order) => {
      if (order.audit?.paymentWebhookEventId === event.id) {
        return order;
      }

      return withStripeAudit(order, {
        paymentProvider: 'stripe',
        paymentStatus: 'failed',
        paymentTransactionId: intent.id,
        paymentFailureReason: failureReason,
        paymentWebhookEventId: event.id,
      });
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json({ success: false, error: 'Missing Stripe signature' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getWebhookSecret());

    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      handleCheckoutSessionEvent(event, event.data.object as Stripe.Checkout.Session);
    } else if (event.type === 'payment_intent.payment_failed') {
      handlePaymentIntentFailed(event, event.data.object as Stripe.PaymentIntent);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Stripe webhook processing failed',
      },
      { status: 400 }
    );
  }
}
