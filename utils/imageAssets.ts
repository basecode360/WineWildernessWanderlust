// utils/imageAssets.ts - Image assets mapping for Acadia Lobster Tour
export const imageAssets = {
  // Tour hero image
  'Lobster-Roll-Tour-Acadia.png': require('@/assets/tour1/images/Lobster-Roll-Tour-Acadia.png'),

  // Stop images - matching your actual file names
  'downtown-bar-harbor.jpg': require('@/assets/tour1/images/downtown-bar-harbor-wanderguide.jpg'),
  'bar-island-sandbar.jpg': require('@/assets/tour1/images/bar-island-hiking-wanderguide.jpg'),
  'bar-harbor-lobster-pound-roll.jpg': require('@/assets/tour1/images/bar-harbor-lobster-pound-wanderguide.png'),
  'wild-maine-blueberries.jpg': require('@/assets/tour1/images/maine-blueberries.jpg'),
  'fresh-lobster-dinner.jpg': require('@/assets/tour1/images/lobster-industry-maine-wanderguide.jpg'),
  'abels-lobster-somes-sound.jpg': require('@/assets/tour1/images/abels-lobster-wanderguide.jpg'),
  'acadia-mountain-vista.jpg': require('@/assets/tour1/images/acadia-national-park-wanderguide.jpg'),
  'atlantic-brewing-blueberry-ale.jpg': require('@/assets/tour1/images/atlantic-brewing-wanderguide.jpg'),
  'travelin-lobster-roll.jpg': require('@/assets/tour1/images/travelin-lobster-wanderguide.jpg'),
  'mount-desert-island-harbor.jpg': require('@/assets/tour1/images/mount-desert-island-wanderguide.jpg'),
  'salisbury-cove-quiet-side.jpg': require('@/assets/tour1/images/salisbury-cove-wanderguide.jpg'),
  'pirates-cove-mini-golf.jpg': require('@/assets/tour1/images/pirates-cove-wanderguide.jpg'),
  'acadia-coastal-scenery.jpg': require('@/assets/tour1/images/outr-acadia-wanderguide.jpg'),
  'ben-bills-lobster-ice-cream.jpg': require('@/assets/tour1/images/lobster-ice-cream-wanderguide.jpg'),
} as const;

export const getImageAsset = (fileName: string) => {
  const asset = imageAssets[fileName as keyof typeof imageAssets];

  if (!asset) {
    // Return a default placeholder or null
    return null;
  }

  return asset;
};

// Helper function to get image with fallback
export const getImageAssetWithFallback = (fileName: string, fallback?: any) => {
  const asset = getImageAsset(fileName);
  return asset || fallback || null;
};

// Debug function to list all available images
export const debugImageAssets = () => {
  Object.keys(imageAssets).forEach((key, index) => {
  });
};

// Categorized image assets for easier access
export const categorizedImageAssets = {
  tourHero: {
    'Lobster Roll Tour Acadia.png': imageAssets['Lobster Roll Tour Acadia.png'],
  },

  infoStops: {
    'downtown-bar-harbor.jpg': imageAssets['downtown-bar-harbor.jpg'],
    'bar-island-sandbar.jpg': imageAssets['bar-island-sandbar.jpg'],
    'wild-maine-blueberries.jpg': imageAssets['wild-maine-blueberries.jpg'],
    'fresh-lobster-dinner.jpg': imageAssets['fresh-lobster-dinner.jpg'],
    'acadia-mountain-vista.jpg': imageAssets['acadia-mountain-vista.jpg'],
    'atlantic-brewing-blueberry-ale.jpg':
      imageAssets['atlantic-brewing-blueberry-ale.jpg'],
    'mount-desert-island-harbor.jpg':
      imageAssets['mount-desert-island-harbor.jpg'],
    'salisbury-cove-quiet-side.jpg':
      imageAssets['salisbury-cove-quiet-side.jpg'],
    'pirates-cove-mini-golf.jpg': imageAssets['pirates-cove-mini-golf.jpg'],
    'acadia-coastal-scenery.jpg': imageAssets['acadia-coastal-scenery.jpg'],
  },

  lobsterStops: {
    'bar-harbor-lobster-pound-roll.jpg':
      imageAssets['bar-harbor-lobster-pound-roll.jpg'],
    'abels-lobster-somes-sound.jpg':
      imageAssets['abels-lobster-somes-sound.jpg'],
    'travelin-lobster-roll.jpg': imageAssets['travelin-lobster-roll.jpg'],
  },

  bonusStops: {
    'ben-bills-lobster-ice-cream.jpg':
      imageAssets['ben-bills-lobster-ice-cream.jpg'],
  },
};

// Type-safe image keys
export type ImageAssetKey = keyof typeof imageAssets;

// Function to validate if an image exists
export const hasImageAsset = (fileName: string): fileName is ImageAssetKey => {
  return fileName in imageAssets;
};
