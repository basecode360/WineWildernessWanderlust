// app/tour/player/[id].tsx - Tour Player Screen
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { calculateDistance, getTourById } from '../../../data/tours';
import { AudioState, LocationData, TourStop } from '../../../types/tour';
import { getAudioAsset } from '../../../utils/audioAssets';
import { getImageAsset } from '../../../utils/imageAssets';

const { width: screenWidth } = Dimensions.get('window');
const PROXIMITY_THRESHOLD = 100; // meters

export default function TourPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = getTourById(id as string);

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

  const audioRef = useRef<Audio.Sound | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  useEffect(() => {
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

  const triggerAudioForStop = async (stop: TourStop, index: number) => {
    try {
      console.log('Attempting to play audio for stop:', stop.title);
      console.log('Audio file name:', stop.audio);

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

      // Get the local audio asset
      const audioSource = getAudioAsset(stop.audio);
      console.log('Audio source:', audioSource);

      if (!audioSource) {
        console.error('Audio file not found:', stop.audio);
        Alert.alert('Audio Error', `Audio file not found: ${stop.audio}`);
        return;
      }

      // FIXED: Use Audio.Sound.createAsync instead of Audio.loadAsync
      console.log('Creating audio sound...');
      const { sound } = await Audio.Sound.createAsync(audioSource, {
        shouldPlay: true,
        volume: 1.0,
        isLooping: false,
      });

      console.log('Audio sound created successfully');
      audioRef.current = sound;

      setAudioState({
        isPlaying: true,
        currentStopId: stop.id,
        position: 0,
        duration: 0,
      });

      setCurrentStopIndex(index);

      // Mark stop as played
      stop.isPlayed = true;

      // Set up status listener for real-time updates
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setAudioState((prev) => ({
            ...prev,
            isPlaying: status.isPlaying || false,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
          }));

          // Auto-update when audio finishes
          if (status.didJustFinish) {
            setAudioState((prev) => ({ ...prev, isPlaying: false }));
          }
        }
      });

      // Show notification
      Alert.alert('🎧 Audio Started', `Now playing: ${stop.title}`, [
        { text: 'OK' },
      ]);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Audio Error', `Could not play audio file: ${error.message}`);
    }
  };

  const playStopAudio = async (stop: TourStop, index: number) => {
    await triggerAudioForStop(stop, index);
  };

  const toggleAudio = async () => {
    if (!audioRef.current) {
      // If no audio is loaded, try to play current stop
      if (tour && tour.stops[currentStopIndex]) {
        await playStopAudio(tour.stops[currentStopIndex], currentStopIndex);
      }
      return;
    }

    try {
      if (audioState.isPlaying) {
        await audioRef.current.pauseAsync();
      } else {
        await audioRef.current.playAsync();
      }

      setAudioState((prev) => ({
        ...prev,
        isPlaying: !prev.isPlaying,
      }));
    } catch (error) {
      console.error('Error toggling audio:', error);
      Alert.alert('Playback Error', 'Could not toggle audio playback');
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

  return (
    <View style={styles.container}>
      {/* Map View */}
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

        {/* Location Status */}
        <View style={styles.locationStatus}>
          <Ionicons
            name={isLocationEnabled ? 'location' : 'location-outline'}
            size={16}
            color={isLocationEnabled ? '#4CAF50' : '#666'}
          />
          <Text
            style={[
              styles.locationText,
              { color: isLocationEnabled ? '#4CAF50' : '#666' },
            ]}
          >
            {isLocationEnabled ? 'GPS Active' : 'GPS Disabled'}
          </Text>
        </View>
      </View>

      {/* Audio Controls */}
      <View style={styles.audioControls}>
        <View style={styles.currentStopInfo}>
          {currentStop?.image && (
            <Image
              source={getImageAsset(currentStop.image)}
              style={styles.currentStopImage}
              resizeMode="cover"
            />
          )}
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
            onPress={() =>
              setCurrentStopIndex(Math.max(0, currentStopIndex - 1))
            }
            disabled={currentStopIndex === 0}
          >
            <Ionicons name="play-skip-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.playButton]}
            onPress={toggleAudio}
          >
            <Ionicons
              name={audioState.isPlaying ? 'pause' : 'play'}
              size={32}
              color="#fff"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              setCurrentStopIndex(
                Math.min(tour.stops.length - 1, currentStopIndex + 1)
              )
            }
            disabled={currentStopIndex === tour.stops.length - 1}
          >
            <Ionicons name="play-skip-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stops List */}
      <ScrollView style={styles.stopsList} showsVerticalScrollIndicator={false}>
        <Text style={styles.stopsTitle}>Tour Stops ({tour.stops.length})</Text>
        {tour.stops.map((stop, index) => (
          <TouchableOpacity
            key={stop.id}
            style={[
              styles.stopItem,
              index === currentStopIndex && styles.currentStopItem,
              stop.isPlayed && styles.playedStopItem,
            ]}
            onPress={() => playStopAudio(stop, index)}
          >
            <View style={styles.stopIconContainer}>
              {stop.isPlayed ? (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              ) : (
                <Text style={styles.stopNumber}>{index + 1}</Text>
              )}
            </View>

            <View style={styles.stopContent}>
              {stop.image && (
                <Image
                  source={getImageAsset(stop.image)}
                  style={styles.stopThumbnail}
                  resizeMode="cover"
                />
              )}
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
              {stop.type === 'lobster_stop' && (
                <Text style={styles.stopEmoji}>🦞</Text>
              )}
              {stop.type === 'bonus_stop' && (
                <Text style={styles.stopEmoji}>🎁</Text>
              )}
              {stop.type === 'info' && <Text style={styles.stopEmoji}>ℹ️</Text>}
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
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  locationStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
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
    height: 100,
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
});
