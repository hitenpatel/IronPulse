const EARTH_RADIUS = 6371000;

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function totalDistance(points: { latitude: number; longitude: number }[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1].latitude, points[i - 1].longitude, points[i].latitude, points[i].longitude);
  }
  return total;
}

export function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters === 0) return 0;
  return Math.round((durationSeconds / distanceMeters) * 1000);
}

export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm === 0) return "--:--";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function metersToKm(meters: number): number { return meters / 1000; }
export function metersToMiles(meters: number): number { return meters / 1609.34; }
