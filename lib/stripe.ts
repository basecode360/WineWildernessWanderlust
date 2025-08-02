import { StripeProvider } from '@stripe/stripe-react-native';

// Your Stripe publishable key (safe to expose in client-side code)
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_your_publishable_key_here';

// Stripe configuration
export const stripeConfig = {
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  merchantId: 'acct_1R2dXDJRVJxx6tCf', // Replace with your merchant ID
  urlScheme: 'wine-wilderness-wanderlust', // Replace with your app's URL scheme
};


if (
  !STRIPE_PUBLISHABLE_KEY ||
  STRIPE_PUBLISHABLE_KEY.includes('your_publishable_key')
) {
  console.warn(
    '⚠️  Please set your EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in your .env file'
  );
}
// types/payment.ts - Payment related types
export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PurchaseItem {
  tourId: string;
  tourTitle: string;
  price: number;
  type: 'tour' | 'subscription';
}

export interface PaymentResponse {
  success: boolean;
  paymentIntent?: PaymentIntent;
  error?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
}
