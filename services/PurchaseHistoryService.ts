import { supabase } from '../lib/supabase';

export interface PurchaseHistoryItem {
  id: string;
  tour_id: string;
  tour_title: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at: string | null;
  payment_intent_id: string | null;
  metadata: any;
}

class PurchaseHistoryService {
  private static instance: PurchaseHistoryService;

  static getInstance(): PurchaseHistoryService {
    if (!PurchaseHistoryService.instance) {
      PurchaseHistoryService.instance = new PurchaseHistoryService();
    }
    return PurchaseHistoryService.instance;
  }

  async getUserPurchaseHistory(userId: string): Promise<PurchaseHistoryItem[]> {
    try {
      console.log('📊 Fetching purchase history for user:', userId);
      
      // First get the purchase data
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('user_purchases')
        .select(`
          id,
          tour_id,
          amount,
          currency,
          status,
          created_at,
          completed_at,
          payment_intent_id,
          metadata
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (purchaseError) {
        console.error('❌ Error fetching purchase history:', purchaseError);
        throw purchaseError;
      }

      if (!purchaseData || purchaseData.length === 0) {
        console.log('📊 No purchase history found for user');
        return [];
      }

      // Get unique tour IDs
      const tourIds = [...new Set(purchaseData.map(item => item.tour_id))];
      
      // Fetch tour titles separately
      const { data: tourData, error: tourError } = await supabase
        .from('tours')
        .select('id, title')
        .in('id', tourIds);

      if (tourError) {
        console.warn('⚠️ Error fetching tour titles:', tourError);
        // Continue without tour titles
      }

      // Create a map of tour titles
      const tourTitleMap: Record<string, string> = {};
      if (tourData) {
        tourData.forEach(tour => {
          tourTitleMap[tour.id] = tour.title;
        });
      }

      // Transform the data to include tour title
      const transformedData: PurchaseHistoryItem[] = purchaseData.map(item => ({
        id: item.id,
        tour_id: item.tour_id,
        tour_title: tourTitleMap[item.tour_id] || 'Unknown Tour',
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        created_at: item.created_at,
        completed_at: item.completed_at,
        payment_intent_id: item.payment_intent_id,
        metadata: item.metadata || {},
      }));

      console.log('✅ Fetched purchase history:', transformedData.length, 'purchases');
      return transformedData;
    } catch (error) {
      console.error('❌ Error in getUserPurchaseHistory:', error);
      throw error;
    }
  }

  async getPurchaseById(userId: string, purchaseId: string): Promise<PurchaseHistoryItem | null> {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          id,
          tour_id,
          amount,
          currency,
          status,
          created_at,
          completed_at,
          payment_intent_id,
          metadata
        `)
        .eq('user_id', userId)
        .eq('id', purchaseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No data found
        }
        console.error('❌ Error fetching purchase:', error);
        throw error;
      }

      // Fetch tour title separately
      const { data: tourData } = await supabase
        .from('tours')
        .select('title')
        .eq('id', data.tour_id)
        .single();

      return {
        id: data.id,
        tour_id: data.tour_id,
        tour_title: tourData?.title || 'Unknown Tour',
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        created_at: data.created_at,
        completed_at: data.completed_at,
        payment_intent_id: data.payment_intent_id,
        metadata: data.metadata || {},
      };
    } catch (error) {
      console.error('❌ Error in getPurchaseById:', error);
      throw error;
    }
  }

  async getPurchasesByTour(userId: string, tourId: string): Promise<PurchaseHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select(`
          id,
          tour_id,
          amount,
          currency,
          status,
          created_at,
          completed_at,
          payment_intent_id,
          metadata
        `)
        .eq('user_id', userId)
        .eq('tour_id', tourId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching tour purchases:', error);
        throw error;
      }

      // Fetch tour title separately
      const { data: tourData } = await supabase
        .from('tours')
        .select('title')
        .eq('id', tourId)
        .single();

      const tourTitle = tourData?.title || 'Unknown Tour';

      return (data || []).map(item => ({
        id: item.id,
        tour_id: item.tour_id,
        tour_title: tourTitle,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        created_at: item.created_at,
        completed_at: item.completed_at,
        payment_intent_id: item.payment_intent_id,
        metadata: item.metadata || {},
      }));
    } catch (error) {
      console.error('❌ Error in getPurchasesByTour:', error);
      throw error;
    }
  }

  formatAmount(amount: number, currency: string = 'usd'): string {
    // Convert cents to dollars
    const dollarAmount = amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(dollarAmount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#757575';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Processing';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  }
}

export default PurchaseHistoryService;