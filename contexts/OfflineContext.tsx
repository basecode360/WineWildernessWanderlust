// contexts/OfflineContext.tsx - Global offline state management
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import OfflineService, {
  DownloadProgress,
  OfflineContent,
} from '../services/OfflineService';
import { useAuth } from './AuthContext';

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
  const offlineService = OfflineService.getInstance();

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
      const [tours, storageUsed] = await Promise.all([
        offlineService.getAllOfflineTours(),
        offlineService.getOfflineStorageUsage(),
      ]);

      console.log('✅ Offline content loaded:', tours.length, 'tours');
      console.log('💾 Storage used:', formatStorageSize(storageUsed));

      setOfflineTours(tours);
      setTotalStorageUsed(storageUsed);
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
        const success = await offlineService.downloadTour(
          tourId,
          (progress) => {
            console.log(
              `📥 Download progress for ${tourId}:`,
              Math.round(progress.progress * 100) + '%'
            );

            setDownloadProgress((prev) => {
              const newMap = new Map(prev);
              newMap.set(tourId, progress);
              return newMap;
            });

            // Remove progress when download completes or fails
            if (
              progress.status === 'completed' ||
              progress.status === 'error' ||
              progress.status === 'cancelled'
            ) {
              setTimeout(() => {
                setDownloadProgress((prev) => {
                  const newMap = new Map(prev);
                  newMap.delete(tourId);
                  return newMap;
                });
              }, 2000); // Keep the final status for 2 seconds
            }
          }
        );

        if (success) {
          console.log('✅ Download completed for tour:', tourId);
          // Refresh offline content to include the new tour
          await loadOfflineContent();
        } else {
          console.log('❌ Download failed for tour:', tourId);
        }

        return success;
      } catch (error) {
        console.error('❌ Error downloading tour:', error);

        // Update progress to show error
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(tourId, {
            tourId,
            totalItems: 0,
            downloadedItems: 0,
            currentFile: '',
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
    [loadOfflineContent]
  );

  const removeTour = useCallback(
    async (tourId: string): Promise<void> => {
      console.log('🗑️ Removing offline tour:', tourId);

      try {
        await offlineService.removeOfflineContent(tourId);
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
      await offlineService.cancelDownload(tourId);
      console.log('✅ Download cancelled for tour:', tourId);
    } catch (error) {
      console.error('❌ Error cancelling download:', error);
      throw error;
    }
  }, []);

  const getOfflineAudioPath = useCallback(
    async (tourId: string, stopId: string): Promise<string | null> => {
      return await offlineService.getOfflineAudioPath(tourId, stopId);
    },
    []
  );

  const getOfflineImagePath = useCallback(
    async (tourId: string, imageKey: string): Promise<string | null> => {
      return await offlineService.getOfflineImagePath(tourId, imageKey);
    },
    []
  );

  const refreshOfflineContent = useCallback(async (): Promise<void> => {
    console.log('🔄 Manually refreshing offline content...');
    await loadOfflineContent();
  }, [loadOfflineContent]);

  const clearAllOfflineContent = useCallback(async (): Promise<void> => {
    console.log('🗑️ Clearing all offline content...');

    try {
      await offlineService.clearAllOfflineContent();
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
