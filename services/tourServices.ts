// services/tourServices.ts - Enhanced with offline-first approach
import { supabase } from '../lib/supabase';
import { Tour } from '../types/tour';
import { API, ERROR_MESSAGES } from '../utils/constants';
import { getImageAsset, hasImageAsset } from '../utils/imageAssets';
import OfflineService from './OfflineService';

// Create a mapping between database filenames and actual bucket filenames
const FILENAME_MAPPING: Record<string, string> = {
  // Tours - Add mappings based on your actual bucket contents
  'downtown-bar-harbor.jpg': 'bar-harbor-downtown.jpg',
  'wild-maine-blueberries.jpg': 'maine-blueberries.jpg',
  
  // Stops - Update these based on your actual bucket file names
  'bar-island-sandbar.jpg': 'bar-island.jpg',
  'bar-harbor-lobster-pound-roll.jpg': 'lobster-pound.jpg', 
  'fresh-lobster-dinner.jpg': 'lobster-dinner.jpg',
  'abels-lobster-somes-sound.jpg': 'abels-lobster.jpg',
  'acadia-mountain-vista.jpg': 'acadia-vista.jpg',
  'atlantic-brewing-blueberry-ale.jpg': 'atlantic-brewing.jpg',
  'travelin-lobster-roll.jpg': 'lobster-roll.jpg',
  'mount-desert-island-harbor.jpg': 'mount-desert-harbor.jpg', 
  'salisbury-cove-quiet-side.jpg': 'salisbury-cove.jpg',
  'pirates-cove-mini-golf.jpg': 'mini-golf.jpg',
  'acadia-coastal-scenery.jpg': 'coastal-scenery.jpg',
  'ben-bills-lobster-ice-cream.jpg': 'lobster-ice-cream.jpg',
};

// STRATEGY ENUM for image loading
enum ImageStrategy {
  LOCAL_ASSETS = 'local_assets',
  SUPABASE_STORAGE = 'supabase_storage',
  HYBRID = 'hybrid',
  OFFLINE_FIRST = 'offline_first' // NEW: Try offline first, then online
}

// Configuration - Use offline-first approach
const IMAGE_STRATEGY: ImageStrategy = ImageStrategy.OFFLINE_FIRST;

// Enhanced network connectivity check
const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    // Simple network check - try to fetch from a reliable endpoint
    const response = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
};

// ENHANCED: Smart getImageUrl function with offline-first approach
export const getImageUrl = async (imagePath: string | null, tourId?: string): Promise<string | null> => {
  if (!imagePath) return null;

  console.log(`🗂️ Getting image URL for: ${imagePath}`);
  console.log(`📋 Using strategy: ${IMAGE_STRATEGY}`);

  // Extract just the filename from the path
  const filename = imagePath.includes('/') ? imagePath.split('/').pop() : imagePath;
  
  if (!filename) {
    console.log(`⚠️ No filename extracted from: ${imagePath}`);
    return null;
  }

  switch (IMAGE_STRATEGY) {
    case ImageStrategy.OFFLINE_FIRST:
      return await getOfflineFirstImageUrl(filename, tourId);
      
    case ImageStrategy.LOCAL_ASSETS:
      return getLocalImageUrl(filename);
      
    case ImageStrategy.SUPABASE_STORAGE:
      return getSupabaseImageUrl(filename);
      
    case ImageStrategy.HYBRID:
      return getHybridImageUrl(filename);
      
    default:
      return getLocalImageUrl(filename);
  }
};

// NEW: Offline-first image URL resolution
const getOfflineFirstImageUrl = async (filename: string, tourId?: string): Promise<string | null> => {
  console.log(`🔄 Using offline-first approach for: ${filename}`);
  
  // If we have a tourId, check for offline version first
  if (tourId) {
    const offlineService = OfflineService.getInstance();
    const offlinePath = await offlineService.getOfflineImagePath(tourId, filename);
    
    if (offlinePath) {
      console.log(`📱 Found offline image: ${offlinePath}`);
      return `file://${offlinePath}`;
    }
  }
  
  // Try local assets next
  const localUrl = getLocalImageUrl(filename);
  if (localUrl) {
    return localUrl;
  }
  
  // Finally, try Supabase if network is available
  const networkAvailable = await isNetworkAvailable();
  if (networkAvailable) {
    console.log(`🌐 Network available, using Supabase for: ${filename}`);
    return getSupabaseImageUrl(filename);
  }
  
  console.log(`❌ No offline or local asset found for: ${filename}`);
  return null;
};

