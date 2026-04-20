import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tier?: string;
    subscriptionStatus?: string;
    unitSystem?: string;
    onboardingComplete?: boolean;
    defaultRestSeconds?: number;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      tier: string;
      subscriptionStatus: string;
      unitSystem: string;
      onboardingComplete: boolean;
      defaultRestSeconds: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    tier?: string;
    subscriptionStatus?: string;
    unitSystem?: string;
    onboardingComplete?: boolean;
    defaultRestSeconds?: number;
  }
}
