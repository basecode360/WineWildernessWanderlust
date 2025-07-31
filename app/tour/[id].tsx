import { tours } from '@/constants/tours';
import { useProximity } from '@/hooks/useProximity';
import { downloadFile } from '@/utils/download';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function TourDetailScreen() {
  // 1) Hooks at the top
  const { id } = useLocalSearchParams<{ id: string }>();
  const [soundObjects, setSoundObjects] = useState<Record<string, Audio.Sound>>(
    {}
  );
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});

  // 2) Find tour
  const tour = tours.find((t) => t.id === id);

  // 3) Preload / download audio into Audio.Sound objects
  useEffect(() => {
    if (!tour) return; // safe-guard, not an early return of the component
    let isMounted = true;

    (async () => {
      try {
        // Download media if needed, then create Sound instances
        for (const stop of tour.stops) {
          // Download audio file
          const audioName = stop.audioUrl.split('/').pop()!;
          const localAudioUri = await downloadFile(stop.audioUrl, audioName);

          // Create Sound
          const { sound } = await Audio.Sound.createAsync(
            { uri: localAudioUri },
            { shouldPlay: false }
          );

          if (isMounted) {
            setSoundObjects((prev) => ({ ...prev, [stop.id]: sound }));
          }
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to load audio files.');
      }
    })();

    return () => {
      isMounted = false;
      // Unload all sounds on unmount
      Object.values(soundObjects).forEach((snd) => snd.unloadAsync());
    };
  }, [tour]);

  // 4) Handler to play/pause
  const togglePlay = async (stopId: string) => {
    const sound = soundObjects[stopId];
    if (!sound) return;
    const status = await sound.getStatusAsync();
    status.isPlaying ? await sound.pauseAsync() : await sound.playAsync();
  };

  // 1. Prepare stops for proximity hook
  const proximityStops = tour
    ? tour.stops.map((stop) => ({
        id: stop.id,
        coordinates: stop.coordinates,
        audioSound: soundObjects[stop.id],
        title: stop.title,
      }))
    : [];

  // 2. Use proximity to auto-play
  useProximity(
    proximityStops,
    async (stop) => {
      const sound = soundObjects[stop.id];
      if (sound) {
        const status = await sound.getStatusAsync();
        if (!status.isPlaying) {
          await sound.playAsync();
          Alert.alert('Now Playing', stop.title);
        }
      }
    },
    150
  );

  // 5) Now it’s safe to return early if tour is missing
  if (!tour) {
    return (
      <View style={styles.center}>
        <Text>Tour not found</Text>
      </View>
    );
  }

  // 6) Render
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tour.title}</Text>
      <Text style={styles.description}>{tour.description}</Text>
      <Text style={styles.price}>${tour.price.toFixed(2)}</Text>

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => Alert.alert('Downloaded')}
      >
        <Ionicons name="download" size={18} color="#fff" />
        <Text style={styles.downloadText}>Download Complete</Text>
      </TouchableOpacity>

      <Text style={styles.stopsTitle}>Stops:</Text>
      <FlatList
        data={tour.stops}
        keyExtractor={(stop) => stop.id}
        renderItem={({ item: stop }) => {
          return (
            <View style={styles.stopItem}>
              <Image source={stop.image} style={styles.stopImage} />
              <View style={styles.stopText}>
                <Text style={styles.stopName}>{stop.title}</Text>
                <Text numberOfLines={2}>{stop.narration}</Text>
              </View>
              <TouchableOpacity
                onPress={() => togglePlay(stop.id)}
                style={styles.playButton}
              >
                <Ionicons
                  name={isPlaying[stop.id] ? 'pause-circle' : 'play-circle'}
                  size={28}
                  color="#5CC4C4"
                />
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  description: { fontSize: 16, color: '#444' },
  price: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: '#5CC4C4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  downloadText: { color: '#fff', fontWeight: '600' },
  stopsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    gap: 10,
  },
  stopImage: { width: 80, height: 60, borderRadius: 8 },
  stopText: { flex: 1 },
  stopName: { fontWeight: 'bold', marginBottom: 4 },
  playButton: { padding: 8 },
});
