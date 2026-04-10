import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  changeEmailSchema,
  completeOnboardingSchema,
  confirmEmailChangeSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from "@ironpulse/shared";
import { sendEmailChangeVerificationEmail } from "../lib/email";
import { getPresignedUploadUrl } from "../lib/s3";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  me: rateLimitedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        unitSystem: true,
        tier: true,
        subscriptionStatus: true,
        defaultRestSeconds: true,
        deletionRequestedAt: true,
        createdAt: true,
      },
    });

    return { user };
  }),

  updateProfile: rateLimitedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.unitSystem !== undefined && { unitSystem: input.unitSystem }),
          ...(input.defaultRestSeconds !== undefined && { defaultRestSeconds: input.defaultRestSeconds }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          unitSystem: true,
          tier: true,
          subscriptionStatus: true,
          defaultRestSeconds: true,
        },
      });

      return { user };
    }),

  completeOnboarding: rateLimitedProcedure
    .input(completeOnboardingSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
          unitSystem: input.unitSystem,
          ...(input.fitnessGoal !== undefined && { fitnessGoal: input.fitnessGoal }),
          ...(input.experienceLevel !== undefined && { experienceLevel: input.experienceLevel }),
          onboardingComplete: true,
        },
        select: {
          id: true,
          name: true,
          unitSystem: true,
          fitnessGoal: true,
          experienceLevel: true,
          onboardingComplete: true,
        },
      });

      return { user };
    }),

  uploadAvatar: rateLimitedProcedure
    .input(uploadAvatarSchema)
    .mutation(async ({ ctx, input }) => {
      const ext = input.contentType.split("/")[1];
      const key = `avatars/${ctx.user.id}.${ext}`;
      const uploadUrl = await getPresignedUploadUrl(key, input.contentType);

      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { avatarUrl: key },
      });

      return { uploadUrl, key };
    }),

  registerPushToken: rateLimitedProcedure
    .input(registerPushTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pushToken.upsert({
        where: { token: input.token },
        create: {
          userId: ctx.user.id,
          token: input.token,
          platform: input.platform,
        },
        update: {
          userId: ctx.user.id,
          platform: input.platform,
        },
      });

      return { success: true };
    }),

  unregisterPushToken: rateLimitedProcedure
    .input(unregisterPushTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.user.id },
      });

      return { success: true };
    }),

  requestEmailChange: rateLimitedProcedure
    .input(changeEmailSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { id: true, passwordHash: true },
      });

      if (!user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password is set on this account. Use a different verification method.",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect password",
        });
      }

      const existing = await ctx.db.user.findUnique({
        where: { email: input.newEmail },
        select: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That email address is already in use",
        });
      }

      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.db.emailChangeToken.create({
        data: {
          userId: ctx.user.id,
          newEmail: input.newEmail,
          token,
          expiresAt,
        },
      });

      try {
        await sendEmailChangeVerificationEmail(input.newEmail, token);
      } catch {
        // Don't expose email delivery failures
      }

      return { ok: true };
    }),

  confirmEmailChange: protectedProcedure
    .input(confirmEmailChangeSchema)
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.db.emailChangeToken.findUnique({
        where: { token: input.token },
        include: { user: { select: { id: true } } },
      });

      if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired email change token",
        });
      }

      // Verify the token belongs to the authenticated user
      if (tokenRecord.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This email change link does not belong to your account",
        });
      }

      const newEmail = tokenRecord.newEmail;

      // Check the new email is still available
      const conflicting = await ctx.db.user.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });
      if (conflicting) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "That email address is already in use",
        });
      }

      await ctx.db.$transaction([
        ctx.db.emailChangeToken.update({
          where: { id: tokenRecord.id },
          data: { used: true },
        }),
        ctx.db.user.update({
          where: { id: tokenRecord.userId },
          data: { email: newEmail },
        }),
        // Update the email provider account's providerAccountId to match the new email
        ctx.db.account.updateMany({
          where: { userId: tokenRecord.userId, provider: "email" },
          data: { providerAccountId: newEmail },
        }),
      ]);

      return { ok: true, newEmail };
    }),

  requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const now = new Date();
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { deletionRequestedAt: now },
    });
    const deletionDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { success: true as const, deletionDate };
  }),

  cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { deletionRequestedAt: true },
    });

    if (!user.deletionRequestedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No pending deletion request to cancel",
      });
    }

    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { deletionRequestedAt: null },
    });
    return { success: true as const };
  }),

  processPendingDeletions: protectedProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const usersToDelete = await ctx.db.user.findMany({
      where: {
        deletionRequestedAt: { not: null, lte: cutoff },
      },
      select: { id: true },
    });

    if (usersToDelete.length === 0) {
      return { success: true as const, deletedCount: 0 };
    }

    // Prisma schema uses onDelete: Cascade on all user relations,
    // so deleting the user record cascades to all related data.
    const result = await ctx.db.user.deleteMany({
      where: {
        id: { in: usersToDelete.map((u) => u.id) },
      },
    });

    return { success: true as const, deletedCount: result.count };
  }),
});
