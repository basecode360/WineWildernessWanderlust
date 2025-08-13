// app/tour/player/[id].tsx - FIXED: Updated for TourServices and dynamic data
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useOffline } from '../../../contexts/OfflineContext';
import { useProgress } from '../../../contexts/ProgressContext';
// FIXED: Import from TourServices (correct name)
import { calculateDistance, getImageSource, getTourById } from '../../../services/tourServices';
import { AudioState, LocationData, Tour, TourStop } from '../../../types/tour';
import { getAudioAsset } from '../../../utils/audioAssets';
import { ERROR_MESSAGES } from '../../../utils/constants';

const { width: screenWidth } = Dimensions.get('window');
const PROXIMITY_THRESHOLD = 100; // meters

export default function TourPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { markStopCompleted } = useProgress(); // Add this line


  // CHANGED: Dynamic tour loading instead of static
  const [tour, setTour] = useState<Tour | null>(null);
  const [isLoadingTour, setIsLoadingTour] = useState(true);
  const [tourError, setTourError] = useState<string | null>(null);

  const {
    isTourOffline,
    getOfflineAudioPath
  } = useOffline();

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
  const [selectedStopForDirection, setSelectedStopForDirection] = useState<TourStop | null>(null);

  const audioRef = useRef<Audio.Sound | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  // NEW: Load tour data when component mounts
  useEffect(() => {
    if (id) {
      loadTour(id as string);
    }
  }, [id]);

  // NEW: Function to load tour from Supabase
  const loadTour = async (tourId: string) => {
    try {
      setIsLoadingTour(true);
      setTourError(null);
      console.log(`🔄 Loading tour ${tourId} for audio player...`);

      const tourData = await getTourById(tourId);
      setTour(tourData);

      if (tourData) {
        console.log(`✅ Tour loaded for player: ${tourData.title} with ${tourData.stops.length} stops`);
      } else {
        console.log(`⚠️ Tour ${tourId} not found`);
        setTourError('Tour not found');
      }
    } catch (error) {
      console.error('❌ Failed to load tour for player:', error);
      setTourError(error instanceof Error ? error.message : ERROR_MESSAGES.API_ERROR);
    } finally {
      setIsLoadingTour(false);
    }
  };

  useEffect(() => {
    checkOfflineMode();
    requestLocationPermission();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isLocationEnabled && tour) {
      startLocationTracking();
    }
  }, [isLocationEnabled, tour]);

  // Handle stop change - reset audio state when currentStopIndex changes
  useEffect(() => {
    if (audioRef.current) {
      // Stop current audio and reset state when stop changes
      stopCurrentAudio();
    }
  }, [currentStopIndex]);

  const checkOfflineMode = async () => {
    if (tour) {
      const isOffline = isTourOffline(tour.id);
      setIsOfflineMode(isOffline);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setIsLocationEnabled(true);
      } else {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to trigger audio at tour stops.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Location.requestForegroundPermissionsAsync(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const startLocationTracking = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (location) => {
          const newLocation: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            timestamp: location.timestamp,
          };
          setCurrentLocation(newLocation);
          checkProximityToStops(newLocation);
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const checkProximityToStops = (location: LocationData) => {
    if (!tour) return;

    tour.stops.forEach((stop, index) => {
      const triggerCoords = stop.triggerCoordinates || stop.coordinates;
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        triggerCoords.lat,
        triggerCoords.lng
      );

      if (distance <= PROXIMITY_THRESHOLD && !stop.isPlayed) {
        triggerAudioForStop(stop, index);
      }
    });
  };

  const stopCurrentAudio = async () => {
    try {
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
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const setupAudioPlaybackListener = (sound: Audio.Sound, stopId: string) => {
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded) {
        setAudioState((prev) => ({
          ...prev,
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying || false,
          currentStopId: stopId,
        }));

        if (status.didJustFinish) {
          console.log('🏁 TourPlayer: Audio playback finished');

          // Mark this stop as completed
          if (tour && stopId) {
            await markStopCompleted(tour.id, stopId);
            console.log('🎉 Stop marked as completed:', stopId);
          }

          // Reset to play icon when audio finishes
          setAudioState(prev => ({
            ...prev,
            isPlaying: false,
            position: 0
          }));

          // Clean up sound object after a short delay
          setTimeout(async () => {
            try {
              if (audioRef.current) {
                await audioRef.current.unloadAsync();
                audioRef.current = null;
              }
            } catch (error) {
              console.error('❌ TourPlayer: Error cleaning up sound after finish:', error);
            }
          }, 100);
        }
      }
    });
  };

  const triggerAudioForStop = async (stop: TourStop, index: number) => {
    try {
      // Initialize audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Stop current audio if playing
      if (audioRef.current) {
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }

      let audioSource;

      if (isOfflineMode && tour) {
        // Try to get offline audio path
        const offlineAudioPath = await getOfflineAudioPath(tour.id, stop.id);

        if (offlineAudioPath && offlineAudioPath !== 'BUNDLED_AUDIO') {
          // Check if the file actually exists and is accessible
          try {
            // Create new Audio.Sound and load with file URI
            const { sound } = await Audio.Sound.createAsync(
              { uri: offlineAudioPath },
              { shouldPlay: false, volume: 1.0 }
            );

            // Test if the sound loaded successfully
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              audioRef.current = sound;
              setupAudioPlaybackListener(sound, stop.id);
              audioSource = 'DOWNLOADED_FILE'; // Flag for tracking
            } else {
              await sound.unloadAsync();
              audioSource = getAudioAsset(stop.audio);
            }
          } catch (downloadError) {
            audioSource = getAudioAsset(stop.audio);
          }
        } else if (offlineAudioPath === 'BUNDLED_AUDIO') {
          // Use bundled audio asset
          audioSource = getAudioAsset(stop.audio);

          if (!audioSource) {
            // Try with different audio file extensions if needed
            const audioAlternatives = [
              stop.audio,
              stop.audio.replace('.wav', '.mp3'),
              stop.audio.replace('.mp3', '.wav'),
            ];

            for (const altAudio of audioAlternatives) {
              const altSource = getAudioAsset(altAudio);
              if (altSource) {
                audioSource = altSource;
                break;
              }
            }
          }
        } else {
          audioSource = getAudioAsset(stop.audio);
        }
      } else {
        // Online mode - use bundled audio asset
        audioSource = getAudioAsset(stop.audio);
      }

      // If we don't have a sound object yet, create one
      if (!audioRef.current) {
        if (!audioSource || audioSource === 'DOWNLOADED_FILE') {
          Alert.alert('Audio Error', `Audio file not available: ${stop.audio}`);
          return;
        }

        const { sound } = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: false,
          volume: 1.0,
          isLooping: false,
        });

        audioRef.current = sound;
        setupAudioPlaybackListener(sound, stop.id);
      }

      // Start playing
      await audioRef.current.playAsync();

      setAudioState({
        isPlaying: true,
        currentStopId: stop.id,
        position: 0,
        duration: 0,
      });

      setCurrentStopIndex(index);
      stop.isPlayed = true;

      const sourceType = audioSource === 'DOWNLOADED_FILE' ? 'Downloaded' : 'Bundled';
      const modeText = isOfflineMode ? ` (Offline - ${sourceType})` : ` (Online - ${sourceType})`;
      Alert.alert('🎧 Audio Started', `Now playing: ${stop.title}${modeText}`, [
        { text: 'OK' },
      ]);

    } catch (error) {
      Alert.alert('Audio Error', `Could not play audio: ${error.message}\n\nTrying bundled fallback...`);

      // Try bundled fallback as last resort
      try {
        const fallbackSource = getAudioAsset(stop.audio);
        if (fallbackSource) {
          const { sound } = await Audio.Sound.createAsync(fallbackSource, {
            shouldPlay: true,
            volume: 1.0,
          });
          audioRef.current = sound;
          setupAudioPlaybackListener(sound, stop.id);
          setAudioState({
            isPlaying: true,
            currentStopId: stop.id,
            position: 0,
            duration: 0,
          });
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  const playStopAudio = async (stop: TourStop, index: number) => {
    await triggerAudioForStop(stop, index);
  };

  const toggleAudio = async () => {
    const currentStop = tour?.stops[currentStopIndex];

    if (!audioRef.current) {
      // No audio loaded - start playing current stop
      if (currentStop) {
        await playStopAudio(currentStop, currentStopIndex);
      }
      return;
    }

    try {
      if (audioState.isPlaying) {
        // Currently playing - pause it
        await audioRef.current.pauseAsync();
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
        }));
      } else {
        // Currently paused - resume playback
        await audioRef.current.playAsync();
        setAudioState((prev) => ({
          ...prev,
          isPlaying: true,
        }));
      }
    } catch (error) {
      Alert.alert('Playback Error', 'Could not toggle audio playback');
    }
  };

  const openDirections = (stop: TourStop) => {
    const { lat, lng } = stop.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'Unable to open maps application');
        }
      })
      .catch((err) => console.error('Error opening directions:', err));
  };

  const handleStopPress = (stop: TourStop, index: number) => {
    if (selectedStopForDirection?.id === stop.id) {
      openDirections(stop);
    } else {
      setSelectedStopForDirection(stop);
      setCurrentStopIndex(index);
    }
  };

  const showMapView = () => {
    setShowMap(true);
  };

  const hideMapView = () => {
    setShowMap(false);
  };

  const renderStopImage = (stop: TourStop) => {
    console.log(`🖼️ TourPlayer: Rendering stop image for "${stop.title}"`);
    console.log(`🖼️ TourPlayer: Stop image path:`, stop.image || 'NO IMAGE');

    if (!stop.image) {
      console.log(`⚠️ TourPlayer: No image for stop "${stop.title}"`);
      return null;
    }

    // Use the new getImageSource function
    const imageSource = getImageSource(stop.image);
    console.log(`🖼️ TourPlayer: Resolved image source:`, imageSource);

    if (!imageSource) {
      console.log(`❌ TourPlayer: No image source resolved for "${stop.title}"`);
      return null;
    }

    return (
      <Image
        source={imageSource} // This will be either require() for local or {uri} for remote
        style={styles.stopThumbnail}
        resizeMode="cover"
        onLoad={() => {
          console.log(`✅ TourPlayer: Stop image loaded for "${stop.title}"`);
        }}
        onError={(error) => {
          console.error(`❌ TourPlayer: Failed to load stop image for "${stop.title}":`, error.nativeEvent);
          console.error(`❌ TourPlayer: Failed source:`, imageSource);
        }}
        onLoadStart={() => {
          console.log(`🔄 TourPlayer: Started loading stop image for "${stop.title}"`);
        }}
        onLoadEnd={() => {
          console.log(`🏁 TourPlayer: Finished loading stop image for "${stop.title}"`);
        }}
      />
    );
  };

  const renderCurrentStopImage = (stop: TourStop) => {
    console.log(`🖼️ TourPlayer: Rendering current stop image for "${stop?.title}"`);
    console.log(`🖼️ TourPlayer: Current stop image path:`, stop?.image || 'NO IMAGE');

    if (!stop?.image) {
      console.log(`⚠️ TourPlayer: No image for current stop "${stop?.title}"`);
      return null;
    }

    // Use the new getImageSource function
    const imageSource = getImageSource(stop.image);
    console.log(`🖼️ TourPlayer: Resolved current stop image source:`, imageSource);

    if (!imageSource) {
      console.log(`❌ TourPlayer: No image source resolved for current stop "${stop.title}"`);
      return null;
    }

    return (
      <Image
        source={imageSource} // This will be either require() for local or {uri} for remote
        style={styles.currentStopImage}
        resizeMode="cover"
        onLoad={() => {
          console.log(`✅ TourPlayer: Current stop image loaded for "${stop.title}"`);
        }}
        onError={(error) => {
          console.error(`❌ TourPlayer: Failed to load current stop image for "${stop.title}":`, error.nativeEvent);
          console.error(`❌ TourPlayer: Failed source:`, imageSource);
        }}
        onLoadStart={() => {
          console.log(`🔄 TourPlayer: Started loading current stop image for "${stop.title}"`);
        }}
        onLoadEnd={() => {
          console.log(`🏁 TourPlayer: Finished loading current stop image for "${stop.title}"`);
        }}
      />
    );
  };

  // Enhanced skip functions that handle audio state properly
  const handlePreviousStop = () => {
    if (currentStopIndex > 0) {
      setCurrentStopIndex(currentStopIndex - 1);
      // Audio will be reset by useEffect when currentStopIndex changes
    }
  };

  const handleNextStop = () => {
    if (tour && currentStopIndex < tour.stops.length - 1) {
      setCurrentStopIndex(currentStopIndex + 1);
      // Audio will be reset by useEffect when currentStopIndex changes
    }
  };

  // NEW: Loading state
  if (isLoadingTour) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5CC4C4" />
        <Text style={styles.loadingText}>Loading tour...</Text>
      </View>
    );
  }

  // NEW: Error state
  if (tourError || !tour) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Unable to Load Tour</Text>
        <Text style={styles.errorText}>
          {tourError || 'Tour not found'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => id && loadTour(id as string)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStop = tour.stops[currentStopIndex];

  // Determine which icon to show based on audio state
  const getPlayButtonIcon = () => {
    if (audioState.isPlaying) {
      return 'pause'; // Show pause icon when playing
    } else {
      return 'play'; // Show play icon when paused, stopped, or on stop change
    }
  };

  return (
    <View style={styles.container}>
      {/* Map View - Hidden by default */}
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
            {tour.stops.map((stop, index) => (
              <Marker
                key={stop.id}
                coordinate={{
                  latitude: stop.coordinates.lat,
                  longitude: stop.coordinates.lng,
                }}
                title={stop.title}
                description={stop.type.replace('_', ' ')}
                pinColor={stop.isPlayed ? '#4CAF50' : '#5CC4C4'}
              />
            ))}
          </MapView>

          {/* Close Map Button */}
          <TouchableOpacity style={styles.closeMapButton} onPress={hideMapView}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Status Indicators */}
          <View style={styles.statusContainer}>
            {/* Location Status */}
            <View style={styles.locationStatus}>
              <Ionicons
                name={isLocationEnabled ? 'location' : 'location-outline'}
                size={16}
                color={isLocationEnabled ? '#4CAF50' : '#666'}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isLocationEnabled ? '#4CAF50' : '#666' },
                ]}
              >
                {isLocationEnabled ? 'GPS Active' : 'GPS Disabled'}
              </Text>
            </View>

            {/* Offline Status */}
            {isOfflineMode && (
              <View style={styles.offlineStatus}>
                <Ionicons name="cloud-done" size={16} color="#4CAF50" />
                <Text style={[styles.statusText, { color: '#4CAF50' }]}>
                  Offline Mode
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Audio Controls */}
      <View style={styles.audioControls}>
        <View style={styles.currentStopInfo}>
          {renderCurrentStopImage(currentStop)}
          <Text style={styles.currentStopTitle}>
            {currentStop ? currentStop.title : 'Select a stop to begin'}
          </Text>
          <Text style={styles.currentStopType}>
            {currentStop && currentStop.type.replace('_', ' ').toUpperCase()}
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
            <Ionicons
              name={getPlayButtonIcon()}
              size={32}
              color="#fff"
            />
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
      <ScrollView style={styles.stopsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.stopsTitle}>
          Tour Stops ({tour.stops.length})
          {isOfflineMode && (
            <Text style={styles.offlineIndicator}> • Offline</Text>
          )}
        </Text>

        {selectedStopForDirection && (
          <View style={styles.directionPrompt}>
            <Text style={styles.directionText}>
              Tap direction button to navigate to "{selectedStopForDirection.title}"
            </Text>
            <TouchableOpacity
              style={styles.clearSelectionButton}
              onPress={() => setSelectedStopForDirection(null)}
            >
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {tour.stops.map((stop, index) => (
          <TouchableOpacity
            key={stop.id}
            style={[
              styles.stopItem,
              index === currentStopIndex && styles.currentStopItem,
              stop.isPlayed && styles.playedStopItem,
              selectedStopForDirection?.id === stop.id && styles.selectedStopItem,
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
                  {stop.type.replace('_', ' ')}
                </Text>
                {currentLocation && (
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

            <View style={styles.stopActions}>
              {selectedStopForDirection?.id === stop.id ? (
                <TouchableOpacity
                  style={styles.directionButton}
                  onPress={() => openDirections(stop)}
                >
                  <Ionicons name="navigate" size={20} color="#5CC4C4" />
                </TouchableOpacity>
              ) : (
                <>
                  {stop.type === 'lobster_stop' && (
                    <Text style={styles.stopEmoji}>🦞</Text>
                  )}
                  {stop.type === 'bonus_stop' && (
                    <Text style={styles.stopEmoji}>🎁</Text>
                  )}
                  {stop.type === 'info_Stop' && <Text style={styles.stopEmoji}>ℹ️</Text>}
                </>
              )}
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
    backgroundColor: '#f8f9fa',
  },
  // NEW: Loading container
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#5CC4C4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  closeMapButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  statusContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  audioControls: {
    backgroundColor: '#5CC4C4',
    padding: 20,
  },
  currentStopInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  currentStopTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  currentStopType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stopsList: {
    flex: 1,
    padding: 16,
  },
  stopsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  offlineIndicator: {
    color: '#4CAF50',
    fontSize: 16,
  },
  directionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  directionText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  clearSelectionButton: {
    padding: 4,
  },
  stopItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  currentStopItem: {
    borderWidth: 2,
    borderColor: '#5CC4C4',
  },
  playedStopItem: {
    backgroundColor: '#f0f8f0',
  },
  selectedStopItem: {
    borderWidth: 2,
    borderColor: '#1976D2',
    backgroundColor: '#F3F9FF',
  },
  stopIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#5CC4C4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stopNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stopContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 8,
  },
  stopTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    lineHeight: 18,
  },
  stopType: {
    fontSize: 11,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  stopDistance: {
    fontSize: 11,
    color: '#5CC4C4',
    fontWeight: '600',
  },
  stopActions: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  stopEmoji: {
    fontSize: 20,
  },
  directionButton: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
});