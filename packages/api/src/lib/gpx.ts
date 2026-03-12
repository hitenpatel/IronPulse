import { XMLParser } from "fast-xml-parser";

interface ParsedPoint {
  lat: number;
  lng: number;
  elevation: number | null;
  timestamp: Date;
}

interface GpxStats {
  points: ParsedPoint[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseGpx(gpxContent: string): GpxStats {
  const parser = new XMLParser({
    processEntities: false,
    allowBooleanAttributes: false,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const parsed = parser.parse(gpxContent);

  // Navigate to track points — GPX can have nested structure
  const gpx = parsed.gpx;
  if (!gpx) throw new Error("Invalid GPX: missing <gpx> root element");

  const trk = gpx.trk;
  if (!trk) throw new Error("Invalid GPX: missing <trk> element");

  // trk can be an array or single object
  const tracks = Array.isArray(trk) ? trk : [trk];

  const allPoints: ParsedPoint[] = [];

  for (const track of tracks) {
    const trkseg = track.trkseg;
    if (!trkseg) continue;
    const segments = Array.isArray(trkseg) ? trkseg : [trkseg];

    for (const seg of segments) {
      const trkpts = seg.trkpt;
      if (!trkpts) continue;
      const points = Array.isArray(trkpts) ? trkpts : [trkpts];

      for (const pt of points) {
        const lat = parseFloat(pt["@_lat"]);
        const lng = parseFloat(pt["@_lon"]);

        // Validate coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          continue; // Silently drop invalid points
        }

        const rawEle = pt.ele != null ? parseFloat(pt.ele) : null;
        const elevation = rawEle !== null && !isNaN(rawEle) ? rawEle : null;
        const timestamp = pt.time ? new Date(pt.time) : null;

        if (!timestamp || isNaN(timestamp.getTime())) continue;

        allPoints.push({ lat, lng, elevation, timestamp });
      }
    }
  }

  if (allPoints.length === 0) {
    throw new Error("GPX file contains no valid track points");
  }

  // Cap at 50,000 points
  const points = allPoints.slice(0, 50_000);

  // Calculate stats
  let distanceMeters = 0;
  let elevationGainM = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;

    distanceMeters += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);

    if (prev.elevation != null && curr.elevation != null) {
      const delta = curr.elevation - prev.elevation;
      if (delta > 0) elevationGainM += delta;
    }
  }

  const startedAt = points[0]!.timestamp;
  const endedAt = points[points.length - 1]!.timestamp;
  const durationSeconds = Math.round(
    (endedAt.getTime() - startedAt.getTime()) / 1000
  );

  return {
    points,
    distanceMeters: Math.round(distanceMeters * 100) / 100,
    elevationGainM: Math.round(elevationGainM * 100) / 100,
    durationSeconds,
    startedAt,
  };
}
