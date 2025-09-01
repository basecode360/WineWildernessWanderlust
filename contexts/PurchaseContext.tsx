// contexts/PurchaseContext.tsx - Fixed Global purchase state management
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { PaymentService } from '../services/PaymentService';
import PurchaseHistoryService, { PurchaseHistoryItem } from '../services/PurchaseHistoryService';
import { useAuth } from './AuthContext';

interface PurchaseContextType {
  purchasedTours: string[];
  isLoadingPurchases: boolean;
  hasPurchased: (tourId: string) => boolean;
  addPurchase: (tourId: string) => void;
  refreshPurchases: () => Promise<void>;
  purchaseHistory: PurchaseHistoryItem[];
  clearAllData: () => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(
  undefined
);

interface PurchaseProviderProps {
  children: ReactNode;
}

export function PurchaseProvider({ children }: PurchaseProviderProps) {
  const [purchasedTours, setPurchasedTours] = useState<string[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistoryItem[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);
  
  // Track the current user ID to detect user changes
  const currentUserIdRef = useRef<string | null>(null);
  const { user } = useAuth();
  const paymentService = PaymentService.getInstance();
  const purchaseHistoryService = PurchaseHistoryService.getInstance();

  // Handle user changes and logout
  useEffect(() => {
    const userId = user?.id || null;
    const previousUserId = currentUserIdRef.current;

    console.log('PurchaseContext: User change detected', {
      previousUserId,
      currentUserId: userId,
      userEmail: user?.email
    });

    // Case 1: User logged out
    if (!user || !userId) {
      console.log('PurchaseContext: User logged out, clearing purchases');
      setPurchasedTours([]);
      setPurchaseHistory([]);
      setIsLoadingPurchases(false);
      currentUserIdRef.current = null;
      
      // Clear PaymentService cache when user logs out
      paymentService.clearCache();
      return;
    }

    // Case 2: User changed (different user logged in)
    if (previousUserId && previousUserId !== userId) {
      console.log('PurchaseContext: Different user detected, clearing old data');
      setPurchasedTours([]);
      setPurchaseHistory([]);
      setIsLoadingPurchases(false);
      
      // Force clear any cached data in PaymentService
      paymentService.clearCache();
    }

    // Case 3: New user logged in or user changed
    if (userId !== previousUserId) {
      currentUserIdRef.current = userId;
      console.log('PurchaseContext: Loading purchases for user:', userId);
      
      // Small delay to ensure state is cleared before loading new data
      setTimeout(() => {
        loadUserPurchases();
      }, 100);
    }

  }, [user?.id]); // Only depend on user.id to detect actual user changes

  const loadUserPurchases = async () => {
    if (!user?.id) {
      console.log('PurchaseContext: No user, skipping purchase load');
      return;
    }

    console.log('PurchaseContext: Loading purchases for user:', user.id);
    setIsLoadingPurchases(true);

    try {
      // Load both purchased tour IDs and full purchase history
      const [tourIds, history] = await Promise.all([
        paymentService.getUserPurchases(true), // Force fresh data
        purchaseHistoryService.getUserPurchaseHistory(user.id),
      ]);

      console.log('PurchaseContext: Loaded purchases:', {
        userId: user.id,
        tourIds,
        historyCount: history.length
      });

      setPurchasedTours(tourIds);
      setPurchaseHistory(history);
    } catch (error) {
      console.error('PurchaseContext: Error loading purchases:', error);
      // Don't throw error, just log it and continue with empty state
      setPurchasedTours([]);
      setPurchaseHistory([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const hasPurchased = (tourId: string): boolean => {
    // Safety check - if no user is logged in, return false immediately
    if (!user?.id) {
      console.log(`PurchaseContext: No user logged in, returning false for tour ${tourId}`);
      return false;
    }

    // Safety check - if current user doesn't match the stored user, clear data first
    if (currentUserIdRef.current && currentUserIdRef.current !== user.id) {
      console.log('PurchaseContext: User mismatch detected in hasPurchased, clearing data');
      setPurchasedTours([]);
      setPurchaseHistory([]);
      currentUserIdRef.current = user.id;
      return false;
    }

    const purchased = purchasedTours.includes(tourId);
    
    // Add debug logging
    console.log(`PurchaseContext: hasPurchased(${tourId}) = ${purchased}`, {
      userId: user.id,
      currentUserIdRef: currentUserIdRef.current,
      purchasedTours,
      tourId
    });
    
    return purchased;
  };

  const addPurchase = (tourId: string) => {
    console.log('PurchaseContext: Adding purchase for tour:', tourId);
    setPurchasedTours((prev) => {
      if (!prev.includes(tourId)) {
        const newPurchases = [...prev, tourId];
        console.log('PurchaseContext: Updated purchases:', newPurchases);
        return newPurchases;
      }
      return prev;
    });
  };

  const refreshPurchases = async () => {
    console.log('PurchaseContext: Manual refresh requested');
    
    // Clear PaymentService cache first
    paymentService.clearCache();
    
    await loadUserPurchases();
  };

  const clearAllData = () => {
    console.log('PurchaseContext: Manually clearing all purchase data');
    setPurchasedTours([]);
    setPurchaseHistory([]);
    setIsLoadingPurchases(false);
    currentUserIdRef.current = null;
    paymentService.clearCache();
  };

  const value: PurchaseContextType = {
    purchasedTours,
    isLoadingPurchases,
    hasPurchased,
    addPurchase,
    refreshPurchases,
    purchaseHistory,
    clearAllData,
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