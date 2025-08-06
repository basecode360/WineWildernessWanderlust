// contexts/OfflineContext.tsx - Fixed global offline state management without FileSystem errors
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getTourById } from '../data/tours';
import { Tour } from '../types/tour';
import { useAuth } from './AuthContext';

interface DownloadProgress {
  tourId: string;
  totalItems: number;
  downloadedItems: number;
  currentFile: string;
  progress: number; // 0-1
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

interface OfflineContent {
  tourId: string;
  tourData: Tour;
  downloadedAt: string;
  size: number;
}

interface OfflineContextType {
  offlineTours: OfflineContent[];
  isLoadingOffline: boolean;
  downloadProgress: Map<string, DownloadProgress>;
  totalStorageUsed: number;

  // Methods
  isTourOffline: (tourId: string) => boolean;
  downloadTour: (tourId: string) => Promise<boolean>;
  removeTour: (tourId: string) => Promise<void>;
  cancelDownload: (tourId: string) => Promise<void>;
  getOfflineAudioPath: (
    tourId: string,
    stopId: string
  ) => Promise<string | null>;
  getOfflineImagePath: (
    tourId: string,
    imageKey: string
  ) => Promise<string | null>;
  refreshOfflineContent: () => Promise<void>;
  clearAllOfflineContent: () => Promise<void>;

  // Utilities
  formatStorageSize: (bytes: number) => string;
  isDownloading: (tourId: string) => boolean;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

interface OfflineProviderProps {
  children: ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [offlineTours, setOfflineTours] = useState<OfflineContent[]>([]);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<
    Map<string, DownloadProgress>
  >(new Map());
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);

  const { user } = useAuth();

  // Load offline content when user signs in
  useEffect(() => {
    if (user) {
      console.log('👤 User signed in, loading offline content...');
      loadOfflineContent();
    } else {
      console.log('👤 User signed out, clearing offline state...');
      // Clear offline state when user signs out (but keep files)
      setOfflineTours([]);
      setDownloadProgress(new Map());
      setTotalStorageUsed(0);
    }
  }, [user]);

