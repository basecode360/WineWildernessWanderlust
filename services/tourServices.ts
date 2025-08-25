// services/tourServices.ts - Fixed version with better offline integration
import { supabase } from "../lib/supabase";
import { Tour, TourStop } from "../types/tour";
import { ERROR_MESSAGES } from "../utils/constants";
import { getOfflineService } from "./OfflineService";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const TOUR_IMAGES_BUCKET = "tour_images";
const TOUR_AUDIO_BUCKET = "tour_audio";

// Check network connectivity
const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    // Try multiple endpoints for better reliability
    const endpoints = [
      "https://www.google.com/generate_204",
      "https://httpbin.org/status/200",
      "https://jsonplaceholder.typicode.com/posts/1"
    ];
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Try next endpoint
        continue;
      }
    }
    
    return false;
  } catch {
    return false;
  }
};

// Helper function to ensure coordinates are valid
const ensureValidCoordinates = (lat?: number | null, lng?: number | null) => {
  return {
    lat: typeof lat === 'number' && !isNaN(lat) ? lat : 0,
    lng: typeof lng === 'number' && !isNaN(lng) ? lng : 0,
  };
};

// Helper function to ensure trigger coordinates are valid (can be null)
const ensureValidTriggerCoordinates = (triggerLat?: number | null, triggerLng?: number | null) => {
  if (triggerLat != null && triggerLng != null && !isNaN(triggerLat) && !isNaN(triggerLng)) {
    return {
      lat: triggerLat,
      lng: triggerLng,
    };
  }
  return null;
};

// Construct image URL with offline fallback
export const getImageUrl = async (
  imagePath: string | null,
  tourId?: string,
  imageKey?: string
): Promise<string | null> => {
  if (!imagePath) return null;

  const offlineService = getOfflineService();
  
  // Check for offline version first
  if (tourId && imageKey) {
    const offlinePath = await offlineService.getOfflineImagePath(tourId, imageKey);
    if (offlinePath) {
      console.log("🖼️ Using offline image:", offlinePath);
      return `file://${offlinePath}`;
    }
  }

  // Return online URL if available
  if (imagePath.startsWith("http")) return imagePath;
  
  const baseUrl = BASE_URL?.replace(/\/$/, "");
  const url = `${baseUrl}/storage/v1/object/public/${TOUR_IMAGES_BUCKET}/${imagePath}`;
  console.log("🖼️ Using online image URL:", url);
  return url;
};

// Construct audio URL with offline fallback
export const getAudioUrl = async (
  audioPath: string | null,
  tourId?: string,
  stopId?: string
): Promise<string | null> => {
  if (!audioPath) return null;

  const offlineService = getOfflineService();
  
  // Check for offline version first
  if (tourId && stopId) {
    const offlinePath = await offlineService.getOfflineAudioPath(tourId, stopId);
    if (offlinePath) {
      console.log("🎧 Using offline audio:", offlinePath);
      return `file://${offlinePath}`;
    }
  }

  // Check network availability for online content
  if (await isNetworkAvailable()) {
    if (audioPath.startsWith("http")) return audioPath;
    
    const baseUrl = BASE_URL?.replace(/\/$/, "");
    const url = `${baseUrl}/storage/v1/object/public/${TOUR_AUDIO_BUCKET}/${audioPath}`;
    console.log("🎧 Using online audio URL:", url);
    return url;
  }

  console.warn("🎧 No offline audio and no network available");
  return null;
};

