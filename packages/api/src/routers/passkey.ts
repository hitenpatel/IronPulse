import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  passkeyRegisterVerifySchema,
  passkeyLoginVerifySchema,
  passkeyRenameSchema,
  passkeyDeleteSchema,
  removePasswordSchema,
} from "@ironpulse/shared";
import {
  createRegistrationOptions,
  verifyAndSaveRegistration,
  createLoginOptions,
  verifyLogin,
  hasAlternativeAuthMethod,
} from "../lib/passkey";
import { checkRateLimit, RATE_LIMITS } from "../lib/rate-limit";
import {
  createTRPCRouter,
  rateLimitedProcedure,
  authRateLimitedProcedure,
} from "../trpc";

export const passkeyRouter = createTRPCRouter({
  registerOptions: rateLimitedProcedure.mutation(async ({ ctx }) => {
    await checkRateLimit(
      `passkey-reg:${ctx.user.id}`,
      RATE_LIMITS.passkeyReg,
    );

    try {
      return await createRegistrationOptions(
        ctx.db,
        ctx.user.id,
        ctx.user.email,
        ctx.user.name,
      );
    } catch (err: any) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err.message ?? "Failed to generate registration options",
      });
    }
  }),

  registerVerify: rateLimitedProcedure
    .input(passkeyRegisterVerifySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const passkey = await verifyAndSaveRegistration(
          ctx.db,
          ctx.user.id,
          input.attestation,
          input.name,
        );

        return {
          id: passkey.id,
          name: passkey.name,
          deviceType: passkey.deviceType,
          createdAt: passkey.createdAt,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message ?? "Registration verification failed",
        });
      }
    }),

  loginOptions: authRateLimitedProcedure.mutation(async ({ ctx }) => {
    try {
      return await createLoginOptions(ctx.db);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate login options",
      });
    }
  }),

  loginVerify: authRateLimitedProcedure
    .input(passkeyLoginVerifySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { passkeyLoginToken } = await verifyLogin(
          ctx.db,
          input.assertion,
          input.challenge,
        );
        return { passkeyLoginToken };
      } catch (err: any) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Passkey authentication failed",
        });
      }
    }),

  list: rateLimitedProcedure.query(async ({ ctx }) => {
    const passkeys = await ctx.db.passkey.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        name: true,
        deviceType: true,
        backedUp: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { passkeys };
  }),

  rename: rateLimitedProcedure
    .input(passkeyRenameSchema)
    .mutation(async ({ ctx, input }) => {
      const passkey = await ctx.db.passkey.findFirst({
        where: { id: input.passkeyId, userId: ctx.user.id },
      });

      if (!passkey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
      }

      await ctx.db.passkey.update({
        where: { id: input.passkeyId },
        data: { name: input.name },
      });

      return { ok: true };
    }),

  delete: rateLimitedProcedure
    .input(passkeyDeleteSchema)
    .mutation(async ({ ctx, input }) => {
      // Serializable transaction to prevent race condition with removePassword
      await ctx.db.$transaction(async (tx) => {
        const passkey = await tx.passkey.findFirst({
          where: { id: input.passkeyId, userId: ctx.user.id },
        });

        if (!passkey) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Passkey not found" });
        }

        const hasAlternative = await hasAlternativeAuthMethod(
          tx,
          ctx.user.id,
          input.passkeyId,
        );

        if (!hasAlternative) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete your only authentication method. Add a password or link an OAuth provider first.",
          });
        }

        await tx.passkey.delete({ where: { id: input.passkeyId } });
      }, { isolationLevel: "Serializable" });

      return { ok: true };
    }),

  removePassword: rateLimitedProcedure
    .input(removePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
        select: { passwordHash: true },
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No password set on this account",
        });
      }

      // Re-authentication: must provide current password or passkey assertion
      if (input.currentPassword) {
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Incorrect password",
          });
        }
      } else if (input.passkeyAssertion) {
        try {
          await verifyLogin(ctx.db, input.passkeyAssertion);
        } catch {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Passkey verification failed",
          });
        }
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Re-authentication required: provide current password or passkey assertion",
        });
      }

      // Serializable transaction to prevent race condition with passkeyDelete
      await ctx.db.$transaction(async (tx) => {
        const passkeyCount = await tx.passkey.count({
          where: { userId: ctx.user.id },
        });

        const oauthAccount = await tx.account.findFirst({
          where: { userId: ctx.user.id, provider: { notIn: ["email"] } },
        });

        if (passkeyCount === 0 && !oauthAccount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot remove password without a passkey or OAuth provider linked",
          });
        }

        await tx.user.update({
          where: { id: ctx.user.id },
          data: { passwordHash: null },
        });
      }, { isolationLevel: "Serializable" });

      return { ok: true };
    }),
});
