// services/OfflineService.ts - Complete offline tour management
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { getTourById } from '../data/tours';
import { Tour, TourStop } from '../types/tour';

export interface OfflineContent {
  tourId: string;
  downloadedAt: string;
  audioFiles: { [stopId: string]: string }; // Local file paths
  imageFiles: { [key: string]: string }; // Local file paths
  tourData: Tour;
  size: number; // Total size in bytes
}

export interface DownloadProgress {
  tourId: string;
  totalItems: number;
  downloadedItems: number;
  currentFile: string;
  progress: number; // 0-1
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

class OfflineService {
  private static instance: OfflineService;
  private downloadProgressCallbacks: Map<
    string,
    (progress: DownloadProgress) => void
  > = new Map();
  private activeDownloads: Set<string> = new Set();

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  private constructor() {
    this.ensureDirectoriesExist();
  }

  private async ensureDirectoriesExist() {
    const audioDir = `${FileSystem.documentDirectory}tours/audio/`;
    const imageDir = `${FileSystem.documentDirectory}tours/images/`;

    try {
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  // Check if a tour is available offline
  async isTourAvailableOffline(tourId: string): Promise<boolean> {
    try {
      const offlineContent = await this.getOfflineContent(tourId);
      return offlineContent !== null;
    } catch (error) {
      console.error('Error checking offline availability:', error);
      return false;
    }
  }

  // Get offline content for a tour
  async getOfflineContent(tourId: string): Promise<OfflineContent | null> {
    try {
      const key = `offline_tour_${tourId}`;
      const data = await AsyncStorage.getItem(key);

      if (!data) return null;

      const offlineContent: OfflineContent = JSON.parse(data);

      // Verify that files still exist
      const allFilesExist = await this.verifyOfflineFiles(offlineContent);
      if (!allFilesExist) {
        // Clean up corrupted offline data
        await this.removeOfflineContent(tourId);
        return null;
      }

      return offlineContent;
    } catch (error) {
      console.error('Error getting offline content:', error);
      return null;
    }
  }

  // Get all offline tours
  async getAllOfflineTours(): Promise<OfflineContent[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((key) => key.startsWith('offline_tour_'));

      const offlineContents: OfflineContent[] = [];

      for (const key of offlineKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          try {
            const content: OfflineContent = JSON.parse(data);
            const filesExist = await this.verifyOfflineFiles(content);

            if (filesExist) {
              offlineContents.push(content);
            } else {
              // Clean up corrupted data
              const tourId = key.replace('offline_tour_', '');
              await this.removeOfflineContent(tourId);
            }
          } catch (parseError) {
            console.error('Error parsing offline content:', parseError);
          }
        }
      }

      return offlineContents;
    } catch (error) {
      console.error('Error getting all offline tours:', error);
      return [];
    }
  }

