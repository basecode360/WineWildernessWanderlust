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
      loadUserPurchases();
    } else {
      // Clear purchases when user signs out
      setPurchasedTours([]);
      setPurchaseHistory([]);
    }
  }, [user]);

  const loadUserPurchases = async () => {
    if (!user) {
      return;
    }

    setIsLoadingPurchases(true);

    try {
      // Load both purchased tour IDs and full purchase history
      const [tourIds, history] = await Promise.all([
        paymentService.getUserPurchases(),
        paymentService.getPurchaseHistory(),
      ]);


      setPurchasedTours(tourIds);
      setPurchaseHistory(history);
    } catch (error) {
      // Don't throw error, just log it and continue with empty state
      setPurchasedTours([]);
      setPurchaseHistory([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const hasPurchased = (tourId: string): boolean => {
    const purchased = purchasedTours.includes(tourId);
    return purchased;
  };

  const addPurchase = (tourId: string) => {
    setPurchasedTours((prev) => {
      if (!prev.includes(tourId)) {
        return [...prev, tourId];
      }
      return prev;
    });
  };

  const refreshPurchases = async () => {
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
