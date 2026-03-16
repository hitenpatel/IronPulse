import {
  completeOnboardingSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from "@ironpulse/shared";
import { getPresignedUploadUrl } from "../lib/s3";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
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
        createdAt: true,
      },
    });

    return { user };
  }),

  updateProfile: protectedProcedure
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

  completeOnboarding: protectedProcedure
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

  uploadAvatar: protectedProcedure
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

  registerPushToken: protectedProcedure
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

  unregisterPushToken: protectedProcedure
    .input(unregisterPushTokenSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pushToken.deleteMany({
        where: { token: input.token, userId: ctx.user.id },
      });

      return { success: true };
    }),
});
