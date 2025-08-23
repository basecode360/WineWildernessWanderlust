// services/ProgressService.ts - Handle user stop completion tracking (FIXED)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface UserStopCompletion {
  id?: number;
  user_id: string;
  stop_id: string;
  completed_at: string;
}

export interface StopProgress {
  stopId: string;
  tourId: string;
  completedAt: string;
  isCompleted: boolean;
}

class ProgressService {
  private static instance: ProgressService;
  private offlineQueue: UserStopCompletion[] = [];

  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  // Check network connectivity
  private async isOnline(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Verify database table exists and has correct structure
  async verifyDatabaseTable(): Promise<boolean> {
    try {
      console.log('🔍 Verifying user_stop_completion table structure...');
      
      const { data, error } = await supabase
        .from('user_stop_completion')
        .select('*')
        .limit(1);

      if (error) {
        console.error('❌ Table verification failed:', error);
        console.error('❌ Please ensure the table exists with this structure:');
        console.error(`
CREATE TABLE user_stop_completion (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stop_id TEXT NOT NULL,
  completed_at TIMESTAMP DEFAULT now()
);
        `);
        return false;
      }

      console.log('✅ Table verification successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection error during verification:', error);
      return false;
    }
  }

  // ADDED: Debug RLS and user authentication
  private async debugRLSAndAuth(): Promise<void> {
    try {
      console.log('🔍 Debugging RLS and authentication...');
      
      // Check current user from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        return;
      }
      
      if (!user) {
        console.error('❌ No authenticated user found!');
        return;
      }
      
      console.log('✅ Current authenticated user:', {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.role
      });
      
      // Test if we can query the table with RLS
      const { data: testQuery, error: queryError } = await supabase
        .from('user_stop_completion')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
        
      if (queryError) {
        console.error('❌ RLS Query error:', queryError);
      } else {
        console.log('✅ RLS Query successful, existing records:', testQuery);
      }
      
      // Test RLS policy by checking if we can read from the table
      const { data: rlsTest, error: rlsError } = await supabase
        .from('user_stop_completion')
        .select('count(*)')
        .single();
        
      console.log('📊 RLS read test result:', { data: rlsTest, error: rlsError });
      
    } catch (error) {
      console.error('❌ Debug RLS error:', error);
    }
  }

