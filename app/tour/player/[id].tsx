// app/tour/player/[id].tsx - Enhanced with complete progress tracking integration
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  
  // UPDATED: Enhanced progress hook usage
  const {
    markStopCompleted,
    isStopCompleted,
    getCompletedStopsForTour,
    isLoading: progressLoading,
    forceResetAllProgress, // Add this
    debugShowStoredData, // Add this
    testDatabaseConnection, // Add this
  } = useProgress();
  
  const { getOfflineTour, getOfflineAudioPath, getOfflineImagePath, isOnline } = useOffline();

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
  
  // NEW: Auto-play settings
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [autoPlayCountdown, setAutoPlayCountdown] = useState(0);

  const audioRef = useRef<Audio.Sound | null>(null);
  const locationService = useRef(LocationService.getInstance());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load tour data
  useEffect(() => {
    if (id) loadTour(id);
  }, [id]);

  const loadTour = async (tourId: string) => {
    console.log("🔄 Loading tour:", tourId, "Online:", isOnline);
    try {
      setIsLoadingTour(true);
      setTourError(null);

      // Check offline first
      const offlineTour = getOfflineTour(tourId);
      if (offlineTour) {
        console.log("✅ Found offline tour");
        const sortedOfflineTour = {
          ...offlineTour.tourData,
          stops: offlineTour.tourData.stops.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        };
        setTour(sortedOfflineTour);
        setIsOfflineMode(true);
        console.log(`✅ Offline tour loaded: ${sortedOfflineTour.title} with ${sortedOfflineTour.stops.length} stops`);
        return;
      }

      // If not offline and online, fetch from Supabase
      if (isOnline) {
        console.log("🌐 Fetching from Supabase...");
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
          console.error("❌ Supabase error:", error);
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
      console.error("❌ Failed to load tour:", error);
      setTourError(error instanceof Error ? error.message : "Failed to load tour");
    } finally {
      setIsLoadingTour(false);
    }
  };

  // Fixed image loading - only run once when tour changes
  useEffect(() => {
    if (!tour) return;

    const loadImages = async () => {
      console.log("🖼️ Loading images for", tour.stops.length, "stops");
      const imagesMap: Record<string, string> = {};

      // Load images sequentially to avoid race conditions
      for (const stop of tour.stops) {
        if (stop.image) {
          imagesMap[stop.id] = stop.image;
          console.log(`📸 Image set for stop ${stop.id}`);
        }
      }

      setStopImages(imagesMap);
      console.log(`📸 Loaded ${Object.keys(imagesMap).length}/${tour.stops.length} stop images`);
    };

    loadImages();
  }, [tour]);

  useEffect(() => {
    initializeLocation();
    return () => {
      locationService.current.stopTracking();
      audioRef.current?.unloadAsync();
      // Clean up auto-play timer
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

  // FIXED: Auto-play countdown effect - always move to next stop
  useEffect(() => {
    if (autoPlayCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoPlayCountdown(autoPlayCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoPlayCountdown === 0 && autoPlayTimerRef.current && tour) {
      // When countdown reaches 0, always move to next stop
      console.log(`🚀 Countdown reached 0, advancing from stop ${currentStopIndex} to ${currentStopIndex + 1}`);
      
      if (currentStopIndex < tour.stops.length - 1) {
        const nextIndex = currentStopIndex + 1;
        setCurrentStopIndex(nextIndex);
        
        // Clear the timer reference
        autoPlayTimerRef.current = null;
        
        // Small delay to ensure state updates, then play next stop
        setTimeout(() => {
          triggerAudioForStop(tour.stops[nextIndex], nextIndex);
        }, 300);
      }
    }
  }, [autoPlayCountdown, currentStopIndex, tour]);

  const initializeLocation = async () => {
    try {
      const hasPermission = await locationService.current.requestPermissions();
      if (hasPermission) {
        setIsLocationEnabled(true);
        console.log("✅ Location permissions granted");
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
          checkProximityToStops(location);
        },
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 10,
        }
      );

      if (!success) {
        console.warn("⚠️ Failed to start location tracking");
      }
    } catch (error) {
      console.error("❌ Error starting location tracking:", error);
    }
  };

  const checkProximityToStops = (location: LocationData) => {
    if (!tour) return;

    tour.stops.forEach((stop, index) => {
      if (stop.isPlayed) return;

      const triggerCoords = stop.triggerCoordinates || stop.coordinates;
      if (!triggerCoords || typeof triggerCoords.lat !== 'number' || typeof triggerCoords.lng !== 'number') {
        return;
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        triggerCoords.lat,
        triggerCoords.lng
      );
      const isNearby = distance <= PROXIMITY_THRESHOLD;

      if (isNearby) {
        triggerAudioForStop(stop, index);
      }
    });
  };

  // Enhanced stop current audio function
  const stopCurrentAudio = async () => {
    console.log("🛑 Stopping current audio");
    
    if (audioRef.current) {
      try {
        // Get current status before unloading
        const status = await audioRef.current.getStatusAsync();
        console.log("Audio status before stop:", status);
        
        await audioRef.current.stopAsync();
        await audioRef.current.unloadAsync();
      } catch (error) {
        console.warn("⚠️ Error stopping/unloading audio:", error);
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

  // FIXED: Enhanced audio playback listener with proper progression logic
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
      
      if (status.didJustFinish && tour) {
        console.log(`🎵 Audio finished for stop: ${stopId} (index: ${currentStopIndex})`);
        
        // Mark stop as completed (only if not already completed to avoid duplicates)
        try {
          const isAlreadyCompleted = checkStopCompletion(stopId);
          if (!isAlreadyCompleted) {
            console.log(`🎯 Marking stop as completed: ${stopId} for tour: ${tour.id}`);
            await markStopCompleted(tour.id, stopId);
            console.log(`✅ Stop ${stopId} marked as completed in progress tracking`);
          } else {
            console.log(`ℹ️ Stop ${stopId} was already completed, skipping database insert`);
          }
        } catch (error) {
          console.error('❌ Error marking stop as completed:', error);
          console.error('❌ Error details:', {
            stopId,
            tourId: tour.id,
            error: error instanceof Error ? error.message : error
          });
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
        
        // FIXED: Always progress to next stop if auto-play enabled and there's a next stop
        // Don't check if next stop is completed - just move forward
        const hasNextStop = currentStopIndex < tour.stops.length - 1;
        
        if (isAutoPlayEnabled && hasNextStop) {
          console.log(`🔄 Auto-play enabled, moving to next stop (${currentStopIndex + 1}/${tour.stops.length})`);
          startAutoPlayCountdown();
        } else if (!hasNextStop) {
          console.log("🎉 Tour completed - reached final stop!");
          showTourCompletedMessage();
        } else {
          console.log("⏹️ Auto-play disabled, staying on current stop");
        }
      }
    });
  };

  // FIXED: Start auto-play countdown - simplified
  const startAutoPlayCountdown = () => {
    console.log(`⏰ Starting 5-second countdown for auto-play (current index: ${currentStopIndex})`);
    setAutoPlayCountdown(5); // 5 second countdown
    
    // Set timer reference for cleanup purposes
    autoPlayTimerRef.current = setTimeout(() => {
      // Timer cleanup will be handled by useEffect
      console.log(`⏰ Auto-play timer completed`);
    }, 5000);
  };

  // FIXED: Simplified playNextStop - remove since we handle it in useEffect
  // This function is now handled directly in the useEffect for better reliability

  // NEW: Cancel auto-play countdown
  const cancelAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setAutoPlayCountdown(0);
    console.log("⏹️ Auto-play cancelled");
  };

  // UPDATED: Show tour completed message with progress stats
  const showTourCompletedMessage = () => {
    if (!tour) return;
    
    const completedStops = getCompletedStopsForTour(tour.id);
    const completionRate = Math.round((completedStops.length / tour.stops.length) * 100);
    
    Alert.alert(
      "🎉 Tour Completed!",
      `Congratulations! You've finished the entire tour with ${completionRate}% completion (${completedStops.length}/${tour.stops.length} stops). We hope you enjoyed the experience!`,
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

  // Improved triggerAudioForStop function with better state management
  const triggerAudioForStop = async (stop: TourStop, index: number) => {
    if (!tour) return;
    
    console.log(`🎵 Triggering audio for stop: ${stop.title} (${stop.id})`);
    
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
          console.log(`🎵 Found offline audio for stop ${stop.id}`);
        }
      }

      // Use stop.audio if it's already set
      if (!audioUri && stop.audio) {
        audioUri = stop.audio;
        console.log(`🎵 Using stop audio URL for ${stop.id}`);
      }

      if (!audioUri) {
        Alert.alert(
          "Audio Not Available",
          `Audio is not available for: ${stop.title}${isOfflineMode ? ' (not downloaded for offline use)' : ''}`
        );
        return;
      }

      console.log(`🎵 Creating audio with URI: ${audioUri}`);
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
      
      console.log(`✅ Audio started for stop: ${stop.title}`);
      
    } catch (error) {
      console.error("❌ Audio playback error:", error);
      // Reset state on error
      setAudioState({
        isPlaying: false,
        currentStopId: null,
        position: 0,
        duration: 0,
      });
      Alert.alert("Audio Not Available", `Could not play audio for: ${stop.title}`);
    }
  };

  // Fixed toggle audio function with better error handling and state management
  const toggleAudio = async () => {
    try {
      // If no audio is loaded, start playing the current stop
      if (!audioRef.current && tour?.stops[currentStopIndex]) {
        console.log("🎵 No audio loaded, starting playback for current stop");
        await triggerAudioForStop(tour.stops[currentStopIndex], currentStopIndex);
        return;
      }

      // If audio exists, toggle play/pause
      if (audioRef.current) {
        if (audioState.isPlaying) {
          console.log("⏸️ Pausing audio");
          await audioRef.current.pauseAsync();
          // Immediately update state to show pause icon
          setAudioState((prev) => ({ ...prev, isPlaying: false }));
        } else {
          console.log("▶️ Resuming audio");
          await audioRef.current.playAsync();
          // Immediately update state to show play icon
          setAudioState((prev) => ({ ...prev, isPlaying: true }));
        }
      } else {
        console.warn("⚠️ No audio reference available");
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
      console.error("❌ Toggle audio error:", error);
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
    const stopName = encodeURIComponent(stop.title);

    // Try Google Maps first (most common)
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    try {
      const canOpenGoogle = await Linking.canOpenURL(googleMapsUrl);
      if (canOpenGoogle) {
        await Linking.openURL(googleMapsUrl);
        console.log(`📍 Opened Google Maps for ${stop.title} at ${lat}, ${lng}`);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to open Google Maps:', error);
    }
    
    // Fallback to Apple Maps
    const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;
    try {
      const canOpenApple = await Linking.canOpenURL(appleMapsUrl);
      if (canOpenApple) {
        await Linking.openURL(appleMapsUrl);
        console.log(`📍 Opened Apple Maps for ${stop.title} at ${lat}, ${lng}`);
        return;
      }
    } catch (error) {
      console.warn('⚠️ Failed to open Apple Maps:', error);
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
    console.log(`👆 Stop pressed: ${stop.title} (index: ${index})`);
    
    // Cancel auto-play when user manually selects a stop
    cancelAutoPlay();
    
    // If this is the currently selected stop and audio is playing, just toggle
    if (index === currentStopIndex && audioRef.current) {
      await toggleAudio();
    } else {
      // Different stop selected, change to it and start playing
      setCurrentStopIndex(index);
      // Small delay to ensure state updates, then trigger audio
      setTimeout(() => {
        triggerAudioForStop(stop, index);
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
            console.warn(`⚠️ Failed to load image for stop ${stop.id}: ${uri}`);
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
    console.log(`🎭 Icon should be: ${icon} (isPlaying: ${audioState.isPlaying})`);
    return icon;
  };

  // ADDED: Get completion stats for current tour
  const getCompletionStats = () => {
    if (!tour) return { completed: 0, total: 0, percentage: 0 };
    
    const completedStops = getCompletedStopsForTour(tour.id);
    const completed = completedStops.length;
    const total = tour.stops.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  // ADDED: Check if specific stop is completed
  const checkStopCompletion = (stopId: string) => {
    return tour ? isStopCompleted(tour.id, stopId) : false;
  };

  // Loading & error states
  if (isLoadingTour || progressLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>
          Loading {isOnline ? 'online' : 'offline'} tour{progressLoading ? ' and progress' : ''}...
        </Text>
      </View>
    );

  if (tourError || !tour)
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

  // ADDED: Get completion stats
  const stats = getCompletionStats();

  return (
    <View style={styles.container}>
      {/* TEMPORARY: Debug buttons - remove after testing 
      <View style={styles.debugContainer}>
        <TouchableOpacity 
          style={styles.debugButton} 
          onPress={() => forceResetAllProgress()}
        >
          <Text style={styles.debugButtonText}>🧹 CLEAR ALL PROGRESS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.debugButton, { backgroundColor: 'blue' }]} 
          onPress={() => debugShowStoredData()}
        >
          <Text style={styles.debugButtonText}>🔍 DEBUG STORAGE</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.debugButton, { backgroundColor: 'green' }]} 
          onPress={() => testDatabaseConnection()}
        >
          <Text style={styles.debugButtonText}>🧪 TEST DATABASE</Text>
        </TouchableOpacity>
      </View>*/}

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

      {/* UPDATED: Enhanced Audio Controls with Progress Display */}
      <View style={styles.audioControls}>
        {currentStopImage ? (
          <ImageBackground
            source={{ uri: currentStopImage }}
            style={styles.audioControlsBackground}
            imageStyle={styles.backgroundImage}
          >
            <View style={styles.audioControlsOverlay}>
              {/* ADDED: Progress stats at top */}
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  {stats.completed} of {stats.total} completed ({stats.percentage}%)
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${stats.percentage}%` }]} />
                </View>
              </View>

              {/* Auto-play countdown display */}
              {autoPlayCountdown > 0 && (
                <View style={styles.autoPlayNotification}>
                  <Text style={styles.autoPlayText}>
                    Next stop in {autoPlayCountdown}s
                  </Text>
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
                {/* ADDED: Completion indicator for current stop */}
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
              
              {/* Auto-play toggle */}
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
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.audioControlsDefault}>
            {/* ADDED: Progress stats for default view */}
            <View style={styles.progressHeader}>
              <Text style={styles.progressTextDefault}>
                {stats.completed} of {stats.total} completed ({stats.percentage}%)
              </Text>
              <View style={styles.progressBarDefault}>
                <View style={[styles.progressFillDefault, { width: `${stats.percentage}%` }]} />
              </View>
            </View>

            {/* Auto-play countdown for default view */}
            {autoPlayCountdown > 0 && (
              <View style={styles.autoPlayNotification}>
                <Text style={styles.autoPlayText}>
                  Next stop in {autoPlayCountdown}s
                </Text>
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
              {/* ADDED: Completion indicator for current stop in default view */}
              {currentStop && checkStopCompletion(currentStop.id) && (
                <View style={styles.completedIndicatorDefault}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.completedTextDefault}>Completed</Text>
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
            
            {/* Auto-play toggle for default view */}
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
          </View>
        )}
      </View>

      {/* UPDATED: Enhanced Stops List with Completion Status */}
      <ScrollView style={styles.stopsList}>
        <Text style={styles.stopsTitle}>
          Tour Stops ({tour.stops.length}){" "}
          {isOfflineMode && (
            <Text style={styles.offlineIndicator}>• Offline</Text>
          )}
          {stats.completed > 0 && (
            <Text style={styles.completionIndicator}>• {stats.completed} completed</Text>
          )}
        </Text>
        {tour.stops.map((stop, index) => {
          const isCompleted = checkStopCompletion(stop.id);
          const isCurrent = index === currentStopIndex;
          
          return (
            <TouchableOpacity
              key={stop.id}
              style={[
                styles.stopItem,
                isCurrent && styles.currentStopItem,
                stop.isPlayed && styles.playedStopItem,
                isCompleted && styles.completedStopItem,
              ]}
              onPress={() => handleStopPress(stop, index)}
            >
              <View style={styles.stopIconContainer}>
                {isCompleted ? (
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                ) : stop.isPlayed ? (
                  <Ionicons name="play-circle" size={24} color="#FF9800" />
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
                  </View>
                  <Text style={styles.stopType}>
                    {stop.type.replace("_", " ")}
                    {isCurrent && " • Now Playing"}
                    {isCompleted && " • Completed"}
                  </Text>
                  {currentLocation && stop.coordinates && (
                    <Text style={styles.stopDistance}>
                      {Math.round(
                        calculateDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          stop.coordinates.lat,
                          stop.coordinates.lng
                        )
                      )}
                      m away
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

        {/* ADDED: Completion Summary at bottom */}
        {stats.completed > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trophy" size={24} color="#5CC4C4" />
              <Text style={styles.summaryTitle}>Tour Progress</Text>
            </View>
            <Text style={styles.summaryText}>
              Great progress! You've completed {stats.completed} out of {stats.total} stops ({stats.percentage}%).
            </Text>
            {stats.percentage === 100 && (
              <Text style={styles.congratsText}>
                🎉 Congratulations! You've completed the entire tour!
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
    height: "55%",
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
  // NEW: Progress header styles
  progressHeader: {
    position: "absolute",
    top: 10,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  progressText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 5,
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  progressTextDefault: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  progressBarDefault: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    marginTop: 4,
  },
  progressFillDefault: {
    height: "100%",
    backgroundColor: "#4CAF50",
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
  // NEW: Completion indicator styles
  completedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderRadius: 12,
  },
  completedText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  completedIndicatorDefault: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  completedTextDefault: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
  // Auto-play styles
  autoPlayNotification: {
    position: "absolute",
    top: 60,
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
  autoPlayToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    alignSelf: "center",
  },
  autoPlayToggleText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
  },
  stopsList: {
    backgroundColor: "white",
    borderRadius: 35,
    marginTop: -50,
    height: "50%",
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
  // NEW: Completion indicator for stops title
  completionIndicator: {
    color: "#5CC4C4",
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
  // NEW: Completed stop item style
  completedStopItem: {
    backgroundColor: "#f0f8f0",
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
  // NEW: Stop title row for completion badge
  stopTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
    lineHeight: 18,
    flex: 1,
  },
  // NEW: Completed stop title style
  completedStopTitle: {
    color: "#4CAF50",
  },
  // NEW: Completed badge
  completedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  completedBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
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
  // NEW: Summary card styles
  summaryCard: {
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    marginHorizontal: 5,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginLeft: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#2E7D32",
    lineHeight: 20,
  },
  congratsText: {
    fontSize: 14,
    color: "#1B5E20",
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  // TEMPORARY: Debug styles - remove after testing
  debugContainer: {
    padding: 10,
    backgroundColor: 'yellow',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  debugButton: {
    padding: 8,
    backgroundColor: 'red',
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 2,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});