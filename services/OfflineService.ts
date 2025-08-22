// services/OfflineService.ts - Alternative version with fixed exports
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Tour } from '../types/tour';

export interface OfflineContent {
  tourId: string;
  tourData: Tour;
  downloadedAt: string;
  size: number;
  imageFiles: Record<string, string>; // imageKey -> localPath
  audioFiles: Record<string, string>; // stopId -> localPath
}

// Create a singleton instance using a different pattern
let offlineServiceInstance: OfflineService | null = null;

export class OfflineService {
  private baseDir: string;

  constructor() {
    this.baseDir = `${FileSystem.documentDirectory}offline_tours/`;
    this.ensureBaseDirectory();
  }

  private async ensureBaseDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.baseDir, { intermediates: true });
        console.log('📁 Created offline tours directory');
      }
    } catch (error) {
      console.error('❌ Error creating base directory:', error);
    }
  }

  private getTourDirectory(tourId: string): string {
    return `${this.baseDir}${tourId}/`;
  }

  private getAudioDirectory(tourId: string): string {
    return `${this.getTourDirectory(tourId)}audio/`;
  }

  private getImageDirectory(tourId: string): string {
    return `${this.getTourDirectory(tourId)}images/`;
  }

  // Download a single file with retry logic
  private async downloadFile(
    url: string, 
    localPath: string, 
    maxRetries: number = 3
  ): Promise<boolean> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Downloading ${url} (attempt ${attempt}/${maxRetries})`);
        
        // Ensure directory exists
        const dir = localPath.substring(0, localPath.lastIndexOf('/'));
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }

        // Download file with timeout
        const downloadResult = await FileSystem.downloadAsync(url, localPath);
        
        if (downloadResult.status === 200) {
          // Verify file was actually downloaded
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists && fileInfo.size && fileInfo.size > 0) {
            console.log(`✅ Downloaded: ${url} -> ${localPath} (${fileInfo.size} bytes)`);
            return true;
          } else {
            throw new Error('Downloaded file is empty or corrupted');
          }
        } else {
          throw new Error(`HTTP ${downloadResult.status}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Download attempt ${attempt} failed for ${url}:`, lastError.message);
        
        // Clean up partial download
        try {
          const fileInfo = await FileSystem.getInfoAsync(localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(localPath, { idempotent: true });
          }
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up partial download:', cleanupError);
        }
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    console.error(`❌ Failed to download ${url} after ${maxRetries} attempts:`, lastError?.message);
    return false;
  }

  // Get safe filename from URL or path
  private getSafeFilename(path: string): string {
    return path.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  // Extract file extension from URL
  private getFileExtension(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const extension = pathname.split('.').pop();
      return extension ? `.${extension}` : '';
    } catch {
      // Fallback for invalid URLs
      const parts = url.split('.');
      const extension = parts.length > 1 ? parts[parts.length - 1] : '';
      return extension ? `.${extension}` : '';
    }
  }

  // Download tour with all assets
  async downloadTourWithAssets(
    tour: Tour,
    onProgress?: (current: number, total: number, currentFile: string) => void
  ): Promise<boolean> {
    try {
      console.log(`🔄 Starting download for tour: ${tour.title}`);
      
      const tourDir = this.getTourDirectory(tour.id);
      const audioDir = this.getAudioDirectory(tour.id);
      const imageDir = this.getImageDirectory(tour.id);

      // Create directories
      await FileSystem.makeDirectoryAsync(tourDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
      await FileSystem.makeDirectoryAsync(imageDir, { intermediates: true });

      const imageFiles: Record<string, string> = {};
      const audioFiles: Record<string, string> = {};

      // Prepare download lists
      const imagesToDownload = [];
      const audiosToDownload = [];

      // Main tour image
      if (tour.image && !tour.image.startsWith('file://')) {
        const extension = this.getFileExtension(tour.image) || '.jpg';
        imagesToDownload.push({
          key: 'main',
          url: tour.image,
          filename: `main_image${extension}`
        });
      }

      // Stop images
      tour.stops.forEach(stop => {
        if (stop.image && !stop.image.startsWith('file://')) {
          const extension = this.getFileExtension(stop.image) || '.jpg';
          imagesToDownload.push({
            key: `${stop.id}_image`,
            url: stop.image,
            filename: `stop_${stop.id}_image${extension}`
          });
        }
      });

      // Stop audio files
      tour.stops.forEach(stop => {
        if (stop.audio && !stop.audio.startsWith('file://')) {
          const extension = this.getFileExtension(stop.audio) || '.mp3';
          audiosToDownload.push({
            key: stop.id,
            url: stop.audio,
            filename: `stop_${stop.id}_audio${extension}`
          });
        }
      });

      const totalFiles = imagesToDownload.length + audiosToDownload.length;
      let downloadedFiles = 0;

      console.log(`📊 Total files to download: ${totalFiles}`);
      onProgress?.(downloadedFiles, totalFiles, 'Starting download...');

      // Download images
      for (const img of imagesToDownload) {
        onProgress?.(downloadedFiles, totalFiles, `Downloading image: ${img.filename}`);
        
        const localPath = `${imageDir}${this.getSafeFilename(img.filename)}`;
        const success = await this.downloadFile(img.url, localPath);
        
        if (success) {
          imageFiles[img.key] = localPath;
          console.log(`✅ Image downloaded: ${img.key} -> ${localPath}`);
        } else {
          console.warn(`⚠️ Failed to download image: ${img.url}`);
          // Continue with download even if some images fail
        }
        
        downloadedFiles++;
        onProgress?.(downloadedFiles, totalFiles, `Downloaded image: ${img.filename}`);
      }

      // Download audio files
      for (const audio of audiosToDownload) {
        onProgress?.(downloadedFiles, totalFiles, `Downloading audio: ${audio.filename}`);
        
        const localPath = `${audioDir}${this.getSafeFilename(audio.filename)}`;
        const success = await this.downloadFile(audio.url, localPath);
        
        if (success) {
          audioFiles[audio.key] = localPath;
          console.log(`✅ Audio downloaded: ${audio.key} -> ${localPath}`);
        } else {
          console.warn(`⚠️ Failed to download audio: ${audio.url}`);
          // Continue with download even if some audio files fail
        }
        
        downloadedFiles++;
        onProgress?.(downloadedFiles, totalFiles, `Downloaded audio: ${audio.filename}`);
      }

      // Calculate actual total size
      let totalSize = 0;
      try {
        const allFiles = [...Object.values(imageFiles), ...Object.values(audioFiles)];
        for (const filePath of allFiles) {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && fileInfo.size) {
            totalSize += fileInfo.size;
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not calculate exact size:', error);
        // Fallback estimation
        totalSize = Object.keys(imageFiles).length * 200000 + Object.keys(audioFiles).length * 2000000;
      }

      // Save offline content metadata
      const offlineContent: OfflineContent = {
        tourId: tour.id,
        tourData: tour,
        downloadedAt: new Date().toISOString(),
        size: totalSize,
        imageFiles,
        audioFiles,
      };

      // Store metadata in AsyncStorage
      await AsyncStorage.setItem(
        `tour_${tour.id}_offline_content`,
        JSON.stringify(offlineContent)
      );

      // Mark as offline
      await AsyncStorage.setItem(`tour_${tour.id}_offline`, 'true');
      await AsyncStorage.setItem(`tour_${tour.id}_download_date`, new Date().toISOString());

      console.log(`✅ Tour ${tour.title} downloaded successfully`);
      console.log(`📊 Downloaded ${downloadedFiles}/${totalFiles} files`);
      console.log(`📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

      onProgress?.(totalFiles, totalFiles, 'Download completed!');
      return true;

    } catch (error) {
      console.error(`❌ Error downloading tour ${tour.id}:`, error);
      onProgress?.(0, 0, 'Download failed');
      
      // Clean up partial download
      try {
        const tourDir = this.getTourDirectory(tour.id);
        const dirInfo = await FileSystem.getInfoAsync(tourDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(tourDir, { idempotent: true });
        }
        
        // Clean up AsyncStorage
        await AsyncStorage.removeItem(`tour_${tour.id}_offline_content`);
        await AsyncStorage.removeItem(`tour_${tour.id}_offline`);
        await AsyncStorage.removeItem(`tour_${tour.id}_download_date`);
      } catch (cleanupError) {
        console.warn('⚠️ Could not clean up failed download:', cleanupError);
      }
      
      return false;
    }
  }

  // Get offline content
  async getOfflineContent(tourId: string): Promise<OfflineContent | null> {
    try {
      const stored = await AsyncStorage.getItem(`tour_${tourId}_offline_content`);
      if (stored) {
        const content = JSON.parse(stored) as OfflineContent;
        
        // Verify files still exist
        const allFiles = [...Object.values(content.imageFiles), ...Object.values(content.audioFiles)];
        let hasAllFiles = true;
        
        for (const filePath of allFiles) {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (!fileInfo.exists) {
            console.warn(`⚠️ Missing offline file: ${filePath}`);
            hasAllFiles = false;
            break;
          }
        }
        
        if (hasAllFiles) {
          return content;
        } else {
          // Clean up corrupted offline content
          console.warn(`🗑️ Cleaning up corrupted offline content for tour ${tourId}`);
          await this.removeTour(tourId);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting offline content for ${tourId}:`, error);
      return null;
    }
  }

  // Get all offline tours
  async getAllOfflineTours(): Promise<OfflineContent[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineContentKeys = keys.filter(key => key.endsWith('_offline_content'));
      
      const offlineTours: OfflineContent[] = [];
      
      for (const key of offlineContentKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          try {
            const content = JSON.parse(stored) as OfflineContent;
            
            // Quick verification - check if at least the tour directory exists
            const tourDir = this.getTourDirectory(content.tourId);
            const dirInfo = await FileSystem.getInfoAsync(tourDir);
            
            if (dirInfo.exists) {
              offlineTours.push(content);
            } else {
              // Clean up orphaned metadata
              console.warn(`🗑️ Cleaning up orphaned metadata for tour ${content.tourId}`);
              await AsyncStorage.removeItem(key);
              const tourId = content.tourId;
              await AsyncStorage.removeItem(`tour_${tourId}_offline`);
              await AsyncStorage.removeItem(`tour_${tourId}_download_date`);
            }
          } catch (parseError) {
            console.warn(`⚠️ Could not parse offline content for key ${key}:`, parseError);
            // Remove corrupted entry
            await AsyncStorage.removeItem(key);
          }
        }
      }
      
      return offlineTours;
    } catch (error) {
      console.error('❌ Error getting all offline tours:', error);
      return [];
    }
  }

  // Get offline audio path
  async getOfflineAudioPath(tourId: string, stopId: string): Promise<string | null> {
    try {
      const offlineContent = await this.getOfflineContent(tourId);
      if (offlineContent && offlineContent.audioFiles[stopId]) {
        const filePath = offlineContent.audioFiles[stopId];
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          return filePath;
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting offline audio path for ${tourId}/${stopId}:`, error);
      return null;
    }
  }

  // Get offline image path
  async getOfflineImagePath(tourId: string, imageKey: string): Promise<string | null> {
    try {
      const offlineContent = await this.getOfflineContent(tourId);
      if (offlineContent && offlineContent.imageFiles[imageKey]) {
        const filePath = offlineContent.imageFiles[imageKey];
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          return filePath;
        }
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting offline image path for ${tourId}/${imageKey}:`, error);
      return null;
    }
  }

  // Remove tour
  async removeTour(tourId: string): Promise<void> {
    try {
      console.log(`🗑️ Removing offline tour: ${tourId}`);
      
      // Remove files from filesystem
      const tourDir = this.getTourDirectory(tourId);
      const dirInfo = await FileSystem.getInfoAsync(tourDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(tourDir, { idempotent: true });
        console.log(`✅ Removed tour directory: ${tourDir}`);
      }

      // Remove from AsyncStorage
      await AsyncStorage.removeItem(`tour_${tourId}_offline`);
      await AsyncStorage.removeItem(`tour_${tourId}_offline_content`);
      await AsyncStorage.removeItem(`tour_${tourId}_download_date`);

      console.log(`✅ Tour ${tourId} removed completely`);
    } catch (error) {
      console.error(`❌ Error removing tour ${tourId}:`, error);
      throw error;
    }
  }

  // Clear all offline content
  async clearAllOfflineContent(): Promise<void> {
    try {
      console.log('🗑️ Clearing all offline content...');
      
      // Remove all tour directories
      const baseInfo = await FileSystem.getInfoAsync(this.baseDir);
      if (baseInfo.exists) {
        await FileSystem.deleteAsync(this.baseDir, { idempotent: true });
        await this.ensureBaseDirectory(); // Recreate base directory
      }

      // Remove all AsyncStorage entries
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter(key => 
        key.startsWith('tour_') && (
          key.endsWith('_offline') ||
          key.endsWith('_offline_content') ||
          key.endsWith('_download_date')
        )
      );

      if (offlineKeys.length > 0) {
        await AsyncStorage.multiRemove(offlineKeys);
      }

      console.log('✅ All offline content cleared');
    } catch (error) {
      console.error('❌ Error clearing all offline content:', error);
      throw error;
    }
  }

  // Get storage stats
  async getStorageStats(): Promise<{ totalSize: number; tourCount: number }> {
    try {
      const offlineTours = await this.getAllOfflineTours();
      const totalSize = offlineTours.reduce((sum, tour) => sum + tour.size, 0);
      
      return {
        totalSize,
        tourCount: offlineTours.length
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return { totalSize: 0, tourCount: 0 };
    }
  }

  // Check if tour files are intact
  async verifyTourIntegrity(tourId: string): Promise<boolean> {
    try {
      const offlineContent = await this.getOfflineContent(tourId);
      if (!offlineContent) return false;

      const allFiles = [...Object.values(offlineContent.imageFiles), ...Object.values(offlineContent.audioFiles)];
      
      for (const filePath of allFiles) {
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists || !fileInfo.size || fileInfo.size === 0) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error verifying tour integrity for ${tourId}:`, error);
      return false;
    }
  }

  // Get tour download info
  async getTourDownloadInfo(tourId: string): Promise<{
    isDownloaded: boolean;
    downloadDate?: string;
    size?: number;
    fileCount?: number;
  }> {
    try {
      const isOffline = await AsyncStorage.getItem(`tour_${tourId}_offline`);
      if (!isOffline) {
        return { isDownloaded: false };
      }

      const downloadDate = await AsyncStorage.getItem(`tour_${tourId}_download_date`);
      const offlineContent = await this.getOfflineContent(tourId);

      if (offlineContent) {
        const fileCount = Object.keys(offlineContent.imageFiles).length + Object.keys(offlineContent.audioFiles).length;
        return {
          isDownloaded: true,
          downloadDate: downloadDate || undefined,
          size: offlineContent.size,
          fileCount
        };
      }

      return { isDownloaded: true, downloadDate: downloadDate || undefined };
    } catch (error) {
      console.error(`❌ Error getting tour download info for ${tourId}:`, error);
      return { isDownloaded: false };
    }
  }
}

// Export singleton instance getter
export const getOfflineService = (): OfflineService => {
  if (!offlineServiceInstance) {
    offlineServiceInstance = new OfflineService();
  }
  return offlineServiceInstance;
};

// Default export for backward compatibility
export default getOfflineService;