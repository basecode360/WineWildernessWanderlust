// contexts/ProgressContext.tsx - Track audio completion progress
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface StopProgress {
  stopId: string;
  tourId: string;
  completedAt: string;
  isCompleted: boolean;
}

interface ProgressContextType {
  completedStops: StopProgress[];
  totalVisitedPlaces: number;
  markStopCompleted: (tourId: string, stopId: string) => Promise<void>;
  isStopCompleted: (tourId: string, stopId: string) => boolean;
  getCompletedStopsForTour: (tourId: string) => StopProgress[];
  refreshProgress: () => Promise<void>;
  clearAllProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [completedStops, setCompletedStops] = useState<StopProgress[]>([]);
  const [totalVisitedPlaces, setTotalVisitedPlaces] = useState(0);
  const { user } = useAuth();

  // Load progress when user signs in
  useEffect(() => {
    if (user) {
      loadProgress();
    } else {
      // Clear progress when user signs out
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
    }
  }, [user]);

  const loadProgress = useCallback(async () => {
    if (!user) return;

    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => 
        key.startsWith('progress_') && key.endsWith('_completed')
      );

      const allProgress: StopProgress[] = [];

      for (const key of progressKeys) {
        const progressData = await AsyncStorage.getItem(key);
        if (progressData) {
          const progress = JSON.parse(progressData);
          allProgress.push(progress);
        }
      }

      setCompletedStops(allProgress);
      setTotalVisitedPlaces(allProgress.length);

      console.log(`📊 Loaded ${allProgress.length} completed stops for user`);
    } catch (error) {
      console.error('❌ Error loading progress:', error);
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
    }
  }, [user]);

  const markStopCompleted = useCallback(async (tourId: string, stopId: string) => {
    if (!user) return;

    try {
      // Check if already completed
      if (isStopCompleted(tourId, stopId)) {
        console.log(`✅ Stop ${stopId} already completed`);
        return;
      }

      const progress: StopProgress = {
        stopId,
        tourId,
        completedAt: new Date().toISOString(),
        isCompleted: true
      };

      // Save to AsyncStorage
      const key = `progress_${tourId}_${stopId}_completed`;
      await AsyncStorage.setItem(key, JSON.stringify(progress));

      // Update state
      setCompletedStops(prev => [...prev, progress]);
      setTotalVisitedPlaces(prev => prev + 1);

      console.log(`🎉 Marked stop ${stopId} in tour ${tourId} as completed`);
    } catch (error) {
      console.error('❌ Error marking stop completed:', error);
    }
  }, [user, isStopCompleted]);

  const isStopCompleted = useCallback((tourId: string, stopId: string): boolean => {
    return completedStops.some(stop => 
      stop.tourId === tourId && stop.stopId === stopId && stop.isCompleted
    );
  }, [completedStops]);

  const getCompletedStopsForTour = useCallback((tourId: string): StopProgress[] => {
    return completedStops.filter(stop => stop.tourId === tourId);
  }, [completedStops]);

  const refreshProgress = useCallback(async () => {
    await loadProgress();
  }, [loadProgress]);

  const clearAllProgress = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => 
        key.startsWith('progress_') && key.endsWith('_completed')
      );
      
      await AsyncStorage.multiRemove(progressKeys);
      
      setCompletedStops([]);
      setTotalVisitedPlaces(0);
      
      console.log('✅ All progress cleared');
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
    }
  }, []);

  const value: ProgressContextType = {
    completedStops,
    totalVisitedPlaces,
    markStopCompleted,
    isStopCompleted,
    getCompletedStopsForTour,
    refreshProgress,
    clearAllProgress,
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