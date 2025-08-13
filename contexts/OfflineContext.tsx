// contexts/OfflineContext.tsx - Updated for dynamic Supabase data
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getTourById } from '../services/tourServices';
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
      loadOfflineContent();
    } else {
      // Clear offline state when user signs out (but keep files)
      setOfflineTours([]);
      setDownloadProgress(new Map());
      setTotalStorageUsed(0);
    }
  }, [user]);

const loadOfflineContent = useCallback(async () => {
  if (!user) {
    return;
  }

  setIsLoadingOffline(true);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const offlineKeys = keys.filter(key => 
      key.startsWith('tour_') && key.endsWith('_offline')
    );
    
    console.log('🧪 DEBUG OfflineContext loadOfflineContent:');
    console.log('📊 Found offline keys:', offlineKeys);
    
    const offlineContent: OfflineContent[] = [];
    let totalSize = 0;

    for (const key of offlineKeys) {
      const tourId = key.replace('tour_', '').replace('_offline', '');
      
      try {
        // Fetch tour data from Supabase using the new service
        const tour = await getTourById(tourId);
        
        if (tour) {
          const downloadDate = await AsyncStorage.getItem(`tour_${tourId}_download_date`);
          
          // Calculate estimated size based on tour content
          let estimatedSize = 0;
          
          // Base tour data
          estimatedSize += 50 * 1024; // 50KB for tour metadata
          
       // Helper function to parse duration string to minutes
const parseDurationToMinutes = (duration: string): number => {
  const lowerDuration = duration.toLowerCase();
  
  // Extract numbers from the string
  const hoursMatch = lowerDuration.match(/(\d+)-?(\d+)?\s*hours?/);
  const minutesMatch = lowerDuration.match(/(\d+)\s*minutes?/);
  
  let totalMinutes = 0;
  
  if (hoursMatch) {
    // If it's a range like "3-4 hours", take the average
    const hour1 = parseInt(hoursMatch[1]);
    const hour2 = hoursMatch[2] ? parseInt(hoursMatch[2]) : hour1;
    const avgHours = (hour1 + hour2) / 2;
    totalMinutes += avgHours * 60;
  }
  
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1]);
  }
  
  // Default to 180 minutes (3 hours) if we can't parse
  return totalMinutes || 180;
};

// Then use it in the calculation:
tour.stops.forEach(stop => {
  if (stop.audio) {
    const durationMinutes = parseDurationToMinutes(tour.duration);
    const minutesPerStop = durationMinutes / tour.stops.length;
    const estimatedAudioSize = minutesPerStop * 60 * 1024; // 60KB per minute
    estimatedSize += Math.max(estimatedAudioSize, 500 * 1024); // Minimum 500KB per audio
  }
});
          
          // Images
          if (tour.image) {
            estimatedSize += 200 * 1024; // 200KB for main tour image
          }
          
          tour.stops.forEach(stop => {
            if (stop.image) {
              estimatedSize += 150 * 1024; // 150KB per stop image
            }
          });
          
          console.log(`📊 Tour "${tour.title}" estimated size:`, estimatedSize);
          console.log(`📊 Tour duration:`, tour.duration);
          console.log(`📊 Tour stops count:`, tour.stops.length);
          
          offlineContent.push({
            tourId,
            tourData: tour,
            downloadedAt: downloadDate || new Date().toISOString(),
            size: estimatedSize
          });
          
          totalSize += estimatedSize;
          console.log(`📊 Running total size:`, totalSize);
        }
      } catch (error) {
        console.error(`❌ Error loading offline tour ${tourId}:`, error);
      }
    }

    console.log('📊 Final offlineContent:', offlineContent);
    console.log('📊 Final totalSize:', totalSize);
    console.log('📊 typeof totalSize:', typeof totalSize);

    setOfflineTours(offlineContent);
    setTotalStorageUsed(totalSize);

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
      try {
        // Fetch tour data from Supabase
        const tour = await getTourById(tourId);
        if (!tour) {
          console.error(`❌ Tour ${tourId} not found in Supabase`);
          return false;
        }

        // Check if already downloaded
        if (isTourOffline(tourId)) {
          console.log(`✅ Tour ${tourId} already offline`);
          return true;
        }

        // Calculate total items to download
        const audioFiles = tour.stops.filter(stop => stop.audio).length;
        const imageFiles = [tour.image, ...tour.stops.map(stop => stop.image)].filter(Boolean).length;
        const totalItems = audioFiles + imageFiles + 1; // +1 for tour data

        console.log(`🔄 Starting download for tour ${tourId}: ${totalItems} items`);

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

        // Simulate download progress for remote assets
        let downloadedItems = 0;

        // Step 1: Save tour data
        await new Promise(resolve => setTimeout(resolve, 200));
        downloadedItems++;
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems,
            downloadedItems,
            currentFile: 'Saving tour data...',
            progress: downloadedItems / totalItems,
            status: 'downloading'
          });
          return newMap;
        });

        // Step 2: Process audio files
        for (let i = 0; i < audioFiles; i++) {
          const currentProgress = downloadProgress.get(tourId);
          if (currentProgress?.status === 'cancelled') {
            console.log(`❌ Download cancelled for tour ${tourId}`);
            return false;
          }

          downloadedItems++;
          setDownloadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(tourId, {
              tourId,
              totalItems,
              downloadedItems,
              currentFile: `Downloading audio ${i + 1}/${audioFiles}...`,
              progress: downloadedItems / totalItems,
              status: 'downloading'
            });
            return newMap;
          });

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Step 3: Process images
        for (let i = 0; i < imageFiles; i++) {
          const currentProgress = downloadProgress.get(tourId);
          if (currentProgress?.status === 'cancelled') {
            console.log(`❌ Download cancelled for tour ${tourId}`);
            return false;
          }

          downloadedItems++;
          setDownloadProgress((prev) => {
            const newMap = new Map(prev);
            newMap.set(tourId, {
              tourId,
              totalItems,
              downloadedItems,
              currentFile: `Downloading image ${i + 1}/${imageFiles}...`,
              progress: downloadedItems / totalItems,
              status: 'downloading'
            });
            return newMap;
          });

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 200));
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

        console.log(`✅ Tour ${tourId} downloaded successfully`);

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
        console.error(`❌ Error downloading tour ${tourId}:`, error);

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
            error: error instanceof Error ? error.message : 'Unknown error',
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
      try {
        console.log(`🗑️ Removing offline tour ${tourId}`);
        
        // Remove from AsyncStorage
        await AsyncStorage.removeItem(`tour_${tourId}_offline`);
        await AsyncStorage.removeItem(`tour_${tourId}_download_date`);
        
        console.log(`✅ Tour ${tourId} removed from offline storage`);

        // Refresh offline content
        await loadOfflineContent();
      } catch (error) {
        console.error(`❌ Error removing tour ${tourId}:`, error);
        throw error;
      }
    },
    [loadOfflineContent]
  );

  const cancelDownload = useCallback(async (tourId: string): Promise<void> => {
    try {
      console.log(`❌ Cancelling download for tour ${tourId}`);
      
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

    } catch (error) {
      console.error(`❌ Error cancelling download for tour ${tourId}:`, error);
      throw error;
    }
  }, []);

  const getOfflineAudioPath = useCallback(
    async (tourId: string, stopId: string): Promise<string | null> => {
      if (!isTourOffline(tourId)) {
        return null;
      }
      
      // For now, return null to indicate that the online URLs should be used
      // In a full implementation, you would return the local file path
      // where the audio was downloaded to device storage
      return null;
    },
    [isTourOffline]
  );

  const getOfflineImagePath = useCallback(
    async (tourId: string, imageKey: string): Promise<string | null> => {
      if (!isTourOffline(tourId)) {
        return null;
      }
      
      // For now, return null to indicate that the online URLs should be used
      // In a full implementation, you would return the local file path
      // where the image was downloaded to device storage
      return null;
    },
    [isTourOffline]
  );

  const refreshOfflineContent = useCallback(async (): Promise<void> => {
    console.log('🔄 Refreshing offline content...');
    await loadOfflineContent();
  }, [loadOfflineContent]);

  const clearAllOfflineContent = useCallback(async (): Promise<void> => {
    try {
      console.log('🗑️ Clearing all offline content...');
      
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('tour_') && (key.endsWith('_offline') || key.endsWith('_download_date'))
      );
      
      await AsyncStorage.multiRemove(offlineKeys);
      
      // Reset state
      setOfflineTours([]);
      setTotalStorageUsed(0);
      setDownloadProgress(new Map());
      
      console.log('✅ All offline content cleared');
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