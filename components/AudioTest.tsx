// components/AudioTest.tsx - Fixed audio test component
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAudioAsset } from '../utils/audioAssets';

export default function AudioTest() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const testLocalAudio = async () => {
    try {
      // Initialize audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Test with your first audio file
      const audioSource = getAudioAsset('Start of Tour.wav');

      if (!audioSource) {
        Alert.alert('Error', 'Audio asset not found');
        return;
      }

      // Stop existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      // CORRECT WAY: Use Audio.Sound.createAsync()
      const { sound: newSound } = await Audio.Sound.createAsync(audioSource, {
        shouldPlay: true,
      });

      setSound(newSound);
      setIsPlaying(true);
      Alert.alert('Success!', 'Local audio is playing');

      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Audio test error:', error);
      Alert.alert('Error', `Audio test failed: ${error.message}`);
    }
  };

  const testRemoteAudio = async () => {
    try {
      // Initialize audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Test with remote audio
      const remoteUrl =
        'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';

      // Stop existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      // CORRECT WAY: Use Audio.Sound.createAsync()
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: remoteUrl },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      Alert.alert('Success!', 'Remote audio is playing');

      // Set up playback status listener
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Remote audio test error:', error);
      Alert.alert('Error', `Remote audio test failed: ${error.message}`);
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        Alert.alert('Stopped', 'Audio stopped');
      }
    } catch (error) {
      console.error('Stop audio error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Test (Fixed)</Text>

      <TouchableOpacity style={styles.button} onPress={testLocalAudio}>
        <Text style={styles.buttonText}>Test Local Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testRemoteAudio}>
        <Text style={styles.buttonText}>Test Remote Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.stopButton]}
        onPress={stopAudio}
        disabled={!isPlaying}
      >
        <Text style={styles.buttonText}>Stop Audio</Text>
      </TouchableOpacity>

      <Text style={styles.status}>
        Status: {isPlaying ? 'Playing' : 'Stopped'}
      </Text>
    </View>
  );
}

// Fixed AudioService.ts
export class AudioService {
  private static instance: AudioService;
  private sound: Audio.Sound | null = null;
  private onStateChange: ((state: AudioState) => void) | null = null;

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async loadAudio(audioAsset: any): Promise<boolean> {
    try {
      // Unload any existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // CORRECT WAY: Use Audio.Sound.createAsync()
      const { sound } = await Audio.Sound.createAsync(audioAsset, {
        shouldPlay: false,
      });

      this.sound = sound;

      // Set up playback status updates
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.onStateChange?.({
            isPlaying: status.isPlaying || false,
            currentStopId: null,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
          });
        }
      });

      return true;
    } catch (error) {
      console.error('Error loading audio:', error);
      return false;
    }
  }

  async playAudio(): Promise<boolean> {
    try {
      if (!this.sound) return false;
      await this.sound.playAsync();
      return true;
    } catch (error) {
      console.error('Error playing audio:', error);
      return false;
    }
  }

  async pauseAudio(): Promise<boolean> {
    try {
      if (!this.sound) return false;
      await this.sound.pauseAsync();
      return true;
    } catch (error) {
      console.error('Error pausing audio:', error);
      return false;
    }
  }

  async stopAudio(): Promise<boolean> {
    try {
      if (!this.sound) return false;
      await this.sound.stopAsync();
      return true;
    } catch (error) {
      console.error('Error stopping audio:', error);
      return false;
    }
  }

  async seekTo(positionMillis: number): Promise<boolean> {
    try {
      if (!this.sound) return false;
      await this.sound.setPositionAsync(positionMillis);
      return true;
    } catch (error) {
      console.error('Error seeking audio:', error);
      return false;
    }
  }

  async setVolume(volume: number): Promise<boolean> {
    try {
      if (!this.sound) return false;
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      return true;
    } catch (error) {
      console.error('Error setting volume:', error);
      return false;
    }
  }

  async getStatus() {
    try {
      if (!this.sound) return null;
      return await this.sound.getStatusAsync();
    } catch (error) {
      console.error('Error getting audio status:', error);
      return null;
    }
  }

  setOnStateChange(callback: (state: AudioState) => void): void {
    this.onStateChange = callback;
  }

  async unloadAudio(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error unloading audio:', error);
    }
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Fixed tour player triggerAudioForStop function
const triggerAudioForStop = async (stop: TourStop, index: number) => {
  try {
    // Initialize audio mode
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
    }

    // Get the local audio asset
    const audioSource = getAudioAsset(stop.audio);

    if (!audioSource) {
      console.error('Audio file not found:', stop.audio);
      Alert.alert('Audio Error', `Audio file not found: ${stop.audio}`);
      return;
    }

    // CORRECT WAY: Use Audio.Sound.createAsync()
    const { sound } = await Audio.Sound.createAsync(audioSource, {
      shouldPlay: true,
    });

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

    // Set up status listener
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setAudioState((prev) => ({
          ...prev,
          isPlaying: status.isPlaying || false,
          position: status.positionMillis || 0,
          duration: status.durationMillis || 0,
        }));
      }
    });

    // Show notification
    Alert.alert('🎧 Audio Started', `Now playing: ${stop.title}`, [
      { text: 'OK' },
    ]);
  } catch (error) {
    console.error('Error playing audio:', error);
    Alert.alert(
      'Audio Error',
      'Could not play audio file. Make sure the audio files are in the assets folder.'
    );
  }
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5CC4C4',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    minWidth: 200,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  status: {
    marginTop: 20,
    fontSize: 16,
  },
});
