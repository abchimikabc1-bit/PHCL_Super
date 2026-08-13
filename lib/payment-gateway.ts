export type CheckoutPaymentMethod = 'usd' | 'tzs' | 'ntzs' | 'pi';

export interface PaymentSession {
  provider: 'stripe' | 'mobile-money' | 'pi-wallet' | 'manual';
  status: 'requires_payment' | 'pending';
  paymentTransactionId: string;
  paymentUrl?: string;
  clientSecret?: string;
  instructions: string;
  amountDue: number;
  currency: string;
}

const roundMoney = (value: number): number => Number(value.toFixed(2));

export async function createPaymentSession(input: {
  orderId: string;
  paymentMethod: CheckoutPaymentMethod;
  totalUsd: number;
  phoneNumber?: string;
  mobileNetwork?: string | null;
  piUsdRate?: number;
}): Promise<PaymentSession> {
  if (input.paymentMethod === 'usd') {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (secretKey) {
      const params = new URLSearchParams({
        amount: String(Math.max(1, Math.round(input.totalUsd * 100))),
        currency: 'usd',
        description: `PHCL Super order ${input.orderId}`,
        'metadata[orderId]': input.orderId,
      });

      const response = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const payload = (await response.json().catch(() => null)) as
        | { id?: string; client_secret?: string; error?: { message?: string } }
        | null;

      if (!response.ok || !payload?.id) {
        throw new Error(payload?.error?.message || `Stripe returned ${response.status}`);
      }

      return {
        provider: 'stripe',
        status: 'requires_payment',
        paymentTransactionId: payload.id,
        clientSecret: payload.client_secret,
        instructions: 'Complete card payment using the generated Stripe payment reference.',
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
