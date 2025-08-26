// services/PaymentService.ts - Updated with proper cache management
import { supabase } from '../lib/supabase';
import { PaymentResponse } from '../types/payment';

export class PaymentService {
  private static instance: PaymentService;
  private baseUrl: string;
  private purchaseCache: Map<string, { purchases: string[], timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {
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
   * Clear cache for a specific user or all users
   */
  clearCache(userId?: string) {
    if (userId) {
      console.log('PaymentService: Clearing cache for user:', userId);
      this.purchaseCache.delete(userId);
    } else {
      console.log('PaymentService: Clearing all cache');
      this.purchaseCache.clear();
    }
  }

  /**
   * Get cached purchases if available and not expired
   */
  private getCachedPurchases(userId: string): string[] | null {
    const cached = this.purchaseCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log('PaymentService: Using cached purchases for user:', userId, cached.purchases);
      return cached.purchases;
    }
    
    // Remove expired cache
    if (cached) {
      console.log('PaymentService: Cache expired for user:', userId);
      this.purchaseCache.delete(userId);
    }
    
    return null;
  }

  /**
   * Cache purchases for a user
   */
  private setCachedPurchases(userId: string, purchases: string[]) {
    console.log('PaymentService: Caching purchases for user:', userId, purchases);
    this.purchaseCache.set(userId, {
      purchases,
      timestamp: Date.now()
    });
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

      // Clear cache for current user since they made a new purchase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.clearCache(user.id);
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
   * Get user's purchased tours with improved user isolation
   */
  async getUserPurchases(forceRefresh: boolean = false): Promise<string[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.log('PaymentService: No authenticated user');
        return [];
      }

      console.log('PaymentService: Getting purchases for user:', user.id, 'forceRefresh:', forceRefresh);

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = this.getCachedPurchases(user.id);
        if (cached !== null) {
          return cached;
        }
      }

      console.log('PaymentService: Fetching fresh purchases from database');

      // First, let's get all purchases for debugging
      const { data: allData, error: allError } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id);

      if (allError) {
        console.error('PaymentService: Error fetching all purchases for debug:', allError);
      } else {
        console.log('PaymentService: All purchases for user:', {
          userId: user.id,
          totalCount: allData?.length || 0,
          purchases: allData?.map(p => ({
            tour_id: p.tour_id,
            status: p.status,
            created_at: p.created_at,
            completed_at: p.completed_at
          }))
        });
      }

      // Now get only completed purchases
      const { data, error } = await supabase
        .from('user_purchases')
        .select('tour_id, status, created_at, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('PaymentService: Database error fetching completed purchases:', error);
        
        // Return cached data if available on error
        const cached = this.getCachedPurchases(user.id);
        if (cached !== null) {
          console.log('PaymentService: Using cached data due to error');
          return cached;
        }
        
        return [];
      }

      const purchases = data?.map((purchase) => purchase.tour_id) || [];
      
      console.log('PaymentService: Fetched completed purchases from DB:', {
        userId: user.id,
        completedPurchases: purchases,
        completedCount: purchases.length,
        rawData: data
      });

      // Cache the fresh results
      this.setCachedPurchases(user.id, purchases);

      return purchases;
    } catch (error) {
      console.error('PaymentService: Error getting user purchases:', error);
      return [];
    }
  }

  /**
   * Check if user has purchased a specific tour
   */
  async hasPurchasedTour(tourId: string): Promise<boolean> {
    try {
      const purchases = await this.getUserPurchases();
      const result = purchases.includes(tourId);
      
      console.log('PaymentService: hasPurchasedTour check:', {
        tourId,
        result,
        allPurchases: purchases
      });
      
      return result;
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
        console.log('PaymentService: No user for purchase history');
        return [];
      }

      console.log('PaymentService: Fetching purchase history for user:', user.id);

      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          id,
          user_id,
          tour_id,
          status,
          amount,
          currency,
          created_at,
          completed_at,
          payment_intent_id,
          metadata
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('PaymentService: Error fetching purchase history:', error);
        return [];
      }

      console.log('PaymentService: Purchase history loaded:', {
        userId: user.id,
        recordCount: data?.length || 0,
        records: data?.map(record => ({
          tour_id: record.tour_id,
          status: record.status,
          amount: record.amount,
          created_at: record.created_at,
          completed_at: record.completed_at
        }))
      });
      
      return data || [];
    } catch (error) {
      console.error('PaymentService: Error getting purchase history:', error);
      return [];
    }
  }

  /**
   * Debug method to check database connectivity and user purchases
   */
  async debugUserPurchases(): Promise<{
    user: any;
    allPurchases: any[];
    completedPurchases: any[];
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        return {
          user: null,
          allPurchases: [],
          completedPurchases: [],
          error: `User error: ${userError.message}`
        };
      }

      if (!user) {
        return {
          user: null,
          allPurchases: [],
          completedPurchases: [],
          error: 'No authenticated user'
        };
      }

      // Get all purchases for this user
      const { data: allPurchases, error: allError } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id);

      // Get only completed purchases
      const { data: completedPurchases, error: completedError } = await supabase
        .from('user_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      return {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        },
        allPurchases: allPurchases || [],
        completedPurchases: completedPurchases || [],
        error: allError?.message || completedError?.message
      };
      
    } catch (error:any) {
      return {
        user: null,
        allPurchases: [],
        completedPurchases: [],
        error: error.message
      };
    }
  }
}