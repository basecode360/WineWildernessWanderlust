import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';

export default function AudioDebugTest() {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioStatus, setAudioStatus] = useState<string>('Not initialized');

  const initializeAudio = async () => {
    try {
      console.log('🎵 DEBUG: Initializing audio session...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });
      setAudioStatus('Audio session initialized');
      console.log('✅ DEBUG: Audio session initialized');
      Alert.alert('Success', 'Audio session initialized');
    } catch (error) {
      console.error('❌ DEBUG: Error initializing audio:', error);
      setAudioStatus(`Error: ${error}`);
      Alert.alert('Error', `Failed to initialize: ${error}`);
    }
  };

  const testRemoteAudio = async () => {
    try {
      setAudioStatus('Loading remote audio...');
      
      // Test with a known working audio URL
      const testUrl = 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.mp3';
      
      console.log('🎵 DEBUG: Loading test audio from:', testUrl);
      
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: testUrl },
        { shouldPlay: false, volume: 1.0 }
      );

      console.log('🎵 DEBUG: Audio load status:', status);
      
      if (!status.isLoaded) {
        throw new Error('Audio failed to load');
      }

      setSound(newSound);
      setAudioStatus('Remote audio loaded successfully');
      Alert.alert('Success', 'Remote audio loaded. Try playing it now.');
    } catch (error) {
      console.error('❌ DEBUG: Error loading remote audio:', error);
      setAudioStatus(`Error loading: ${error}`);
      Alert.alert('Error', `Failed to load audio: ${error}`);
    }
  };

  const testLocalAudio = async () => {
    try {
      setAudioStatus('Testing local audio...');
      
      // This requires you to have a local audio file in assets
      // For now, we'll just test the loading mechanism
      console.log('🎵 DEBUG: Testing local audio loading capability...');
      
      // Test with expo-av's example sound
      const { sound: newSound, status } = await Audio.Sound.createAsync(
        require('../assets/sounds/notification.mp3'), // You'd need to add this
        { shouldPlay: false, volume: 1.0 }
      );

      console.log('🎵 DEBUG: Local audio status:', status);
      
      if (!status.isLoaded) {
        throw new Error('Local audio failed to load');
      }

      setSound(newSound);
      setAudioStatus('Local audio loaded successfully');
      Alert.alert('Success', 'Local audio loaded. Try playing it now.');
    } catch (error) {
      console.error('❌ DEBUG: Error with local audio:', error);
      setAudioStatus(`Local audio error: ${error}`);
      Alert.alert('Info', 'Local audio test failed (this is normal if you don\'t have assets/sounds/notification.mp3)');
    }
  };

  const playPauseAudio = async () => {
    try {
      if (!sound) {
        Alert.alert('Error', 'No audio loaded. Load audio first.');
        return;
      }

      const status = await sound.getStatusAsync();
      console.log('🎵 DEBUG: Current audio status:', status);

      if (!status.isLoaded) {
        Alert.alert('Error', 'Audio not properly loaded');
        return;
      }

      if (status.isPlaying) {
        console.log('⏸️ DEBUG: Pausing audio');
        await sound.pauseAsync();
        setIsPlaying(false);
        setAudioStatus('Audio paused');
      } else {
        console.log('▶️ DEBUG: Playing audio');
        await sound.playAsync();
        setIsPlaying(true);
        setAudioStatus('Audio playing');
      }
    } catch (error) {
      console.error('❌ DEBUG: Play/pause error:', error);
      setAudioStatus(`Play error: ${error}`);
      Alert.alert('Error', `Play/pause failed: ${error}`);
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        console.log('⏹️ DEBUG: Stopping and unloading audio');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setAudioStatus('Audio stopped and unloaded');
      }
    } catch (error) {
      console.error('❌ DEBUG: Stop error:', error);
      setAudioStatus(`Stop error: ${error}`);
    }
  };

  const checkDeviceInfo = () => {
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
    };
    
    console.log('📱 DEBUG: Device info:', deviceInfo);
    Alert.alert('Device Info', `Platform: ${deviceInfo.platform}\nVersion: ${deviceInfo.version}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Debug Test</Text>
      <Text style={styles.status}>Status: {audioStatus}</Text>
      
      <TouchableOpacity style={styles.button} onPress={checkDeviceInfo}>
        <Text style={styles.buttonText}>Check Device Info</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={initializeAudio}>
        <Text style={styles.buttonText}>Initialize Audio Session</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testRemoteAudio}>
        <Text style={styles.buttonText}>Load Remote Test Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testLocalAudio}>
        <Text style={styles.buttonText}>Test Local Audio (Optional)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, !sound && styles.buttonDisabled]} 
        onPress={playPauseAudio}
        disabled={!sound}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? '⏸️ Pause' : '▶️ Play'} Audio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, !sound && styles.buttonDisabled]} 
        onPress={stopAudio}
        disabled={!sound}
      >
        <Text style={styles.buttonText}>⏹️ Stop Audio</Text>
      </TouchableOpacity>
      
      <Text style={styles.instructions}>
        1. Initialize Audio Session first{'\n'}
        2. Load Remote Test Audio{'\n'}
        3. Try playing the audio{'\n'}
        4. Check console for detailed logs
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#5CC4C4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    marginTop: 30,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});