import Stripe from "stripe";
import { db } from "@ironpulse/db";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;
      if (customerId) {
        const tier = session.metadata?.tier ?? "athlete";
        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "active", tier },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
      if (customerId) {
        const statusMap: Record<string, string> = {
          active: "active",
          trialing: "trialing",
          past_due: "past_due",
          canceled: "cancelled",
          unpaid: "past_due",
        };
        const status = statusMap[subscription.status] ?? "none";
        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: status },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id;
      if (customerId) {
        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "cancelled" },
        });
      }
      break;
    }
  }

  return Response.json({ received: true });
}
