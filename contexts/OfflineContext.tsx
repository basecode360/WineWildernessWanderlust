// contexts/OfflineContext.tsx - Fixed version with proper OfflineService integration
import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getOfflineService, OfflineContent } from '../services/OfflineService';
import { getTourById } from '../services/tourServices';
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

interface OfflineContextType {
  offlineTours: OfflineContent[];
  isLoadingOffline: boolean;
  downloadProgress: Map<string, DownloadProgress>;
  totalStorageUsed: number;
  isOnline: boolean;

  // Methods
  isTourOffline: (tourId: string) => boolean;
  downloadTour: (tourId: string) => Promise<boolean>;
  removeTour: (tourId: string) => Promise<void>;
  cancelDownload: (tourId: string) => Promise<void>;
  getOfflineAudioPath: (tourId: string, stopId: string) => Promise<string | null>;
  getOfflineImagePath: (tourId: string, imageKey: string) => Promise<string | null>;
  refreshOfflineContent: () => Promise<void>;
  clearAllOfflineContent: () => Promise<void>;
  getOfflineTour: (tourId: string) => OfflineContent | null;

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
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [downloadCancellationTokens, setDownloadCancellationTokens] = useState<Map<string, boolean>>(new Map());

  const { user } = useAuth();
  const offlineService = getOfflineService();

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log(`Network status changed: ${state.isConnected ? 'Online' : 'Offline'}`);
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

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
    if (!user) return;

    setIsLoadingOffline(true);

