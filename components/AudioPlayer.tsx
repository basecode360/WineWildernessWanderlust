// components/AudioPlayer.tsx - Reusable audio player component
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Slider, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AudioService } from '../services/AudioService';
import { AudioState } from '../types/tour';

interface AudioPlayerProps {
  audioUri: string;
  title: string;
  onPlaybackEnd?: () => void;
  onError?: (error: string) => void;
}

export default function AudioPlayer({
  audioUri,
  title,
  onPlaybackEnd,
  onError,
}: AudioPlayerProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentStopId: null,
    position: 0,
    duration: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const audioService = AudioService.getInstance();

  useEffect(() => {
    initializeAudio();
    audioService.setOnStateChange(setAudioState);

    return () => {
      audioService.unloadAudio();
    };
  }, [audioUri]);

  const initializeAudio = async () => {
    setIsLoading(true);
    try {
      await audioService.initializeAudio();
      const success = await audioService.loadAudio(audioUri);
      if (!success) {
        onError?.('Failed to load audio');
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
      onError?.('Error initializing audio');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    try {
      if (audioState.isPlaying) {
        await audioService.pauseAudio();
      } else {
        await audioService.playAudio();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      onError?.('Playback error');
    }
  };

  const handleSeek = async (value: number) => {
    try {
      const position = value * audioState.duration;
      await audioService.seekTo(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress =
    audioState.duration > 0 ? audioState.position / audioState.duration : 0;

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formatTime(audioState.position)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={progress}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#5CC4C4"
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbStyle={styles.sliderThumb}
        />
        <Text style={styles.timeText}>{formatTime(audioState.duration)}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => handleSeek(Math.max(0, progress - 0.1))}
        >
          <Ionicons name="play-skip-back" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          {isLoading ? (
            <Ionicons name="hourglass-outline" size={32} color="#fff" />
          ) : (
            <Ionicons
              name={audioState.isPlaying ? 'pause' : 'play'}
              size={32}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => handleSeek(Math.min(1, progress + 0.1))}
        >
          <Ionicons name="play-skip-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <Ionicons
          name="volume-low"
          size={16}
          color="rgba(255, 255, 255, 0.7)"
        />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={1} // Default volume
          onSlidingComplete={(value) => audioService.setVolume(value)}
          minimumTrackTintColor="rgba(255, 255, 255, 0.8)"
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbStyle={styles.volumeThumb}
        />
        <Ionicons
          name="volume-high"
          size={16}
          color="rgba(255, 255, 255, 0.7)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#5CC4C4',
    padding: 20,
    borderRadius: 15,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    minWidth: 35,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sliderThumb: {
    backgroundColor: '#fff',
    width: 20,
    height: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeSlider: {
    flex: 1,
    height: 30,
    marginHorizontal: 8,
  },
  volumeThumb: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 15,
    height: 15,
  },
});
