// utils/audioAssets.ts - Local audio file mapping
// This approach works with Expo and handles local audio files properly

export const audioAssets = {
  'Start of Tour.wav': require('@/assets/tour1/audios/Intro.wav'),
  'Info Stop 1 Bar Island.wav': require('@/assets/tour1/audios/Info Stop 1_ Bar Island – A Walk Across the Ocean Floor.wav'),
  'Lobster Roll Stop 1 Bar Harbor Lobster Pound.wav': require('@/assets/tour1/audios/Lobster Roll Stop 1_ Bar Harbor Lobster Pound.wav'),
  'Info Stop 2 Blueberries in Maine.wav': require('@/assets/tour1/audios/Info Stop 2_ Blueberries in Maine.wav'),
  'Info Stop 3 The Lobster Industry.wav': require('@/assets/tour1/audios/Info Stop 3_ The Lobster Industry.wav'),
  'Lobster Roll Stop 2 Abels Lobster.wav': require(`@/assets/tour1/audios/Lobster Roll Stop 2_ Abels Lobster.wav`),
//   'Info Stop 4 Creation of Acadia National Park.wav': require('@/assets/tour1/audios/Info Stop 4 Creation of Acadia National Park.wav'),
//   'Info Stop 5 Atlantic Brewing Company.wav': require('@/assets/tour1/audios/Info Stop 5 Atlantic Brewing Company.wav'),
//   'Lobster Roll Stop 3 The Travelin Lobster.wav': require('@/assets/tour1/audios/Lobster Roll Stop 3 The Travelin Lobster.wav'),
//   'Info Stop 6 Life on Mount Desert Island.wav': require('@/assets/tour1/audios/Info Stop 6 Life on Mount Desert Island.wav'),
//   'Info Stop 7 Salisbury Cove.wav': require('@/assets/tour1/audios/Info Stop 7 Salisbury Cove.wav'),
  'Info Stop 8 Pirates Cove Mini Golf.wav': require('@/assets/tour1/audios/Info Stop 8_ Pirates Cove Mini Golf.wav'),
//   'Info Stop 9 Drive Back to Bar Harbor.wav': require('@/assets/tour1/audios/Info Stop 9 Drive Back to Bar Harbor.wav'),
//   'Bonus Stop Lobster Ice Cream.wav': require('@/assets/tour1/audios/Bonus Stop Lobster Ice Cream.wav'),
//   'Outro.wav': require('@/assets/tour1/audios/Outro.wav'),
} as const;

export const getAudioAsset = (fileName: string) => {
  return audioAssets[fileName as keyof typeof audioAssets];
};

// Alternative approach using expo-asset
import { Asset } from 'expo-asset';

export const loadAudioAsset = async (fileName: string) => {
  try {
    const asset = audioAssets[fileName as keyof typeof audioAssets];
    if (!asset) {
      throw new Error(`Audio file not found: ${fileName}`);
    }

    // Load the asset
    const [loadedAsset] = await Asset.loadAsync(asset);
    return loadedAsset.localUri || loadedAsset.uri;
  } catch (error) {
    console.error('Error loading audio asset:', error);
    return null;
  }
};
