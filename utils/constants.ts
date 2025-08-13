// utils/constants.ts - Updated with Supabase configuration
export const COLORS = {
  primary: '#5CC4C4',
  secondary: '#4CAF50',
  accent: '#2196F3',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  background: '#f8f9fa',
  surface: '#ffffff',
  text: {
    primary: '#333333',
    secondary: '#666666',
    light: 'rgba(255, 255, 255, 0.8)',
    white: '#ffffff',
  },
} as const;

export const SIZES = {
  // Spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Font sizes
  fontSizes: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    heading: 32,
  },

  // Border radius
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 15,
    xl: 20,
    round: 50,
  },
} as const;

export const LOCATION = {
  PROXIMITY_THRESHOLD: 100, // meters
  UPDATE_INTERVAL: 1000, // milliseconds
  DISTANCE_FILTER: 10, // meters
} as const;

export const AUDIO = {
  DEFAULT_VOLUME: 1.0,
  FADE_DURATION: 1000, // milliseconds
  SEEK_STEP: 10000, // 10 seconds in milliseconds
} as const;

export const STORAGE = {
  MAX_CACHE_SIZE: 500 * 1024 * 1024, // 500MB
  CLEANUP_THRESHOLD: 0.9, // 90% of max cache size
} as const;

// UPDATED: API configuration with Supabase
export const API = {
  // Keep your existing API for other services
  BASE_URL: 'https://api.winewildernesswanderlust.com',
  ENDPOINTS: {
    tours: '/tours',
    audio: '/audio',
    images: '/images',
    purchase: '/purchase',
  },
  // ADD: Supabase configuration (REQUIRED for services/tourService.ts)
  SUPABASE: {
    STORAGE_URL: 'https://ibgfliafcsbmyiktekjp.supabase.co/storage/v1/object/public',
    BUCKETS: {
      TOUR_IMAGES: 'tour_images',
      TOUR_AUDIO: 'tour_audio',
    },
  },
  TIMEOUT: 30000, // 30 seconds
} as const;

export const PAYMENT = {
  STRIPE_PUBLISHABLE_KEY: 'pk_test_your_stripe_key_here',
  CURRENCY: 'USD',
  PRICE_PER_TOUR: 5.99,
} as const;

// Tour configuration
export const TOUR_CONFIG = {
  DEFAULT_REGION: {
    latitude: 44.38756,
    longitude: -68.20429,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  },
  MAP_STYLE: 'standard' as const,
  MARKER_COLORS: {
    unvisited: '#5CC4C4',
    visited: '#4CAF50',
    current: '#FF9800',
  },
} as const;

// UPDATED: Error messages (REQUIRED for services/tourService.ts)
export const ERROR_MESSAGES = {
  LOCATION_PERMISSION_DENIED:
    'Location permission is required for the audio tour to work properly.',
  AUDIO_LOAD_FAILED:
    'Failed to load audio. Please check your internet connection.',
  DOWNLOAD_FAILED: 'Download failed. Please try again.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  TOUR_NOT_FOUND: 'Tour not found.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  API_ERROR: 'Failed to load data. Please try again.', // ADDED - Required by tourService
} as const;

// UPDATED: Success messages
export const SUCCESS_MESSAGES = {
  TOUR_PURCHASED: 'Tour purchased successfully!',
  DOWNLOAD_COMPLETE: 'Download completed. Tour is now available offline.',
  AUDIO_READY: 'Audio is ready to play.',
  DATA_LOADED: 'Data loaded successfully.', // ADDED
} as const;