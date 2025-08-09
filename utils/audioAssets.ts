// utils/audioAssets.ts - Local audio file mapping
// This approach works with Expo and handles local audio files properly

export const audioAssets = {
  'Intro.wav': require('@/assets/tour1/audios/Intro.wav'),
  'Info Stop 1_ Bar Island – A Walk Across the Ocean Floor.wav': require('@/assets/tour1/audios/Info Stop 1_ Bar Island – A Walk Across the Ocean Floor.wav'),
  'Lobster Roll Stop 1_ Bar Harbor Lobster Pound.wav': require('@/assets/tour1/audios/Lobster Roll Stop 1_ Bar Harbor Lobster Pound.wav'),
  'Info Stop 2_ Blueberries in Maine.wav': require('@/assets/tour1/audios/Info Stop 2_ Blueberries in Maine.wav'),
  'Info Stop 3_ The Lobster Industry.wav': require('@/assets/tour1/audios/Info Stop 3_ The Lobster Industry.wav'),
  'Lobster Roll Stop 2_ Abels Lobster.wav': require('@/assets/tour1/audios/Lobster Roll Stop 2_ Abels Lobster.wav'),
  'Info Stop 4_ Creation of Acadia National Park.wav': require('@/assets/tour1/audios/Info Stop 4_ Creation of Acadia National Park.wav'),
  'Info Stop 5_ Atlantic Brewing Company.wav': require('@/assets/tour1/audios/Info Stop 5_ Atlantic Brewing Company.wav'),
  'Lobster Roll Stop 3_ The Travelin Lobster.wav': require('@/assets/tour1/audios/Lobster Roll Stop 3_ The Travelin_ Lobster.wav'),
  'Info Stop 6_ Life on Mount Desert Island.wav': require('@/assets/tour1/audios/Info Stop 6_ Life on Mount Desert Island.wav'),
  'Info Stop 7_ Salisbury Cove.wav': require('@/assets/tour1/audios/Info Stop 7_ Salisbury Cove – The Quiet Side of the Island.wav'),
  'Info Stop 8_ Pirates Cove Mini Golf.wav': require('@/assets/tour1/audios/Info Stop 8_ Pirates Cove Mini Golf.wav'),
  'Info Stop 9_ Drive Back to Bar Harbor.wav': require('@/assets/tour1/audios/Info Stop 9_ Drive Back to Bar Harbor.wav'),
  'Bonus Stop_ Lobster Ice Cream.wav': require('@/assets/tour1/audios/Bonus Stop_ Lobster Ice Cream in Bar Harbor.wav'),
  'Outro.wav': require('@/assets/tour1/audios/Outro.wav'),
} as const;

export const getAudioAsset = (fileName: string) => {

  // Direct lookup first
  const asset = audioAssets[fileName as keyof typeof audioAssets];
  if (asset) {
    return asset;
  }


  const alternatives = Object.keys(audioAssets).filter(key => {
    // Try partial matching
    return key.toLowerCase().includes(fileName.toLowerCase()) ||
      fileName.toLowerCase().includes(key.toLowerCase());
  });

  if (alternatives.length > 0) {
    const foundKey = alternatives[0];
    return audioAssets[foundKey as keyof typeof audioAssets];
  }
  return null;
};

// Simple direct approach - no Asset.downloadAsync
export const getAudioSource = (fileName: string) => {
  const asset = getAudioAsset(fileName);
  if (asset) {
    return asset;
  }
  return null;
};

// Debug function to list all available audio files
export const debugAudioAssets = () => {
  Object.keys(audioAssets).forEach((key, index) => {
  });
};

// Type-safe audio keys
export type AudioAssetKey = keyof typeof audioAssets;

// Function to validate if an audio file exists
export const hasAudioAsset = (fileName: string): fileName is AudioAssetKey => {
  return fileName in audioAssets;
};

// Get all available audio keys
export const getAllAudioKeys = (): string[] => {
  return Object.keys(audioAssets);
};

// Alternative loading method without expo-asset dependency
export const loadAudioAssetSimple = (fileName: string) => {
  try {
    const asset = getAudioAsset(fileName);
    if (!asset) {
      throw new Error(`Audio file not found: ${fileName}`);
    }

    // Return the require() result directly - no Asset.loadAsync needed
    return asset;
  } catch (error) {
    return null;
  }
};