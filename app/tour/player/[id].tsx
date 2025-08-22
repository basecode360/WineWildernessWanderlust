// app/tour/player/[id].tsx
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
  return null; // Return null if trigger coordinates are not available
};

export default function TourPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markStopCompleted } = useProgress();
  const { getOfflineTour, getOfflineAudioPath, getOfflineImagePath, isOnline } =
    useOffline();

  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [tourError, setTourError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(
    null
  );
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
  const [selectedStopForDirection, setSelectedStopForDirection] =
    useState<TourStop | null>(null);
  const [stopImages, setStopImages] = useState<Record<string, string>>({});

  const audioRef = useRef<Audio.Sound | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  // Load tour data
  useEffect(() => {
    if (id) loadTour(id);
  }, [id]);

  const loadTour = async (tourId: string) => {
    console.log("current tour id is ", tourId);
    try {
      setIsLoadingTour(true);
      setTourError(null);
      if (isOnline) {
        const { data, error } = await supabase
          .from("tours")
          .select("*, stops(*)")
          .eq("id", tourId)
          .single();

        if (error) throw error;

        // Transform the data to match expected structure
        const transformedTour = {
          ...data,
          stops: data.stops.map((stop: any) => ({
            ...stop,
            coordinates: ensureValidCoordinates(stop.lat, stop.lng),
            triggerCoordinates: ensureValidTriggerCoordinates(stop.trigger_lat, stop.trigger_lng),
            isPlayed: false,
          }))
        };

        setTour(transformedTour);
        checkOfflineMode(tourId);
        console.log(`✅ Online tour loaded: ${data.title}`);
      } else {
        const offlineTour = getOfflineTour(tourId);
        if (offlineTour) {
          setTour(offlineTour.tourData);
          console.log(
            `✅ Offline tour loaded: ${offlineTour.tourData.title} with ${offlineTour.tourData.stops.length} stops`
          );
        } else {
          setTourError("This tour is not downloaded for offline use");
        }
      }
    } catch (error) {
      console.error("❌ Failed to load tour:", error);
      setTourError("Failed to load tour");
    } finally {
      setIsLoadingTour(false);
    }
  };

  const checkOfflineMode = async (tourId: string) => {
    const offline = !isOnline || !!getOfflineTour(tourId);
    setIsOfflineMode(offline);
  };

  // Preload stop images
  useEffect(() => {
    if (!tour) return;

    const loadImages = async () => {
      const imagesMap: Record<string, string> = {};

      await Promise.all(
        tour.stops.map(async (stop) => {
          const uri = await getImageUrl(stop.image_path, tour.id);
          imagesMap[stop.id] = uri || '';
        })
      );

      setStopImages(imagesMap);
    };

    loadImages();
  }, [tour]);

  useEffect(() => {
    requestLocationPermission();
    return () => {
      locationSubscription.current?.remove();
      audioRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (isLocationEnabled && tour) startLocationTracking();
  }, [isLocationEnabled, tour]);

  useEffect(() => {
    stopCurrentAudio();
  }, [currentStopIndex]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setIsLocationEnabled(true);
      else
        Alert.alert(
          "Location Permission Required",
          "This app needs location access to trigger audio at tour stops.",
          [{ text: "Cancel", style: "cancel" }]
        );
    } catch (error) {
      console.error("Error requesting location permission:", error);
    }
  };

  const startLocationTracking = async () => {
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 10,
      },
      (loc) => {
        const newLocation: LocationData = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy || 0,
          timestamp: loc.timestamp,
        };
        setCurrentLocation(newLocation);
        checkProximityToStops(newLocation);
      }
    );
  };

  const checkProximityToStops = (location: LocationData) => {
    if (!tour) return;
    tour.stops.forEach((stop, index) => {
      if (stop.isPlayed) return;
      
      // Use triggerCoordinates if available, otherwise use main coordinates
      const triggerCoords = stop.triggerCoordinates || stop.coordinates;
      
      // Safety check to ensure coordinates exist
      if (!triggerCoords || typeof triggerCoords.lat !== 'number' || typeof triggerCoords.lng !== 'number') {
        console.warn(`Stop ${stop.id} has invalid coordinates:`, triggerCoords);
        return;
      }
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        triggerCoords.lat,
        triggerCoords.lng
      );
      if (distance <= PROXIMITY_THRESHOLD) triggerAudioForStop(stop, index);
    });
  };

  const stopCurrentAudio = async () => {
    if (audioRef.current) {
      await audioRef.current.unloadAsync();
      audioRef.current = null;
    }
    setAudioState({
      isPlaying: false,
      currentStopId: null,
      position: 0,
      duration: 0,
    });
  };

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
        await markStopCompleted(tour.id, stopId);
        setAudioState((prev) => ({ ...prev, isPlaying: false, position: 0 }));
        audioRef.current && audioRef.current.unloadAsync();
        audioRef.current = null;
      }
    });
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

      const audioUri = await getAudioUrl(stop.audio_path, tour.id, stop.id);

      if (!audioUri) {
        Alert.alert(
          "Audio Not Available",
          `This audio is not downloaded or available: ${stop.title}`
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
      console.error("❌ Offline audio error:", error);
      Alert.alert(
        "Audio Not Available",
        `This audio is not downloaded for offline use: ${stop.title}`
      );
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

  const openDirections = (stop: TourStop) => {
    // Safety check for coordinates
    const coords = stop.coordinates;
    if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
      Alert.alert("Error", "This location doesn't have valid coordinates");
      return;
    }
    
    const { lat, lng } = coords;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.canOpenURL(url).then((supported) =>
      supported
        ? Linking.openURL(url)
        : Alert.alert("Error", "Unable to open maps app")
    );
  };

  const handleStopPress = (stop: TourStop, index: number) => {
    if (selectedStopForDirection?.id === stop.id) openDirections(stop);
    else {
      setSelectedStopForDirection(stop);
      setCurrentStopIndex(index);
    }
  };

  const handlePreviousStop = () =>
    currentStopIndex > 0 && setCurrentStopIndex(currentStopIndex - 1);
  const handleNextStop = () =>
    tour &&
    currentStopIndex < tour.stops.length - 1 &&
    setCurrentStopIndex(currentStopIndex + 1);

  // Render helper
  const renderStopImage = (stop: TourStop) => {
    const uri = stopImages[stop.id];
    if (uri) return <Image source={{ uri }} style={styles.stopThumbnail} />;
    return (
      <View
        style={[
          styles.stopThumbnail,
          {
            backgroundColor: "#f0f0f0",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Ionicons name="image-outline" size={20} color="#ccc" />
      </View>
    );
  };

  const currentStop = tour?.stops[currentStopIndex];
  const getPlayButtonIcon = () => (audioState.isPlaying ? "pause" : "play");

  // Loading & error states
  if (isLoadingTour)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>Loading offline tour...</Text>
      </View>
    );

  if (tourError || !tour)
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline-outline" size={64} color="#FF9800" />
        <Text style={styles.errorTitle}>Tour Not Available Offline</Text>
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
              // Safety check for map markers
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

      {/* Audio Controls */}
      <View style={styles.audioControls}>
        <View style={styles.currentStopInfo}>
          {currentStop && renderStopImage(currentStop)}
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
      </View>

      {/* Stops List */}
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
              selectedStopForDirection?.id === stop.id &&
                styles.selectedStopItem,
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
  // NEW: Loading container
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
  statusContainer: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  offlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  audioControls: {
    backgroundColor: "#5CC4C4",
    padding: 20,
  },
  currentStopInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  currentStopTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  currentStopType: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  stopsList: {
    flex: 1,
    padding: 16,
  },
  stopsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  offlineIndicator: {
    color: "#4CAF50",
    fontSize: 16,
  },
  directionPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  directionText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    fontWeight: "500",
  },
  clearSelectionButton: {
    padding: 4,
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
  selectedStopItem: {
    borderWidth: 2,
    borderColor: "#1976D2",
    backgroundColor: "#F3F9FF",
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
  stopTextContent: {
    flex: 1,
  },
  currentStopImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginBottom: 8,
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
  stopActions: {
    alignSelf: "flex-start",
    marginTop: 2,
  },
  stopEmoji: {
    fontSize: 20,
  },
  directionButton: {
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
});