// services/AudioService.ts - Audio playbook management
import { Audio, AVPlaybackStatus } from 'expo-av';
import { AudioState } from '../types/tour';

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
      console.log('🎵 AudioService: Initializing audio session...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('✅ AudioService: Audio session initialized successfully');
    } catch (error) {
      console.error('❌ AudioService: Error initializing audio:', error);
      throw error;
    }
  }

  async loadAudio(audioUri: string): Promise<boolean> {
    try {
      // Unload any existing sound
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // For local assets, use require() instead of URI
      let audioSource;
      if (audioUri.startsWith('./assets/') || audioUri.startsWith('assets/')) {
        // For local assets, you'll need to import them
        console.warn('Local audio files should be imported as modules');
        return false;
      } else {
        // For remote URLs
        audioSource = { uri: audioUri };
      }

      const { sound, status } = await Audio.loadAsync(audioSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });

      this.sound = sound;

      // Set up playback status updates
      this.sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          this.onStateChange?.({
            isPlaying: status.isPlaying || false,
            currentStopId: null, // This should be set by the caller
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

  async getStatus(): Promise<AVPlaybackStatus | null> {
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

  // Format time in MM:SS format
  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
