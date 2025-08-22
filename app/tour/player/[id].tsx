// app/tour/player/[id].tsx - Enhanced with auto-play next stop feature
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
  const { markStopCompleted } = useProgress();
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

  // NEW: Auto-play countdown effect
  useEffect(() => {
    if (autoPlayCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoPlayCountdown(autoPlayCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoPlayCountdown === 0 && autoPlayTimerRef.current) {
      // When countdown reaches 0, play next stop
      playNextStop();
    }
  }, [autoPlayCountdown]);

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

  const stopCurrentAudio = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.unloadAsync();
      } catch (error) {
        console.warn("⚠️ Error unloading audio:", error);
      }
      audioRef.current = null;
    }
    
    // Clear auto-play timer when stopping audio
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setAutoPlayCountdown(0);
    
    setAudioState({
      isPlaying: false,
      currentStopId: null,
      position: 0,
      duration: 0,
    });
  };

  // NEW: Enhanced audio playback listener with auto-play
  const setupAudioPlaybackListener = (sound: Audio.Sound, stopId: string) => {
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (!status.isLoaded) return;
      
      setAudioState((prev) => ({
        ...prev,
        position: status.positionMillis || 0,
        duration: status.durationMillis || 0,
        isPlaying: status.isPlaying || false,
        currentStopId: stopId,
      }));
      
      if (status.didJustFinish && tour) {
        console.log(`🎵 Audio finished for stop: ${stopId}`);
        
        // Mark stop as completed
        await markStopCompleted(tour.id, stopId);
        setAudioState((prev) => ({ ...prev, isPlaying: false, position: 0 }));
        
        // Clean up current audio
        if (audioRef.current) {
          await audioRef.current.unloadAsync();
          audioRef.current = null;
        }
        
        // NEW: Start auto-play countdown if enabled and there's a next stop
        if (isAutoPlayEnabled && currentStopIndex < tour.stops.length - 1) {
          console.log("🔄 Starting auto-play countdown...");
          startAutoPlayCountdown();
        } else if (currentStopIndex >= tour.stops.length - 1) {
          console.log("🎉 Tour completed!");
          showTourCompletedMessage();
        }
      }
    });
  };

  // NEW: Start auto-play countdown
  const startAutoPlayCountdown = () => {
    setAutoPlayCountdown(5); // 5 second countdown
    
    autoPlayTimerRef.current = setTimeout(() => {
      if (isAutoPlayEnabled) {
        playNextStop();
      }
    }, 5000);
  };

  // NEW: Play next stop
  const playNextStop = () => {
    if (!tour || currentStopIndex >= tour.stops.length - 1) return;
    
    console.log("▶️ Auto-playing next stop...");
    const nextIndex = currentStopIndex + 1;
    setCurrentStopIndex(nextIndex);
    
    // Small delay to ensure state updates
    setTimeout(() => {
      triggerAudioForStop(tour.stops[nextIndex], nextIndex);
    }, 500);
  };

  // NEW: Cancel auto-play countdown
  const cancelAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setAutoPlayCountdown(0);
    console.log("⏹️ Auto-play cancelled");
  };

  // NEW: Show tour completed message
  const showTourCompletedMessage = () => {
    Alert.alert(
      "🎉 Tour Completed!",
      "Congratulations! You've finished the entire tour. We hope you enjoyed the experience!",
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

  const triggerAudioForStop = async (stop: TourStop, index: number) => {
    if (!tour) return;
    try {
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

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true, volume: 1.0 }
      );
      audioRef.current = sound;
      setupAudioPlaybackListener(sound, stop.id);

      setAudioState({
        isPlaying: true,
        currentStopId: stop.id,
        position: 0,
        duration: 0,
      });
      setCurrentStopIndex(index);
      setTour((prev) => {
        if (!prev) return prev;
        const updatedStops = [...prev.stops];
        updatedStops[index] = { ...updatedStops[index], isPlayed: true };
        return { ...prev, stops: updatedStops };
      });
    } catch (error) {
      console.error("❌ Audio playback error:", error);
      Alert.alert("Audio Not Available", `Could not play audio for: ${stop.title}`);
    }
  };

  const toggleAudio = async () => {
    if (!audioRef.current && tour?.stops[currentStopIndex]) {
      await triggerAudioForStop(tour.stops[currentStopIndex], currentStopIndex);
      return;
    }
    try {
      if (audioState.isPlaying) await audioRef.current?.pauseAsync();
      else await audioRef.current?.playAsync();
      setAudioState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    } catch (error) {
      Alert.alert("Playback Error", "Could not toggle audio playback");
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

  const handleStopPress = (stop: TourStop, index: number) => {
    // Cancel auto-play when user manually selects a stop
    cancelAutoPlay();
    setCurrentStopIndex(index);
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
  const getPlayButtonIcon = () => (audioState.isPlaying ? "pause" : "play");

  // Loading & error states
  if (isLoadingTour)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>Loading {isOnline ? 'online' : 'offline'} tour...</Text>
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

  return (
    <View style={styles.container}>
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
                  pinColor={stop.isPlayed ? "#4CAF50" : "#5CC4C4"}
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

      {/* Enhanced Audio Controls with Auto-play Status */}
      <View style={styles.audioControls}>
        {currentStopImage ? (
          <ImageBackground
            source={{ uri: currentStopImage }}
            style={styles.audioControlsBackground}
            imageStyle={styles.backgroundImage}
          >
            <View style={styles.audioControlsOverlay}>
              {/* NEW: Auto-play countdown display */}
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
              
              {/* NEW: Auto-play toggle */}
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

      {/* Enhanced Stops List with Map Icons */}
      <ScrollView style={styles.stopsList}>
        <Text style={styles.stopsTitle}>
          Tour Stops ({tour.stops.length}){" "}
          {isOfflineMode && (
            <Text style={styles.offlineIndicator}>• Offline</Text>
          )}
        </Text>
        {tour.stops.map((stop, index) => (
          <TouchableOpacity
            key={stop.id}
            style={[
              styles.stopItem,
              index === currentStopIndex && styles.currentStopItem,
              stop.isPlayed && styles.playedStopItem,
            ]}
            onPress={() => handleStopPress(stop, index)}
          >
            <View style={styles.stopIconContainer}>
              {stop.isPlayed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              ) : (
                <Text style={styles.stopNumber}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.stopContent}>
              {renderStopImage(stop)}
              <View style={styles.stopTextContent}>
                <Text style={styles.stopTitle}>{stop.title}</Text>
                <Text style={styles.stopType}>
                  {stop.type.replace("_", " ")}
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
        ))}
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
  // NEW: Auto-play styles
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
  stopTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
    lineHeight: 18,
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
});