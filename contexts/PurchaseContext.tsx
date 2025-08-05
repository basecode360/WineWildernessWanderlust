// contexts/PurchaseContext.tsx - Global purchase state management
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { PaymentService } from '../services/PaymentService';
import { useAuth } from './AuthContext';

interface PurchaseContextType {
  purchasedTours: string[];
  isLoadingPurchases: boolean;
  hasPurchased: (tourId: string) => boolean;
  addPurchase: (tourId: string) => void;
  refreshPurchases: () => Promise<void>;
  purchaseHistory: any[];
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(
  undefined
);

interface PurchaseProviderProps {
  children: ReactNode;
}

export function PurchaseProvider({ children }: PurchaseProviderProps) {
  const [purchasedTours, setPurchasedTours] = useState<string[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  const { user } = useAuth();
  const paymentService = PaymentService.getInstance();

  // Load purchases when user signs in
  useEffect(() => {
    if (user) {
      console.log('👤 User signed in, loading purchases...');
      loadUserPurchases();
    } else {
      console.log('👤 User signed out, clearing purchases...');
      // Clear purchases when user signs out
      setPurchasedTours([]);
      setPurchaseHistory([]);
    }
  }, [user]);

  const loadUserPurchases = async () => {
    if (!user) {
      console.log('❌ No user, skipping purchase load');
      return;
    }

    setIsLoadingPurchases(true);
    console.log('🔄 Loading user purchases...');

    try {
      // Load both purchased tour IDs and full purchase history
      const [tourIds, history] = await Promise.all([
        paymentService.getUserPurchases(),
        paymentService.getPurchaseHistory(),
      ]);

      console.log('✅ Purchases loaded:', tourIds);
      console.log('📜 Purchase history loaded:', history.length, 'items');

      setPurchasedTours(tourIds);
      setPurchaseHistory(history);
    } catch (error) {
      console.error('❌ Error loading purchases:', error);
      // Don't throw error, just log it and continue with empty state
      setPurchasedTours([]);
      setPurchaseHistory([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const hasPurchased = (tourId: string): boolean => {
    const purchased = purchasedTours.includes(tourId);
    console.log(`🔍 Checking if tour ${tourId} is purchased:`, purchased);
    return purchased;
  };

  const addPurchase = (tourId: string) => {
    console.log('➕ Adding purchase to cache:', tourId);
    setPurchasedTours((prev) => {
      if (!prev.includes(tourId)) {
        return [...prev, tourId];
      }
      return prev;
    });
  };

  const refreshPurchases = async () => {
    console.log('🔄 Manually refreshing purchases...');
    await loadUserPurchases();
  };

  const value: PurchaseContextType = {
    purchasedTours,
    isLoadingPurchases,
    hasPurchased,
    addPurchase,
    refreshPurchases,
    purchaseHistory,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}
