import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { signUpSchema, signInSchema } from "@ironpulse/shared";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.user.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await ctx.db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        accounts: {
          create: {
            provider: "email",
            providerAccountId: input.email,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        subscriptionStatus: true,
        unitSystem: true,
      },
    });

    return { user };
  }),

  signIn: publicProcedure.input(signInSchema).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({
      where: { email: input.email },
    });

    if (!user || !user.passwordHash) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        subscriptionStatus: user.subscriptionStatus,
        unitSystem: user.unitSystem,
      },
    };
  }),

  getSession: publicProcedure.query(({ ctx }) => {
    return { session: ctx.session };
  }),
});