  // SIMPLIFIED: Test database insertion with RLS debugging
  async testDatabaseInsertion(userId: string): Promise<void> {
    try {
      // First debug RLS and auth
      await this.debugRLSAndAuth();
      
      // Check what stops exist in the database
      console.log('🔍 Checking available stops in database...');
      const { data: stops, error: stopsError } = await supabase
        .from('stops')
        .select('id, title, tour_id')
        .limit(5);

      if (stopsError) {
        console.error('❌ Error fetching stops:', stopsError);
        throw new Error(`Cannot fetch stops: ${stopsError.message}`);
      }

      console.log('📋 Available stops:', stops);

      if (!stops || stops.length === 0) {
        console.error('❌ No stops found in database');
        throw new Error('No stops found in database for testing');
      }

      const realStopId = stops[0].id;
      console.log(`✅ Using stop ID: ${realStopId} (${stops[0].title})`);

      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Authentication issue:', authError);
        throw new Error('User not authenticated');
      }
      
      console.log('👤 Using authenticated user ID:', user.id);
      console.log('👤 Provided user ID:', userId);
      console.log('🔍 User IDs match:', user.id === userId);

      const testCompletion = {
        user_id: user.id, // Use the authenticated user ID instead of provided userId
        stop_id: realStopId,
        completed_at: new Date().toISOString()
      };

      console.log('🧪 Testing database insertion:', testCompletion);

      await this.saveToDatabase(testCompletion);
      console.log('✅ Database insertion test successful - This means audio completion tracking will work!');

      // Clean up test record
      const { error: deleteError } = await supabase
        .from('user_stop_completion')
        .delete()
        .eq('user_id', user.id)
        .eq('stop_id', realStopId);

      if (deleteError) {
        console.warn('⚠️ Could not clean up test record:', deleteError);
      } else {
        console.log('🧹 Test record cleaned up successfully');
      }
    } catch (error) {
      console.error('❌ Database insertion test failed:', error);
      throw error;
    }
  }

  // FIXED: Mark stop as completed using authenticated user ID
  async markStopCompleted(userId: string, stopId: string, tourId: string): Promise<void> {
    const completedAt = new Date().toISOString();
    console.log(`🎯 markStopCompleted called: userId=${userId}, stopId=${stopId}, tourId=${tourId}`);

    try {
      // Get the authenticated user to ensure we use the correct user ID for RLS
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('❌ Authentication error in markStopCompleted:', authError);
        throw new Error('User not authenticated');
      }
      
      // Use the authenticated user ID for database operations
      const authenticatedUserId = user.id;
      console.log('👤 Using authenticated user ID:', authenticatedUserId);
      console.log('🔍 Provided vs Authenticated user ID match:', userId === authenticatedUserId);

      const completion: UserStopCompletion = {
        user_id: authenticatedUserId, // Use authenticated user ID
        stop_id: stopId,
        completed_at: completedAt
      };

      console.log(`📝 Creating completion record:`, completion);

      const online = await this.isOnline();
      console.log(`🌐 Network status: ${online ? 'online' : 'offline'}`);

      if (online) {
        console.log(`🌐 Attempting to save to database...`);
        
        try {
          await this.saveToDatabase(completion);
          console.log(`✅ Database save successful for stop ${stopId}`);
        } catch (dbError) {
          console.error(`❌ Database save failed for stop ${stopId}:`, dbError);
          // Continue to save locally even if database fails
        }
        
        // Also save locally for offline access with user-specific key
        await this.saveToLocalStorage(stopId, tourId, completedAt, authenticatedUserId);
        console.log(`💾 Local storage save completed for stop ${stopId}`);
        
        // Process any queued offline completions
        await this.processOfflineQueue();
        console.log(`🔄 Processed offline queue`);
      } else {
        console.log(`📱 Saving offline: stop ${stopId}`);
        // Save to local storage and queue for later sync
        await this.saveToLocalStorage(stopId, tourId, completedAt, authenticatedUserId);
        await this.queueForOfflineSync(completion);
        
        console.log(`📱 Stop ${stopId} queued for offline sync`);
      }

      console.log(`🎉 Stop ${stopId} marked as completed successfully`);
    } catch (error) {
      console.error('❌ Error in markStopCompleted:', error);
      
      // Fallback to local storage if everything fails
      try {
        await this.saveToLocalStorage(stopId, tourId, completedAt, userId);
        await this.queueForOfflineSync({
          user_id: userId,
          stop_id: stopId,
          completed_at: completedAt
        });
        console.log(`📱 Fallback save completed for stop ${stopId}`);
      } catch (fallbackError) {
        console.error('❌ Even fallback save failed:', fallbackError);
      }
    }
  }

  // Save completion to Supabase database
  private async saveToDatabase(completion: UserStopCompletion): Promise<void> {
    console.log('💾 Attempting to save to database:', completion);
    
    const { data, error } = await supabase
      .from('user_stop_completion')
      .insert([{
        user_id: completion.user_id,
        stop_id: completion.stop_id,
        completed_at: completion.completed_at
      }])
      .select(); // Add select to get returned data for verification

    if (error) {
      console.error('❌ Database save error:', error);
      throw new Error(`Database save failed: ${error.message}`);
    }

    console.log(`✅ Stop completion saved to database successfully:`, data);
  }

  // FIXED: Save to local storage with user-specific keys
  private async saveToLocalStorage(stopId: string, tourId: string, completedAt: string, userId?: string): Promise<void> {
    const progress: StopProgress = {
      stopId,
      tourId,
      completedAt,
      isCompleted: true
    };

    // Make key user-specific to avoid cross-user contamination
    const userPrefix = userId ? `user_${userId}_` : '';
    const key = `${userPrefix}progress_${tourId}_${stopId}_completed`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));
    console.log(`💾 Saved to local storage with key: ${key}`);
  }

  // Queue completion for offline sync
  private async queueForOfflineSync(completion: UserStopCompletion): Promise<void> {
    try {
      const queue = await AsyncStorage.getItem('offline_completion_queue');
      const existingQueue: UserStopCompletion[] = queue ? JSON.parse(queue) : [];
      
      // Check if already in queue
      const alreadyQueued = existingQueue.some(item => 
        item.user_id === completion.user_id && item.stop_id === completion.stop_id
      );

      if (!alreadyQueued) {
        existingQueue.push(completion);
        await AsyncStorage.setItem('offline_completion_queue', JSON.stringify(existingQueue));
      }
    } catch (error) {
      console.error('❌ Error queuing offline completion:', error);
    }
  }

  // Process offline queue when coming back online
  async processOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_completion_queue');
      if (!queueData) return;

      const queue: UserStopCompletion[] = JSON.parse(queueData);
      if (queue.length === 0) return;

      console.log(`🔄 Processing ${queue.length} offline completions`);

      const successfulSyncs: number[] = [];

      for (let i = 0; i < queue.length; i++) {
        try {
          await this.saveToDatabase(queue[i]);
          successfulSyncs.push(i);
        } catch (error) {
          console.warn(`⚠️ Failed to sync completion ${i}:`, error);
        }
      }

      // Remove successfully synced items from queue
      if (successfulSyncs.length > 0) {
        const remainingQueue = queue.filter((_, index) => !successfulSyncs.includes(index));
        await AsyncStorage.setItem('offline_completion_queue', JSON.stringify(remainingQueue));
        
        console.log(`✅ Successfully synced ${successfulSyncs.length} completions`);
      }
    } catch (error) {
      console.error('❌ Error processing offline queue:', error);
    }
  }

  // FIXED: Check completion with user-specific keys
  async isStopCompleted(userId: string, stopId: string): Promise<boolean> {
    try {
      console.log(`🔍 Checking completion status for user ${userId}, stop ${stopId}`);
      
      // Check user-specific local storage first
      const userSpecificKey = `user_${userId}_progress_*_${stopId}_completed`;
      const keys = await AsyncStorage.getAllKeys();
      const hasUserSpecificLocal = keys.some(key => 
        key.startsWith(`user_${userId}_`) && 
        key.includes(stopId) && 
        key.endsWith('_completed')
      );
      
      if (hasUserSpecificLocal) {
        console.log(`📱 Found user-specific local completion for stop ${stopId}`);
        return true;
      }

      // Then check database if online
      const online = await this.isOnline();
      if (online) {
        console.log(`🌐 Checking database for completion: user ${userId}, stop ${stopId}`);
        
        const { data, error } = await supabase
          .from('user_stop_completion')
          .select('id')
          .eq('user_id', userId)
          .eq('stop_id', stopId)
          .limit(1);

        if (error) {
          console.warn('⚠️ Database check failed, using local data:', error);
          return hasUserSpecificLocal;
        }

        const isCompleted = data && data.length > 0;
        console.log(`📊 Database completion status for stop ${stopId}: ${isCompleted}`);
        return isCompleted;
      }

      console.log(`📱 Using local completion status for stop ${stopId}: ${hasUserSpecificLocal}`);
      return hasUserSpecificLocal;
    } catch (error) {
      console.error('❌ Error checking stop completion:', error);
      return false;
    }
  }

  // Get all completed stops for user
  async getCompletedStops(userId: string): Promise<StopProgress[]> {
    try {
      const online = await this.isOnline();
      
      if (online) {
        // Get from database with tour info
        const { data, error } = await supabase
          .from('user_stop_completion')
          .select(`
            stop_id,
            completed_at,
            stops!inner(tour_id)
          `)
          .eq('user_id', userId);

        if (error) {
          console.warn('⚠️ Database fetch failed, using local data:', error);
          return await this.getLocalCompletedStops(userId);
        }

        if (data) {
          return data.map(item => ({
            stopId: item.stop_id,
            tourId: item.stops.tour_id,
            completedAt: item.completed_at,
            isCompleted: true
          }));
        }
      }

      // Fallback to local storage
      return await this.getLocalCompletedStops(userId);
    } catch (error) {
      console.error('❌ Error getting completed stops:', error);
      return await this.getLocalCompletedStops(userId);
    }
  }

  // FIXED: Get user-specific completed stops from local storage
  private async getLocalCompletedStops(userId?: string): Promise<StopProgress[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => {
        if (userId) {
          // Look for user-specific keys first
          return key.startsWith(`user_${userId}_progress_`) && key.endsWith('_completed');
        } else {
          // Fallback to generic keys (for backward compatibility)
          return key.startsWith('progress_') && key.endsWith('_completed');
        }
      });

      console.log(`🔍 Found ${progressKeys.length} ${userId ? 'user-specific' : 'generic'} progress keys`);

      const completedStops: StopProgress[] = [];

      for (const key of progressKeys) {
        const progressData = await AsyncStorage.getItem(key);
        if (progressData) {
          const progress = JSON.parse(progressData);
          completedStops.push(progress);
        }
      }

      return completedStops;
    } catch (error) {
      console.error('❌ Error getting local completed stops:', error);
      return [];
    }
  }

  // Get completed stops for specific tour
  async getCompletedStopsForTour(userId: string, tourId: string): Promise<StopProgress[]> {
    const allCompleted = await this.getCompletedStops(userId);
    return allCompleted.filter(stop => stop.tourId === tourId);
  }

  // Get total completed stops count (unique)
  async getTotalCompletedCount(userId: string): Promise<number> {
    const completedStops = await this.getCompletedStops(userId);
    
    // Use Set to ensure uniqueness (in case of duplicates)
    const uniqueStops = new Set(completedStops.map(stop => stop.stopId));
    return uniqueStops.size;
  }

  // Clear all progress (for logout/reset)
  async clearAllProgress(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => 
        key.startsWith('progress_') || key === 'offline_completion_queue'
      );
      
      await AsyncStorage.multiRemove(progressKeys);
      
      console.log('✅ All progress cleared');
    } catch (error) {
      console.error('❌ Error clearing progress:', error);
    }
  }

  // Sync progress when user logs in (merge local with remote)
  async syncProgressOnLogin(userId: string): Promise<void> {
    try {
      console.log('🔄 Syncing progress on login...');
      
      // Process any offline queue first
      await this.processOfflineQueue();
      
      // Get remote completions
      const online = await this.isOnline();
      if (online) {
        const remoteCompletions = await this.getCompletedStops(userId);
        
        // Save remote completions to local storage for offline access
        for (const completion of remoteCompletions) {
          await this.saveToLocalStorage(
            completion.stopId, 
            completion.tourId, 
            completion.completedAt
          );
        }
        
        console.log(`✅ Synced ${remoteCompletions.length} completions from server`);
      }
    } catch (error) {
      console.error('❌ Error syncing progress on login:', error);
    }
  }
  // ADDED: Force clear all progress data (for testing/debugging)
  async forceResetAllProgress(): Promise<void> {
    try {
      console.log('🧹 FORCE CLEARING ALL PROGRESS DATA...');
      
      // Clear AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => 
        key.startsWith('progress_') || 
        key === 'offline_completion_queue' ||
        key.includes('completed')
      );
      
      if (progressKeys.length > 0) {
        await AsyncStorage.multiRemove(progressKeys);
        console.log(`✅ Cleared ${progressKeys.length} items from AsyncStorage:`, progressKeys);
      }

      // Clear offline queue
      await AsyncStorage.removeItem('offline_completion_queue');
      console.log('✅ Cleared offline completion queue');
      
      console.log('🎉 ALL PROGRESS DATA CLEARED - Ready for fresh testing');
    } catch (error) {
      console.error('❌ Error force clearing progress:', error);
    }
  }

}

export const progressService = ProgressService.getInstance();