  // Download a tour for offline use
  async downloadTour(
    tourId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    if (this.activeDownloads.has(tourId)) {
      throw new Error('Tour is already being downloaded');
    }

    const tour = getTourById(tourId);
    if (!tour) {
      throw new Error('Tour not found');
    }

    this.activeDownloads.add(tourId);

    if (onProgress) {
      this.downloadProgressCallbacks.set(tourId, onProgress);
    }

    try {
      // Calculate total items to download
      const audioFiles = tour.stops.filter((stop) => stop.audio).length;
      const imageFiles = this.getUniqueImages(tour).length;
      const totalItems = audioFiles + imageFiles;

      let downloadedItems = 0;
      const audioFilePaths: { [stopId: string]: string } = {};
      const imageFilePaths: { [key: string]: string } = {};
      let totalSize = 0;

      const updateProgress = (
        currentFile: string,
        status: DownloadProgress['status'] = 'downloading'
      ) => {
        const progress: DownloadProgress = {
          tourId,
          totalItems,
          downloadedItems,
          currentFile,
          progress: totalItems > 0 ? downloadedItems / totalItems : 0,
          status,
        };

        if (onProgress) {
          onProgress(progress);
        }
      };

      // Download audio files
      for (const stop of tour.stops) {
        if (stop.audio) {
          updateProgress(`Audio: ${stop.title}`);

          try {
            const audioPath = await this.downloadAudioFile(tourId, stop);
            audioFilePaths[stop.id] = audioPath;

            // Get file size
            const fileInfo = await FileSystem.getInfoAsync(audioPath);
            if (fileInfo.exists && 'size' in fileInfo) {
              totalSize += fileInfo.size;
            }

            downloadedItems++;
          } catch (error) {
            console.error(
              `Error downloading audio for stop ${stop.id}:`,
              error
            );
            // Continue with other files even if one fails
          }
        }
      }

      // Download image files
      const uniqueImages = this.getUniqueImages(tour);
      for (const imageKey of uniqueImages) {
        updateProgress(`Image: ${imageKey}`);

        try {
          const imagePath = await this.downloadImageFile(tourId, imageKey);
          imageFilePaths[imageKey] = imagePath;

          // Get file size
          const fileInfo = await FileSystem.getInfoAsync(imagePath);
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size;
          }

          downloadedItems++;
        } catch (error) {
          console.error(`Error downloading image ${imageKey}:`, error);
          // Continue with other files even if one fails
        }
      }

      // Save offline content metadata
      const offlineContent: OfflineContent = {
        tourId,
        downloadedAt: new Date().toISOString(),
        audioFiles: audioFilePaths,
        imageFiles: imageFilePaths,
        tourData: tour,
        size: totalSize,
      };

      await AsyncStorage.setItem(
        `offline_tour_${tourId}`,
        JSON.stringify(offlineContent)
      );

      updateProgress('Download completed', 'completed');

      return true;
    } catch (error) {
      console.error('Error downloading tour:', error);

      if (onProgress) {
        const errorProgress: DownloadProgress = {
          tourId,
          totalItems: 0,
          downloadedItems: 0,
          currentFile: '',
          progress: 0,
          status: 'error',
          error: error.message,
        };
        onProgress(errorProgress);
      }

      // Clean up any partially downloaded files
      await this.cleanupPartialDownload(tourId);

      return false;
    } finally {
      this.activeDownloads.delete(tourId);
      this.downloadProgressCallbacks.delete(tourId);
    }
  }

  // Cancel an active download
  async cancelDownload(tourId: string): Promise<void> {
    if (!this.activeDownloads.has(tourId)) {
      return;
    }

    this.activeDownloads.delete(tourId);

    const callback = this.downloadProgressCallbacks.get(tourId);
    if (callback) {
      const cancelledProgress: DownloadProgress = {
        tourId,
        totalItems: 0,
        downloadedItems: 0,
        currentFile: '',
        progress: 0,
        status: 'cancelled',
      };
      callback(cancelledProgress);
    }

    this.downloadProgressCallbacks.delete(tourId);

    // Clean up any partially downloaded files
    await this.cleanupPartialDownload(tourId);
  }

  // Remove offline content for a tour
  async removeOfflineContent(tourId: string): Promise<void> {
    try {
      const offlineContent = await this.getOfflineContent(tourId);

      if (offlineContent) {
        // Delete audio files
        for (const filePath of Object.values(offlineContent.audioFiles)) {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (error) {
            console.warn('Error deleting audio file:', error);
          }
        }

        // Delete image files
        for (const filePath of Object.values(offlineContent.imageFiles)) {
          try {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          } catch (error) {
            console.warn('Error deleting image file:', error);
          }
        }
      }

      // Remove metadata
      await AsyncStorage.removeItem(`offline_tour_${tourId}`);
    } catch (error) {
      console.error('Error removing offline content:', error);
      throw error;
    }
  }

  // Get local audio file path for a stop
  async getOfflineAudioPath(
    tourId: string,
    stopId: string
  ): Promise<string | null> {
    const offlineContent = await this.getOfflineContent(tourId);
    return offlineContent?.audioFiles[stopId] || null;
  }

  // Get local image file path
  async getOfflineImagePath(
    tourId: string,
    imageKey: string
  ): Promise<string | null> {
    const offlineContent = await this.getOfflineContent(tourId);
    return offlineContent?.imageFiles[imageKey] || null;
  }

  // Get total offline storage usage
  async getOfflineStorageUsage(): Promise<number> {
    const offlineTours = await this.getAllOfflineTours();
    return offlineTours.reduce((total, tour) => total + tour.size, 0);
  }

  // Clean up all offline content
  async clearAllOfflineContent(): Promise<void> {
    const offlineTours = await this.getAllOfflineTours();

    for (const tour of offlineTours) {
      await this.removeOfflineContent(tour.tourId);
    }
  }

  // Private helper methods
  private async downloadAudioFile(
    tourId: string,
    stop: TourStop
  ): Promise<string> {
    const audioDir = `${FileSystem.documentDirectory}tours/audio/`;
    const fileName = `${tourId}_${stop.id}_${stop.audio}`;
    const localPath = `${audioDir}${fileName}`;

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }

