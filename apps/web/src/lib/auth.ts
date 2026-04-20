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

        if (!user?.passwordHash) {
          console.error("[auth] user not found or no password:", parsed.data.email);
          return null;
        }

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!valid) {
          console.error("[auth] bcrypt compare failed for:", parsed.data.email);
          return null;
        }

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
        if (user.tier) {
          token.tier = user.tier;
          token.subscriptionStatus = user.subscriptionStatus;
          token.unitSystem = user.unitSystem;
          token.onboardingComplete = user.onboardingComplete ?? true;
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
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.tier = token.tier ?? "athlete";
        session.user.subscriptionStatus = token.subscriptionStatus ?? "none";
        session.user.unitSystem = token.unitSystem ?? "metric";
        session.user.onboardingComplete = token.onboardingComplete ?? true;
        session.user.defaultRestSeconds = token.defaultRestSeconds ?? 90;
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
  trustHost: true,
});
