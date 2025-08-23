// contexts/ProgressContext.tsx - Updated with database integration
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { progressService, StopProgress } from '../services/ProgressService';

interface ProgressContextType {
  completedStops: StopProgress[];
  totalVisitedPlaces: number;
  isLoading: boolean;
  markStopCompleted: (tourId: string, stopId: string) => Promise<void>;
  isStopCompleted: (tourId: string, stopId: string) => boolean;
  getCompletedStopsForTour: (tourId: string) => StopProgress[];
  refreshProgress: () => Promise<void>;
  clearAllProgress: () => Promise<void>;
  syncProgress: () => Promise<void>;
  testDatabaseConnection: () => Promise<boolean>;
  forceResetAllProgress: () => Promise<void>; // Add this
  debugShowStoredData: () => Promise<void>; // Add this
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [completedStops, setCompletedStops] = useState<StopProgress[]>([]);
  const [totalVisitedPlaces, setTotalVisitedPlaces] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Load progress when user signs in or component mounts
  useEffect(() => {
    if (user) {
      initializeProgress();
    } else {
      // Clear progress when user signs out
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
    }
  }, [user]);

  // Initialize progress for logged in user
  const initializeProgress = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Sync progress from server and local storage
      await progressService.syncProgressOnLogin(user.id);
      
      // Load all completed stops
      await loadProgress();
    } catch (error) {
      console.error('❌ Error initializing progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load progress from service
  const loadProgress = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const stops = await progressService.getCompletedStops(user.id);
      const totalCount = await progressService.getTotalCompletedCount(user.id);
      
      setCompletedStops(stops);
      setTotalVisitedPlaces(totalCount);

      console.log(`📊 Loaded ${stops.length} completed stops, total unique: ${totalCount}`);
    } catch (error) {
      console.error('❌ Error loading progress:', error);
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Mark stop as completed
  const markStopCompleted = useCallback(async (tourId: string, stopId: string) => {
    if (!user) {
      console.warn('⚠️ Cannot mark stop completed: user not authenticated');
      return;
    }

    try {
      // Check if already completed to avoid unnecessary operations
      const alreadyCompleted = await progressService.isStopCompleted(user.id, stopId);
      if (alreadyCompleted) {
        console.log(`✅ Stop ${stopId} already completed`);
        return;
      }

      // Mark as completed in database/local storage
      await progressService.markStopCompleted(user.id, stopId, tourId);

      // Update local state
      const newProgress: StopProgress = {
        stopId,
        tourId,
        completedAt: new Date().toISOString(),
        isCompleted: true
      };

      setCompletedStops(prev => {
        // Check if already in state (avoid duplicates)
        const exists = prev.some(stop => 
          stop.tourId === tourId && stop.stopId === stopId
        );
        
        if (exists) {
          return prev;
        }
        
        return [...prev, newProgress];
      });

      setTotalVisitedPlaces(prev => prev + 1);

      console.log(`🎉 Stop ${stopId} in tour ${tourId} marked as completed`);
    } catch (error) {
      console.error('❌ Error marking stop completed:', error);
    }
  }, [user]);

  // Check if stop is completed
  const isStopCompleted = useCallback((tourId: string, stopId: string): boolean => {
    return completedStops.some(stop => 
      stop.tourId === tourId && stop.stopId === stopId && stop.isCompleted
    );
  }, [completedStops]);

  // Get completed stops for specific tour
  const getCompletedStopsForTour = useCallback((tourId: string): StopProgress[] => {
    return completedStops.filter(stop => stop.tourId === tourId);
  }, [completedStops]);

  // Refresh progress from server
  const refreshProgress = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Process any offline queue first
      await progressService.processOfflineQueue();
      
      // Reload from server
      await loadProgress();
    } catch (error) {
      console.error('❌ Error refreshing progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadProgress]);

  // Clear all progress
  const clearAllProgress = useCallback(async () => {
    try {
      await progressService.clearAllProgress();
      
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
      
      console.log('✅ All progress cleared');
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
    }
  }, []);

  // Sync progress (for manual sync button)
  const syncProgress = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      await progressService.syncProgressOnLogin(user.id);
      await loadProgress();
      console.log('✅ Progress synced successfully');
    } catch (error) {
      console.error('❌ Error syncing progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadProgress]);

  // ADDED: Debug function to test database connectivity
  const testDatabaseConnection = useCallback(async () => {
    if (!user) {
      console.log('⚠️ No user logged in for database test');
      return false;
    }

    try {
      // Test table structure
      const tableExists = await progressService.verifyDatabaseTable();
      if (!tableExists) {
        console.error('❌ Database table verification failed');
        return false;
      }

      // Test insertion
      await progressService.testDatabaseInsertion(user.id);
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }, [user]);

  // ADDED: Force reset all progress (for testing)
  const forceResetAllProgress = useCallback(async () => {
    try {
      await progressService.forceResetAllProgress();
      
      // Reset local state
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
      
      console.log('🎉 All progress reset completed');
    } catch (error) {
      console.error('❌ Error resetting progress:', error);
    }
  }, []);

  // ADDED: Debug function
  const debugShowStoredData = useCallback(async () => {
    await progressService.debugShowAllStoredData();
  }, []);

  const value: ProgressContextType = {
    completedStops,
    totalVisitedPlaces,
    isLoading,
    markStopCompleted,
    isStopCompleted,
    getCompletedStopsForTour,
    refreshProgress,
    clearAllProgress,
    syncProgress,
    testDatabaseConnection,
    forceResetAllProgress, // Add this
    debugShowStoredData, // Add this
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}