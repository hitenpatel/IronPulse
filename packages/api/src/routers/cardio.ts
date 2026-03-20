import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createCardioSchema,
  completeGpsSessionSchema,
  importGpxSchema,
  previewGpxSchema,
  previewFitSchema,
  importFitSchema,
  cursorPaginationSchema,
} from "@ironpulse/shared";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { parseGpx, haversineDistance } from "../lib/gpx";
import { parseFitFile } from "../lib/fit";

export const cardioRouter = createTRPCRouter({
  create: rateLimitedProcedure
    .input(createCardioSchema)
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          source: "manual",
          startedAt: input.startedAt,
          durationSeconds: input.durationSeconds,
          ...(input.distanceMeters !== undefined && { distanceMeters: input.distanceMeters }),
          ...(input.elevationGainM !== undefined && { elevationGainM: input.elevationGainM }),
          ...(input.avgHeartRate !== undefined && { avgHeartRate: input.avgHeartRate }),
          ...(input.maxHeartRate !== undefined && { maxHeartRate: input.maxHeartRate }),
          ...(input.calories !== undefined && { calories: input.calories }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
          avgHeartRate: true, maxHeartRate: true, calories: true, notes: true,
        },
      });

      return { session };
    }),

  list: rateLimitedProcedure
    .input(cursorPaginationSchema)
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.db.cardioSession.findMany({
        where: { userId: ctx.user.id },
        orderBy: { startedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        select: {
          id: true,
          type: true,
          source: true,
          startedAt: true,
          durationSeconds: true,
          distanceMeters: true,
          calories: true,
        },
      });

      const hasMore = sessions.length > input.limit;
      const data = hasMore ? sessions.slice(0, -1) : sessions;
      const nextCursor = hasMore ? data[data.length - 1]!.id : null;

      return { data, nextCursor };
    }),

  getById: rateLimitedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.cardioSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
          avgHeartRate: true, maxHeartRate: true, calories: true, notes: true,
          laps: {
            select: {
              id: true,
              lapNumber: true,
              distanceMeters: true,
              durationSeconds: true,
              avgHeartRate: true,
            },
            orderBy: { lapNumber: "asc" },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return { session };
    }),

  getRoutePoints: rateLimitedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const session = await ctx.db.cardioSession.findFirst({
        where: { id: input.sessionId, userId: ctx.user.id },
        select: { id: true },
      });
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      const points = await ctx.db.routePoint.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { timestamp: "asc" },
        select: {
          latitude: true,
          longitude: true,
          elevationM: true,
          heartRate: true,
          timestamp: true,
        },
      });

      return { points };
    }),

  completeGpsSession: rateLimitedProcedure
    .input(completeGpsSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const points = input.routePoints;

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

      const lastPoint = points[points.length - 1]!;
      const durationSeconds = Math.round(
        (lastPoint.timestamp.getTime() - input.startedAt.getTime()) / 1000
      );

      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          source: "gps",
          startedAt: input.startedAt,
          durationSeconds,
          distanceMeters: Math.round(distanceMeters * 100) / 100,
          elevationGainM: Math.round(elevationGainM * 100) / 100,
          routePoints: {
            createMany: {
              data: points.map((p) => ({
                latitude: p.lat,
                longitude: p.lng,
                elevationM: p.elevation ?? null,
                timestamp: p.timestamp,
              })),
            },
          },
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
        },
      });

      return { session };
    }),

  previewGpx: rateLimitedProcedure
    .input(previewGpxSchema)
    .mutation(async ({ input }) => {
      const gpxData = parseGpx(input.gpxContent);
      return {
        points: gpxData.points,
        distanceMeters: gpxData.distanceMeters,
        elevationGainM: gpxData.elevationGainM,
        durationSeconds: gpxData.durationSeconds,
        startedAt: gpxData.startedAt,
      };
    }),

  importGpx: rateLimitedProcedure
    .input(importGpxSchema)
    .mutation(async ({ ctx, input }) => {
      const gpxData = parseGpx(input.gpxContent);

      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: input.type ?? "hike",
          source: "gpx",
          startedAt: gpxData.startedAt,
          durationSeconds: gpxData.durationSeconds,
          distanceMeters: gpxData.distanceMeters,
          elevationGainM: gpxData.elevationGainM,
          routePoints: {
            createMany: {
              data: gpxData.points.map((p) => ({
                latitude: p.lat,
                longitude: p.lng,
                elevationM: p.elevation,
                timestamp: p.timestamp,
              })),
            },
          },
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
        },
      });

      return { session };
    }),

  previewFit: rateLimitedProcedure
    .input(previewFitSchema)
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const fitData = await parseFitFile(buffer);
      return {
        type: fitData.type,
        startedAt: fitData.startedAt,
        durationSeconds: fitData.durationSeconds,
        distanceMeters: fitData.distanceMeters,
        elevationGainM: fitData.elevationGainM,
        avgHeartRate: fitData.avgHeartRate,
        maxHeartRate: fitData.maxHeartRate,
        calories: fitData.calories,
        pointCount: fitData.points.length,
        points: fitData.points.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
          elevation: p.altitude,
          timestamp: p.timestamp,
        })),
      };
    }),

  importFit: rateLimitedProcedure
    .input(importFitSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const fitData = await parseFitFile(buffer);

      const session = await ctx.db.cardioSession.create({
        data: {
          userId: ctx.user.id,
          type: fitData.type,
          source: "fit",
          startedAt: fitData.startedAt,
          durationSeconds: fitData.durationSeconds,
          ...(fitData.distanceMeters != null && { distanceMeters: fitData.distanceMeters }),
          ...(fitData.elevationGainM != null && { elevationGainM: fitData.elevationGainM }),
          ...(fitData.avgHeartRate != null && { avgHeartRate: fitData.avgHeartRate }),
          ...(fitData.maxHeartRate != null && { maxHeartRate: fitData.maxHeartRate }),
          ...(fitData.calories != null && { calories: fitData.calories }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(fitData.points.length > 0 && {
            routePoints: {
              createMany: {
                data: fitData.points.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                  elevationM: p.altitude,
                  heartRate: p.heartRate,
                  timestamp: p.timestamp,
                })),
              },
            },
          }),
        },
        select: {
          id: true, type: true, source: true, startedAt: true,
          durationSeconds: true, distanceMeters: true, elevationGainM: true,
          avgHeartRate: true, maxHeartRate: true, calories: true, notes: true,
        },
      });

      return { session };
    }),
});
