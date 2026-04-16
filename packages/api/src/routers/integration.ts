import { TRPCError } from "@trpc/server";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import {
  disconnectProviderSchema,
  completeStravaAuthSchema,
  completeGarminAuthSchema,
  completeIntervalsIcuAuthSchema,
} from "@ironpulse/shared/src/schemas/integration";
import { encryptToken, decryptToken } from "../lib/encryption";
import { revokeToken } from "../lib/strava";
import { requireIntegrationCredentials } from "../lib/env";
import { logger } from "../lib/logger";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const GARMIN_TOKEN_URL =
  "https://connectapi.garmin.com/oauth-service/oauth/token";

export const integrationRouter = createTRPCRouter({
  listConnections: rateLimitedProcedure.query(async ({ ctx }) => {
    return ctx.db.deviceConnection.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        lastSyncedAt: true,
        syncEnabled: true,
        createdAt: true,
      },
    });
  }),

  disconnectProvider: rateLimitedProcedure
    .input(disconnectProviderSchema)
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.deviceConnection.findUnique({
        where: {
          userId_provider: {
            userId: ctx.user.id,
            provider: input.provider,
          },
        },
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No ${input.provider} connection found`,
        });
      }

      // Best-effort token revocation — may fail if token is already invalid
      try {
        const accessToken = decryptToken(connection.accessToken);
        if (input.provider === "garmin") {
          const { revokeGarminToken } = await import("../lib/garmin");
          await revokeGarminToken(accessToken);
        } else if (input.provider === "polar") {
          const { revokePolarToken } = await import("../lib/polar");
          await revokePolarToken(accessToken, connection.providerAccountId);
        } else if (input.provider === "withings") {
          // Withings does not have a revocation endpoint
        } else if (input.provider === "oura") {
          const { revokeOuraToken } = await import("../lib/oura");
          await revokeOuraToken(accessToken);
        } else if (input.provider === "intervals_icu") {
          // API key auth — no revocation needed
        } else {
          await revokeToken(accessToken);
        }
      } catch {
        // Ignore revocation errors
      }

      await ctx.db.deviceConnection.delete({
        where: {
          userId_provider: {
            userId: ctx.user.id,
            provider: input.provider,
          },
        },
      });

      return { success: true };
    }),

  completeStravaAuth: rateLimitedProcedure
    .input(completeStravaAuthSchema)
    .mutation(async ({ ctx, input }) => {
      const response = await fetch(STRAVA_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code: input.code,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to exchange Strava authorization code",
        });
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_at: number;
        athlete: { id: number };
      };

      await ctx.db.deviceConnection.upsert({
        where: {
          userId_provider: {
            userId: ctx.user.id,
            provider: "strava",
          },
        },
        create: {
          userId: ctx.user.id,
          provider: "strava",
          providerAccountId: String(data.athlete.id),
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(data.expires_at * 1000),
        },
        update: {
          providerAccountId: String(data.athlete.id),
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(data.expires_at * 1000),
        },
      });

      return { success: true };
    }),

  completeGarminAuth: rateLimitedProcedure
    .input(completeGarminAuthSchema)
    .mutation(async ({ ctx, input }) => {
      const garmin = requireIntegrationCredentials("GARMIN");
      const response = await fetch(GARMIN_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: input.code,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/garmin/callback`,
          client_id: garmin.clientId,
          client_secret: garmin.clientSecret,
          code_verifier: input.codeVerifier,
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to exchange Garmin authorization code",
        });
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user_id: string;
      };

      await ctx.db.deviceConnection.upsert({
        where: {
          userId_provider: {
            userId: ctx.user.id,
            provider: "garmin",
          },
        },
        create: {
          userId: ctx.user.id,
          provider: "garmin",
          providerAccountId: data.user_id,
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
        update: {
          providerAccountId: data.user_id,
          accessToken: encryptToken(data.access_token),
          refreshToken: encryptToken(data.refresh_token),
          tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
        },
      });

      return { success: true };
    }),

  completeIntervalsIcuAuth: rateLimitedProcedure
    .input(completeIntervalsIcuAuthSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the API key works by making a test request
      const testUrl = `https://intervals.icu/api/v1/athlete/${input.athleteId}`;
      const testResponse = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`API_KEY:${input.apiKey}`).toString("base64")}`,
        },
      });

      if (!testResponse.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid API key or athlete ID",
        });
      }

      const connection = await ctx.db.deviceConnection.upsert({
        where: {
          userId_provider: {
            userId: ctx.user.id,
            provider: "intervals_icu",
          },
        },
        create: {
          userId: ctx.user.id,
          provider: "intervals_icu",
          providerAccountId: input.athleteId,
          accessToken: encryptToken(input.apiKey),
          refreshToken: null,
          tokenExpiresAt: new Date("2099-01-01"),
        },
        update: {
          providerAccountId: input.athleteId,
          accessToken: encryptToken(input.apiKey),
          tokenExpiresAt: new Date("2099-01-01"),
        },
      });

      // Fire-and-forget backfill
      import("../lib/intervals-icu").then(({ runIntervalsBackfill }) => {
        runIntervalsBackfill(connection.id, ctx.db).catch((err) => {
          logger.error({ err, provider: "intervals-icu" }, "Intervals.icu backfill failed");
        });
      });

      return { success: true };
    }),
});
