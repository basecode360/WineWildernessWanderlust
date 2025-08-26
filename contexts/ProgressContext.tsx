// contexts/ProgressContext.tsx - Fixed Data Insertion Issue
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { progressService, StopProgress } from '../services/ProgressService';
import { useAuth } from './AuthContext';
import { useOffline } from './OfflineContext';

interface ProgressContextType {
  completedStops: StopProgress[];
  totalVisitedPlaces: number;
  isLoading: boolean;
  completedCount: number;
  markStopCompleted: (stopId: string, tourId?: string) => Promise<void>; // FIXED: Simplified signature
  isStopCompleted: (tourId: string, stopId: string) => boolean;
  getCompletedStopsForTour: (tourId: string) => StopProgress[];
  getTotalCompletedCount: (userId: string) => Promise<number>;
  refreshProgress: () => Promise<void>;
  clearAllProgress: () => Promise<void>;
  syncProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [completedStops, setCompletedStops] = useState<StopProgress[]>([]);
  const [totalVisitedPlaces, setTotalVisitedPlaces] = useState(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { isOnline } = useOffline();

  // Load progress when user signs in or component mounts
  useEffect(() => {
    if (user) {
      console.log(`ProgressContext: User logged in, initializing progress for ${user.id}`);
      initializeProgress();
    } else {
      console.log('ProgressContext: No user, clearing progress state');
      // Clear progress when user signs out
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
      setCompletedCount(0);
    }
  }, [user]);

  // Initialize progress for logged in user
  const initializeProgress = async () => {
    if (!user) {
      console.warn('Cannot initialize progress: no user');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Initializing progress for user: ${user.id}`);
      
      // Sync progress from server and local storage
      await progressService.syncProgressOnLogin(user.id);
      
      // Load all completed stops
      await loadProgress();
      
      // Load completed count
      await refreshCompletedCount();
      
      console.log('Progress initialization completed');
    } catch (error) {
      console.error('Error initializing progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load progress function
  const loadProgress = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const stops = await progressService.getCompletedStops(user.id, isOnline);

      // Count only this user's completions
      const totalCount = stops.length;

      setCompletedStops(stops);
      setTotalVisitedPlaces(totalCount);

      console.log(`Loaded ${stops.length} completed stops for user ${user.id}`);
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isOnline]);

  // Refresh completed count
  const refreshCompletedCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await progressService.getTotalCompletedCount(user.id);
      setCompletedCount(count);
      console.log('Updated completed count:', count);
    } catch (error) {
      console.error('Error refreshing completed count:', error);
    }
  }, [user]);

  // Check if stop is completed (works offline)
  const isStopCompleted = useCallback((tourId: string, stopId: string): boolean => {
    const isCompleted = completedStops.some(stop => 
      stop.stopId === stopId && 
      stop.isCompleted &&
      // Only check tourId if it exists in the data
      (stop.tourId ? stop.tourId === tourId : true)
    );
    
    console.log(`Checking completion for stop ${stopId} in tour ${tourId}: ${isCompleted}`);
    return isCompleted;
  }, [completedStops]);

  // FIXED: Mark stop as completed with correct parameter order
  const markStopCompleted = useCallback(async (stopId: string, tourId?: string) => {
    if (!user) {
      console.warn('Cannot mark stop completed: user not authenticated');
      return;
    }

    // FIXED: Check completion with correct parameter order
    if (isStopCompleted(tourId || '', stopId)) {
      console.log(`Stop ${stopId} in tour ${tourId} is already completed`);
      return;
    }

    try {
      console.log(`ProgressContext: Marking stop ${stopId} as completed for user ${user.id}`);
      
      // Call service with correct parameter order (userId, stopId, tourId, isOnline)
      await progressService.markStopCompleted(user.id, stopId, tourId, isOnline);
      
      // Optimistically update local state
      const newCompletion: StopProgress = {
        id: `temp-${Date.now()}`, // Temporary ID until synced
        userId: user.id,
        stopId,
        tourId: tourId || '',
        isCompleted: true,
        completedAt: new Date(),
      };
      
      setCompletedStops(prev => [...prev, newCompletion]);
      setTotalVisitedPlaces(prev => prev + 1);
      setCompletedCount(prev => prev + 1);
      
      // Refresh from service to ensure consistency
      setTimeout(async () => {
        await refreshCompletedCount();
        await loadProgress();
      }, 1000);
      
      console.log(`ProgressContext: Stop ${stopId} marked as completed successfully`);
      
    } catch (error) {
      console.error('ProgressContext: Error marking stop completed:', error);
      // Reload progress to ensure consistency
      await loadProgress();
      await refreshCompletedCount();
    }
  }, [user, isStopCompleted, isOnline, loadProgress, refreshCompletedCount]);

  // Get completed stops for specific tour (works offline)
  const getCompletedStopsForTour = useCallback((tourId: string): StopProgress[] => {
    const tourCompletions = completedStops.filter(stop => 
      stop.tourId === tourId || (!stop.tourId && tourId) // Handle cases where tourId might be missing
    );
    console.log(`Tour ${tourId} has ${tourCompletions.length} completed stops`);
    return tourCompletions;
  }, [completedStops]);

  // Refresh progress with better error handling
  const refreshProgress = useCallback(async () => {
    if (!user) {
      console.warn('Cannot refresh progress: no user');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Refreshing progress for user: ${user.id}`);
      
      // Use service refresh method
      await progressService.refreshProgress(user.id);
      
      // Reload local state
      await loadProgress();
      await refreshCompletedCount();
      
      console.log('Progress refresh completed');
    } catch (error) {
      console.error('Error refreshing progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadProgress, refreshCompletedCount]);

  // Clear all progress for current user
  const clearAllProgress = useCallback(async () => {
    if (!user) {
      console.warn('Cannot clear progress: no user');
      return;
    }

    try {
      console.log(`Clearing all progress for user: ${user.id}`);
      
      await progressService.clearAllProgress(user.id);
      
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
      setCompletedCount(0);
      
      console.log('All progress cleared successfully');
    } catch (error) {
      console.error('Error clearing progress:', error);
    }
  }, [user]);

  // Sync progress (for manual sync button)
  const syncProgress = useCallback(async () => {
    if (!user) {
      console.warn('Cannot sync progress: no user');
      return;
    }
    
    if (!isOnline) {
      console.log('Cannot sync progress: offline');
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Syncing progress for user: ${user.id}`);
      
      await progressService.syncProgressOnLogin(user.id);
      await loadProgress();
      await refreshCompletedCount();
      
      console.log('Progress synced successfully');
    } catch (error) {
      console.error('Error syncing progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, loadProgress, refreshCompletedCount, isOnline]);

  // Get total completed count wrapper
  const getTotalCompletedCount = useCallback(async (userId: string) => {
    if (!user) {
      console.warn("Cannot get total count: no user");
      return 0;
    }
    try {
      const count = await progressService.getTotalCompletedCount(userId);
      setCompletedCount(count);
      return count;
    } catch (err) {
      console.error("Error refreshing completed count:", err);
      return 0;
    }
  }, [user]);

  const value: ProgressContextType = {
    completedStops,
    totalVisitedPlaces,
    isLoading,
    completedCount,
    markStopCompleted,
    isStopCompleted,
    getCompletedStopsForTour,
    getTotalCompletedCount,
    refreshProgress,
    clearAllProgress,
    syncProgress,
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