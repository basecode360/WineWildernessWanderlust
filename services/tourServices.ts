// services/tourService.ts - Enhanced with local asset integration
import { supabase } from '../lib/supabase';
import { Tour } from '../types/tour';
import { API, ERROR_MESSAGES } from '../utils/constants';
import { getImageAsset, hasImageAsset } from '../utils/imageAssets';

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
  HYBRID = 'hybrid' // Try local first, fallback to Supabase
}

// Configuration - change this to switch between strategies
const IMAGE_STRATEGY: ImageStrategy = ImageStrategy.LOCAL_ASSETS; // Use local assets for now

// UPDATED: Smart getImageUrl function with multiple strategies
export const getImageUrl = (imagePath: string | null): string | null => {
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

// LOCAL ASSETS: Use bundled images from imageAssets.ts
const getLocalImageUrl = (filename: string): string | null => {
  console.log(`📱 Checking local assets for: ${filename}`);
  
  // Check if we have this asset locally
  if (hasImageAsset(filename)) {
    console.log(`✅ Found local asset: ${filename}`);
    const asset = getImageAsset(filename);
    
    // For React Native Image component, we need to return the asset directly
    // But since we're returning a string URL, we'll return a special identifier
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

// HELPER: Function to resolve image source for React Native Image component
export const getImageSource = (imagePath: string | null): any => {
  if (!imagePath) return null;
  
  console.log(`🖼️ Getting image source for: ${imagePath}`);
  
  // If it's a local asset identifier
  if (imagePath.startsWith('LOCAL_ASSET:')) {
    const filename = imagePath.replace('LOCAL_ASSET:', '');
    console.log(`📱 Using local asset: ${filename}`);
    return getImageAsset(filename);
  }
  
  // If it's a URL (Supabase or other)
  if (imagePath.startsWith('http')) {
    console.log(`🌐 Using URL: ${imagePath}`);
    return { uri: imagePath };
  }
  
  // Fallback
  console.log(`⚠️ Unknown image path format: ${imagePath}`);
  return null;
};

// Helper function to get audio URL from storage
export const getAudioUrl = (audioPath: string | null): string | null => {
  if (!audioPath) return null;
  console.log(`🎵 Audio path: ${audioPath}`);
  const fullUrl = `${API.SUPABASE.STORAGE_URL}/${API.SUPABASE.BUCKETS.TOUR_AUDIO}/${audioPath}`;
  console.log(`🎵 Audio URL: ${fullUrl}`);
  return fullUrl;
};

// HELPER: Function to discover actual filenames in your bucket
export const discoverBucketFiles = async () => {
  try {
    console.log('🔍 Discovering files in tour_images bucket...');
    
    const { data: files, error } = await supabase.storage
      .from('tour_images')
      .list('', {
        limit: 100,
        offset: 0
      });

    if (error) {
      console.error('❌ Error listing bucket files:', error);
      return [];
    }

    if (files) {
      console.log(`📂 Found ${files.length} files in bucket:`);
      files.forEach(file => {
        console.log(`  📄 ${file.name}`);
      });
      return files.map(f => f.name).filter(name => name.endsWith('.jpg') || name.endsWith('.png'));
    }

    return [];
  } catch (error) {
    console.error('❌ Error discovering bucket files:', error);
    return [];
  }
};

// DEBUGGING: Function to test image URL accessibility
export const testImageUrl = async (url: string, title: string): Promise<boolean> => {
  // Skip testing for local assets
  if (url.startsWith('LOCAL_ASSET:')) {
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

// DEBUGGING: Function to test all image URLs for a tour
export const debugTourImages = async (tour: Tour) => {
  console.log(`🧪 DEBUG: Testing all image URLs for tour "${tour.title}"`);
  console.log(`📋 Current strategy: ${IMAGE_STRATEGY}`);
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    localAssets: 0,
    remoteUrls: 0
  };
  
  // Test tour image
  if (tour.image) {
    results.total++;
    if (tour.image.startsWith('LOCAL_ASSET:')) {
      results.localAssets++;
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
  console.log(`  Remote URLs: ${results.remoteUrls}`);
  
  return results;
};

// Fetch all tours - REPLACES your getAllTours function
export const getAllTours = async (): Promise<Tour[]> => {
  try {
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

    console.log(`✅ Found ${tours.length} tours`);

    // Transform database data to match your Tour interface
    const transformedTours: Tour[] = tours.map(tour => ({
      id: tour.id,
      title: tour.title,
      description: tour.description,
      price: tour.price,
      duration: tour.duration,
      distance: tour.distance,
      image: getImageUrl(tour.image_path) || '', // Convert path using strategy
      isPurchased: false, // Will be handled by your PurchaseContext
      isDownloaded: false, // Will be handled by your OfflineContext
      stops: [] // Loaded separately for performance
    }));

    return transformedTours;
  } catch (error) {
    console.error('❌ Error in getAllTours:', error);
    throw error;
  }
};

// Fetch tour by ID with stops - REPLACES your getTourById function
export const getTourById = async (tourId: string): Promise<Tour | null> => {
  try {
    console.log(`🔄 Fetching tour ${tourId} with stops...`);
    
    // Fetch tour data
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', tourId)
      .single();

    if (tourError) {
      console.error('❌ Tour fetch error:', tourError);
      if (tourError.code === 'PGRST116') {
        return null; // Tour not found
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

    console.log(`✅ Tour loaded with ${stops?.length || 0} stops`);

    // Transform to match your Tour interface
    const transformedTour: Tour = {
      id: tour.id,
      title: tour.title,
      description: tour.description,
      price: tour.price,
      duration: tour.duration,
      distance: tour.distance,
      image: getImageUrl(tour.image_path) || '', // Using smart strategy
      isPurchased: false, // Handled by your contexts
      isDownloaded: false, // Handled by your contexts
      stops: stops ? stops.map(stop => ({
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
        audio: getAudioUrl(stop.audio_path) || '',
        transcript: stop.transcript || '',
        image: getImageUrl(stop.image_path) || '', // Using smart strategy
        isPlayed: false, // Handled by your progress tracking
        address: stop.address || undefined,
        tips: stop.tips || undefined
      })) : []
    };

    // Debug image URLs in development
    if (__DEV__) {
      console.log(`🧪 DEV: Running image tests for tour "${transformedTour.title}"`);
      // Run image tests asynchronously (don't block the return)
      setTimeout(() => {
        debugTourImages(transformedTour);
      }, 1000);
    }

    return transformedTour;
  } catch (error) {
    console.error('❌ Error in getTourById:', error);
    throw error;
  }
};

// Keep your existing distance calculation function
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

// DEPRECATED: Keep for backward compatibility during transition
export const sampleTourData = null; // Remove this once all components are updated