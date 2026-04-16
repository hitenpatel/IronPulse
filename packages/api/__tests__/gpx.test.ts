import { describe, it, expect } from "vitest";
import { haversineDistance, parseGpx } from "../src/lib/gpx";

describe("haversineDistance", () => {
  it("returns ~343km between London and Paris", () => {
    const dist = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    // Known great-circle distance is approximately 343 km
    expect(dist).toBeGreaterThan(340_000);
    expect(dist).toBeLessThan(346_000);
  });

  it("returns 0 for the same point", () => {
    const dist = haversineDistance(51.5074, -0.1278, 51.5074, -0.1278);
    expect(dist).toBe(0);
  });
});

describe("parseGpx", () => {
  const validGpx = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="51.5074" lon="-0.1278"><ele>11</ele><time>2024-01-01T08:00:00Z</time></trkpt>
    <trkpt lat="51.5080" lon="-0.1270"><ele>15</ele><time>2024-01-01T08:01:00Z</time></trkpt>
    <trkpt lat="51.5090" lon="-0.1260"><ele>13</ele><time>2024-01-01T08:02:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;

  it("parses valid GPX with 3 trackpoints", () => {
    const result = parseGpx(validGpx);

    expect(result.points).toHaveLength(3);
    expect(result.points[0]!.lat).toBe(51.5074);
    expect(result.points[0]!.lng).toBe(-0.1278);
    expect(result.points[0]!.elevation).toBe(11);

    // Distance should be small (a few hundred meters in central London)
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.distanceMeters).toBeLessThan(1000);

    // Elevation gain: 11 -> 15 = +4, 15 -> 13 = -2 (no gain)
    expect(result.elevationGainM).toBe(4);

    // Duration: 2 minutes = 120 seconds
    expect(result.durationSeconds).toBe(120);

    expect(result.startedAt).toEqual(new Date("2024-01-01T08:00:00Z"));
  });

  it("throws on empty/no track points", () => {
    const emptyGpx = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg></trkseg></trk>
</gpx>`;
    expect(() => parseGpx(emptyGpx)).toThrow("no valid track points");
  });

  it("throws on missing gpx root element", () => {
    const noRoot = `<?xml version="1.0"?>
<notgpx><trk><trkseg>
  <trkpt lat="51.5" lon="-0.1"><ele>10</ele><time>2024-01-01T08:00:00Z</time></trkpt>
</trkseg></trk></notgpx>`;
    expect(() => parseGpx(noRoot)).toThrow("missing <gpx> root element");
  });

  it("skips invalid coordinates (lat > 90)", () => {
    const invalidCoordGpx = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="91.0" lon="0.0"><ele>10</ele><time>2024-01-01T08:00:00Z</time></trkpt>
    <trkpt lat="51.5074" lon="-0.1278"><ele>11</ele><time>2024-01-01T08:01:00Z</time></trkpt>
    <trkpt lat="51.5080" lon="-0.1270"><ele>15</ele><time>2024-01-01T08:02:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`;
    const result = parseGpx(invalidCoordGpx);
    // The invalid point (lat=91) should be skipped, leaving 2 valid points
    expect(result.points).toHaveLength(2);
    expect(result.points[0]!.lat).toBe(51.5074);
  });
});
