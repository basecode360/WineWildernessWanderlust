// types/tour.ts - TypeScript interfaces for tour data

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TourStop {
  id: string;
  title: string;
  type: 'info_Stop' | 'lobster_stop' | 'bonus_stop';
  coordinates: Coordinates;
  triggerCoordinates?: Coordinates;
  audio: string;
  transcript: string;
  image: string;
  isPlayed: boolean;
  address?: string;
  tips?: string;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  distance: string;
  image: string;
  isPurchased: boolean;
  isDownloaded: boolean;
  stops: TourStop[];
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AudioState {
  isPlaying: boolean;
  currentStopId: string | null;
  position: number;
  duration: number;
}

export interface DownloadProgress {
  stopId: string;
  progress: number;
  isComplete: boolean;
}
