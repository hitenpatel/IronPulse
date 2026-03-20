"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Check, Crown, Dumbbell } from "lucide-react";

const COACH_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_COACH_PRICE_ID ?? "";

const tiers = [
  {
    name: "Athlete",
    price: "Free",
    description: "Track your workouts and progress",
    features: [
      "Unlimited workout logging",
      "Exercise library",
      "Progress photos",
      "Activity feed",
      "Personal records tracking",
    ],
    tier: "athlete" as const,
    current: true,
  },
  {
    name: "Coach",
    price: "$9.99/mo",
    description: "Manage clients and build programs",
    features: [
      "Everything in Athlete",
      "Client management dashboard",
      "Custom training programs",
      "Coach-athlete messaging",
      "Public coach profile",
      "Program templates",
      "14-day free trial",
    ],
    tier: "coach" as const,
    current: false,
    priceId: COACH_PRICE_ID,
  },
];

export default function PricingPage() {
  const { data: meData } = trpc.user.me.useQuery();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const currentTier = meData?.user?.tier ?? "athlete";

  async function handleUpgrade(priceId: string, tier: "athlete" | "coach") {
    const origin = window.location.origin;
    const result = await createCheckout.mutateAsync({
      priceId,
      tier,
      successUrl: `${origin}/coach?upgraded=true`,
      cancelUrl: `${origin}/pricing`,
    });
    if (result.url) {
      window.location.href = result.url;
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">Plans & Pricing</h1>
        <p className="mt-1 text-muted-foreground">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
        {tiers.map((tier) => {
          const isCurrentTier = currentTier === tier.tier;

          return (
            <div
              key={tier.name}
              className={`bg-card rounded-lg border p-6 flex flex-col ${
                tier.tier === "coach"
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              <div className="text-center mb-4">
                <div className="mx-auto mb-3 w-fit">
                  {tier.tier === "coach" ? (
                    <Crown className="h-8 w-8 text-pr-gold" />
                  ) : (
                    <Dumbbell className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <h2 className="font-display font-bold text-xl text-foreground">{tier.name}</h2>
                <p className="font-display font-bold text-[32px] text-foreground leading-tight mt-1">
                  {tier.price}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.priceId && !isCurrentTier ? (
                <Button
                  className="w-full"
                  disabled={createCheckout.isPending}
                  onClick={() => handleUpgrade(tier.priceId!, tier.tier)}
                >
                  {createCheckout.isPending
                    ? "Redirecting..."
                    : "Start Free Trial"}
                </Button>
              ) : isCurrentTier ? (
                <Button className="w-full" variant="outline" disabled>
                  Current Plan
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