    try {
      console.log(`Loading offline content for user: ${user.id}`);

      // FIXED: Use user-specific method
      const offlineContent = await offlineService.getAllOfflineToursForUser(user.id);
      console.log(`Found ${offlineContent.length} offline tours for user ${user.id}`);

      setOfflineTours(offlineContent);

      // Get user-specific storage stats
      const stats = await offlineService.getStorageStatsForUser(user.id);
      setTotalStorageUsed(stats.totalSize);

    } catch (error) {
      console.error('Error loading offline content:', error);
      setOfflineTours([]);
      setTotalStorageUsed(0);
    } finally {
      setIsLoadingOffline(false);
    }
  }, [user, offlineService]);

  const isTourOffline = useCallback(
    (tourId: string): boolean => {
      return offlineTours.some((tour) => tour.tourId === tourId);
    },
    [offlineTours]
  );

  const getOfflineTour = useCallback(
    (tourId: string): OfflineContent | null => {
      return offlineTours.find(tour => tour.tourId === tourId) || null;
    },
    [offlineTours]
  );

  const downloadTour = useCallback(
    async (tourId: string): Promise<boolean> => {
      // Check network connectivity
      if (!isOnline) {
        console.error(`Cannot download tour ${tourId}: No internet connection`);
        return false;
      }

      if (!user) {
        console.error(`Cannot download tour ${tourId}: No user logged in`);
        return false;
      }

      try {
        console.log(`Starting download for tour: ${tourId}`);

        // Fetch tour data from Supabase
        const tour = await getTourById(tourId);
        if (!tour) {
          console.error(`Tour ${tourId} not found in Supabase`);
          return false;
        }

        // Check if already downloaded
        if (isTourOffline(tourId)) {
          console.log(`Tour ${tourId} already offline`);
          return true;
        }

        // Reset cancellation token
        setDownloadCancellationTokens(prev => {
          const newMap = new Map(prev);
          newMap.set(tourId, false);
          return newMap;
        });

        // Calculate total items to download
        const audioFiles = tour.stops.filter(stop => stop.audio).length;
        const imageFiles = [
          tour.image,
          ...tour.stops.map(stop => stop.image)
        ].filter(Boolean).length;
        const totalItems = audioFiles + imageFiles;

        console.log(`Total items to download: ${totalItems}`);

        // Initialize progress with correct values
        setDownloadProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems: totalItems,
            downloadedItems: 0,
            currentFile: 'Preparing download...',
            progress: 0,
            status: 'downloading'
          });
          return newMap;
        });

        // FIXED: Use user-specific download method
        const success = await offlineService.downloadTourWithAssetsForUser(
          tour,
          user.id,
          (current: number = 0, total: number = 0, currentFile: string = '') => {
            // Safety checks
            if (typeof current !== 'number') current = 0;
            if (typeof total !== 'number') total = 0;
            if (typeof currentFile !== 'string') currentFile = '';

            // Check for cancellation
            const isCancelled = downloadCancellationTokens.get(tourId);
            if (isCancelled) {
              console.log(`Download cancelled for tour ${tourId}`);
              return;
            }

            setDownloadProgress(prev => {
              const newMap = new Map(prev);
              newMap.set(tourId, {
                tourId,
                totalItems: total,
                downloadedItems: current,
                currentFile,
                progress: total > 0 ? Math.min(current / total, 1) : 0,
                status: 'downloading'
              });
              return newMap;
            });
          }
        );

        if (success) {
          // Mark as completed
          setDownloadProgress(prev => {
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

          console.log(`Tour ${tourId} downloaded successfully`);

          // Remove progress after delay
          setTimeout(() => {
            setDownloadProgress(prev => {
              const newMap = new Map(prev);
              newMap.delete(tourId);
              return newMap;
            });
          }, 2000);

          // Refresh offline content to include the new tour
          await loadOfflineContent();
          return true;
        } else {
          throw new Error('Download failed');
        }

      } catch (error) {
        console.error(`Error downloading tour ${tourId}:`, error);

        // Update progress to show error
        setDownloadProgress(prev => {
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
          setDownloadProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(tourId);
            return newMap;
          });
        }, 3000);

        return false;
      }
    },
    [isTourOffline, loadOfflineContent, downloadCancellationTokens, isOnline, offlineService, user]
  );

  const removeTour = useCallback(
    async (tourId: string): Promise<void> => {
      if (!user) {
        throw new Error('User not logged in');
      }

      try {
        console.log(`Removing offline tour ${tourId}`);

        // FIXED: Use user-specific removal method
        await offlineService.removeTourForUser(user.id, tourId);

        console.log(`Tour ${tourId} removed from offline storage`);

        // Refresh offline content
        await loadOfflineContent();
      } catch (error) {
        console.error(`Error removing tour ${tourId}:`, error);
        throw error;
      }
    },
    [loadOfflineContent, offlineService, user]
  );

  const cancelDownload = useCallback(async (tourId: string): Promise<void> => {
    try {
      console.log(`Cancelling download for tour ${tourId}`);

      // Set cancellation token
      setDownloadCancellationTokens(prev => {
        const newMap = new Map(prev);
        newMap.set(tourId, true);
        return newMap;
      });

      // Call OfflineService to cancel download
      await offlineService.cancelDownload(tourId);

      // Update progress to cancelled status
      setDownloadProgress(prev => {
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
        setDownloadProgress(prev => {
          const newMap = new Map(prev);
          newMap.delete(tourId);
          return newMap;
        });

        setDownloadCancellationTokens(prev => {
          const newMap = new Map(prev);
          newMap.delete(tourId);
          return newMap;
        });
      }, 1000);

    } catch (error) {
      console.error(`Error cancelling download for tour ${tourId}:`, error);
      throw error;
    }
  }, [offlineService]);

  const getOfflineAudioPath = useCallback(
    async (tourId: string, stopId: string): Promise<string | null> => {
      if (!isTourOffline(tourId) || !user) {
        return null;
      }

      // Use OfflineService to get audio path
      const audioPath = await offlineService.getOfflineAudioPath(tourId, stopId, user.id);
      return audioPath;
    },
    [isTourOffline, offlineService, user]
  );

  const getOfflineImagePath = useCallback(
    async (tourId: string, imageKey: string): Promise<string | null> => {
      if (!isTourOffline(tourId) || !user) {
        return null;
      }

      // Use OfflineService to get image path
      const imagePath = await offlineService.getOfflineImagePath(tourId, imageKey, user.id);
      return imagePath;
    },
    [isTourOffline, offlineService, user]
  );

  const refreshOfflineContent = useCallback(async (): Promise<void> => {
    console.log('Refreshing offline content...');
    await loadOfflineContent();
  }, [loadOfflineContent]);

  const clearAllOfflineContent = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('User not logged in');
    }

    try {
      console.log('Clearing all offline content...');

      // FIXED: Use user-specific clear method
      await offlineService.clearAllOfflineContentForUser(user.id);

      // Reset state
      setOfflineTours([]);
      setTotalStorageUsed(0);
      setDownloadProgress(new Map());
      setDownloadCancellationTokens(new Map());

      console.log('All offline content cleared');
    } catch (error) {
      console.error('Error clearing offline content:', error);
      throw error;
    }
  }, [offlineService, user]);

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
    isOnline,

    // Methods
    isTourOffline,
    downloadTour,
    removeTour,
    cancelDownload,
    getOfflineAudioPath,
    getOfflineImagePath,
    refreshOfflineContent,
    clearAllOfflineContent,
    getOfflineTour,

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