  const loadOfflineContent = useCallback(async () => {
    if (!user) {
      console.log('❌ No user, skipping offline load');
      return;
    }

    setIsLoadingOffline(true);
    console.log('🔄 Loading offline content...');

    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('tour_') && key.endsWith('_offline')
      );
      
      const offlineContent: OfflineContent[] = [];
      let totalSize = 0;

      for (const key of offlineKeys) {
        const tourId = key.replace('tour_', '').replace('_offline', '');
        const tour = getTourById(tourId);
        
        if (tour) {
          const downloadDate = await AsyncStorage.getItem(`tour_${tourId}_download_date`);
          
          // Estimate size for bundled assets (since we're not actually copying files)
          const estimatedSize = tour.stops.length * 2048 * 1024; // 2MB per stop estimate
          
          offlineContent.push({
            tourId,
            tourData: tour,
            downloadedAt: downloadDate || new Date().toISOString(),
            size: estimatedSize
          });
          
          totalSize += estimatedSize;
        }
      }

      setOfflineTours(offlineContent);
      setTotalStorageUsed(totalSize);
      
      console.log('✅ Offline content loaded:', offlineContent.length, 'tours');
      console.log('💾 Storage used:', formatStorageSize(totalSize));

    } catch (error) {
      console.error('❌ Error loading offline content:', error);
      setOfflineTours([]);
      setTotalStorageUsed(0);
    } finally {
      setIsLoadingOffline(false);
    }
  }, [user]);

  const isTourOffline = useCallback(
    (tourId: string): boolean => {
      return offlineTours.some((tour) => tour.tourId === tourId);
    },
    [offlineTours]
  );

  const downloadTour = useCallback(
    async (tourId: string): Promise<boolean> => {
      console.log('⬇️ Starting download for tour:', tourId);

      try {
        const tour = getTourById(tourId);
        if (!tour) {
          console.error('Tour not found:', tourId);
          return false;
        }

        // Check if already downloaded
        if (isTourOffline(tourId)) {
          console.log('Tour already offline:', tourId);
          return true;
        }

        const totalItems = tour.stops.length + 1; // +1 for images

        // Initialize progress
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems,
            downloadedItems: 0,
            currentFile: 'Preparing download...',
            progress: 0,
            status: 'downloading'
          });
          return newMap;
        });

        // Simulate download progress for bundled assets
        for (let i = 0; i <= totalItems; i++) {
          const progress = i / totalItems;
          const currentFile = i === 0 ? 'Preparing download...' : 
                            i <= tour.stops.length ? `Processing audio ${i}/${tour.stops.length}` : 
                            'Processing images...';
          
          // Update progress
          setDownloadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(tourId, {
              tourId,
              totalItems,
              downloadedItems: i,
              currentFile,
              progress,
              status: 'downloading'
            });
            return newMap;
          });
          
          console.log(`📥 Download progress for ${tourId}: ${Math.round(progress * 100)}%`);
          
          // Check if cancelled
          const currentProgress = downloadProgress.get(tourId);
          if (currentProgress?.status === 'cancelled') {
            console.log('❌ Download cancelled for tour:', tourId);
            return false;
          }
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Mark as completed
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems,
            downloadedItems: totalItems,
            currentFile: 'Download complete!',
            progress: 1,
            status: 'completed'
          });
          return newMap;
        });

        // Store in AsyncStorage
        await AsyncStorage.setItem(`tour_${tourId}_offline`, 'true');
        await AsyncStorage.setItem(`tour_${tourId}_download_date`, new Date().toISOString());

        console.log('✅ Download completed for tour:', tourId);

        // Remove progress after delay
        setTimeout(() => {
          setDownloadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.delete(tourId);
            return newMap;
          });
        }, 2000);

        // Refresh offline content to include the new tour
        await loadOfflineContent();
        return true;

      } catch (error) {
        console.error('❌ Error downloading tour:', error);

        // Update progress to show error
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems: 0,
            downloadedItems: 0,
            currentFile: 'Download failed',
            progress: 0,
            status: 'error',
            error: error.message,
          });
          return newMap;
        });

        // Remove error progress after delay
        setTimeout(() => {
          setDownloadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.delete(tourId);
            return newMap;
          });
        }, 3000);

        return false;
      }
    },
    [isTourOffline, loadOfflineContent, downloadProgress]
  );

  const removeTour = useCallback(
    async (tourId: string): Promise<void> => {
      console.log('🗑️ Removing offline tour:', tourId);

      try {
        // Remove from AsyncStorage
        await AsyncStorage.removeItem(`tour_${tourId}_offline`);
        await AsyncStorage.removeItem(`tour_${tourId}_download_date`);
        
        console.log('✅ Tour removed from offline storage:', tourId);

        // Refresh offline content
        await loadOfflineContent();
      } catch (error) {
        console.error('❌ Error removing offline tour:', error);
        throw error;
      }
    },
    [loadOfflineContent]
  );

  const cancelDownload = useCallback(async (tourId: string): Promise<void> => {
    console.log('⏹️ Cancelling download for tour:', tourId);

    try {
      // Update progress to cancelled status
      setDownloadProgress((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(tourId);
        if (current) {
          newMap.set(tourId, {
            ...current,
            status: 'cancelled',
            currentFile: 'Download cancelled'
          });
        }
        return newMap;
      });

      // Remove progress after delay
      setTimeout(() => {
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.delete(tourId);
          return newMap;
        });
      }, 1000);

      console.log('✅ Download cancelled for tour:', tourId);
    } catch (error) {
      console.error('❌ Error cancelling download:', error);
      throw error;
    }
  }, []);

  const getOfflineAudioPath = useCallback(
    async (tourId: string, stopId: string): Promise<string | null> => {
      if (!isTourOffline(tourId)) {
        return null;
      }
      
      // Since we're using bundled assets, return null to use bundled assets directly
      console.log('🎵 Using bundled audio asset for offline mode');
      return null;
    },
    [isTourOffline]
  );

  const getOfflineImagePath = useCallback(
    async (tourId: string, imageKey: string): Promise<string | null> => {
      if (!isTourOffline(tourId)) {
        return null;
      }
      
      // Since we're using bundled assets, return null to use bundled assets directly  
      console.log('🖼️ Using bundled image asset for offline mode');
      return null;
    },
    [isTourOffline]
  );

  const refreshOfflineContent = useCallback(async (): Promise<void> => {
    console.log('🔄 Manually refreshing offline content...');
    await loadOfflineContent();
  }, [loadOfflineContent]);

  const clearAllOfflineContent = useCallback(async (): Promise<void> => {
    console.log('🗑️ Clearing all offline content...');

    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('tour_') && (key.endsWith('_offline') || key.endsWith('_download_date'))
      );
      
      await AsyncStorage.multiRemove(offlineKeys);
      console.log('✅ All offline content cleared');

      // Reset state
      setOfflineTours([]);
      setTotalStorageUsed(0);
      setDownloadProgress(new Map());
    } catch (error) {
      console.error('❌ Error clearing offline content:', error);
      throw error;
    }
  }, []);

  const formatStorageSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const isDownloading = useCallback(
    (tourId: string): boolean => {
      const progress = downloadProgress.get(tourId);
      return progress?.status === 'downloading' || false;
    },
    [downloadProgress]
  );

  const value: OfflineContextType = {
    offlineTours,
    isLoadingOffline,
    downloadProgress,
    totalStorageUsed,

    // Methods
    isTourOffline,
    downloadTour,
    removeTour,
    cancelDownload,
    getOfflineAudioPath,
    getOfflineImagePath,
    refreshOfflineContent,
    clearAllOfflineContent,

    // Utilities
    formatStorageSize,
    isDownloading,
  };

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}