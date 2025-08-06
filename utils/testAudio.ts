// utils/testAudio.ts - Simple audio test without local files
import { Audio } from 'expo-av';

export const testAudioPlayback = async () => {
  try {
    // Test with a remote audio file first
    const testUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';

    const sound = new Audio.Sound();
    const status = await sound.loadAsync({ uri: testUrl });

    if (status.isLoaded) {
      
      await sound.playAsync();
      console.log('✅ Audio test successful!');
      return sound;
    } else {
      console.error('❌ Audio failed to load');
      return null;
    }
  } catch (error) {
    console.error('❌ Audio test failed:', error);
    return null;
  }
};

export const playLocalAudio = async (audioAsset: any) => {
  try {
    if (!audioAsset) {
      console.warn('No audio asset provided');
      return null;
    }

    const sound = new Audio.Sound();
    const status = await sound.loadAsync(audioAsset);

    if (status.isLoaded) {
      await sound.playAsync();
      console.log('✅ Local audio playback successful!');
      return sound;
    } else {
      console.error('❌ Local audio failed to load');
      return null;
    }
  } catch (error) {
    console.error('❌ Local audio test failed:', error);
    return null;
  }
};
