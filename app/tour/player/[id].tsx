// app/tour/player/[id].tsx - Complete Tour Player with Enhanced Audio Controls
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import { calculateDistance, getTourById } from '../../../data/tours';
import { AudioState, LocationData, TourStop } from '../../../types/tour';
import { getAudioAsset } from '../../../utils/audioAssets';
import { getImageAsset } from '../../../utils/imageAssets';

const { width: screenWidth } = Dimensions.get('window');
const PROXIMITY_THRESHOLD = 100; // meters

export default function TourPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTourById(id as string);
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
      console.log('📱 Tour offline mode:', isOffline);
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
        console.log('🛑 Stopping current audio');
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
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setAudioState((prev) => ({
          ...prev,
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying || false,
          currentStopId: stopId,
        }));
        
        if (status.didJustFinish) {
          console.log('🎵 Audio finished naturally');
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
                console.log('🎵 Sound object cleaned up after finish');
              }
            } catch (error) {
              console.error('Error cleaning up sound after finish:', error);
            }
          }, 100);
        }
      }
    });
  };

  const triggerAudioForStop = async (stop: TourStop, index: number) => {
    try {
      console.log('🎵 Attempting to play audio for stop:', stop.title); 
      console.log('📱 Offline mode:', isOfflineMode);
      console.log('🎵 Audio file name:', stop.audio);

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
        console.log('🔍 Looking for offline audio...');
        
        // Try to get offline audio path
        const offlineAudioPath = await getOfflineAudioPath(tour.id, stop.id);
        console.log('🎵 Offline audio path result:', offlineAudioPath);

        if (offlineAudioPath && offlineAudioPath !== 'BUNDLED_AUDIO') {
          // Check if the file actually exists and is accessible
          try {
            console.log('✅ Using downloaded audio file:', offlineAudioPath);
            
            // Create new Audio.Sound and load with file URI
            const { sound } = await Audio.Sound.createAsync(
              { uri: offlineAudioPath },
              { shouldPlay: false, volume: 1.0 }
            );
            
            // Test if the sound loaded successfully
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              console.log('✅ Downloaded audio loaded successfully');
              audioRef.current = sound;
              setupAudioPlaybackListener(sound, stop.id);
              audioSource = 'DOWNLOADED_FILE'; // Flag for tracking
            } else {
              console.log('❌ Downloaded audio failed to load, trying bundled');
              await sound.unloadAsync();
              audioSource = getAudioAsset(stop.audio);
            }
          } catch (downloadError) {
            console.log('❌ Error with downloaded file, falling back to bundled:', downloadError.message);
            audioSource = getAudioAsset(stop.audio);
          }
        } else if (offlineAudioPath === 'BUNDLED_AUDIO') {
          // Use bundled audio asset
          console.log('📦 Using bundled audio asset for offline');
          audioSource = getAudioAsset(stop.audio);
          
          if (!audioSource) {
            console.log('⚠️ No bundled audio asset found, trying alternatives');
            // Try with different audio file extensions if needed
            const audioAlternatives = [
              stop.audio,
              stop.audio.replace('.wav', '.mp3'),
              stop.audio.replace('.mp3', '.wav'),
            ];
            
            for (const altAudio of audioAlternatives) {
              const altSource = getAudioAsset(altAudio);
              if (altSource) {
                console.log('✅ Found alternative audio asset:', altAudio);
                audioSource = altSource;
                break;
              }
            }
          }
        } else {
          console.log('❌ No offline audio available, falling back to bundled');
          audioSource = getAudioAsset(stop.audio);
        }
      } else {
        // Online mode - use bundled audio asset
        console.log('📦 Using bundled audio asset for online mode');
        audioSource = getAudioAsset(stop.audio);
      }

      // If we don't have a sound object yet, create one
      if (!audioRef.current) {
        if (!audioSource || audioSource === 'DOWNLOADED_FILE') {
          console.error('❌ No audio source available for:', stop.audio);
          Alert.alert('Audio Error', `Audio file not available: ${stop.audio}`);
          return;
        }

        console.log('🎵 Creating audio sound with bundled source');
        
        const { sound } = await Audio.Sound.createAsync(audioSource, {
          shouldPlay: false,
          volume: 1.0,
          isLooping: false,
        });

        audioRef.current = sound;
        setupAudioPlaybackListener(sound, stop.id);
      }

      // Start playing
      console.log('🎵 Starting audio playback');
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
      console.error('❌ Error playing audio:', error);
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
          console.log('✅ Fallback audio playing');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
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
        console.log('🎵 No audio loaded, starting playback for current stop');
        await playStopAudio(currentStop, currentStopIndex);
      }
      return;
    }

    try {
      if (audioState.isPlaying) {
        // Currently playing - pause it
        console.log('⏸️ Pausing audio');
        await audioRef.current.pauseAsync();
        setAudioState((prev) => ({
          ...prev,
          isPlaying: false,
        }));
      } else {
        // Currently paused - resume playback
        console.log('▶️ Resuming audio');
        await audioRef.current.playAsync();
        setAudioState((prev) => ({
          ...prev,
          isPlaying: true,
        }));
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
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
    if (!stop.image) return null;

    if (isOfflineMode && tour) {
      return (
        <Image
          source={getImageAsset(stop.image)} // Fallback to bundled asset
          style={styles.stopThumbnail}
          resizeMode="cover"
          onError={() => {
            console.warn('Failed to load image:', stop.image);
          }}
        />
      );
    }

    return (
      <Image
        source={getImageAsset(stop.image)}
        style={styles.stopThumbnail}
        resizeMode="cover"
      />
    );
  };

  const renderCurrentStopImage = (stop: TourStop) => {
    if (!stop?.image) return null;

    return (
      <Image
        source={getImageAsset(stop.image)}
        style={styles.currentStopImage}
        resizeMode="cover"
        onError={() => {
          console.warn('Failed to load current stop image:', stop.image);
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

  if (!tour) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tour not found</Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
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