// services/ProgressService.ts - Fixed Data Insertion Issue
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

export interface UserStopCompletion {
  id?: number;
  user_id: string;
  stop_id: string;
  completed_at: string;
}

export interface StopProgress {
  id?: string;
  userId: string;
  stopId: string;
  tourId?: string;
  completedAt: Date | string;
  isCompleted: boolean;
}

// Cache for stop-to-tour mapping to avoid repeated queries
interface StopTourMapping {
  [stopId: string]: string; // stopId -> tourId
}

class ProgressService {
  private static instance: ProgressService;
  private localProgressCache: Map<string, StopProgress[]> = new Map();
  private stopTourMappingCache: StopTourMapping = {};
  private mappingCacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  // Generate consistent local storage key
  private getLocalStorageKey(userId: string, type: 'progress' | 'queue' = 'progress'): string {
    return `user_${userId}_${type}`;
  }

  // Check if device is online
  private async isOnline(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.warn('Could not check network status:', error);
      return false;
    }
  }

  // Get stop-to-tour mapping with caching
  private async getStopTourMappings(): Promise<StopTourMapping> {
    const now = Date.now();
    
    // Return cached mapping if still valid
    if (this.mappingCacheExpiry > now && Object.keys(this.stopTourMappingCache).length > 0) {
      return this.stopTourMappingCache;
    }

    try {
      console.log('Refreshing stop-to-tour mapping cache...');
      
      const { data: stops, error } = await supabase
        .from('stops')
        .select('id, tour_id');

      if (error) {
        console.error('Error fetching stop mappings:', error);
        return this.stopTourMappingCache; // Return old cache if available
      }

      // Build mapping object
      const newMapping: StopTourMapping = {};
      if (stops) {
        stops.forEach(stop => {
          newMapping[stop.id] = stop.tour_id;
        });
      }

      this.stopTourMappingCache = newMapping;
      this.mappingCacheExpiry = now + this.CACHE_DURATION;
      
      console.log(`Cached ${Object.keys(newMapping).length} stop-to-tour mappings`);
      return newMapping;
      
    } catch (error) {
      console.error('Error building stop mappings:', error);
      return this.stopTourMappingCache;
    }
  }

  // Get tour ID for a specific stop
  private async getTourIdForStop(stopId: string): Promise<string | null> {
    const mappings = await this.getStopTourMappings();
    return mappings[stopId] || null;
  }

  // FIXED: Mark stop as completed - MAIN METHOD
  async markStopCompleted(userId: string, stopId: string, tourId?: string, isOnline?: boolean): Promise<void> {
    const completedAt = new Date().toISOString();
    console.log(`=== MARK STOP COMPLETED ===`);
    console.log(`userId: ${userId}`);
    console.log(`stopId: ${stopId}`);
    console.log(`tourId: ${tourId}`);

    // Use provided isOnline or check network status
    const networkOnline = isOnline !== undefined ? isOnline : await this.isOnline();
    console.log(`Network status: ${networkOnline ? 'online' : 'offline'}`);

    try {
      const completion: UserStopCompletion = {
        user_id: userId,
        stop_id: stopId,
        completed_at: completedAt
      };

      // ALWAYS save to database first when online
      if (networkOnline) {
        try {
          // Check if already exists in database
          const { data: existing } = await supabase
            .from('user_stop_completion')
            .select('id')
            .eq('user_id', userId)
            .eq('stop_id', stopId)
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`Stop ${stopId} already completed in database`);
          } else {
            // Insert into database
            console.log('Inserting into database:', completion);
            const { data, error } = await supabase
              .from('user_stop_completion')
              .insert([{
                user_id: completion.user_id,
                stop_id: completion.stop_id,
                completed_at: completion.completed_at
              }])
              .select();

            if (error) {
              console.error('Database insert error:', error);
              console.error('Error details:', error.details, error.hint, error.code);
              throw error;
            }

            console.log('✅ Database insert successful:', data);
          }
        } catch (dbError) {
          console.error(`❌ Database operation failed for stop ${stopId}:`, dbError);
          // Continue with local storage but also queue for later sync
          await this.queueForOfflineSync(completion);
        }
      } else {
        // Offline: queue for later sync
        console.log(`📱 Offline: queuing stop ${stopId} for sync`);
        await this.queueForOfflineSync(completion);
      }

      // ALWAYS save locally (for offline access and consistency)
      await this.saveToLocalStorage(stopId, tourId, completedAt, userId);
      
      // Process any existing offline queue when online
      if (networkOnline) {
        await this.processOfflineQueue(userId);
      }

      // Update cache
      this.invalidateCache(userId);

      console.log(`✅ Stop ${stopId} marked as completed successfully`);
      console.log(`=== END MARK STOP COMPLETED ===`);
    } catch (error) {
      console.error('❌ Critical error in markStopCompleted:', error);
      
      // Ultimate fallback: save locally and queue for sync
      try {
        await this.saveToLocalStorage(stopId, tourId, completedAt, userId);
        await this.queueForOfflineSync({
          user_id: userId,
          stop_id: stopId,
          completed_at: completedAt
        });
        console.log(`💾 Fallback save completed for stop ${stopId}`);
      } catch (fallbackError) {
        console.error('💥 Even fallback save failed:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // Save to local storage
  private async saveToLocalStorage(stopId: string, tourId?: string, completedAt?: string, userId?: string): Promise<void> {
    if (!userId) {
      console.error('Cannot save to local storage: no userId provided');
      return;
    }

    try {
      // Get tourId from mapping if not provided
      const finalTourId = tourId || await this.getTourIdForStop(stopId);

      const progress: StopProgress = {
        userId,
        stopId,
        tourId: finalTourId || undefined,
        completedAt: completedAt || new Date().toISOString(),
        isCompleted: true
      };

      // Get existing progress for user
      const existingProgress = await this.getLocalProgressForUser(userId);
      
      // Check if already exists
      const alreadyExists = existingProgress.some(p => 
        p.stopId === stopId
      );

      if (!alreadyExists) {
        existingProgress.push(progress);
        
        const key = this.getLocalStorageKey(userId, 'progress');
        await AsyncStorage.setItem(key, JSON.stringify(existingProgress));
        
        // Update cache
        this.localProgressCache.set(userId, existingProgress);
        
        console.log(`Saved to local storage: stop ${stopId} for user ${userId}`);
      } else {
        console.log(`Stop ${stopId} already exists in local storage for user ${userId}`);
      }
    } catch (error) {
      console.error('Error saving to local storage:', error);
      throw error;
    }
  }

  // Get local progress for specific user
  private async getLocalProgressForUser(userId: string): Promise<StopProgress[]> {
    try {
      // Check cache first
      if (this.localProgressCache.has(userId)) {
        return this.localProgressCache.get(userId) || [];
      }

      const key = this.getLocalStorageKey(userId, 'progress');
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        const progress = JSON.parse(data);
        this.localProgressCache.set(userId, progress);
        return progress;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting local progress:', error);
      return [];
    }
  }

  // Invalidate cache for user
  private invalidateCache(userId: string): void {
    this.localProgressCache.delete(userId);
  }

  // Queue completion for offline sync
  private async queueForOfflineSync(completion: UserStopCompletion): Promise<void> {
    try {
      const queueKey = this.getLocalStorageKey(completion.user_id, 'queue');
      const existingQueueData = await AsyncStorage.getItem(queueKey);
      const existingQueue: UserStopCompletion[] = existingQueueData ? JSON.parse(existingQueueData) : [];
      
      // Check if already in queue
      const alreadyQueued = existingQueue.some(item => 
        item.user_id === completion.user_id && item.stop_id === completion.stop_id
      );

      if (!alreadyQueued) {
        existingQueue.push(completion);
        await AsyncStorage.setItem(queueKey, JSON.stringify(existingQueue));
        console.log(`Queued completion for sync: ${completion.stop_id}`);
      }
    } catch (error) {
      console.error('Error queuing offline completion:', error);
    }
  }

  // Process offline queue when coming back online
  async processOfflineQueue(userId: string): Promise<void> {
    try {
      const queueKey = this.getLocalStorageKey(userId, 'queue');
      const queueData = await AsyncStorage.getItem(queueKey);
      
      if (!queueData) return;

      const queue: UserStopCompletion[] = JSON.parse(queueData);
      if (queue.length === 0) return;

      console.log(`Processing ${queue.length} offline completions for user ${userId}`);

      const successfulSyncs: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        try {
          // Check if already exists in database before inserting
          const { data: existing } = await supabase
            .from('user_stop_completion')
            .select('id')
            .eq('user_id', queue[i].user_id)
            .eq('stop_id', queue[i].stop_id)
            .limit(1);

          if (!existing || existing.length === 0) {
            const { error } = await supabase
              .from('user_stop_completion')
              .insert([{
                user_id: queue[i].user_id,
                stop_id: queue[i].stop_id,
                completed_at: queue[i].completed_at
              }]);

            if (!error) {
              console.log(`Synced completion: ${queue[i].stop_id}`);
            }
          } else {
            console.log(`Completion already exists in database: ${queue[i].stop_id}`);
          }
          
          successfulSyncs.push(i);
        } catch (error) {
          console.warn(`Failed to sync completion ${i}:`, error);
        }
      }

      // Remove successfully synced items from queue
      if (successfulSyncs.length > 0) {
        const remainingQueue = queue.filter((_, index) => !successfulSyncs.includes(index));
        await AsyncStorage.setItem(queueKey, JSON.stringify(remainingQueue));
        
        console.log(`Successfully synced ${successfulSyncs.length} completions for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error processing offline queue for user ${userId}:`, error);
    }
  }

  // Check completion with proper offline support
  async isStopCompleted(userId: string, stopId: string, isOnline?: boolean): Promise<boolean> {
    try {
      console.log(`Checking completion status for user ${userId}, stop ${stopId}`);
      
      // Use provided isOnline or check network status
      const networkOnline = isOnline !== undefined ? isOnline : await this.isOnline();
            
      if (networkOnline) {
        // Check database first when online
        const { data, error } = await supabase
          .from('user_stop_completion')
          .select('id')
          .eq('user_id', userId)
          .eq('stop_id', stopId)
          .limit(1);

        if (!error && data && data.length > 0) {
          console.log(`Database: stop ${stopId} is completed`);
          return true;
        }
      }

      // Check local storage (both online and offline)
      const localProgress = await this.getLocalProgressForUser(userId);
      const isCompletedLocally = localProgress.some(p => p.stopId === stopId);
      
      console.log(`Local storage: stop ${stopId} completion status: ${isCompletedLocally}`);
      return isCompletedLocally;
      
    } catch (error) {
      console.error('Error checking stop completion:', error);
      
      // Fallback to local storage only
      try {
        const localProgress = await this.getLocalProgressForUser(userId);
        return localProgress.some(p => p.stopId === stopId);
      } catch (localError) {
        console.error('Error checking local completion:', localError);
        return false;
      }
    }
  }

  // Get all completed stops - optimized with batch mapping
  async getCompletedStops(userId: string, isOnline?: boolean): Promise<StopProgress[]> {
    try {
      console.log(`Getting completed stops for user: ${userId}`);
      
      // Use provided isOnline or check network status
      const networkOnline = isOnline !== undefined ? isOnline : await this.isOnline();
      
      console.log(`Network: ${networkOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      if (networkOnline) {
        try {
          // Get user completions
          const { data: userCompletions, error: userError } = await supabase
            .from('user_stop_completion')
            .select('stop_id, completed_at')
            .eq('user_id', userId);

          if (userError) {
            console.error('Database query failed:', userError);
            return await this.getLocalProgressForUser(userId);
          }

          if (!userCompletions || userCompletions.length === 0) {
            console.log('No completions in database for this user');
            const localData = await this.getLocalProgressForUser(userId);
            console.log(`Local storage has ${localData.length} completions`);
            return localData;
          }

          console.log(`DATABASE SUCCESS: ${userCompletions.length} completions found`);
          
          // Get all stop-to-tour mappings at once (more efficient)
          const mappings = await this.getStopTourMappings();
          
          // Map completions to StopProgress format with tour IDs
          const completionsWithTourId: StopProgress[] = [];
          
          for (const completion of userCompletions) {
            const tourId = mappings[completion.stop_id];
            
            completionsWithTourId.push({
              userId,
              stopId: completion.stop_id,
              tourId: tourId,
              completedAt: new Date(completion.completed_at),
              isCompleted: true
            });
          }

          console.log(`FINAL DATABASE RESULT: ${completionsWithTourId.length} completions with tour_id`);

          // Save to local storage and cache
          const key = this.getLocalStorageKey(userId, 'progress');
          await AsyncStorage.setItem(key, JSON.stringify(completionsWithTourId));
          this.localProgressCache.set(userId, completionsWithTourId);

          return completionsWithTourId;
          
        } catch (dbError) {
          console.error('Database operation failed:', dbError);
          return await this.getLocalProgressForUser(userId);
        }
      }

      // Offline mode
      console.log('OFFLINE: Using local storage only');
      return await this.getLocalProgressForUser(userId);
    } catch (error) {
      console.error('Critical error in getCompletedStops:', error);
      // Final fallback
      return await this.getLocalProgressForUser(userId);
    }
  }

  // Get completed stops for specific tour
  async getCompletedStopsForTour(userId: string, tourId: string, isOnline?: boolean): Promise<StopProgress[]> {
    const allCompleted = await this.getCompletedStops(userId, isOnline);
    return allCompleted.filter(stop => stop.tourId === tourId);
  }

  // Get total completed count
  async getTotalCompletedCount(userId: string): Promise<number> {
    try {
      console.log('Getting total completed count for user:', userId);
      
      if (!userId || userId.trim() === '') {
        console.error('Invalid userId provided');
        return 0;
      }

      const online = await this.isOnline();
      console.log('Network status:', online ? 'ONLINE' : 'OFFLINE');

      if (online) {
        try {
          // Direct count query to database
          const { count, error } = await supabase
            .from('user_stop_completion')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

          if (error) {
            console.error('Database count query failed:', error);
            const localProgress = await this.getLocalProgressForUser(userId);
            return localProgress.length;
          }

          console.log('Database count result:', count);
          return count || 0;

        } catch (dbError) {
          console.error('Database error:', dbError);
          const localProgress = await this.getLocalProgressForUser(userId);
          return localProgress.length;
        }
      } else {
        // Offline - use local storage
        const localProgress = await this.getLocalProgressForUser(userId);
        return localProgress.length;
      }

    } catch (error) {
      console.error('Error in getTotalCompletedCount:', error);
      try {
        const localProgress = await this.getLocalProgressForUser(userId);
        return localProgress.length;
      } catch (localError) {
        console.error('Even local storage failed:', localError);
        return 0;
      }
    }
  }

  // Clear all progress for specific user
  async clearAllProgress(userId: string): Promise<void> {
    try {
      console.log(`Clearing all progress for user: ${userId}`);
      
      // Clear from database if online
      const online = await this.isOnline();
      if (online) {
        try {
          const { error } = await supabase
            .from('user_stop_completion')
            .delete()
            .eq('user_id', userId);
            
          if (error) {
            console.warn('Could not clear from database:', error);
          } else {
            console.log('Cleared database records for user');
          }
        } catch (dbError) {
          console.warn('Database clear failed:', dbError);
        }
      }
      
      // Clear local storage
      const progressKey = this.getLocalStorageKey(userId, 'progress');
      const queueKey = this.getLocalStorageKey(userId, 'queue');
      
      await AsyncStorage.multiRemove([progressKey, queueKey]);
      this.invalidateCache(userId);
      
      console.log('All progress cleared successfully');
    } catch (error) {
      console.error('Error clearing progress:', error);
    }
  }

  // Sync progress when user logs in
  async syncProgressOnLogin(userId: string): Promise<void> {
    try {
      console.log(`Syncing progress on login for user: ${userId}`);
      
      // Process any offline queue first
      await this.processOfflineQueue(userId);
      
      // Get remote completions and merge with local
      const online = await this.isOnline();
      if (online) {
        await this.getCompletedStops(userId, online); // This will automatically merge and save locally
        console.log(`Progress synced successfully for user ${userId}`);
      } else {
        console.log(`Offline: using local progress only for user ${userId}`);
      }
    } catch (error) {
      console.error('Error syncing progress on login:', error);
    }
  }

  // Refresh progress
  async refreshProgress(userId: string): Promise<void> {
    try {
      console.log('Refreshing progress for user:', userId);
      
      const online = await this.isOnline();
      if (online) {
        await this.processOfflineQueue(userId);
      }
      
      // Clear cache to force fresh data
      this.localProgressCache.delete(userId);
      
      // Reload progress
      await this.getCompletedStops(userId, online);
      
      console.log('Progress refreshed successfully');
    } catch (error) {
      console.error('Error refreshing progress:', error);
    }
  }
}

export const progressService = ProgressService.getInstance();