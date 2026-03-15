import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  disconnectProviderSchema,
  completeStravaAuthSchema,
} from "@ironpulse/shared/src/schemas/integration";
import { encryptToken, decryptToken } from "../lib/encryption";
import { revokeToken } from "../lib/strava";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export const integrationRouter = createTRPCRouter({
  listConnections: protectedProcedure.query(async ({ ctx }) => {
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

  disconnectProvider: protectedProcedure
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
        await revokeToken(accessToken);
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

  completeStravaAuth: protectedProcedure
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
});
