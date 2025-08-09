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
      return sound;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};

export const playLocalAudio = async (audioAsset: any) => {
  try {
    if (!audioAsset) {
      return null;
    }

    const sound = new Audio.Sound();
    const status = await sound.loadAsync(audioAsset);

    if (status.isLoaded) {
      await sound.playAsync();
      return sound;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
};
