import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { cardioRouter } from "../src/routers/cardio";
import { haversineDistance } from "../src/lib/gpx";

const db = new PrismaClient();
const createCaller = createCallerFactory(cardioRouter);

function cardioCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "cardio@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("haversineDistance", () => {
  it("calculates distance between two known points", () => {
    // London to Paris ~ 343.5 km
    const d = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(d).toBeGreaterThan(340_000);
    expect(d).toBeLessThan(350_000);
  });

  it("returns 0 for same point", () => {
    expect(haversineDistance(0, 0, 0, 0)).toBe(0);
  });
});

describe("cardio.create", () => {
  it("creates a manual cardio session", async () => {
    const caller = cardioCaller({ user: testUser });
    const result = await caller.create({
      type: "run",
      startedAt: new Date("2026-03-01T08:00:00Z"),
      durationSeconds: 1800,
      distanceMeters: 5000,
    });

    expect(result.session.type).toBe("run");
    expect(result.session.source).toBe("manual");
    expect(result.session.durationSeconds).toBe(1800);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = cardioCaller();
    await expect(
      caller.create({
        type: "run",
        startedAt: new Date(),
        durationSeconds: 1800,
      })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("cardio.list", () => {
  it("returns paginated cardio history", async () => {
    for (let i = 0; i < 3; i++) {
      await db.cardioSession.create({
        data: {
          userId: testUser.id,
          type: "run",
          source: "manual",
          startedAt: new Date(2026, 0, i + 1),
          durationSeconds: 1800,
        },
      });
    }

    const caller = cardioCaller({ user: testUser });
    const result = await caller.list({ limit: 2 });

    expect(result.data.length).toBe(2);
    expect(result.nextCursor).toBeTruthy();
  });
});

describe("cardio.getById", () => {
  it("returns session details without route points", async () => {
    const session = await db.cardioSession.create({
      data: {
        userId: testUser.id,
        type: "hike",
        source: "manual",
        startedAt: new Date(),
        durationSeconds: 7200,
        distanceMeters: 10000,
      },
    });

    const caller = cardioCaller({ user: testUser });
    const result = await caller.getById({ sessionId: session.id });

    expect(result.session.type).toBe("hike");
    expect(result.session.distanceMeters).toBeDefined();
  });
});

describe("cardio.getRoutePoints", () => {
  it("returns route points for a session", async () => {
    const session = await db.cardioSession.create({
      data: {
        userId: testUser.id,
        type: "run",
        source: "gps",
        startedAt: new Date(),
        durationSeconds: 1800,
        routePoints: {
          create: [
            { latitude: 40.7128, longitude: -74.006, timestamp: new Date() },
            { latitude: 40.7138, longitude: -74.005, timestamp: new Date() },
          ],
        },
      },
    });

    const caller = cardioCaller({ user: testUser });
    const result = await caller.getRoutePoints({ sessionId: session.id });

    expect(result.points.length).toBe(2);
  });
});

describe("cardio ownership scoping", () => {
  it("rejects access to another user's session", async () => {
    const otherUser = createTestUser({ email: "other-cardio@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: otherUser.id, email: otherUser.email, name: otherUser.name } });

    const session = await db.cardioSession.create({
      data: { userId: otherUser.id, type: "run", source: "manual", startedAt: new Date(), durationSeconds: 1800 },
    });

    const caller = cardioCaller({ user: testUser });
    await expect(caller.getById({ sessionId: session.id })).rejects.toThrow();
    await expect(caller.getRoutePoints({ sessionId: session.id })).rejects.toThrow();
  });
});

describe("cardio.completeGpsSession", () => {
  it("creates session from buffered GPS points", async () => {
    const now = new Date();
    const caller = cardioCaller({ user: testUser });
    const result = await caller.completeGpsSession({
      type: "run",
      startedAt: now,
      routePoints: [
        { lat: 40.7128, lng: -74.006, elevation: 10, timestamp: now },
        { lat: 40.7138, lng: -74.005, elevation: 12, timestamp: new Date(now.getTime() + 60_000) },
        { lat: 40.7148, lng: -74.004, elevation: 11, timestamp: new Date(now.getTime() + 120_000) },
      ],
    });

    expect(result.session.source).toBe("gps");
    expect(result.session.durationSeconds).toBe(120);
    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);

    // Verify route points stored
    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(3);
  });
});

describe("cardio.importGpx", () => {
  it("parses GPX and creates session with route points", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <ele>10</ele>
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <ele>15</ele>
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
      <trkpt lat="40.7148" lon="-74.0040">
        <ele>12</ele>
        <time>2026-03-01T08:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent, type: "hike" });

    expect(result.session.type).toBe("hike");
    expect(result.session.source).toBe("gpx");
    expect(result.session.durationSeconds).toBe(120);
    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);
    expect(Number(result.session.elevationGainM)).toBe(5); // 10->15 = +5, 15->12 = -3

    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(3);
  });

  it("handles missing elevation gracefully", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="40.7138" lon="-74.0050">
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent });

    expect(Number(result.session.distanceMeters)).toBeGreaterThan(0);
    expect(Number(result.session.elevationGainM)).toBe(0); // No elevation data = 0 gain
  });

  it("silently drops invalid coordinates", async () => {
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="40.7128" lon="-74.0060">
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="999" lon="-74.0050">
        <time>2026-03-01T08:01:00Z</time>
      </trkpt>
      <trkpt lat="40.7148" lon="-74.0040">
        <time>2026-03-01T08:02:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const caller = cardioCaller({ user: testUser });
    const result = await caller.importGpx({ gpxContent });

    // Only 2 valid points should be stored (the invalid lat=999 one is dropped)
    const points = await db.routePoint.findMany({
      where: { sessionId: result.session.id },
    });
    expect(points.length).toBe(2);
  });

  it("rejects empty GPX", async () => {
    const caller = cardioCaller({ user: testUser });
    await expect(
      caller.importGpx({ gpxContent: "<gpx><trk><trkseg></trkseg></trk></gpx>" })
    ).rejects.toThrow();
  });
});
