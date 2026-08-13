import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-security';
import { getServerCommerceSnapshot } from '@/lib/server-commerce-store';
import { getStripeWebhookAuditPath, readStripeWebhookAuditEvents } from '@/lib/stripe-webhook-audit';

export async function GET(request: NextRequest) {
  const auth = requireAdminSession(request);
  if (auth.response) {
    return auth.response;
  }

  const snapshot = getServerCommerceSnapshot();
  const orders = snapshot.orders || [];
  const webhookEvents = await readStripeWebhookAuditEvents(20);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || request.nextUrl.origin;
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, '');
  const webhookUrl = `${normalizedSiteUrl}/api/payments/stripe/webhook`;

  const byStatus = orders.reduce(
    (acc, order) => {
      const status = order.audit?.paymentStatus || 'pending';
      if (status === 'paid' || status === 'failed' || status === 'requires_payment' || status === 'pending') {
        acc[status] += 1;
      } else {
        acc.pending += 1;
      }
      return acc;
    },
    { paid: 0, pending: 0, failed: 0, requires_payment: 0 }
  );

  const byProvider = orders.reduce(
    (acc, order) => {
      const provider = order.audit?.paymentProvider || 'manual';
      if (provider === 'stripe' || provider === 'mobile-money' || provider === 'pi-wallet' || provider === 'manual') {
        acc[provider] += 1;
      }
      return acc;
    },
    { stripe: 0, 'mobile-money': 0, 'pi-wallet': 0, manual: 0 }
  );

  return NextResponse.json({
    success: true,
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
      publishableKeyConfigured: Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()),
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
      webhookUrl,
      webhookAuditPath: getStripeWebhookAuditPath(),
      cliCommand: `stripe listen --forward-to ${webhookUrl}`,
      dashboardHint: 'Add the same webhook URL in the Stripe Dashboard and copy the signing secret into STRIPE_WEBHOOK_SECRET.',
    },
    summary: {
      totalOrders: orders.length,
      byStatus,
      byProvider,
      tracedOrders: orders.filter((order) => !!order.audit?.paymentTransactionId).length,
    },
    recentPayments: orders
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 20)
      .map((order) => ({
        id: order.id,
        createdAt: order.createdAt,
        customerName: order.customer?.fullName || 'Guest Customer',
        amountUsd: order.totalUsd,
        paymentMethod: order.paymentMethod,
        paymentProvider: order.audit?.paymentProvider || 'manual',
        paymentStatus: order.audit?.paymentStatus || 'pending',
        paymentTransactionId: order.audit?.paymentTransactionId || null,
        paymentSessionId: order.audit?.paymentSessionId || null,
        paymentFailureReason: order.audit?.paymentFailureReason || null,
      })),
    webhookEvents,
  });
}
