import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { tours } from '@/constants/tours';
import { downloadFile } from '@/utils/download';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tour = tours.find((t) => t.id === id);
  const [soundObjects, setSoundObjects] = useState<Record<string, Audio.Sound>>(
    {}
  );

  if (!tour) return <Text style={styles.center}>Tour not found</Text>;

  // Pre-download media on mount (optional if not already done)
  useEffect(() => {
    (async () => {
      try {
        for (const stop of tour.stops) {
          const audioName = stop.audio.split('/').pop()!;
          const localUri = await downloadFile(stop.audio, audioName);
          const { sound } = await Audio.Sound.createAsync(
            { uri: localUri },
            { shouldPlay: false }
          );
          setSoundObjects((s) => ({ ...s, [stop.id]: sound }));
        }
      } catch {
        Alert.alert('Error', 'Failed to load audio files.');
      }
    })();
    // Unload on unmount
    return () => {
      Object.values(soundObjects).forEach((snd) => snd.unloadAsync());
    };
  }, []);

  const togglePlay = async (stopId: string) => {
    const sound = soundObjects[stopId];
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if ('isPlaying' in status && status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tour.title}</Text>
      <Text style={styles.description}>{tour.description}</Text>
      <Text style={styles.price}>${tour.price.toFixed(2)}</Text>

      <TouchableOpacity
        onPress={() => Alert.alert('Downloaded', 'Media already saved.')}
        style={styles.downloadButton}
      >
        <Ionicons name="download" size={18} color="#fff" />
        <Text style={styles.downloadText}>Download Complete</Text>
      </TouchableOpacity>

      <Text style={styles.stopsTitle}>Stops:</Text>
      <FlatList
        data={tour.stops}
        keyExtractor={(stop) => stop.id}
        renderItem={({ item }) => {
          // We cannot use async/await in render, so we need to track playing state
          // For simplicity, let's show 'pause' if we have a sound object and it's playing, otherwise 'play'
          // We'll need to add a state to track which stop is currently playing
          const [playingStopId, setPlayingStopId] = useState<string | null>(null);

          const handleTogglePlay = async (stopId: string) => {
            const sound = soundObjects[stopId];
            if (!sound) return;
            const status = await sound.getStatusAsync();
            if ('isLoaded' in status && status.isLoaded && status.isPlaying) {
              await sound.pauseAsync();
              setPlayingStopId(null);
            } else if ('isLoaded' in status && status.isLoaded) {
              await sound.playAsync();
              setPlayingStopId(stopId);
            }
          };

          const isPlaying = playingStopId === item.id;

          return (
            <View style={styles.stopItem}>
              <Image
                source={{
                  uri: `file://${FileSystem.documentDirectory}${item.image
                    .split('/')
                    .pop()}`,
                }}
                style={styles.stopImage}
              />
              <View style={styles.stopText}>
                <Text style={styles.stopName}>{item.title}</Text>
                <Text numberOfLines={2}>{item.transcript}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleTogglePlay(item.id)}
                style={styles.playButton}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
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
    gap: 8,
    marginBottom: 20,
  },
  downloadText: { color: '#fff', fontWeight: '600' },
  stopsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  stopImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  stopText: { flex: 1 },
  stopName: { fontWeight: 'bold', marginBottom: 4 },
  playButton: {
    padding: 8,
  },
});
