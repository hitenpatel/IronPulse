import {
  completeOnboardingSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from "@ironpulse/shared";
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
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          unitSystem: true,
          tier: true,
          subscriptionStatus: true,
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
          onboardingComplete: true,
        },
        select: {
          id: true,
          name: true,
          unitSystem: true,
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

  requestDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { deletionRequestedAt: new Date() },
    });
    return { message: "Account deletion requested. You have 7 days to cancel." };
  }),

  cancelDeletion: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { deletionRequestedAt: null },
    });
    return { message: "Account deletion cancelled." };
  }),
});