    // For demo purposes, we'll copy from assets
    // In a real app, you'd download from a server
    const audioAsset = this.getAudioAssetUri(stop.audio);
    if (audioAsset) {
      try {
        await FileSystem.copyAsync({
          from: audioAsset,
          to: localPath,
        });
        return localPath;
      } catch (error) {
        console.error('Error copying audio file:', error);
        throw new Error(`Failed to download audio: ${stop.audio}`);
      }
    } else {
      throw new Error(`Audio asset not found: ${stop.audio}`);
    }
  }

  private async downloadImageFile(
    tourId: string,
    imageKey: string
  ): Promise<string> {
    const imageDir = `${FileSystem.documentDirectory}tours/images/`;
    const fileName = `${tourId}_${imageKey}`;
    const localPath = `${imageDir}${fileName}`;

    // Check if file already exists
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    if (fileInfo.exists) {
      return localPath;
    }

    // For demo purposes, we'll copy from assets
    // In a real app, you'd download from a server
    const imageAsset = this.getImageAssetUri(imageKey);
    if (imageAsset) {
      try {
        await FileSystem.copyAsync({
          from: imageAsset,
          to: localPath,
        });
        return localPath;
      } catch (error) {
        console.error('Error copying image file:', error);
        throw new Error(`Failed to download image: ${imageKey}`);
      }
    } else {
      throw new Error(`Image asset not found: ${imageKey}`);
    }
  }

  private getUniqueImages(tour: Tour): string[] {
    const images = new Set<string>();

    // Tour main image
    if (tour.image) {
      images.add(tour.image);
    }

    // Stop images
    for (const stop of tour.stops) {
      if (stop.image) {
        images.add(stop.image);
      }
    }

    return Array.from(images);
  }

  private async verifyOfflineFiles(
    offlineContent: OfflineContent
  ): Promise<boolean> {
    try {
      // Check audio files
      for (const filePath of Object.values(offlineContent.audioFiles)) {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          return false;
        }
      }

      // Check image files
      for (const filePath of Object.values(offlineContent.imageFiles)) {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error verifying offline files:', error);
      return false;
    }
  }

  private async cleanupPartialDownload(tourId: string): Promise<void> {
    try {
      const audioDir = `${FileSystem.documentDirectory}tours/audio/`;
      const imageDir = `${FileSystem.documentDirectory}tours/images/`;

      // Get all files in directories
      const audioFiles = await FileSystem.readDirectoryAsync(audioDir);
      const imageFiles = await FileSystem.readDirectoryAsync(imageDir);

      // Delete files that start with the tour ID
      const filesToDelete = [
        ...audioFiles
          .filter((file) => file.startsWith(`${tourId}_`))
          .map((file) => `${audioDir}${file}`),
        ...imageFiles
          .filter((file) => file.startsWith(`${tourId}_`))
          .map((file) => `${imageDir}${file}`),
      ];

      for (const filePath of filesToDelete) {
        try {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        } catch (error) {
          console.warn('Error deleting partial file:', error);
        }
      }

      // Remove any stored metadata
      await AsyncStorage.removeItem(`offline_tour_${tourId}`);
    } catch (error) {
      console.error('Error cleaning up partial download:', error);
    }
  }

  // These methods now properly access your asset mappings
  private getAudioAssetUri(audioFileName: string): string | null {
    try {
      // Import the audio assets utility
      const { getAudioAsset } = require('../utils/audioAssets');
      const asset = getAudioAsset(audioFileName);

      if (!asset) {
        console.error('Audio asset not found:', audioFileName);
        return null;
      }

      // For bundled assets, we need to resolve to a local URI
      // This is a simplified approach - in production you might want to use expo-asset
      return asset;
    } catch (error) {
      console.error('Error getting audio asset URI:', error);
      return null;
    }
  }

  private getImageAssetUri(imageFileName: string): string | null {
    try {
      // Import the image assets utility
      const { getImageAsset } = require('../utils/imageAssets');
      const asset = getImageAsset(imageFileName);

      if (!asset) {
        console.error('Image asset not found:', imageFileName);
        return null;
      }

      // For bundled assets, we need to resolve to a local URI
      return asset;
    } catch (error) {
      console.error('Error getting image asset URI:', error);
      return null;
    }
  }
}

export default OfflineService;
