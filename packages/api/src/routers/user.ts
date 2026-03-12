import { updateProfileSchema } from "@ironpulse/shared";
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
});
