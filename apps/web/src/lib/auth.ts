import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { db } from "@ironpulse/db";
import { verifyPasskeyLoginToken } from "@ironpulse/api/src/lib/passkey";
import { signInSchema } from "@ironpulse/shared";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          subscriptionStatus: user.subscriptionStatus,
          unitSystem: user.unitSystem,
          onboardingComplete: user.onboardingComplete,
        };
      },
    }),
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        passkeyLoginToken: {},
      },
      async authorize(credentials) {
        const token = credentials?.passkeyLoginToken as string;
        if (!token) return null;

        const userId = verifyPasskeyLoginToken(token);
        if (!userId) return null;

        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          subscriptionStatus: user.subscriptionStatus,
          unitSystem: user.unitSystem,
          onboardingComplete: user.onboardingComplete,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, user object is available
      if (user) {
        token.id = user.id;

        // For credentials provider, custom fields are on the user object
        if ((user as any).tier) {
          token.tier = (user as any).tier;
          token.subscriptionStatus = (user as any).subscriptionStatus;
          token.unitSystem = (user as any).unitSystem;
          token.onboardingComplete = (user as any).onboardingComplete ?? true;
        }
      }

      // For OAuth providers (or if custom fields not set yet), load from DB
      if (token.id && !token.tier) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { tier: true, subscriptionStatus: true, unitSystem: true, onboardingComplete: true },
        });
        if (dbUser) {
          token.tier = dbUser.tier;
          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.unitSystem = dbUser.unitSystem;
          token.onboardingComplete = dbUser.onboardingComplete;
        }
      }

      if (token.onboardingComplete === undefined) {
        token.onboardingComplete = true;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).tier = token.tier;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).unitSystem = token.unitSystem;
        (session.user as any).onboardingComplete = token.onboardingComplete as boolean;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "apple") {
        const existing = await db.user.findUnique({
          where: { email: user.email! },
        });

        if (!existing) {
          const newUser = await db.user.create({
            data: {
              email: user.email!,
              name: user.name ?? "User",
              avatarUrl: user.image,
              accounts: {
                create: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            },
          });
          // Set user.id so the jwt callback gets the DB id
          user.id = newUser.id;
        } else {
          // Set user.id to the existing DB id
          user.id = existing.id;

          const hasAccount = await db.account.findFirst({
            where: {
              userId: existing.id,
              provider: account.provider,
            },
          });

          if (!hasAccount) {
            await db.account.create({
              data: {
                userId: existing.id,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            });
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
