// services/LocationService.ts - Enhanced location tracking and proximity detection
import * as Location from 'expo-location';
import { Coordinates, LocationData } from '../types/tour';

export class LocationService {
  private static instance: LocationService;
  private subscription: Location.LocationSubscription | null = null;
  private onLocationUpdate: ((location: LocationData) => void) | null = null;
  private isTracking: boolean = false;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      console.log('📍 Requesting location permissions...');
      
      // Check current permission status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('✅ Location permissions already granted');
        return true;
      }

      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Location permissions granted');
        return true;
      } else {
        console.warn('⚠️ Location permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      console.log('📍 Getting current location...');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ No location permissions');
        return null;
      }

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        console.warn('⚠️ Location services are disabled');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000, // 15 second timeout
        maximumAge: 10000, // Use cached location if less than 10 seconds old
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: location.timestamp,
      };

      console.log(`📍 Current location: ${locationData.latitude}, ${locationData.longitude} (±${locationData.accuracy}m)`);
      return locationData;

    } catch (error) {
      console.error('❌ Error getting current location:', error);
      return null;
    }
  }

  async startTracking(
    onLocationUpdate: (location: LocationData) => void,
    options?: {
      accuracy?: Location.Accuracy;
      timeInterval?: number;
      distanceInterval?: number;
    }
  ): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('📍 Location tracking already active');
        return true;
      }

      console.log('📍 Starting location tracking...');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ Cannot start tracking without permissions');
        return false;
      }

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        console.warn('⚠️ Location services are disabled');
        return false;
      }

      this.onLocationUpdate = onLocationUpdate;

      const trackingOptions = {
        accuracy: options?.accuracy || Location.Accuracy.High,
        timeInterval: options?.timeInterval || 2000, // Update every 2 seconds
        distanceInterval: options?.distanceInterval || 5, // Update every 5 meters
        foregroundService: {
          notificationTitle: 'Tour Guide Active',
          notificationBody: 'Tracking your location for tour stops',
          notificationColor: '#5CC4C4',
        },
      };

      this.subscription = await Location.watchPositionAsync(
        trackingOptions,
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          
          // Only update if we have reasonable accuracy (less than 50 meters)
          if (locationData.accuracy <= 50) {
            this.onLocationUpdate?.(locationData);
          } else {
            console.warn(`⚠️ Poor location accuracy: ${locationData.accuracy}m`);
          }
        }
      );

      this.isTracking = true;
      console.log('✅ Location tracking started successfully');
      return true;

    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  stopTracking(): void {
    try {
      console.log('📍 Stopping location tracking...');
      
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      
      this.onLocationUpdate = null;
      this.isTracking = false;
      
      console.log('✅ Location tracking stopped');
    } catch (error) {
      console.error('❌ Error stopping location tracking:', error);
    }
  }

  getTrackingStatus(): boolean {
    return this.isTracking;
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Validate coordinates
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
    ) {
      console.warn('⚠️ Invalid coordinates for distance calculation');
      return Infinity;
    }

    // Check for obviously invalid coordinates
    if (
      Math.abs(lat1) > 90 || Math.abs(lat2) > 90 ||
      Math.abs(lon1) > 180 || Math.abs(lon2) > 180
    ) {
      console.warn('⚠️ Coordinates out of valid range');
      return Infinity;
    }

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    
    // Log distance for debugging
    console.log(`📏 Distance calculated: ${distance.toFixed(2)}m between (${lat1}, ${lon1}) and (${lat2}, ${lon2})`);
    
    return distance;
  }

  isWithinProximity(
    userLocation: LocationData,
    targetLocation: Coordinates,
    threshold: number = 100
  ): boolean {
    try {
      // Validate inputs
      if (!userLocation || !targetLocation) {
        console.warn('⚠️ Invalid location data for proximity check');
        return false;
      }

      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        targetLocation.lat,
        targetLocation.lng
      );

      const isNearby = distance <= threshold;
      
      if (isNearby) {
        console.log(`🎯 Within proximity! Distance: ${distance.toFixed(2)}m (threshold: ${threshold}m)`);
      }
      
      return isNearby;
    } catch (error) {
      console.error('❌ Error checking proximity:', error);
      return false;
    }
  }

  // Enhanced method for getting accurate location with retries
  async getAccurateLocation(maxAttempts: number = 3): Promise<LocationData | null> {
    let bestLocation: LocationData | null = null;
    let bestAccuracy = Infinity;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📍 Getting location (attempt ${attempt}/${maxAttempts})...`);
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 10000,
          maximumAge: 5000,
        });

        const locationData: LocationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          timestamp: location.timestamp,
        };

        // Keep the most accurate reading
        if (locationData.accuracy < bestAccuracy) {
          bestAccuracy = locationData.accuracy;
          bestLocation = locationData;
        }

        // If we get very accurate reading, use it immediately
        if (locationData.accuracy <= 10) {
          console.log(`📍 Excellent accuracy achieved: ${locationData.accuracy}m`);
          break;
        }

        // Wait before next attempt
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.warn(`⚠️ Location attempt ${attempt} failed:`, error);
        
        if (attempt === maxAttempts && !bestLocation) {
          console.error('❌ All location attempts failed');
          return null;
        }
      }
    }

    if (bestLocation) {
      console.log(`📍 Best location: ${bestLocation.latitude}, ${bestLocation.longitude} (±${bestLocation.accuracy}m)`);
    }

    return bestLocation;
  }

  // Method to check location services status
  async getLocationServicesStatus(): Promise<{
    hasPermission: boolean;
    isEnabled: boolean;
    canUseLocation: boolean;
  }> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const hasPermission = status === 'granted';
      const isEnabled = await Location.hasServicesEnabledAsync();
      
      return {
        hasPermission,
        isEnabled,
        canUseLocation: hasPermission && isEnabled,
      };
    } catch (error) {
      console.error('❌ Error checking location services status:', error);
      return {
        hasPermission: false,
        isEnabled: false,
        canUseLocation: false,
      };
    }
  }
}