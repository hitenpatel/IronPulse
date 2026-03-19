import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import type { SessionUser } from "@ironpulse/shared";
import {
  signUpSchema,
  signInSchema,
  sendMagicLinkSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@ironpulse/shared";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "../lib/email";
import { signMobileToken } from "../lib/mobile-auth";
import { createTRPCRouter, publicProcedure, rateLimitedProcedure } from "../trpc";

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
        consentedAt: input.consentedAt ?? null,
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

  getSession: rateLimitedProcedure.query(({ ctx }) => {
    return { session: ctx.session };
  }),

  mobileSignIn: publicProcedure
    .input(signInSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          tier: true,
          subscriptionStatus: true,
          unitSystem: true,
          onboardingComplete: true,
          defaultRestSeconds: true,
        },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const { passwordHash: _, ...sessionUser } = user;
      const token = signMobileToken(sessionUser as SessionUser);

      return { token, user: sessionUser };
    }),

  mobileSignUp: publicProcedure
    .input(signUpSchema)
    .mutation(async ({ ctx, input }) => {
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
          consentedAt: input.consentedAt ?? null,
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
          onboardingComplete: true,
          defaultRestSeconds: true,
        },
      });

      const token = signMobileToken(user as SessionUser);
      return { token, user };
    }),

  sendMagicLink: publicProcedure
    .input(sendMagicLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await ctx.db.magicLinkToken.create({
        data: {
          email: input.email,
          token,
          expiresAt,
        },
      });

      try {
        await sendMagicLinkEmail(input.email, token);
      } catch {
        // Don't expose email delivery failures to prevent enumeration
      }

      return { ok: true };
    }),

  requestPasswordReset: publicProcedure
    .input(requestPasswordResetSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });

      if (user) {
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await ctx.db.passwordResetToken.create({
          data: {
            userId: user.id,
            token,
            expiresAt,
          },
        });

        try {
          await sendPasswordResetEmail(input.email, token);
        } catch {
          // Don't expose email delivery failures
        }
      }

      // Always return ok to prevent email enumeration
      return { ok: true };
    }),

  resetPassword: publicProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const tokenRecord = await ctx.db.passwordResetToken.findUnique({
        where: { token: input.token },
        include: { user: { select: { id: true } } },
      });

      if (!tokenRecord || tokenRecord.used || tokenRecord.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const [, updatedUser] = await ctx.db.$transaction([
        ctx.db.passwordResetToken.update({
          where: { id: tokenRecord.id },
          data: { used: true },
        }),
        ctx.db.user.update({
          where: { id: tokenRecord.user.id },
          data: { passwordHash },
          select: { email: true },
        }),
      ]);

      return { ok: true, email: updatedUser.email };
    }),

  changePassword: rateLimitedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to change your password",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { id: true, passwordHash: true },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password is set on this account",
        });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, 12);

      await ctx.db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      return { ok: true };
    }),
});