// LOCAL ASSETS: Use bundled images from imageAssets.ts
const getLocalImageUrl = (filename: string): string | null => {
  console.log(`📱 Checking local assets for: ${filename}`);
  
  // Check if we have this asset locally
  if (hasImageAsset(filename)) {
    console.log(`✅ Found local asset: ${filename}`);
    return `LOCAL_ASSET:${filename}`;
  } else {
    console.log(`❌ No local asset found for: ${filename}`);
    return null;
  }
};

// SUPABASE STORAGE: Use remote images from Supabase
const getSupabaseImageUrl = (filename: string): string | null => {
  console.log(`☁️ Using Supabase storage for: ${filename}`);
  
  // Check if we have a mapping for this filename
  const mappedFilename = FILENAME_MAPPING[filename] || filename;
  
  if (mappedFilename !== filename) {
    console.log(`🔄 Mapped filename: ${filename} → ${mappedFilename}`);
  }

  // Construct the full URL with the correct filename
  const fullUrl = `${API.SUPABASE.STORAGE_URL}/${API.SUPABASE.BUCKETS.TOUR_IMAGES}/${mappedFilename}`;
  
  console.log(`🌐 Supabase URL: ${fullUrl}`);
  
  return fullUrl;
};

// HYBRID: Try local first, fallback to Supabase
const getHybridImageUrl = (filename: string): string | null => {
  console.log(`🔄 Using hybrid approach for: ${filename}`);
  
  // Try local first
  const localUrl = getLocalImageUrl(filename);
  if (localUrl) {
    return localUrl;
  }
  
  // Fallback to Supabase
  console.log(`🔄 Local asset not found, falling back to Supabase`);
  return getSupabaseImageUrl(filename);
};

// ENHANCED: Function to resolve image source for React Native Image component
/*export const getImageSource = async (imagePath: string | null, tourId?: string): Promise<any> => {
  if (!imagePath) return null;
  
  console.log(`🖼️ Getting image source for: ${imagePath}`);
  
  // If it's already a resolved path
  if (imagePath.startsWith('LOCAL_ASSET:')) {
    const filename = imagePath.replace('LOCAL_ASSET:', '');
    console.log(`📱 Using local asset: ${filename}`);
    return getImageAsset(filename);
  }
  
  if (imagePath.startsWith('file://')) {
    console.log(`📁 Using offline file: ${imagePath}`);
    return { uri: imagePath };
  }
  
  if (imagePath.startsWith('http')) {
    console.log(`🌐 Using URL: ${imagePath}`);
    return { uri: imagePath };
  }
  
  // Resolve the image URL first
  const resolvedUrl = await getImageUrl(imagePath, tourId);
  if (!resolvedUrl) {
    console.log(`⚠️ Could not resolve image: ${imagePath}`);
    return null;
  }
  
  return getImageSource(resolvedUrl, tourId);
};
*/


// Synchronous version for immediate use (uses cached or local assets only)
export const getImageSource = (imagePath: string | null): any => {
  if (!imagePath) return null;
  
  console.log(`🖼️ Getting image source for: ${imagePath}`);
  
  // If it's a local asset identifier
  if (imagePath.startsWith('LOCAL_ASSET:')) {
    const filename = imagePath.replace('LOCAL_ASSET:', '');
    console.log(`📱 Using local asset: ${filename}`);
    return getImageAsset(filename);
  }
  
  // If it's a file URI (offline)
  if (imagePath.startsWith('file://')) {
    console.log(`📁 Using offline file: ${imagePath}`);
    return { uri: imagePath };
  }
  
  // If it's a URL (Supabase or other)
  if (imagePath.startsWith('http')) {
    console.log(`🌐 Using URL: ${imagePath}`);
    return { uri: imagePath };
  }
  
  // For simple filenames, try local assets
  if (hasImageAsset(imagePath)) {
    console.log(`📱 Found local asset for filename: ${imagePath}`);
    return getImageAsset(imagePath);
  }
  
  // Fallback
  console.log(`⚠️ Unknown image path format: ${imagePath}`);
  return null;
};

// Helper function to get audio URL from storage or offline
export const getAudioUrl = async (audioPath: string | null, tourId?: string, stopId?: string): Promise<string | null> => {
  if (!audioPath) return null;
  
  console.log(`🎵 Getting audio URL for: ${audioPath}`);
  
  // Check for offline version first
  if (tourId && stopId) {
    const offlineService = OfflineService.getInstance();
    const offlinePath = await offlineService.getOfflineAudioPath(tourId, stopId);
    
    if (offlinePath) {
      console.log(`📱 Found offline audio: ${offlinePath}`);
      return `file://${offlinePath}`;
    }
  }
  
  // Fallback to Supabase if network is available
  const networkAvailable = await isNetworkAvailable();
  if (networkAvailable) {
    const fullUrl = `${API.SUPABASE.STORAGE_URL}/${API.SUPABASE.BUCKETS.TOUR_AUDIO}/${audioPath}`;
    console.log(`🎵 Using Supabase audio URL: ${fullUrl}`);
    return fullUrl;
  }
  
  console.log(`❌ No offline audio found and no network available`);
  return null;
};

