

import { Platform } from 'react-native';

import { paymentApi } from '@/api/services';
import type { RazorpayOrderResponse, User } from '@/types';

export type PayOutcome =
  | { status: 'success' | 'pending'; orderId: number }
  | {
      status: 'failed' | 'cancelled' | 'unavailable';
      orderId: number;
      reason: string;
    };

type CheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

function getNativeCheckout() {
  try {
    const mod = require('react-native-razorpay');
    return mod?.default?.open ? mod.default : null;
  } catch {
    return null;
  }
}

function loadWebCheckout(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser environment unavailable.'));
      return;
    }

    if ((window as any).Razorpay) {
      resolve((window as any).Razorpay);
      return;
    }

    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () =>
        resolve((window as any).Razorpay)
      );
      existing.addEventListener('error', () =>
        reject(new Error('Could not load Razorpay Checkout.'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      const Razorpay = (window as any).Razorpay;

      if (Razorpay) {
        resolve(Razorpay);
      } else {
        reject(new Error('Razorpay Checkout unavailable.'));
      }
    };

    script.onerror = () =>
      reject(new Error('Could not load Razorpay Checkout.'));

    document.body.appendChild(script);
  });
}

async function openWebCheckout(
  options: Record<string, any>
): Promise<CheckoutResult> {
  const Razorpay = await loadWebCheckout();

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (
      callback: (value: any) => void,
      value: any
    ) => {
      if (settled) return;
      settled = true;
      callback(value);
    };

    const checkout = new Razorpay({
      ...options,

      handler: (response: CheckoutResult) => {
        finish(resolve, response);
      },

      modal: {
        ondismiss: () => {
          const error: any = new Error('Payment cancelled');
          error.code = 0;
          finish(reject, error);
        },
      },
    });

    checkout.on('payment.failed', (response: any) => {
      finish(
        reject,
        response?.error ?? new Error('Payment failed.')
      );
    });

    try {
      checkout.open();
    } catch (error) {
      finish(reject, error);
    }
  });
}

export async function payOnline(
  orderId: number,
  user: User
): Promise<PayOutcome> {

  // Check native SDK before creating a payment order.
  const nativeCheckout =
    Platform.OS === 'web' ? null : getNativeCheckout();

  if (Platform.OS !== 'web' && !nativeCheckout) {
    return {
      status: 'unavailable',
      orderId,
      reason: 'Online payment needs the Android development build. Please use Cash on Delivery.',
    };
  }

  let p: RazorpayOrderResponse;

  try {
    p = await paymentApi.createOrder(orderId);
  } catch (e) {
    return {
      status: 'failed',
      orderId,
      reason:
        e instanceof Error
          ? e.message
          : 'Could not create payment order.',
    };
  }

  const options: Record<string, any> = {
    key: p.key_id,
    order_id: p.razorpay_order_id,
    amount: p.amount,
    currency: p.currency,
    name: p.name,
    description: p.description,
    prefill: {
      name: p.prefill.name || user.first_name,
      email: p.prefill.email,
      contact: p.prefill.contact,
    },
    theme: { color: '#4F46E5' },
  };

  let result: CheckoutResult;

  try {
    if (Platform.OS === 'web') {
      result = await openWebCheckout(options);
    } else {
      result = await nativeCheckout!.open(options);
    }
  } catch (e: any) {
    const description =
      e?.description ??
      e?.error?.description ??
      e?.message ??
      '';

    const cancelled =
      e?.code === 0 || /cancel/i.test(description);

    await paymentApi
      .report(
        p.razorpay_order_id,
        cancelled ? 'cancelled' : 'failed',
        description
      )
      .catch(() => {});

    return {
      status: cancelled ? 'cancelled' : 'failed',
      orderId,
      reason:
        description ||
        (cancelled ? 'Payment cancelled' : 'Payment failed'),
    };
  }

  try {
    const verified = await paymentApi.verify(result);

    if (
      verified.status === 'success' ||
      verified.status === 'pending'
    ) {
      return {
        status: verified.status,
        orderId,
      };
    }

    return {
      status: 'failed',
      orderId,
      reason: 'The bank declined the payment.',
    };
  } catch {
    // Server/webhook may confirm the payment later.
    return {
      status: 'pending',
      orderId,
    };
  }
}