// Fetch all tours (offline-first approach)
export const getAllTours = async (): Promise<Tour[]> => {
  const offlineService = getOfflineService();
  const networkAvailable = await isNetworkAvailable();

  console.log(`🔍 Getting all tours (network: ${networkAvailable})`);

  try {
    // Always try offline first
    const offlineTours = await offlineService.getAllOfflineTours();
    
    if (offlineTours.length > 0) {
      console.log(`📱 Found ${offlineTours.length} offline tours`);
      
      // Transform offline tours to the expected format
      const transformedTours = await Promise.all(
        offlineTours.map(async (offlineContent) => {
          const tour = offlineContent.tourData;
          
          // Get offline image paths
          const mainImagePath = await offlineService.getOfflineImagePath(tour.id, 'main');
          
          const transformedStops = await Promise.all(
            tour.stops.map(async (stop) => {
              const imageKey = `${stop.id}_image`;
              const stopImagePath = await offlineService.getOfflineImagePath(tour.id, imageKey);
              const stopAudioPath = await offlineService.getOfflineAudioPath(tour.id, stop.id);
              
              return {
                ...stop,
                coordinates: ensureValidCoordinates(stop.lat, stop.lng),
                triggerCoordinates: ensureValidTriggerCoordinates(stop.trigger_lat, stop.trigger_lng),
                image: stopImagePath ? `file://${stopImagePath}` : (stop.image || ""),
                audio: stopAudioPath ? `file://${stopAudioPath}` : (stop.audio || ""),
              };
            })
          );

          return {
            ...tour,
            isDownloaded: true,
            image: mainImagePath ? `file://${mainImagePath}` : (tour.image || ""),
            stops: transformedStops,
          };
        })
      );
      
      // If we have offline tours and no network, return only offline tours
      if (!networkAvailable) {
        return transformedTours;
      }
      
      // If we have network, try to get online tours too and merge
      try {
        const onlineTours = await fetchToursFromSupabase();
        
        // Create a map of offline tour IDs for quick lookup
        const offlineTourIds = new Set(offlineTours.map(t => t.tourId));
        
        // Add online tours that aren't already offline
        const onlineOnlyTours = onlineTours.filter(tour => !offlineTourIds.has(tour.id));
        
        return [...transformedTours, ...onlineOnlyTours];
      } catch (onlineError) {
        console.warn('⚠️ Could not fetch online tours, returning offline only:', onlineError);
        return transformedTours;
      }
    }

    // No offline tours, try online if network is available
    if (networkAvailable) {
      return await fetchToursFromSupabase();
    }

    // No offline tours and no network
    throw new Error(ERROR_MESSAGES.OFFLINE_NO_DATA);
    
  } catch (error) {
    console.error('❌ Error in getAllTours:', error);
    return [];
  }
};

// Fetch single tour by ID (offline-first approach)
export const getTourById = async (tourId: string): Promise<Tour | null> => {
  const offlineService = getOfflineService();
  const networkAvailable = await isNetworkAvailable();

  console.log(`🔍 Getting tour ${tourId} (network: ${networkAvailable})`);

  try {
    // Try offline first
    const offlineContent = await offlineService.getOfflineContent(tourId);
    
    if (offlineContent) {
      console.log(`📱 Found offline tour: ${tourId}`);
      
      // Transform offline tour to expected format
      const tour = offlineContent.tourData;
      const mainImagePath = await offlineService.getOfflineImagePath(tourId, 'main');
      
      const transformedStops = await Promise.all(
        tour.stops.map(async (stop) => {
          const imageKey = `${stop.id}_image`;
          const stopImagePath = await offlineService.getOfflineImagePath(tourId, imageKey);
          const stopAudioPath = await offlineService.getOfflineAudioPath(tourId, stop.id);
          
          return {
            ...stop,
            coordinates: ensureValidCoordinates(stop.lat, stop.lng),
            triggerCoordinates: ensureValidTriggerCoordinates(stop.trigger_lat, stop.trigger_lng),
            image: stopImagePath ? `file://${stopImagePath}` : (stop.image || ""),
            audio: stopAudioPath ? `file://${stopAudioPath}` : (stop.audio || ""),
          };
        })
      );

      return {
        ...tour,
        isDownloaded: true,
        image: mainImagePath ? `file://${mainImagePath}` : (tour.image || ""),
        stops: transformedStops,
      };
    }

    // Not available offline, try online
    if (networkAvailable) {
      console.log(`🌐 Fetching tour ${tourId} online`);
      return await fetchTourFromSupabase(tourId);
    }

    // Not available offline and no network
    console.warn(`⚠️ Tour ${tourId} not available offline and no network`);
    return null;
    
  } catch (error) {
    console.error(`❌ Error getting tour ${tourId}:`, error);
    return null;
  }
};

