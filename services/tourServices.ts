import { supabase } from "../lib/supabase";
import { Tour, TourStop } from "../types/tour";
import { ERROR_MESSAGES } from "../utils/constants";
import OfflineService from "./OfflineService";

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const TOUR_IMAGES_BUCKET = "tour_images";
const TOUR_AUDIO_BUCKET = "tour_audio";

// Check network connectivity
const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch("https://www.google.com/generate_204", {
      method: "HEAD",
      cache: "no-cache",
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Construct image URL
export const getImageUrl = (imagePath: string | null): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  const baseUrl = BASE_URL?.replace(/\/$/, "");
  const url = `${baseUrl}/storage/v1/object/public/${TOUR_IMAGES_BUCKET}/${imagePath}`;
  console.log("✅ Tour image URL:", url);
  return url;
};

// Construct audio URL
export const getAudioUrl = async (
  audioPath: string | null,
  tourId?: string,
  stopId?: string
): Promise<string | null> => {
  if (!audioPath) return null;

  const offlineService = OfflineService.getInstance();
  if (tourId && stopId) {
    const offlinePath = await offlineService.getOfflineAudioPath(
      tourId,
      stopId
    );
    if (offlinePath) {
      console.log("🎧 Offline audio path found:", offlinePath);
      return `file://${offlinePath}`;
    }
  }

  if (await isNetworkAvailable()) {
    if (audioPath.startsWith("http")) return audioPath;
    const url = `${BASE_URL}/storage/v1/object/public/${TOUR_AUDIO_BUCKET}/${audioPath}`;
    console.log("🎧 Online audio URL:", url);
    return url;
  }

  return null;
};

// Fetch all tours (offline-first)
export const getAllTours = async (): Promise<Tour[]> => {
  const offlineService = OfflineService.getInstance();
  const networkAvailable = await isNetworkAvailable();

  try {
    const offlineTours = await offlineService.getAllOfflineTours();
    if (offlineTours.length > 0) {
      return offlineTours.map((t) => ({
        ...t.tourData,
        isDownloaded: true,
        image: t.tourData.image
          ? `file://${t.imageFiles[t.tourData.image] || t.tourData.image}`
          : getImageUrl(t.tourData.image_path) || "",
        stops: t.tourData.stops.map((stop) => ({
          ...stop,
          coordinates: stop.coordinates || { lat: 0, lng: 0 },
          image: stop.image
            ? `file://${t.imageFiles[stop.image] || stop.image}`
            : getImageUrl(stop.image_path) || "",
          audio: stop.audio
            ? stop.audio
            : getAudioUrl(stop.audio_path, t.tourData.id, stop.id) || "",
        })),
      }));
    }

    if (networkAvailable) {
      return await fetchToursFromSupabase();
    }

    throw new Error(ERROR_MESSAGES.OFFLINE_NO_DATA);
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Fetch single tour by ID (offline-first)
export const getTourById = async (tourId: string): Promise<Tour | null> => {
  const offlineService = OfflineService.getInstance();
  const networkAvailable = await isNetworkAvailable();

  const offlineContent = await offlineService.getOfflineContent(tourId);
  if (offlineContent) {
    return {
      ...offlineContent.tourData,
      isDownloaded: true,
      image: offlineContent.tourData.image
        ? `file://${
            offlineContent.imageFiles[offlineContent.tourData.image] ||
            offlineContent.tourData.image
          }`
        : getImageUrl(offlineContent.tourData.image_path) || "",
      stops: offlineContent.tourData.stops.map((stop) => ({
        ...stop,
        coordinates:
          stop.lat != null && stop.lng != null
            ? { lat: stop.lat, lng: stop.lng }
            : { lat: 0, lng: 0 },
        image: offlineContent.imageFiles[stop.image]
          ? `file://${offlineContent.imageFiles[stop.image]}`
          : stop.image || getImageUrl(stop.image) || "",
        audio: offlineContent.audioFiles[stop.id]
          ? `file://${offlineContent.audioFiles[stop.id]}`
          : stop.audio || "",
      })),
    };
  }

  if (networkAvailable) {
    return await fetchTourFromSupabase(tourId);
  }

  throw new Error(ERROR_MESSAGES.OFFLINE_NO_DATA);
};

// Fetch tours from Supabase
const fetchToursFromSupabase = async (): Promise<Tour[]> => {
  const { data: tours, error } = await supabase
    .from("tours")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${error.message}`);
  if (!tours) return [];

  return tours.map((tour) => {
    const imgUrl = getImageUrl(tour.image_path);
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
    };
  });
};

// Fetch single tour from Supabase
const fetchTourFromSupabase = async (tourId: string): Promise<Tour | null> => {
  const { data: tour, error: tourError } = await supabase
    .from("tours")
    .select("*")
    .eq("id", tourId)
    .single();
  if (tourError)
    throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${tourError.message}`);
  if (!tour) return null;

  const { data: stops, error: stopsError } = await supabase
    .from("stops")
    .select("*")
    .eq("tour_id", tourId)
    .order("order_index");
  if (stopsError)
    throw new Error(`${ERROR_MESSAGES.API_ERROR}: ${stopsError.message}`);

  // ✅ make it async with Promise.all
  const tourStops: TourStop[] = await Promise.all(
    stops.map(async (stop) => ({
      id: stop.id,
      title: stop.title,
      type: stop.type,
      coordinates:
        stop.lat != null && stop.lng != null
          ? { lat: stop.lat, lng: stop.lng }
          : { lat: 0, lng: 0 }, // fallback
      audio: stop.audio_path
        ? await getAudioUrl(stop.audio_path, tour.id, stop.id)
        : "",
      transcript: stop.transcript || "",
      image: stop.image_path ? getImageUrl(stop.image_path) : "",
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
    image: getImageUrl(tour.image_path) || "",
    isPurchased: false,
    isDownloaded: false,
    stops: tourStops,
  };
};

// Distance helper
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
