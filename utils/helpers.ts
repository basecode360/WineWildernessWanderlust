// utils/helpers.ts - Helper functions and utilities
import { Coordinates, LocationData } from '../types/tour';

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
}

/**
 * Format time duration in milliseconds to MM:SS format
 */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if user is within proximity of a location
 */
export function isWithinProximity(
  userLocation: LocationData,
  targetLocation: Coordinates,
  threshold: number = 100
): boolean {
  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    targetLocation.lat,
    targetLocation.lng
  );
  return distance <= threshold;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;

  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  }) as T;
}

/**
 * Throttle function to limit function calls to at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;

  return ((...args: any[]) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (typeof obj === 'object') {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Convert coordinates to a region object for MapView
 */
export function coordinatesToRegion(
  coordinates: Coordinates,
  latitudeDelta: number = 0.01,
  longitudeDelta: number = 0.01
) {
  return {
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    latitudeDelta,
    longitudeDelta,
  };
}

/**
 * Calculate the center point of multiple coordinates
 */
export function getCenterOfCoordinates(
  coordinates: Coordinates[]
): Coordinates {
  if (coordinates.length === 0) {
    throw new Error('Cannot calculate center of empty coordinates array');
  }

  const totalLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0);
  const totalLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0);

  return {
    lat: totalLat / coordinates.length,
    lng: totalLng / coordinates.length,
  };
}

/**
 * Get appropriate map region to fit all coordinates
 */
export function getRegionForCoordinates(coordinates: Coordinates[]) {
  if (coordinates.length === 0) {
    throw new Error('Cannot get region for empty coordinates array');
  }

  if (coordinates.length === 1) {
    return coordinatesToRegion(coordinates[0]);
  }

  const minLat = Math.min(...coordinates.map((c) => c.lat));
  const maxLat = Math.max(...coordinates.map((c) => c.lat));
  const minLng = Math.min(...coordinates.map((c) => c.lng));
  const maxLng = Math.max(...coordinates.map((c) => c.lng));

  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latitudeDelta = (maxLat - minLat) * 1.2; // Add 20% padding
  const longitudeDelta = (maxLng - minLng) * 1.2; // Add 20% padding

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latitudeDelta, 0.01), // Minimum zoom level
    longitudeDelta: Math.max(longitudeDelta, 0.01), // Minimum zoom level
  };
}

/**
 * Sleep/delay function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handle async operations with error catching
 */
export async function safeAsync<T>(
  asyncFn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Safe async error:', error);
    return fallback;
  }
}