// ENHANCED: Fetch all tours - offline-first approach
export const getAllTours = async (): Promise<Tour[]> => {
  console.log('🔄 Starting getAllTours with offline-first approach...');
  
  const offlineService = OfflineService.getInstance();
  const networkAvailable = await isNetworkAvailable();
  
  try {
    // Always try to get offline tours first
    const offlineTours = await offlineService.getAllOfflineTours();
    console.log(`📱 Found ${offlineTours.length} offline tours`);
    
    if (offlineTours.length > 0) {
      console.log('✅ Returning offline tours');
      return offlineTours.map(content => ({
        ...content.tourData,
        isDownloaded: true,
        // Update image paths to use offline versions
        image: content.tourData.image ? `file://${content.imageFiles[content.tourData.image] || content.tourData.image}` : '',
        stops: content.tourData.stops.map(stop => ({
          ...stop,
          image: stop.image ? `file://${content.imageFiles[stop.image] || stop.image}` : '',
          audio: content.audioFiles[stop.id] ? `file://${content.audioFiles[stop.id]}` : stop.audio
        }))
      }));
    }
    
    // If no offline tours and network is available, fetch from Supabase
    if (networkAvailable) {
      console.log('🌐 No offline tours found, fetching from Supabase...');
      return await fetchToursFromSupabase();
    }
    
    // No offline tours and no network
    console.log('❌ No offline tours and no network connection');
    throw new Error(ERROR_MESSAGES.OFFLINE_NO_DATA);
    
  } catch (error) {
    console.error('❌ Error in getAllTours:', error);
    
    // If Supabase fails, try to return any offline tours we have
    try {
      const offlineTours = await offlineService.getAllOfflineTours();
      if (offlineTours.length > 0) {
        console.log('🔄 Supabase failed, falling back to offline tours');
        return offlineTours.map(content => content.tourData);
      }
    } catch (offlineError) {
      console.error('❌ Offline fallback also failed:', offlineError);
    }
    
    throw error;
  }
};

// Helper function to fetch tours from Supabase
const fetchToursFromSupabase = async (): Promise<Tour[]> => {
  console.log('🔄 Fetching tours from Supabase...');
  
  const { data: tours, error } = await supabase
    .from('tours')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase error:', error);
    throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${error.message}`);
  }

  if (!tours || tours.length === 0) {
    console.log('⚠️ No tours found in database');
    return [];
  }

  console.log(`✅ Found ${tours.length} tours from Supabase`);

  // Transform database data to match your Tour interface
  const transformedTours: Tour[] = await Promise.all(tours.map(async tour => ({
    id: tour.id,
    title: tour.title,
    description: tour.description,
    price: tour.price,
    duration: tour.duration,
    distance: tour.distance,
    image: await getImageUrl(tour.image_path, tour.id) || '',
    isPurchased: false,
    isDownloaded: false,
    stops: []
  })));

  return transformedTours;
};

// ENHANCED: Fetch tour by ID with offline-first approach
export const getTourById = async (tourId: string): Promise<Tour | null> => {
  console.log(`🔄 Getting tour ${tourId} with offline-first approach...`);
  
  const offlineService = OfflineService.getInstance();
  const networkAvailable = await isNetworkAvailable();
  
  try {
    // Check for offline version first
    const offlineContent = await offlineService.getOfflineContent(tourId);
    
    if (offlineContent) {
      console.log(`📱 Found offline tour: ${tourId}`);
      
      // Return offline tour with local file paths
      const offlineTour: Tour = {
        ...offlineContent.tourData,
        isDownloaded: true,
        image: offlineContent.tourData.image ? 
          `file://${offlineContent.imageFiles[offlineContent.tourData.image] || offlineContent.tourData.image}` : '',
        stops: offlineContent.tourData.stops.map(stop => ({
          ...stop,
          image: stop.image ? 
            `file://${offlineContent.imageFiles[stop.image] || stop.image}` : '',
          audio: offlineContent.audioFiles[stop.id] ? 
            `file://${offlineContent.audioFiles[stop.id]}` : stop.audio
        }))
      };
      
      return offlineTour;
    }
    
    // If not offline and network is available, fetch from Supabase
    if (networkAvailable) {
      console.log(`🌐 Tour not offline, fetching from Supabase: ${tourId}`);
      return await fetchTourFromSupabase(tourId);
    }
    
    // No offline version and no network
    console.log(`❌ Tour ${tourId} not available offline and no network`);
    throw new Error(ERROR_MESSAGES.OFFLINE_NO_DATA);
    
  } catch (error) {
    console.error('❌ Error in getTourById:', error);
    throw error;
  }
};

