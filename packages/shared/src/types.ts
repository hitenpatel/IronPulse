export interface SessionUser {
  id: string;
  email: string;
  name: string;
  tier: string;
  subscriptionStatus: string;
  unitSystem: string;
  onboardingComplete: boolean;
  defaultRestSeconds: number;
  warmupScheme?: "strength" | "hypertrophy" | "light" | "none";
  warmupEnabled?: boolean;
}
