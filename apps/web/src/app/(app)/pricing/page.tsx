"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <h1 className="text-2xl font-bold">Plans & Pricing</h1>
        <p className="mt-1 text-muted-foreground">
          Choose the plan that fits your needs
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 max-w-2xl mx-auto">
        {tiers.map((tier) => {
          const isCurrentTier = currentTier === tier.tier;

          return (
            <Card
              key={tier.name}
              className={
                tier.tier === "coach" ? "border-primary" : undefined
              }
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-2">
                  {tier.tier === "coach" ? (
                    <Crown className="h-8 w-8 text-amber-500" />
                  ) : (
                    <Dumbbell className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <CardTitle>{tier.name}</CardTitle>
                <p className="text-2xl font-bold">{tier.price}</p>
                <p className="text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
