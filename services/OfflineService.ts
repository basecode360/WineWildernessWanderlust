// services/OfflineService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Tour, TourStop } from '../types/tour';
import { getTourById } from './tourServices';

export interface OfflineContent {
  tourId: string;
  downloadedAt: string;
  audioFiles: { [stopId: string]: string };
  imageFiles: { [key: string]: string };
  tourData: Tour;
  size: number;
}

export interface DownloadProgress {
  tourId: string;
  totalItems: number;
  downloadedItems: number;
  currentFile: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

class OfflineService {
  private static instance: OfflineService;
  private downloadProgressCallbacks = new Map<string, (progress: DownloadProgress) => void>();
  private activeDownloads = new Set<string>();

  static getInstance(): OfflineService {
    if (!OfflineService.instance) OfflineService.instance = new OfflineService();
    return OfflineService.instance;
  }

  private constructor() {
    this.ensureDirectoriesExist();
  }

  private async ensureDirectoriesExist() {
    try {
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}tours/audio/`, { intermediates: true });
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}tours/images/`, { intermediates: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async isTourAvailableOffline(tourId: string): Promise<boolean> {
    const content = await this.getOfflineContent(tourId);
    return !!content;
  }

  async getOfflineContent(tourId: string): Promise<OfflineContent | null> {
    try {
      const key = `offline_tour_${tourId}`;
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;

      const offlineContent: OfflineContent = JSON.parse(data);
      const filesExist = await this.verifyOfflineFiles(offlineContent);

      if (!filesExist) {
        await this.removeOfflineContent(tourId);
        return null;
      }

      return offlineContent;
    } catch (error) {
      console.error('Error getting offline content:', error);
      return null;
    }
  }

  async getAllOfflineTours(): Promise<OfflineContent[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const offlineKeys = keys.filter((k) => k.startsWith('offline_tour_'));
      const results: OfflineContent[] = [];

      for (const key of offlineKeys) {
        const data = await AsyncStorage.getItem(key);
        if (!data) continue;

        try {
          const content: OfflineContent = JSON.parse(data);
          const exists = await this.verifyOfflineFiles(content);
          if (exists) results.push(content);
          else await this.removeOfflineContent(content.tourId);
        } catch (err) {
          console.error('Error parsing offline content:', err);
        }
      }
      return results;
    } catch (error) {
      console.error('Error fetching offline tours:', error);
      return [];
    }
  }

  async downloadTour(
    tourId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    if (this.activeDownloads.has(tourId)) throw new Error('Tour already downloading');

    const tour = getTourById(tourId);
    if (!tour) throw new Error('Tour not found');

    this.activeDownloads.add(tourId);
    if (onProgress) this.downloadProgressCallbacks.set(tourId, onProgress);

    try {
      const audioStops = tour.stops.filter((stop) => stop.audio);
      const uniqueImages = this.getUniqueImages(tour);

      const totalItems = audioStops.length + uniqueImages.length;
      let downloadedItems = 0;
      let totalSize = 0;

      const audioFiles: { [stopId: string]: string } = {};
      const imageFiles: { [key: string]: string } = {};

      const progressUpdate = (currentFile: string, status: DownloadProgress['status'] = 'downloading') => {
        if (onProgress) {
          onProgress({
            tourId,
            totalItems,
            downloadedItems,
            currentFile,
            progress: totalItems > 0 ? downloadedItems / totalItems : 0,
            status,
          });
        }
      };

      // Download audio
      for (const stop of audioStops) {
        progressUpdate(`Audio: ${stop.title}`);
        const path = await this.downloadAudioFile(tourId, stop);
        audioFiles[stop.id] = path;
        const info = await FileSystem.getInfoAsync(path);
        totalSize += info.size || 0;
        downloadedItems++;
      }

      // Download images
      for (const imageKey of uniqueImages) {
        progressUpdate(`Image: ${imageKey}`);
        const path = await this.downloadImageFile(tourId, imageKey);
        imageFiles[imageKey] = path;
        const info = await FileSystem.getInfoAsync(path);
        totalSize += info.size || 0;
        downloadedItems++;
      }

      // Save metadata
      const offlineContent: OfflineContent = {
        tourId,
        downloadedAt: new Date().toISOString(),
        audioFiles,
        imageFiles,
        tourData: tour,
        size: totalSize,
      };

      await AsyncStorage.setItem(`offline_tour_${tourId}`, JSON.stringify(offlineContent));
      progressUpdate('Download completed', 'completed');

      return true;
    } catch (error) {
      console.error('Error downloading tour:', error);
      await this.cleanupPartialDownload(tourId);

      if (onProgress) {
        onProgress({
          tourId,
          totalItems: 0,
          downloadedItems: 0,
          currentFile: '',
          progress: 0,
          status: 'error',
          error: (error as Error).message,
        });
      }

      return false;
    } finally {
      this.activeDownloads.delete(tourId);
      this.downloadProgressCallbacks.delete(tourId);
    }
  }

  async cancelDownload(tourId: string): Promise<void> {
    if (!this.activeDownloads.has(tourId)) return;

    this.activeDownloads.delete(tourId);
    const callback = this.downloadProgressCallbacks.get(tourId);
    if (callback) callback({ tourId, totalItems: 0, downloadedItems: 0, currentFile: '', progress: 0, status: 'cancelled' });

    this.downloadProgressCallbacks.delete(tourId);
    await this.cleanupPartialDownload(tourId);
  }

  async removeOfflineContent(tourId: string): Promise<void> {
    try {
      const content = await this.getOfflineContent(tourId);
      if (!content) return;

      // Delete audio files
      for (const path of Object.values(content.audioFiles)) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }

      // Delete image files
      for (const path of Object.values(content.imageFiles)) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }

      await AsyncStorage.removeItem(`offline_tour_${tourId}`);
    } catch (error) {
      console.error('Error removing offline content:', error);
    }
  }

