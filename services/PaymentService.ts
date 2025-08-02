// services/PaymentService.ts - Complete payment service with Stripe integration
import { supabase } from '../lib/supabase';
import { PaymentResponse } from '../types/payment';

export class PaymentService {
  private static instance: PaymentService;
  private baseUrl: string;

  private constructor() {
    // Use your Supabase Edge Function URL
    this.baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`
      : 'https://your-project.supabase.co/functions/v1';
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Create a payment intent for a tour purchase
   */
  async createPaymentIntent(
    tourId: string,
    amount: number,
    currency: string = 'usd'
  ): Promise<PaymentResponse> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tour_id: tourId,
          amount: Math.round(amount * 100), // Convert to cents
          currency,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();

      return {
        success: true,
        paymentIntent: data.payment_intent,
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message || 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm a successful payment and record purchase
   */
  async confirmPayment(
    paymentIntentId: string,
    tourId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${this.baseUrl}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntentId,
          tour_id: tourId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm payment');
      }

      return { success: true };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to confirm payment',
      };
    }
  }

  /**
   * Get user's purchased tours
   */
  async getUserPurchases(): Promise<string[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_purchases')
        .select('tour_id')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (error) {
        console.error('Error fetching purchases:', error);
        return [];
      }

      return data?.map((purchase) => purchase.tour_id) || [];
    } catch (error) {
      console.error('Error getting user purchases:', error);
      return [];
    }
  }

  /**
   * Check if user has purchased a specific tour
   */
  async hasPurchasedTour(tourId: string): Promise<boolean> {
    try {
      const purchases = await this.getUserPurchases();
      return purchases.includes(tourId);
    } catch (error) {
      console.error('Error checking tour purchase:', error);
      return false;
    }
  }

  /**
   * Get purchase history with details
   */
  async getPurchaseHistory(): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_purchases')
        .select(
          `
          *,
          created_at,
          amount,
          currency,
          tour_id
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting purchase history:', error);
      return [];
    }
  }
}
