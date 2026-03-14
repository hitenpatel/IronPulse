import { TRPCError } from "@trpc/server";
import {
  createCheckoutSessionSchema,
  createPortalSessionSchema,
} from "@ironpulse/shared";
import { getStripe } from "../lib/stripe";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const stripeRouter = createTRPCRouter({
  createCheckoutSession: protectedProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { stripeCustomerId: true, email: true, subscriptionStatus: true },
      });

      if (user.subscriptionStatus === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have an active subscription",
        });
      }

      let customerId = user.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: ctx.user.id },
        });
        customerId = customer.id;

        await ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: input.priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        subscription_data: {
          trial_period_days: 14,
          metadata: { userId: ctx.user.id },
        },
      });

      return { url: session.url };
    }),

  createPortalSession: protectedProcedure
    .input(createPortalSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const user = await ctx.db.user.findUniqueOrThrow({
        where: { id: ctx.user.id },
        select: { stripeCustomerId: true },
      });

      if (!user.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No billing account found",
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: input.returnUrl,
      });

      return { url: session.url };
    }),
});
