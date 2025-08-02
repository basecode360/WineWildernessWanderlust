// services/StorageService.ts - Offline content management
import * as FileSystem from 'expo-file-system';
import { DownloadProgress, Tour } from '../types/tour';

export class StorageService {
  private static instance: StorageService;
  private readonly TOURS_DIR = `${FileSystem.documentDirectory}tours/`;
  private readonly AUDIO_DIR = `${FileSystem.documentDirectory}tours/audio/`;
  private readonly IMAGES_DIR = `${FileSystem.documentDirectory}tours/images/`;

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  async initializeDirectories(): Promise<void> {
    try {
      await FileSystem.makeDirectoryAsync(this.TOURS_DIR, {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(this.AUDIO_DIR, {
        intermediates: true,
      });
      await FileSystem.makeDirectoryAsync(this.IMAGES_DIR, {
        intermediates: true,
      });
    } catch (error) {
      console.error('Error initializing directories:', error);
    }
  }

  async downloadTourContent(
    tour: Tour,
    baseUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    try {
      await this.initializeDirectories();

      const totalStops = tour.stops.length;
      let completedStops = 0;

      // Download audio files for each stop
      for (const stop of tour.stops) {
        try {
          // Download audio
          const audioUrl = `${baseUrl}/audio/${stop.audio}`;
          const audioLocalPath = `${this.AUDIO_DIR}${stop.audio}`;

          await FileSystem.downloadAsync(audioUrl, audioLocalPath);

          // Download image
          const imageUrl = `${baseUrl}/images/${stop.image}`;
          const imageLocalPath = `${this.IMAGES_DIR}${stop.image}`;

          await FileSystem.downloadAsync(imageUrl, imageLocalPath);

          completedStops++;
          onProgress?.({
            stopId: stop.id,
            progress: completedStops / totalStops,
            isComplete: completedStops === totalStops,
          });
        } catch (error) {
          console.error(
            `Error downloading content for stop ${stop.id}:`,
            error
          );
          return false;
        }
      }

      // Save tour metadata
      await this.saveTourMetadata(tour);
      return true;
    } catch (error) {
      console.error('Error downloading tour content:', error);
      return false;
    }
  }

  async saveTourMetadata(tour: Tour): Promise<void> {
    try {
      const tourPath = `${this.TOURS_DIR}${tour.id}.json`;
      const tourData = {
        ...tour,
        isDownloaded: true,
        downloadedAt: new Date().toISOString(),
      };

      await FileSystem.writeAsStringAsync(
        tourPath,
        JSON.stringify(tourData, null, 2)
      );
    } catch (error) {
      console.error('Error saving tour metadata:', error);
    }
  }

  async loadTourMetadata(tourId: string): Promise<Tour | null> {
    try {
      const tourPath = `${this.TOURS_DIR}${tourId}.json`;
      const tourExists = await this.fileExists(tourPath);

      if (!tourExists) return null;

      const tourData = await FileSystem.readAsStringAsync(tourPath);
      return JSON.parse(tourData) as Tour;
    } catch (error) {
      console.error('Error loading tour metadata:', error);
      return null;
    }
  }

  async getLocalAudioPath(audioFileName: string): Promise<string | null> {
    try {
      const audioPath = `${this.AUDIO_DIR}${audioFileName}`;
      const exists = await this.fileExists(audioPath);
      return exists ? audioPath : null;
    } catch (error) {
      console.error('Error getting local audio path:', error);
      return null;
    }
  }

  async getLocalImagePath(imageFileName: string): Promise<string | null> {
    try {
      const imagePath = `${this.IMAGES_DIR}${imageFileName}`;
      const exists = await this.fileExists(imagePath);
      return exists ? imagePath : null;
    } catch (error) {
      console.error('Error getting local image path:', error);
      return null;
    }
  }

  async deleteTourContent(tourId: string): Promise<boolean> {
    try {
      // Delete tour metadata
      const tourPath = `${this.TOURS_DIR}${tourId}.json`;
      if (await this.fileExists(tourPath)) {
        await FileSystem.deleteAsync(tourPath);
      }

      // Delete associated audio and image files
      // Note: In a production app, you'd want to track which files belong to which tour
      // to avoid deleting files used by other tours

      return true;
    } catch (error) {
      console.error('Error deleting tour content:', error);
      return false;
    }
  }

  async getStorageInfo(): Promise<{
    totalSpace?: number;
    freeSpace?: number;
    usedSpace: number;
  }> {
    try {
      const freeSpace = await FileSystem.getFreeDiskStorageAsync();
      const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
      const usedSpace = totalSpace - freeSpace;

      return {
        totalSpace,
        freeSpace,
        usedSpace,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { usedSpace: 0 };
    }
  }

  async getTourSize(tourId: string): Promise<number> {
    try {
      let totalSize = 0;

      // Get tour metadata file size
      const tourPath = `${this.TOURS_DIR}${tourId}.json`;
      if (await this.fileExists(tourPath)) {
        const info = await FileSystem.getInfoAsync(tourPath);
        totalSize += info.size || 0;
      }

      // Calculate size of audio and image files
      // This would require tracking which files belong to which tour
      // For now, return a rough estimate

      return totalSize;
    } catch (error) {
      console.error('Error calculating tour size:', error);
      return 0;
    }
  }

  async listDownloadedTours(): Promise<string[]> {
    try {
      await this.initializeDirectories();
      const tourFiles = await FileSystem.readDirectoryAsync(this.TOURS_DIR);
      return tourFiles
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace('.json', ''));
    } catch (error) {
      console.error('Error listing downloaded tours:', error);
      return [];
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch (error) {
      return false;
    }
  }

  // Utility method to clear all tour data (for testing/debugging)
  async clearAllTourData(): Promise<void> {
    try {
      if (await this.fileExists(this.TOURS_DIR)) {
        await FileSystem.deleteAsync(this.TOURS_DIR, { idempotent: true });
      }
      await this.initializeDirectories();
    } catch (error) {
      console.error('Error clearing tour data:', error);
    }
  }
}
