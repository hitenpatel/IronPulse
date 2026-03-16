import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  tier: z.enum(["athlete", "coach"]).optional(),
});

export const createPortalSessionSchema = z.object({
  returnUrl: z.string().url(),
});
