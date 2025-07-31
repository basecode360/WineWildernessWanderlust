import { useEffect } from 'react';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

type Stop = {
  id: string;
  coordinates: [number, number];
};

function getDistanceMeters(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useProximity(
  stops: Stop[],
  onEnter: (stop: Stop) => void,
  thresholdMeters = 150
) {
  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;
    const triggered: Record<string, boolean> = {};

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscriber = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        ({ coords }) => {
          stops.forEach((stop) => {
            const dist = getDistanceMeters(
              [coords.latitude, coords.longitude],
              stop.coordinates
            );
            if (dist <= thresholdMeters && !triggered[stop.id]) {
              triggered[stop.id] = true;
              onEnter(stop);
            }
          });
        }
      );
    })();

    return () => {
      subscriber?.remove();
    };
  }, [stops, onEnter, thresholdMeters]);
}
