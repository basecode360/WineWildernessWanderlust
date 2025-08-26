// app/tour/player/[id].tsx - Fixed with Proper Progress Tracking
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../../../contexts/AuthContext";
import { useOffline } from "../../../contexts/OfflineContext";
import { useProgress } from "../../../contexts/ProgressContext";
import { LocationService } from "../../../services/LocationService";
import { calculateDistance, getAudioUrl, getImageUrl } from "../../../services/tourServices";
import { AudioState, LocationData, Tour, TourStop } from "../../../types/tour";

const { width: screenWidth } = Dimensions.get("window");
const PROXIMITY_THRESHOLD = 100;

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

export default function TourPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  // FIXED: Enhanced progress hook usage with proper method calls
  const {
    markStopCompleted,
    isStopCompleted,
    getCompletedStopsForTour,
    getTotalCompletedCount,
    completedCount,
    isLoading: progressLoading,
    refreshProgress,
  } = useProgress();

  const { getOfflineTour, getOfflineAudioPath, getOfflineImagePath, isOnline } = useOffline();

  // ADDED: State for tracking completed stops
  const [completedStops, setCompletedStops] = useState<Set<string>>(new Set());
  const [completionStats, setCompletionStats] = useState({ completed: 0, total: 0, percentage: 0 });

  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [tourError, setTourError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentStopId: null,
    position: 0,
    duration: 0,
  });
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [stopImages, setStopImages] = useState<Record<string, string>>({});

  // Auto-play settings
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(0);

  // Location-based auto-play settings
  const [locationAutoPlayEnabled, setLocationAutoPlayEnabled] = useState(true);
  const [lastTriggeredStopId, setLastTriggeredStopId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  const audioRef = useRef<Audio.Sound | null>(null);
  const locationService = useRef(LocationService.getInstance());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Proximity trigger guards (session-scoped)
  const isTriggeringRef = useRef(false);
  const playedSetRef = useRef<Set<string>>(new Set());

 useEffect(() => {
    if (user?.id) {
      getTotalCompletedCount(user.id);
    }
  }, [user, getTotalCompletedCount]);

  // FIXED: Load completion data when tour changes
  const loadCompletionData = useCallback(async () => {
    if (!tour || !user) return;

    try {
      console.log('Loading completion data for tour:', tour.id);
      
      // Get completed stops for this specific tour
      const completed = await getCompletedStopsForTour(tour.id);
      const completedStopIds = new Set(completed.map(stop => stop.stopId));
      
      setCompletedStops(completedStopIds);
      
      // Update completion stats
      const stats = {
        completed: completed.length,
        total: tour.stops.length,
        percentage: tour.stops.length > 0 ? Math.round((completed.length / tour.stops.length) * 100) : 0
      };
      setCompletionStats(stats);
      
      console.log(`Loaded completion data: ${completed.length}/${tour.stops.length} stops completed`);
      console.log('Completed stop IDs:', Array.from(completedStopIds));
    } catch (error) {
      console.error('Error loading completion data:', error);
      // Set empty state on error
      setCompletedStops(new Set());
      setCompletionStats({ completed: 0, total: tour?.stops.length || 0, percentage: 0 });
    }
  }, [tour, user, getCompletedStopsForTour]);

  // FIXED: Refresh completion data after marking a stop complete
  const refreshCompletionData = useCallback(async () => {
    console.log('Refreshing completion data...');
    await refreshProgress(); // Refresh the progress context first
    await loadCompletionData(); // Then reload our local completion data
  }, [refreshProgress, loadCompletionData]);

  // Toast notification component
  const Toast = ({ message, isVisible, onHide }: {
    message: string;
    isVisible: boolean;
    onHide: () => void;
  }) => {
    useEffect(() => {
      if (isVisible) {
        const timer = setTimeout(() => {
          onHide();
        }, 4000);
        return () => clearTimeout(timer);
      }
    }, [isVisible, onHide]);

    if (!isVisible) return null;

    return (
      <View style={styles.toastContainer}>
        <View style={styles.toast}>
          <Ionicons name="location-outline" size={20} color="#FF9800" />
          <Text style={styles.toastText}>{message}</Text>
          <TouchableOpacity onPress={onHide} style={styles.toastCloseButton}>
            <Ionicons name="close" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Location warning banner component
  const LocationWarningBanner = () => {
    if (!showLocationWarning || !tour || currentStopIndex >= tour.stops.length - 1) return null;

    const nextStop = tour.stops[currentStopIndex + 1];
    const distance = getDistanceToStop(currentLocation, nextStop);

    return (
      <View style={styles.locationWarningBanner}>
        <View style={styles.warningContent}>
          <Ionicons name="location-outline" size={20} color="#FFF" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Next Stop: {nextStop.title}</Text>
            <Text style={styles.warningText}>
              You're {distance ? `${Math.round(distance)}m away` : 'not close enough'}. Move closer for auto-play.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.forcePlayButton}
          onPress={forcePlayNextStop}
        >
          <Text style={styles.forcePlayButtonText}>Play Anyway</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Helper functions
  const isUserNearStop = (userLocation: LocationData, stop: TourStop, threshold: number = PROXIMITY_THRESHOLD): boolean => {
    if (!userLocation || !stop) return false;

    const triggerCoords = stop.triggerCoordinates || stop.coordinates;
    if (!triggerCoords || typeof triggerCoords.lat !== 'number' || typeof triggerCoords.lng !== 'number') {
      return false;
    }

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      triggerCoords.lat,
      triggerCoords.lng
    );

    return distance <= threshold;
  };

  const getDistanceToStop = (userLocation: LocationData | null, stop: TourStop): number | null => {
    if (!userLocation || !stop) return null;

    const triggerCoords = stop.triggerCoordinates || stop.coordinates;
    if (!triggerCoords || typeof triggerCoords.lat !== 'number' || typeof triggerCoords.lng !== 'number') {
      return null;
    }

    return calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      triggerCoords.lat,
      triggerCoords.lng
    );
  };

  const showToast = (message: string) => {
    console.log(`Toast: ${message}`);
    setToastMessage(message);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  // Manual override function to skip location requirement
  const forcePlayNextStop = () => {
    if (!tour || currentStopIndex >= tour.stops.length - 1) return;

    console.log('Force playing next stop (overriding location requirement)');
    cancelAutoPlay();
    hideToast();
    setShowLocationWarning(false);

    const nextIndex = currentStopIndex + 1;
    setCurrentStopIndex(nextIndex);

    setTimeout(() => {
      triggerAudioForStop(tour.stops[nextIndex], nextIndex, false);
    }, 300);
  };

  // Load tour data
  useEffect(() => {
    if (id) loadTour(id);
  }, [id]);

  // FIXED: Load completion data when tour loads or changes
  useEffect(() => {
    if (tour && user) {
      loadCompletionData();
    }
  }, [tour, user, loadCompletionData]);

  const loadTour = async (tourId: string) => {
    console.log("Loading tour:", tourId, "Online:", isOnline);
    try {
      setIsLoadingTour(true);
      setTourError(null);

      // Check offline first
      const offlineTour = getOfflineTour(tourId);
      if (offlineTour) {
        console.log("Found offline tour");
        const sortedOfflineTour = {
          ...offlineTour.tourData,
          stops: offlineTour.tourData.stops.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        };
        setTour(sortedOfflineTour);
        setIsOfflineMode(true);
        console.log(`Offline tour loaded: ${sortedOfflineTour.title} with ${sortedOfflineTour.stops.length} stops`);
        return;
      }

      // If not offline and online, fetch from Supabase
      if (isOnline) {
        console.log("Fetching from Supabase...");
        const { data, error } = await supabase
          .from("tours")
          .select(`
            *,
            stops (
              id,
              title,
              type,
              lat,
              lng,
              trigger_lat,
              trigger_lng,
              audio_path,
              image_path,
              transcript,
              address,
              tips,
              order_index
            )
          `)
          .eq("id", tourId)
          .single();

        if (error) {
          console.error("Supabase error:", error);
          throw error;
        }

        if (!data) {
          throw new Error("Tour not found");
        }

        // Transform the data to match expected structure and sort stops by order_index
        const transformedTour = {
          id: data.id,
          title: data.title,
          description: data.description,
          price: data.price || 0,
          duration: data.duration || 0,
          distance: data.distance || 0,
          image: data.image_path ? await getImageUrl(data.image_path, data.id, 'main') : '',
          isPurchased: true,
          isDownloaded: false,
          stops: await Promise.all(
            (data.stops || [])
              .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
              .map(async (stop: any) => ({
                id: stop.id,
                title: stop.title,
                type: stop.type,
                coordinates: ensureValidCoordinates(stop.lat, stop.lng),
                triggerCoordinates: ensureValidTriggerCoordinates(stop.trigger_lat, stop.trigger_lng),
                audio: stop.audio_path ? await getAudioUrl(stop.audio_path, data.id, stop.id) : '',
                image: stop.image_path ? await getImageUrl(stop.image_path, data.id, `${stop.id}_image`) : '',
                transcript: stop.transcript || '',
                address: stop.address || '',
                tips: stop.tips || '',
                order_index: stop.order_index || 0,
                isPlayed: false,
              }))
          )
        };

        setTour(transformedTour);
        setIsOfflineMode(false);
      } else {
        throw new Error("Tour not available offline and no internet connection");
      }

    } catch (error) {
      console.error("Failed to load tour:", error);
      setTourError(error instanceof Error ? error.message : "Failed to load tour");
    } finally {
      setIsLoadingTour(false);
    }
  };

  // Fixed image loading - only run once when tour changes
  useEffect(() => {
    if (!tour) return;

    const loadImages = async () => {
      console.log("Loading images for", tour.stops.length, "stops");
      const imagesMap: Record<string, string> = {};

      // Load images sequentially to avoid race conditions
      for (const stop of tour.stops) {
        if (stop.image) {
          imagesMap[stop.id] = stop.image;
          console.log(`Image set for stop ${stop.id}`);
        }
      }

      setStopImages(imagesMap);
      console.log(`Loaded ${Object.keys(imagesMap).length}/${tour.stops.length} stop images`);
    };

    loadImages();
  }, [tour]);

  useEffect(() => {
    initializeLocation();
    return () => {
      console.log('Player cleanup: stopping tracking + unloading audio');
      locationService.current.stopTracking();
      audioRef.current?.unloadAsync();

      // reset guards
      isTriggeringRef.current = false;
      playedSetRef.current.clear();

      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLocationEnabled && tour) startLocationTracking();
  }, [isLocationEnabled, tour]);

  useEffect(() => {
    stopCurrentAudio();
  }, [currentStopIndex]);

  // Enhanced auto-play countdown effect with location checking
  useEffect(() => {
    if (autoPlayCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoPlayCountdown(autoPlayCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoPlayCountdown === 0 && autoPlayTimerRef.current && tour) {
      console.log(`Countdown reached 0, advancing from stop ${currentStopIndex} to ${currentStopIndex + 1}`);

      if (currentStopIndex < tour.stops.length - 1) {
        const nextIndex = currentStopIndex + 1;
        setCurrentStopIndex(nextIndex);

        // Clear the timer reference
        autoPlayTimerRef.current = null;

        // Small delay to ensure state updates, then play next stop
        setTimeout(() => {
          triggerAudioForStop(tour.stops[nextIndex], nextIndex, false);
        }, 300);
      }
    }
  }, [autoPlayCountdown, currentStopIndex, tour]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await locationService.current.requestPermissions();
      if (hasPermission) {
        setIsLocationEnabled(true);
        console.log("Location permissions granted");
      } else {
        Alert.alert(
          "Location Permission Required",
          "This app needs location access to trigger audio at tour stops.",
          [{ text: "Cancel", style: "cancel" }]
        );
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const startLocationTracking = async () => {
    try {
      const success = await locationService.current.startTracking(
        (location) => {
          setCurrentLocation(location);
          console.log(`Location updated: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);

          // Only check proximity if location auto-play is enabled
          if (locationAutoPlayEnabled) {
            checkProximityToStops(location);
          }
        },
        {
          // Use high accuracy for better proximity detection
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,   // Check every 2 seconds
          distanceInterval: 5,  // Or when moved 5 meters
        }
      );

      if (!success) {
        console.warn("Failed to start location tracking");
        Alert.alert(
          "Location Tracking Failed",
          "Unable to start location tracking. Location-based audio triggers won't work.",
          [{ text: "OK" }]
        );
      } else {
        console.log("Location tracking started successfully");
      }
    } catch (error) {
      console.error("Error starting location tracking:", error);
      Alert.alert(
        "Location Error",
        "There was an error starting location tracking. Please check your location permissions.",
        [{ text: "OK" }]
      );
    }
  };

  const checkProximityToStops = (location: LocationData) => {
    if (!tour) {
      console.log('No tour loaded yet; skipping proximity check');
      return;
    }

    // Skip if location-based auto-play is disabled
    if (!locationAutoPlayEnabled) {
      console.log('Location auto-play is disabled');
      return;
    }

    if (isTriggeringRef.current) {
      console.log('Already triggering a stop; skipping this tick');
      return;
    }

    // Clear location warning when user moves (will be recalculated)
    if (showLocationWarning && currentStopIndex < tour.stops.length - 1) {
      const nextStop = tour.stops[currentStopIndex + 1];
      if (isUserNearStop(location, nextStop)) {
        console.log('User moved closer to next stop, clearing warning');
        setShowLocationWarning(false);
        hideToast();

        // If auto-play is enabled and we were waiting, start countdown now
        if (isAutoPlayEnabled && !audioRef.current) {
          console.log('User is now close enough, starting delayed auto-play countdown');
          startAutoPlayCountdown();
        }
      }
    }

    let bestStop: TourStop | null = null;
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;

    // Find the closest stop within proximity threshold
    for (let i = 0; i < tour.stops.length; i++) {
      const stop = tour.stops[i];

      // Use trigger coordinates if available, otherwise use regular coordinates
      const triggerCoords = stop.triggerCoordinates || stop.coordinates;
      if (
        !triggerCoords ||
        typeof triggerCoords.lat !== 'number' ||
        typeof triggerCoords.lng !== 'number'
      ) {
        continue;
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        triggerCoords.lat,
        triggerCoords.lng
      );

      // Check if within proximity and is closer than previous candidates
      if (distance <= PROXIMITY_THRESHOLD && distance < bestDistance) {
        bestDistance = distance;
        bestStop = stop;
        bestIndex = i;
      }
    }

    if (bestStop && bestIndex >= 0) {
      // Prevent re-triggering the same stop repeatedly
      if (lastTriggeredStopId === bestStop.id) {
        console.log(`Stop "${bestStop.title}" already triggered recently, skipping`);
        return;
      }

      console.log(`Location triggered: "${bestStop.title}" [${bestStop.id}] @ ${Math.round(bestDistance)}m`);

      // Show location trigger toast
      showToast(`Entering "${bestStop.title}" area - starting audio automatically`);

      // Set triggering flag and trigger audio
      isTriggeringRef.current = true;
      setLastTriggeredStopId(bestStop.id);

      triggerAudioForStop(bestStop, bestIndex, true) // true = triggered by location
        .catch((e) => {
          console.warn('Location-triggered audio failed:', e);
          showToast(`Could not play audio for "${bestStop.title}"`);
          setLastTriggeredStopId(null);
        })
        .finally(() => {
          isTriggeringRef.current = false;
        });
    } else {
      // Reset last triggered stop if we're far from all stops
      if (lastTriggeredStopId) {
        const lastTriggeredStop = tour.stops.find(s => s.id === lastTriggeredStopId);
        if (lastTriggeredStop) {
          const triggerCoords = lastTriggeredStop.triggerCoordinates || lastTriggeredStop.coordinates;
          if (triggerCoords) {
            const distanceFromLast = calculateDistance(
              location.latitude,
              location.longitude,
              triggerCoords.lat,
              triggerCoords.lng
            );

            // Reset if we're far enough from the last triggered stop
            if (distanceFromLast > PROXIMITY_THRESHOLD * 2) {
              console.log(`Far enough from last triggered stop, resetting trigger lock`);
              setLastTriggeredStopId(null);
            }
          }
        }
      }
    }
  };

  // Enhanced stop current audio function
  const stopCurrentAudio = async () => {
    console.log("Stopping current audio");

    if (audioRef.current) {
      try {
        const status = await audioRef.current.getStatusAsync();
        console.log("Audio status before stop:", status);

        await audioRef.current.stopAsync();
        await audioRef.current.unloadAsync();
      } catch (error) {
        console.warn("Error stopping/unloading audio:", error);
      }
      audioRef.current = null;
    }

    // Clear auto-play timer when stopping audio
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setAutoPlayCountdown(0);

    // Reset audio state completely
    setAudioState({
      isPlaying: false,
      currentStopId: null,
      position: 0,
      duration: 0,
    });
  };

  // Enhanced auto-play countdown with location checking
  const startAutoPlayCountdown = () => {
    if (!tour || currentStopIndex >= tour.stops.length - 1) {
      console.log('No next stop available for auto-play');
      return;
    }

    const nextStop = tour.stops[currentStopIndex + 1];

    // Check if location-based auto-play is enabled
    if (locationAutoPlayEnabled && currentLocation) {
      const isNearNextStop = isUserNearStop(currentLocation, nextStop);
      const distance = getDistanceToStop(currentLocation, nextStop);

      if (!isNearNextStop) {
        console.log(`User not near next stop "${nextStop.title}" (${distance ? Math.round(distance) : 'unknown'}m away)`);

        // Show toast message about location requirement
        const distanceText = distance ? `${Math.round(distance)}m away` : 'far from location';
        showToast(`You're ${distanceText} from "${nextStop.title}". Move closer to auto-play the next stop.`);

        // Set warning flag
        setShowLocationWarning(true);

        // Don't start the countdown - wait for user to get closer
        return;
      } else {
        console.log(`User is near next stop "${nextStop.title}", proceeding with auto-play countdown`);
        // Clear any existing warning
        setShowLocationWarning(false);
      }
    }

    console.log(`Starting 5-second countdown for auto-play (current index: ${currentStopIndex})`);
    setAutoPlayCountdown(5); // 5 second countdown

    // Set timer reference for cleanup purposes
    autoPlayTimerRef.current = setTimeout(() => {
      console.log(`Auto-play timer completed`);
    }, 5000);
  };


// FIXED: Audio completion handler - replace the incorrect line around line 546
const setupAudioPlaybackListener = (sound: Audio.Sound, stopId: string) => {
  sound.setOnPlaybackStatusUpdate(async (status) => {
    if (!status.isLoaded) return;

    // More robust state updates
    setAudioState((prev) => ({
      ...prev,
      position: status.positionMillis || 0,
      duration: status.durationMillis || 0,
      isPlaying: status.isPlaying || false,
      currentStopId: stopId,
    }));

    if (status.didJustFinish && tour && user) {
      console.log(`Audio finished for stop: ${stopId} (index: ${currentStopIndex})`);

      // FIXED: Mark stop as completed with CORRECT parameters
      try {
        // Check if already completed to avoid duplicate calls
        if (!completedStops.has(stopId)) {
          console.log(`Marking stop as completed: ${stopId} for tour: ${tour.id}`);
          
          // CORRECT: stopId first, tourId second (no user.id here!)
          await markStopCompleted(stopId, tour.id);
          
          console.log(`Stop ${stopId} marked as completed in progress tracking`);
          
          // Refresh completion data to show updated UI
          await refreshCompletionData();
        } else {
          console.log(`Stop ${stopId} was already completed, skipping database insert`);
        }
      } catch (error) {
        console.error('Error marking stop as completed:', error);
      }

        // Reset audio state properly
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
          position: 0,
          currentStopId: null
        }));

        // Clean up current audio
        if (audioRef.current) {
          try {
            await audioRef.current.unloadAsync();
          } catch (error) {
            console.warn("Error unloading finished audio:", error);
          }
          audioRef.current = null;
        }

        const hasNextStop = currentStopIndex < tour.stops.length - 1;

        if (isAutoPlayEnabled && hasNextStop) {
          console.log(`Auto-play enabled, checking location for next stop (${currentStopIndex + 1}/${tour.stops.length})`);
          startAutoPlayCountdown(); // This will now check location
        } else if (!hasNextStop) {
          console.log("Tour completed - reached final stop!");
          showTourCompletedMessage();
        } else {
          console.log("Auto-play disabled, staying on current stop");
        }
      }
    });
  };

  // Cancel auto-play countdown
  const cancelAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setAutoPlayCountdown(0);
    console.log("Auto-play cancelled");
  };

  // FIXED: Show tour completed message with accurate progress stats
  const showTourCompletedMessage = () => {
    if (!tour) return;

    const completionRate = completionStats.percentage;

    Alert.alert(
      "Tour Completed!",
      `Congratulations! You've finished the entire tour with ${completionRate}% completion (${completionStats.completed}/${completionStats.total} stops). We hope you enjoyed the experience!`,
      [
        {
          text: "Restart Tour",
          onPress: () => {
            setCurrentStopIndex(0);
            setTour(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                stops: prev.stops.map(stop => ({ ...stop, isPlayed: false }))
              };
            });
          }
        },
        { text: "Finish", style: "default" }
      ]
    );
  };

  // Enhanced triggerAudioForStop with location parameter
  const triggerAudioForStop = async (stop: TourStop, index: number, triggeredByLocation: boolean = false) => {
    if (!tour) {
      console.log('No tour while triggering audio; abort');
      return;
    }

    const triggerSource = triggeredByLocation ? "location" : "manual";
    console.log(`triggerAudioForStop -> "${stop.title}" [${stop.id}] (index=${index}, source=${triggerSource})`);

    try {
      // Stop any currently playing audio first
      await stopCurrentAudio();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      let audioUri: string | null = null;

      // Try offline first if in offline mode
      if (isOfflineMode) {
        audioUri = await getOfflineAudioPath(tour.id, stop.id);
        if (audioUri) {
          console.log(`Found offline audio for stop ${stop.id}`);
        }
      }

      // Use stop.audio if it's already set
      if (!audioUri && stop.audio) {
        audioUri = stop.audio;
        console.log(`Using stop audio URL for ${stop.id}`);
      }

      if (!audioUri) {
        const message = `Audio is not available for: ${stop.title}${isOfflineMode ? ' (not downloaded for offline use)' : ''}`;

        if (triggeredByLocation) {
          console.warn(`Location-triggered audio not available: ${message}`);
          // Don't show alert for location-triggered failures, just log
          return;
        } else {
          Alert.alert("Audio Not Available", message);
          return;
        }
      }

      console.log(`Creating audio with URI: ${audioUri}`);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, volume: 1.0 }
      );

      audioRef.current = sound;
      setupAudioPlaybackListener(sound, stop.id);

      // Set initial state - audio should be playing
      setAudioState({
        isPlaying: true,
        currentStopId: stop.id,
        position: 0,
        duration: 0,
      });

      setCurrentStopIndex(index);

      // Update tour stop as played
      setTour((prev) => {
        if (!prev) return prev;
        const updatedStops = [...prev.stops];
        updatedStops[index] = { ...updatedStops[index], isPlayed: true };
        return { ...prev, stops: updatedStops };
      });

      console.log(`Audio started for stop: ${stop.title} (triggered by ${triggerSource})`);

    } catch (error) {
      console.error("Audio playback error:", error);

      // Reset state on error
      setAudioState({
        isPlaying: false,
        currentStopId: null,
        position: 0,
        duration: 0,
      });

      if (!triggeredByLocation) {
        Alert.alert("Audio Not Available", `Could not play audio for: ${stop.title}`);
      }
    }
  };

  // Fixed toggle audio function with better error handling and state management
  const toggleAudio = async () => {
    try {
      // If no audio is loaded, start playing the current stop
      if (!audioRef.current && tour?.stops[currentStopIndex]) {
        console.log("No audio loaded, starting playback for current stop");
        await triggerAudioForStop(tour.stops[currentStopIndex], currentStopIndex, false);
        return;
      }

      // If audio exists, toggle play/pause
      if (audioRef.current) {
        if (audioState.isPlaying) {
          console.log("Pausing audio");
          await audioRef.current.pauseAsync();
          // Immediately update state to show pause icon
          setAudioState((prev) => ({ ...prev, isPlaying: false }));
        } else {
          console.log("Resuming audio");
          await audioRef.current.playAsync();
          // Immediately update state to show play icon
          setAudioState((prev) => ({ ...prev, isPlaying: true }));
        }
      } else {
        console.warn("No audio reference available");
        // Reset audio state if no reference exists
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
          currentStopId: null,
          position: 0,
          duration: 0
        }));
      }
    } catch (error) {
      console.error("Toggle audio error:", error);
      // Reset state on error
      setAudioState((prev) => ({
        ...prev,
        isPlaying: false,
        currentStopId: null
      }));
      Alert.alert("Playback Error", "Could not toggle audio playback. Please try selecting the stop again.");
    }
  };

  // Enhanced location opening with multiple map options
  const openLocationInMaps = async (stop: TourStop) => {
    const coords = stop.coordinates;
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      Alert.alert("Error", "This location doesn't have valid coordinates");
      return;
    }

    const { lat, lng } = coords;

    // Try Google Maps first (most common)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    try {
      const canOpenGoogle = await Linking.canOpenURL(googleMapsUrl);
      if (canOpenGoogle) {
        await Linking.openURL(googleMapsUrl);
        console.log(`Opened Google Maps for ${stop.title} at ${lat}, ${lng}`);
        return;
      }
    } catch (error) {
      console.warn('Failed to open Google Maps:', error);
    }

    // Fallback to Apple Maps
    const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;
    try {
      const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
      if (canOpenApple) {
        await Linking.openURL(appleMapsUrl);
        console.log(`Opened Apple Maps for ${stop.title} at ${lat}, ${lng}`);
        return;
      }
    } catch (error) {
      console.warn('Failed to open Apple Maps:', error);
    }

    // Last resort: show coordinates
    Alert.alert(
      "Location Coordinates",
      `${stop.title}\nLatitude: ${lat}\nLongitude: ${lng}`,
      [{ text: "OK" }]
    );
  };

  // Enhanced handle stop press with audio management
  const handleStopPress = async (stop: TourStop, index: number) => {
    console.log(`Stop pressed: ${stop.title} (index: ${index})`);

    // Cancel auto-play when user manually selects a stop
    cancelAutoPlay();

    // Reset location trigger lock when manually selecting
    setLastTriggeredStopId(null);

    // If this is the currently selected stop and audio is playing, just toggle
    if (index === currentStopIndex && audioRef.current) {
      await toggleAudio();
    } else {
      // Different stop selected, change to it and start playing
      setCurrentStopIndex(index);
      // Small delay to ensure state updates, then trigger audio (manual trigger)
      setTimeout(() => {
        triggerAudioForStop(stop, index, false);
      }, 100);
    }
  };

  const handleMapPress = (stop: TourStop) => {
    openLocationInMaps(stop);
  };

  const handlePreviousStop = () => {
    if (currentStopIndex > 0) {
      cancelAutoPlay();
      setCurrentStopIndex(currentStopIndex - 1);
    }
  };

  const handleNextStop = () => {
    if (tour && currentStopIndex < tour.stops.length - 1) {
      cancelAutoPlay();
      setCurrentStopIndex(currentStopIndex + 1);
    }
  };

  const renderStopImage = (stop: TourStop) => {
    const uri = stopImages[stop.id];
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={styles.stopThumbnail}
          onError={() => {
            console.warn(`Failed to load image for stop ${stop.id}: ${uri}`);
          }}
        />
      );
    }
    return (
      <View style={[styles.stopThumbnail, styles.placeholderImage]}>
        <Ionicons name="image-outline" size={20} color="#ccc" />
      </View>
    );
  };

  const currentStop = tour?.stops[currentStopIndex];
  const currentStopImage = currentStop ? stopImages[currentStop.id] : null;

  // Improved icon function with debugging
  const getPlayButtonIcon = () => {
    const icon = audioState.isPlaying ? "pause" : "play";
    //console.log(`Icon should be: ${icon} (isPlaying: ${audioState.isPlaying})`);
    return icon;
  };

  // FIXED: Check if specific stop is completed using local state
  const checkStopCompletion = (stopId: string): boolean => {
    return completedStops.has(stopId);
  };

  // Loading state
  if (isLoadingTour) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>
          Loading tour stops...
        </Text>
      </View>
    );
  }

  // GUARD: Ensure user is authenticated before rendering
  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={64} color="#FF9800" />
        <Text style={styles.errorTitle}>Authentication Required</Text>
        <Text style={styles.errorText}>
          Please log in to track your tour progress and completion.
        </Text>
      </View>
    );
  }

  if (tourError || !tour) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color="#FF9800" />
        <Text style={styles.errorTitle}>Tour Not Available {!isOnline ? 'Offline' : ''}</Text>
        <Text style={styles.errorText}>
          {tourError || "This tour is not downloaded for offline use"}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => id && loadTour(id)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toast notification overlay */}
      <Toast
        message={toastMessage || ''}
        isVisible={!!toastMessage}
        onHide={hideToast}
      />

      {/* Location warning banner */}
      <LocationWarningBanner />

      {showMap && (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 44.38756,
              longitude: -68.20429,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={isLocationEnabled}
            followsUserLocation={isLocationEnabled}
          >
            {tour.stops.map((stop) => {
              const coords = stop.coordinates;
              if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
                return null;
              }

              return (
                <Marker
                  key={stop.id}
                  coordinate={{
                    latitude: coords.lat,
                    longitude: coords.lng,
                  }}
                  title={stop.title}
                  description={stop.type.replace("_", " ")}
                  pinColor={checkStopCompletion(stop.id) ? "#4CAF50" : "#5CC4C4"}
                />
              );
            })}
          </MapView>
          <TouchableOpacity
            style={styles.closeMapButton}
            onPress={() => setShowMap(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Audio Controls with Location Auto-Play */}
      <View style={styles.audioControls}>
        {currentStopImage ? (
          <ImageBackground
            source={{ uri: currentStopImage }}
            style={styles.audioControlsBackground}
            imageStyle={styles.backgroundImage}
          >
            <View style={styles.audioControlsOverlay}>
              {/* Progress stats at top */}
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {completedCount} of {completionStats.total} completed ({completionStats.percentage}%)
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${completionStats.percentage}%` }]} />
                </View>
              </View>

              {/* Enhanced auto-play countdown display with location info */}
              {autoPlayCountdown > 0 && (
                <View style={styles.autoPlayNotification}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoPlayText}>
                      Next stop in {autoPlayCountdown}s
                    </Text>
                    {locationAutoPlayEnabled && tour && currentStopIndex < tour.stops.length - 1 && (
                      <Text style={[styles.autoPlayText, { fontSize: 11, opacity: 0.8 }]}>
                        Location verified
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={cancelAutoPlay} style={styles.cancelAutoPlayButton}>
                    <Text style={styles.cancelAutoPlayText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.currentStopInfo}>
                <Text style={styles.currentStopTitle}>
                  {currentStop?.title || "Select a stop to begin"}
                </Text>
                <Text style={styles.currentStopType}>
                  {currentStop?.type.replace("_", " ").toUpperCase()}
                </Text>
                {/* Completion indicator for current stop */}
                {currentStop && checkStopCompletion(currentStop.id) && (
                  <View style={styles.completedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>

              <View style={styles.controlButtons}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handlePreviousStop}
                  disabled={currentStopIndex === 0}
                >
                  <Ionicons name="play-skip-back" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.controlButton, styles.playButton]}
                  onPress={toggleAudio}
                >
                  <Ionicons name={getPlayButtonIcon()} size={32} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleNextStop}
                  disabled={currentStopIndex === tour.stops.length - 1}
                >
                  <Ionicons name="play-skip-forward" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Control toggles container */}
              <View style={styles.togglesContainer}>
                {/* Regular Auto-play toggle */}
                <TouchableOpacity
                  style={styles.autoPlayToggle}
                  onPress={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
                >
                  <Ionicons
                    name={isAutoPlayEnabled ? "shuffle" : "shuffle-outline"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.autoPlayToggleText}>
                    Auto-play {isAutoPlayEnabled ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>

                {/* Location Auto-play toggle */}
                <TouchableOpacity
                  style={styles.locationAutoPlayToggle}
                  onPress={() => setLocationAutoPlayEnabled(!locationAutoPlayEnabled)}
                >
                  <Ionicons
                    name={locationAutoPlayEnabled ? "location" : "location-outline"}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.locationAutoPlayToggleText}>
                    Location Auto-Play {locationAutoPlayEnabled ? "ON" : "OFF"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.audioControlsDefault}>
            {/* Progress stats for default view */}
            <View style={styles.progressHeader}>
              <Text style={styles.progressTextDefault}>
                {completionStats.completed} of {completionStats.total} completed ({completionStats.percentage}%)
              </Text>
              <View style={styles.progressBarDefault}>
                <View style={[styles.progressFillDefault, { width: `${completionStats.percentage}%` }]} />
              </View>
            </View>

            {/* Auto-play countdown for default view */}
            {autoPlayCountdown > 0 && (
              <View style={styles.autoPlayNotification}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoPlayText}>
                    Next stop in {autoPlayCountdown}s
                  </Text>
                  {locationAutoPlayEnabled && tour && currentStopIndex < tour.stops.length - 1 && (
                    <Text style={[styles.autoPlayText, { fontSize: 11, opacity: 0.8 }]}>
                      Location verified
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={cancelAutoPlay} style={styles.cancelAutoPlayButton}>
                  <Text style={styles.cancelAutoPlayText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.currentStopInfo}>
              <Text style={styles.currentStopTitle}>
                {currentStop?.title || "Select a stop to begin"}
              </Text>
              <Text style={styles.currentStopType}>
                {currentStop?.type.replace("_", " ").toUpperCase()}
              </Text>
              {/* Completion indicator for current stop in default view */}
              {currentStop && checkStopCompletion(currentStop.id) && (
                <View style={styles.completedIndicatorDefault}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.completedTextDefault}>Completed</Text>
                </View>
              )}

              {/* Location status for next stop in default view */}
              {locationAutoPlayEnabled && currentLocation && tour && currentStopIndex < tour.stops.length - 1 && (
                <View style={styles.locationStatusDefault}>
                  <Ionicons
                    name={isUserNearStop(currentLocation, tour.stops[currentStopIndex + 1]) ? "location" : "location-outline"}
                    size={12}
                    color={isUserNearStop(currentLocation, tour.stops[currentStopIndex + 1]) ? "#4CAF50" : "#FF9800"}
                  />
                  <Text style={styles.locationStatusTextDefault}>
                    Next: {isUserNearStop(currentLocation, tour.stops[currentStopIndex + 1]) ? "In range" : "Move closer"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePreviousStop}
                disabled={currentStopIndex === 0}
              >
                <Ionicons name="play-skip-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.playButton]}
                onPress={toggleAudio}
              >
                <Ionicons name={getPlayButtonIcon()} size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleNextStop}
                disabled={currentStopIndex === tour.stops.length - 1}
              >
                <Ionicons name="play-skip-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Control toggles container for default view */}
            <View style={styles.togglesContainer}>
              {/* Regular Auto-play toggle for default view */}
              <TouchableOpacity
                style={styles.autoPlayToggle}
                onPress={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
              >
                <Ionicons
                  name={isAutoPlayEnabled ? "shuffle" : "shuffle-outline"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.autoPlayToggleText}>
                  Auto-play {isAutoPlayEnabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>

              {/* Location Auto-play toggle for default view */}
              <TouchableOpacity
                style={styles.locationAutoPlayToggle}
                onPress={() => setLocationAutoPlayEnabled(!locationAutoPlayEnabled)}
              >
                <Ionicons
                  name={locationAutoPlayEnabled ? "location" : "location-outline"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.locationAutoPlayToggleText}>
                  Location Auto-Play {locationAutoPlayEnabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Enhanced Stops List with Location Status */}
      <ScrollView style={styles.stopsList}>
        <Text style={styles.stopsTitle}>
          Tour Stops ({tour.stops.length}){" "}
          {isOfflineMode && (
            <Text style={styles.offlineIndicator}>• Offline</Text>
          )}
          {completionStats.completed > 0 && (
            <Text style={styles.completionIndicator}>• {completionStats.completed} completed</Text>
          )}
        </Text>
        {tour.stops.map((stop, index) => {
          const isCompleted = checkStopCompletion(stop.id);
          const isCurrent = index === currentStopIndex;
          const isNearby = currentLocation ? isUserNearStop(currentLocation, stop) : false;
          const distance = currentLocation ? getDistanceToStop(currentLocation, stop) : null;

          return (
            <TouchableOpacity
              key={stop.id}
              style={[
                styles.stopItem,
                isCurrent && styles.currentStopItem,
                stop.isPlayed && styles.playedStopItem,
                isCompleted && styles.completedStopItem,
                isNearby && styles.nearbyStopItem,
              ]}
              onPress={() => handleStopPress(stop, index)}
            >
              <View style={styles.stopIconContainer}>
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                ) : stop.isPlayed ? (
                  <Ionicons name="play-circle" size={24} color="#FF9800" />
                ) : isNearby ? (
                  <View style={styles.nearbyStopIcon}>
                    <Text style={styles.stopNumber}>{index + 1}</Text>
                    <Ionicons name="location" size={12} color="#4CAF50" style={styles.locationBadge} />
                  </View>
                ) : (
                  <Text style={styles.stopNumber}>{index + 1}</Text>
                )}
              </View>
              <View style={styles.stopContent}>
                {renderStopImage(stop)}
                <View style={styles.stopTextContent}>
                  <View style={styles.stopTitleRow}>
                    <Text style={[
                      styles.stopTitle,
                      isCompleted && styles.completedStopTitle
                    ]}>
                      {stop.title}
                    </Text>
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>✓</Text>
                      </View>
                    )}
                    {isNearby && !isCompleted && (
                      <View style={styles.nearbyBadge}>
                        <Text style={styles.nearbyBadgeText}> </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stopType}>
                    {stop.type.replace("_", " ")}
                    {isCurrent && " • Now Playing"}
                    {isCompleted && " • Completed"}
                    {isNearby && !isCurrent && " • Nearby"}
                  </Text>
                  {distance && (
                    <Text style={[
                      styles.stopDistance,
                      isNearby && styles.nearbyStopDistance
                    ]}>
                      {Math.round(distance)}m away
                      {isNearby && " ✓"}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => handleMapPress(stop)}
              >
                <Ionicons name="location" size={20} color="#5CC4C4" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* Completion Summary */}
        {completionStats.completed > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trophy" size={24} color="#5CC4C4" />
              <Text style={styles.summaryTitle}>Tour Progress</Text>
            </View>
            <Text style={styles.summaryText}>
              Great progress! You've completed {completionStats.completed} out of {completionStats.total} stops ({completionStats.percentage}%).
            </Text>
            {locationAutoPlayEnabled && (
              <Text style={styles.locationHelpText}>
                Keep Location Auto-Play enabled to automatically start audio when you reach each stop.
              </Text>
            )}
            {completionStats.percentage === 100 && (
              <Text style={styles.congratsText}>
                Congratulations! You've completed the entire tour!
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#5CC4C4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Toast notification styles
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 2000,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#5CC4C4',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 12,
    flex: 1,
    lineHeight: 18,
  },
  toastCloseButton: {
    padding: 4,
  },

  // Location warning banner styles
  locationWarningBanner: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#5CC4C4',
    borderRadius: 12,
    padding: 16,
    zIndex: 1500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 18,
  },
  forcePlayButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  forcePlayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  mapContainer: {
    height: 300,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  closeMapButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 8,
  },
  audioControls: {
    height: "60%",
  },
  audioControlsBackground: {
    flex: 1,
    minHeight: 200,
  },
  backgroundImage: {
    opacity: 1,
    resizeMode: 'cover',
  },
  audioControlsOverlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "#0000004f",
    justifyContent: 'center',
  },
  audioControlsDefault: {
    backgroundColor: "#5CC4C4",
    padding: 20,
    minHeight: 150,
    justifyContent: 'center',
  },

  // Progress header styles
  progressHeader: {
    alignItems: "center",
    marginBottom: 12,
  },
  progressText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  progressTextDefault: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  progressBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBarDefault: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressFillDefault: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },

  currentStopInfo: {
    alignItems: "center",
    marginBottom: 16,
    padding: 20,
  },
  currentStopTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    textShadowColor: 'rgba(29, 29, 29, 0.93)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  currentStopType: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },

  // Completion indicator styles
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
  },
  completedIndicatorDefault: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  completedTextDefault: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },

  // Location status styles
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  locationStatusDefault: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignSelf: 'center',
  },
  locationStatusText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },
  locationStatusTextDefault: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '500',
  },

  controlButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#5CC4C4",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#5CC4C4",
  },

  // Auto-play notification styles
  autoPlayNotification: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1000,
  },
  autoPlayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelAutoPlayButton: {
    backgroundColor: "#FF6B6B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelAutoPlayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Toggle controls styles
  togglesContainer: {
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  autoPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    minWidth: 140,
  },
  autoPlayToggleText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  locationAutoPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    minWidth: 160,
  },
  locationAutoPlayToggleText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },

  stopsList: {
    backgroundColor: "white",
    borderRadius: 35,
    marginTop: -50,
    height: "45%",
    width: "auto",
    padding: 10,
  },
  stopsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 15,
    marginBottom: 16,
  },
  offlineIndicator: {
    color: "#4CAF50",
    fontSize: 16,
  },
  completionIndicator: {
    color: "#5CC4C4",
    fontSize: 16,
  },
  locationIndicator: {
    color: "#4CAF50",
    fontSize: 16,
  },

  stopItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "flex-start",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentStopItem: {
    borderWidth: 2,
    borderColor: "#5CC4C4",
  },
  playedStopItem: {
    backgroundColor: "#f0f8f0",
  },
  completedStopItem: {
    backgroundColor: "#f0f8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  nearbyStopItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },

  stopIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5CC4C4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  stopNumber: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  nearbyStopIcon: {
    position: 'relative',
  },
  locationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 6,
    width: 12,
    height: 12,
  },

  stopContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stopThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 10,
  },
  placeholderImage: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  stopTextContent: {
    flex: 1,
  },
  stopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
    lineHeight: 18,
    flex: 1,
  },
  completedStopTitle: {
    color: "#4CAF50",
  },
  stopType: {
    fontSize: 11,
    color: "#666",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  stopDistance: {
    fontSize: 11,
    color: "#5CC4C4",
    fontWeight: "600",
  },
  nearbyStopDistance: {
    color: "#4CAF50",
    fontWeight: "700",
  },

  // Badge styles
  completedBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  completedBadgeText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "bold",
  },
  nearbyBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  nearbyBadgeText: {
    fontSize: 10,
    color: "#fff",
  },

  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f8ff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#5CC4C4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Summary card styles
  summaryCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  locationHelpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  congratsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 12,
  },
});