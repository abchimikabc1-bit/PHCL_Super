import Stripe from 'stripe';

export type CheckoutPaymentMethod = 'usd' | 'tzs' | 'ntzs' | 'pi';

export interface PaymentSession {
  provider: 'stripe' | 'mobile-money' | 'pi-wallet' | 'manual';
  status: 'requires_payment' | 'pending';
  paymentTransactionId: string;
  paymentSessionId?: string;
  paymentUrl?: string;
  clientSecret?: string;
  instructions: string;
  amountDue: number;
  currency: string;
}

const getStripeClient = (): Stripe | null => {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  return secretKey ? new Stripe(secretKey) : null;
};

const roundMoney = (value: number): number => Number(value.toFixed(2));

export async function createPaymentSession(input: {
  orderId: string;
  paymentMethod: CheckoutPaymentMethod;
  totalUsd: number;
  phoneNumber?: string;
  mobileNetwork?: string | null;
  piUsdRate?: number;
  customerEmail?: string | null;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<PaymentSession> {
  if (input.paymentMethod === 'usd') {
    const stripe = getStripeClient();
    if (stripe && input.successUrl && input.cancelUrl) {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.customerEmail || undefined,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `PHCL Super order ${input.orderId}`,
                description: 'Secure Stripe card payment',
              },
              unit_amount: Math.max(1, Math.round(input.totalUsd * 100)),
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderId: input.orderId,
        },
        payment_intent_data: {
          description: `PHCL Super order ${input.orderId}`,
          metadata: {
            orderId: input.orderId,
          },
        },
      });
      if (!session.id || !session.url) {
        throw new Error('Stripe checkout session was created without a redirect URL.');
      }

      return {
        provider: 'stripe',
        status: 'pending',
        paymentTransactionId: session.payment_intent && typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        paymentSessionId: session.id,
        paymentUrl: session.url,
        instructions: 'Complete card payment on the secure Stripe checkout page.',
        amountDue: roundMoney(input.totalUsd),
        currency: 'USD',
      };
    }

    return {
      provider: 'manual',
      status: 'pending',
      paymentTransactionId: `USD-${input.orderId}`,
      instructions: 'Stripe is not configured yet. Collect USD payment manually using this reference.',
      amountDue: roundMoney(input.totalUsd),
      currency: 'USD',
    };
  }

  if (input.paymentMethod === 'pi') {
    const piRate = Number.isFinite(input.piUsdRate) && (input.piUsdRate as number) > 0 ? (input.piUsdRate as number) : 314159;
    return {
      provider: 'pi-wallet',
      status: 'pending',
      paymentTransactionId: `PI-${input.orderId}`,
      instructions: 'Ask the customer to complete the Pi wallet transfer using this reference.',
      amountDue: Number((input.totalUsd / piRate).toFixed(8)),
      currency: 'PI',
    };
  }

  return {
    provider: 'mobile-money',
    status: 'pending',
    paymentTransactionId: `MM-${input.orderId}`,
    instructions: `Collect ${input.paymentMethod.toUpperCase()} payment via ${input.mobileNetwork || 'mobile money'} using reference ${input.orderId}.`,
    amountDue: roundMoney(input.totalUsd),
    currency: input.paymentMethod.toUpperCase(),
  };
}
