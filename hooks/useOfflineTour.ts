// hooks/useOfflineTour.ts - Custom hook for managing offline tour functionality
import { useCallback, useEffect, useState } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { getTourById, getTourDownloadStatus } from '../services/tourServices';
import { Tour } from '../types/tour';

interface UseOfflineTourResult {
  // State
  tour: Tour | null;
  isLoading: boolean;
  error: string | null;
  
  // Offline status
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadStatus: string;
  
  // Download info
  downloadDate?: string;
  downloadSize?: number;
  fileCount?: number;
  isIntact?: boolean;
  
  // Actions
  downloadTour: () => Promise<boolean>;
  removeTour: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  refreshTour: () => Promise<void>;
  
  // Utilities
  formatDownloadSize: () => string;
  getDownloadStatusText: () => string;
}

export function useOfflineTour(tourId: string): UseOfflineTourResult {
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Download status
  const [downloadDate, setDownloadDate] = useState<string>();
  const [downloadSize, setDownloadSize] = useState<number>();
  const [fileCount, setFileCount] = useState<number>();
  const [isIntact, setIsIntact] = useState<boolean>();

  const {
    isTourOffline,
    isDownloading,
    downloadProgress,
    downloadTour: contextDownloadTour,
    removeTour: contextRemoveTour,
    cancelDownload: contextCancelDownload,
    formatStorageSize,
    isOnline,
  } = useOffline();

  // Get current progress for this tour
  const currentProgress = downloadProgress.get(tourId);
  const progressValue = currentProgress?.progress || 0;
  const progressStatus = currentProgress?.currentFile || '';

  // Load tour data
  const loadTour = useCallback(async () => {
    if (!tourId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const tourData = await getTourById(tourId);
      if (tourData) {
        setTour(tourData);
        
        // Load download status
        const downloadStatus = await getTourDownloadStatus(tourId);
        setDownloadDate(downloadStatus.downloadDate);
        setDownloadSize(downloadStatus.size);
        setFileCount(downloadStatus.fileCount);
        setIsIntact(downloadStatus.isIntact);
      } else {
        setError('Tour not found');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tour';
      setError(errorMessage);
      console.error('❌ Error loading tour:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tourId]);

  // Load tour on mount and when tourId changes
  useEffect(() => {
    loadTour();
  }, [loadTour]);

  // Update download status when offline state changes
  useEffect(() => {
    if (tourId) {
      getTourDownloadStatus(tourId).then(status => {
        setDownloadDate(status.downloadDate);
        setDownloadSize(status.size);
        setFileCount(status.fileCount);
        setIsIntact(status.isIntact);
      });
    }
  }, [tourId, isTourOffline(tourId)]);

  // Actions
  const downloadTour = useCallback(async (): Promise<boolean> => {
    if (!isOnline) {
      setError('Cannot download: No internet connection');
      return false;
    }
    
    if (isDownloading(tourId)) {
      console.warn('⚠️ Tour is already being downloaded');
      return false;
    }
    
    setError(null);
    
    try {
      const success = await contextDownloadTour(tourId);
      if (success) {
        // Refresh tour data to get offline version
        await loadTour();
      } else {
        setError('Download failed');
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      return false;
    }
  }, [tourId, contextDownloadTour, isDownloading, loadTour, isOnline]);

  const removeTour = useCallback(async (): Promise<void> => {
    if (!isTourOffline(tourId)) {
      console.warn('⚠️ Tour is not downloaded');
      return;
    }
    
    setError(null);
    
    try {
      await contextRemoveTour(tourId);
      // Refresh tour data to get online version
      await loadTour();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove tour';
      setError(errorMessage);
      throw err;
    }
  }, [tourId, contextRemoveTour, isTourOffline, loadTour]);

  const cancelDownload = useCallback(async (): Promise<void> => {
    if (!isDownloading(tourId)) {
      console.warn('⚠️ Tour is not being downloaded');
      return;
    }
    
    try {
      await contextCancelDownload(tourId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel download';
      setError(errorMessage);
      throw err;
    }
  }, [tourId, contextCancelDownload, isDownloading]);

  const refreshTour = useCallback(async (): Promise<void> => {
    await loadTour();
  }, [loadTour]);

  // Utilities
  const formatDownloadSize = useCallback((): string => {
    if (!downloadSize) return 'Unknown size';
    return formatStorageSize(downloadSize);
  }, [downloadSize, formatStorageSize]);

  const getDownloadStatusText = useCallback((): string => {
    if (isDownloading(tourId)) {
      return progressStatus || 'Downloading...';
    }
    
    if (isTourOffline(tourId)) {
      if (isIntact === false) {
        return 'Downloaded (corrupted - re-download recommended)';
      }
      return 'Downloaded';
    }
    
    if (!isOnline) {
      return 'Offline - Cannot download';
    }
    
    return 'Not downloaded';
  }, [tourId, isDownloading, isTourOffline, progressStatus, isIntact, isOnline]);

  return {
    // State
    tour,
    isLoading,
    error,
    
    // Offline status
    isDownloaded: isTourOffline(tourId),
    isDownloading: isDownloading(tourId),
    downloadProgress: progressValue,
    downloadStatus: progressStatus,
    
    // Download info
    downloadDate,
    downloadSize,
    fileCount,
    isIntact,
    
    // Actions
    downloadTour,
    removeTour,
    cancelDownload,
    refreshTour,
    
    // Utilities
    formatDownloadSize,
    getDownloadStatusText,
  };
}