// Helper function to fetch tour from Supabase
const fetchTourFromSupabase = async (tourId: string): Promise<Tour | null> => {
  console.log(`🔄 Fetching tour ${tourId} from Supabase...`);
  
  // Fetch tour data
  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('*')
    .eq('id', tourId)
    .single();

  if (tourError) {
    console.error('❌ Tour fetch error:', tourError);
    if (tourError.code === 'PGRST116') {
      return null;
    }
    throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${tourError.message}`);
  }

  if (!tour) {
    console.log(`⚠️ Tour ${tourId} not found`);
    return null;
  }

  // Fetch stops data
  const { data: stops, error: stopsError } = await supabase
    .from('stops')
    .select('*')
    .eq('tour_id', tourId)
    .order('order_index');

  if (stopsError) {
    console.error('❌ Stops fetch error:', stopsError);
    throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${stopsError.message}`);
  }

  console.log(`✅ Tour loaded from Supabase with ${stops?.length || 0} stops`);

  // Transform to match your Tour interface
  const transformedTour: Tour = {
    id: tour.id,
    title: tour.title,
    description: tour.description,
    price: tour.price,
    duration: tour.duration,
    distance: tour.distance,
    image: await getImageUrl(tour.image_path, tour.id) || '',
    isPurchased: false,
    isDownloaded: false,
    stops: stops ? await Promise.all(stops.map(async stop => ({
      id: stop.id,
      title: stop.title,
      type: stop.type,
      coordinates: {
        lat: stop.lat,
        lng: stop.lng
      },
      triggerCoordinates: stop.trigger_lat && stop.trigger_lng ? {
        lat: stop.trigger_lat,
        lng: stop.trigger_lng
      } : undefined,
      audio: await getAudioUrl(stop.audio_path, tour.id, stop.id) || '',
      transcript: stop.transcript || '',
      image: await getImageUrl(stop.image_path, tour.id) || '',
      isPlayed: false,
      address: stop.address || undefined,
      tips: stop.tips || undefined
    }))) : []
  };

  return transformedTour;
};

// Keep your existing helper functions
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// DEBUGGING functions (keep existing ones)
export const testImageUrl = async (url: string, title: string): Promise<boolean> => {
  if (url.startsWith('LOCAL_ASSET:') || url.startsWith('file://')) {
    console.log(`📱 ${title}: Using local asset (skipping URL test)`);
    return true;
  }
  
  try {
    console.log(`🔍 Testing image: ${title}`);
    console.log(`🔗 URL: ${url}`);
    
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log(`✅ ${title}: Image accessible (${response.status})`);
      return true;
    } else {
      console.error(`❌ ${title}: HTTP ${response.status} - ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ${title}: Network error -`, error);
    return false;
  }
};

export const debugTourImages = async (tour: Tour) => {
  console.log(`🧪 DEBUG: Testing all image URLs for tour "${tour.title}"`);
  console.log(`📋 Current strategy: ${IMAGE_STRATEGY}`);
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    localAssets: 0,
    remoteUrls: 0,
    offlineFiles: 0
  };
  
  // Test tour image
  if (tour.image) {
    results.total++;
    if (tour.image.startsWith('LOCAL_ASSET:')) {
      results.localAssets++;
      results.successful++;
    } else if (tour.image.startsWith('file://')) {
      results.offlineFiles++;
      results.successful++;
    } else {
      results.remoteUrls++;
      const success = await testImageUrl(tour.image, `Tour: ${tour.title}`);
      if (success) results.successful++;
      else results.failed++;
    }
  }
  
  // Test stop images
  for (const stop of tour.stops) {
    if (stop.image) {
      results.total++;
      if (stop.image.startsWith('LOCAL_ASSET:')) {
        results.localAssets++;
        results.successful++;
      } else if (stop.image.startsWith('file://')) {
        results.offlineFiles++;
        results.successful++;
      } else {
        results.remoteUrls++;
        const success = await testImageUrl(stop.image, `Stop: ${stop.title}`);
        if (success) results.successful++;
        else results.failed++;
      }
    }
  }
  
  console.log(`📊 Image test results:`);
  console.log(`  Total: ${results.total}`);
  console.log(`  Successful: ${results.successful}`);
  console.log(`  Failed: ${results.failed}`);
  console.log(`  Local assets: ${results.localAssets}`);
  console.log(`  Offline files: ${results.offlineFiles}`);
  console.log(`  Remote URLs: ${results.remoteUrls}`);
  
  return results;
};