  async getOfflineAudioPath(tourId: string, stopId: string) {
    const content = await this.getOfflineContent(tourId);
    return content?.audioFiles[stopId] || null;
  }

  async getOfflineImagePath(tourId: string, imageKey: string) {
    const content = await this.getOfflineContent(tourId);
    return content?.imageFiles[imageKey] || null;
  }

  async getOfflineStorageUsage(): Promise<number> {
    const tours = await this.getAllOfflineTours();
    return tours.reduce((total, t) => total + t.size, 0);
  }

  async clearAllOfflineContent() {
    const tours = await this.getAllOfflineTours();
    for (const t of tours) await this.removeOfflineContent(t.tourId);
  }

  // Helpers
  private getUniqueImages(tour: Tour) {
    const set = new Set<string>();
    if (tour.image) set.add(tour.image);
    for (const stop of tour.stops) if (stop.image) set.add(stop.image);
    return Array.from(set);
  }

  private async verifyOfflineFiles(content: OfflineContent): Promise<boolean> {
    for (const path of Object.values(content.audioFiles)) {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return false;
    }
    for (const path of Object.values(content.imageFiles)) {
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) return false;
    }
    return true;
  }

  private async cleanupPartialDownload(tourId: string) {
    const audioDir = `${FileSystem.documentDirectory}tours/audio/`;
    const imageDir = `${FileSystem.documentDirectory}tours/images/`;

    for (const file of await FileSystem.readDirectoryAsync(audioDir)) {
      if (file.startsWith(`${tourId}_`)) await FileSystem.deleteAsync(`${audioDir}${file}`, { idempotent: true });
    }
    for (const file of await FileSystem.readDirectoryAsync(imageDir)) {
      if (file.startsWith(`${tourId}_`)) await FileSystem.deleteAsync(`${imageDir}${file}`, { idempotent: true });
    }

    await AsyncStorage.removeItem(`offline_tour_${tourId}`);
  }

  private async downloadAudioFile(tourId: string, stop: TourStop): Promise<string> {
  const path = `${FileSystem.documentDirectory}tours/audio/${tourId}_${stop.id}.mp3`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;

  if (!stop.audioUrl) throw new Error(`Audio URL missing for stop ${stop.id}`);
  await FileSystem.downloadAsync(stop.audioUrl, path);
  return path;
}


 private async downloadImageFile(tourId: string, imageUrl: string): Promise<string> {
  const fileName = `${tourId}_${imageUrl.split('/').pop()}`;
  const path = `${FileSystem.documentDirectory}tours/images/${fileName}`;
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) return path;

  await FileSystem.downloadAsync(imageUrl, path);
  return path;
}


  private getAudioAssetUri(fileName: string): string | null {
    try {
      const { getAudioAsset } = require('../utils/audioAssets');
      return getAudioAsset(fileName) || null;
    } catch {
      return null;
    }
  }

  private getImageAssetUri(fileName: string): string | null {
    try {
      const { getImageAsset } = require('../utils/imageAssets');
      return getImageAsset(fileName) || null;
    } catch {
      return null;
    }
  }
}

export default OfflineService;