// Fetch tours from Supabase (online only)
const fetchToursFromSupabase = async (): Promise<Tour[]> => {
  console.log('🌐 Fetching tours from Supabase');
  
  const { data: tours, error } = await supabase
    .from("tours")
    .select("*, stops_count") // Add stops_count to the select
    .order("created_at", { ascending: false });
    
  if (error) throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${error.message}`);
  if (!tours) return [];

  return await Promise.all(tours.map(async (tour) => {
    const imgUrl = await getImageUrl(tour.image_path);
    return {
      id: tour.id,
      title: tour.title,
      description: tour.description,
      price: tour.price,
      duration: tour.duration,
      distance: tour.distance,
      image: imgUrl || "",
      isPurchased: false,
      isDownloaded: false,
      stops: [],
      stopsCount: tour.stops_count || 0, // Add this line
    };
  }));
};

// Fetch single tour from Supabase (online only)
 const fetchTourFromSupabase = async (tourId: string): Promise<Tour | null> => {
  console.log(`🌐 Fetching tour ${tourId} from Supabase`);
  
  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .select("*")
    .eq("id", tourId)
    .single();
    
  if (tourError) throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${tourError.message}`);
  if (!tour) return null;


    const { data: stops, error: stopsError } = await supabase
  .from("stops")
  .select("*")
  .eq("tour_id", tourId)
  .order("order_index", { ascending: true, nullsFirst: false }); // set what you want explicitly

    
if (stopsError) throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${stopsError.message}`);

// ADD this null check
const safeStops = stops || [];


  // Transform stops with proper offline/online URL handling
const tourStops: TourStop[] = await Promise.all(
  safeStops.map(async (stop) => ({
      id: stop.id,
      title: stop.title,
      type: stop.type,
      coordinates: ensureValidCoordinates(stop.lat, stop.lng),
      triggerCoordinates: ensureValidTriggerCoordinates(stop.trigger_lat, stop.trigger_lng),
      audio: stop.audio_path ? await getAudioUrl(stop.audio_path, tour.id, stop.id) : "",
      transcript: stop.transcript || "",
      image: stop.image_path ? await getImageUrl(stop.image_path, tour.id, `${stop.id}_image`) : "",
      isPlayed: false,
      address: stop.address || undefined,
      tips: stop.tips || undefined,
    }))
  );

  return {
    id: tour.id,
    title: tour.title,
    description: tour.description,
    price: tour.price,
    duration: tour.duration,
    distance: tour.distance,
    image: await getImageUrl(tour.image_path, tour.id, 'main') || "",
    isPurchased: false,
    isDownloaded: false,
    stops: tourStops,
  };
};

// Distance helper function
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
};

// Utility function to check if tour is available offline
export const isTourAvailableOffline = async (tourId: string): Promise<boolean> => {
  const offlineService = getOfflineService();
  const offlineContent = await offlineService.getOfflineContent(tourId);
  return offlineContent !== null;
};

// Utility function to get tour download status
export const getTourDownloadStatus = async (tourId: string): Promise<{
  isDownloaded: boolean;
  downloadDate?: string;
  size?: number;
  fileCount?: number;
  isIntact?: boolean;
}> => {
  const offlineService = getOfflineService();
  const downloadInfo = await offlineService.getTourDownloadInfo(tourId);
  
  if (downloadInfo.isDownloaded) {
    const isIntact = await offlineService.verifyTourIntegrity(tourId);
    return {
      ...downloadInfo,
      isIntact
    };
  }
  
  return downloadInfo;
};