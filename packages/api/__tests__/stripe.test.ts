import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createTRPCContext, createCallerFactory } from "../src/trpc";
import { createTestUser } from "./helpers";
import { stripeRouter } from "../src/routers/stripe";

// ---------------------------------------------------------------------------
// Mock Stripe SDK
// ---------------------------------------------------------------------------
const mockCustomersCreate = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    customers: { create: mockCustomersCreate },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    billingPortal: { sessions: { create: mockBillingPortalSessionsCreate } },
    webhooks: { constructEvent: mockWebhooksConstructEvent },
  }));
  return { default: StripeMock };
});

// ---------------------------------------------------------------------------
// DB + tRPC caller
// ---------------------------------------------------------------------------
const db = new PrismaClient();
const createCaller = createCallerFactory(stripeRouter);

function stripeCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await db.account.deleteMany();
  await db.user.deleteMany();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// tRPC: createCheckoutSession
// ---------------------------------------------------------------------------
describe("stripe.createCheckoutSession", () => {
  it("creates a Stripe customer and checkout session for a new user", async () => {
    const dbUser = await db.user.create({
      data: { email: "checkout@example.com", name: "Checkout User" },
    });

    mockCustomersCreate.mockResolvedValue({ id: "cus_test123" });
    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session_abc",
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = stripeCaller({ user: session });

    const result = await caller.createCheckoutSession({
      priceId: "price_athlete_monthly",
      successUrl: "https://app.ironpulse.com/success",
      cancelUrl: "https://app.ironpulse.com/cancel",
      tier: "athlete",
    });

    expect(result.url).toBe("https://checkout.stripe.com/session_abc");

    // Should have created a Stripe customer
    expect(mockCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "checkout@example.com",
        metadata: { userId: dbUser.id },
      }),
    );

    // Should have created a checkout session with the right params
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test123",
        mode: "subscription",
        line_items: [{ price: "price_athlete_monthly", quantity: 1 }],
        success_url: "https://app.ironpulse.com/success",
        cancel_url: "https://app.ironpulse.com/cancel",
      }),
    );

    // Verify stripeCustomerId was persisted to DB
    const updatedUser = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updatedUser.stripeCustomerId).toBe("cus_test123");
  });

  it("reuses an existing Stripe customer ID", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "existing@example.com",
        name: "Existing",
        stripeCustomerId: "cus_existing",
      },
    });

    mockCheckoutSessionsCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/reuse",
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = stripeCaller({ user: session });

    await caller.createCheckoutSession({
      priceId: "price_coach_monthly",
      successUrl: "https://app.ironpulse.com/success",
      cancelUrl: "https://app.ironpulse.com/cancel",
      tier: "coach",
    });

    // Should NOT have created a new customer
    expect(mockCustomersCreate).not.toHaveBeenCalled();

    // Should have used the existing customer ID
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("rejects if user already has an active subscription", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "active@example.com",
        name: "Active Sub",
        subscriptionStatus: "active",
      },
    });

    const session = createTestUser({
      id: dbUser.id,
      email: dbUser.email,
      subscriptionStatus: "active",
    });
    const caller = stripeCaller({ user: session });

    await expect(
      caller.createCheckoutSession({
        priceId: "price_test",
        successUrl: "https://app.ironpulse.com/success",
        cancelUrl: "https://app.ironpulse.com/cancel",
      }),
    ).rejects.toThrow("You already have an active subscription");
  });

  it("rejects unauthenticated requests", async () => {
    const caller = stripeCaller();
    await expect(
      caller.createCheckoutSession({
        priceId: "price_test",
        successUrl: "https://app.ironpulse.com/success",
        cancelUrl: "https://app.ironpulse.com/cancel",
      }),
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

// ---------------------------------------------------------------------------
// tRPC: createPortalSession
// ---------------------------------------------------------------------------
describe("stripe.createPortalSession", () => {
  it("creates a billing portal session", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "portal@example.com",
        name: "Portal User",
        stripeCustomerId: "cus_portal",
      },
    });

    mockBillingPortalSessionsCreate.mockResolvedValue({
      url: "https://billing.stripe.com/portal_abc",
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = stripeCaller({ user: session });

    const result = await caller.createPortalSession({
      returnUrl: "https://app.ironpulse.com/settings",
    });

    expect(result.url).toBe("https://billing.stripe.com/portal_abc");
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
      customer: "cus_portal",
      return_url: "https://app.ironpulse.com/settings",
    });
  });

  it("rejects when user has no Stripe customer", async () => {
    const dbUser = await db.user.create({
      data: { email: "nocust@example.com", name: "No Customer" },
    });

    const session = createTestUser({ id: dbUser.id, email: dbUser.email });
    const caller = stripeCaller({ user: session });

    await expect(
      caller.createPortalSession({
        returnUrl: "https://app.ironpulse.com/settings",
      }),
    ).rejects.toThrow("No billing account found");
  });
});

// ---------------------------------------------------------------------------
// Webhook handler
// ---------------------------------------------------------------------------
describe("Stripe webhook handler", () => {
  // We import the POST handler dynamically so the Stripe mock is active
  let POST: (request: Request) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import(
      "../../../apps/web/src/app/api/stripe/webhook/route"
    );
    POST = mod.POST;
  });

  beforeEach(async () => {
    await db.account.deleteMany();
    await db.user.deleteMany();
    vi.clearAllMocks();
  });

  function webhookRequest(body: string, signature = "sig_valid") {
    return new Request("https://app.ironpulse.com/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": signature },
      body,
    });
  }

  // -- Signature validation ------------------------------------------------

  it("rejects requests without a stripe-signature header", async () => {
    const req = new Request(
      "https://app.ironpulse.com/api/stripe/webhook",
      { method: "POST", body: "{}" },
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing signature");
  });

  it("rejects requests with an invalid signature", async () => {
    mockWebhooksConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(webhookRequest("{}", "sig_bad"));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid signature");
  });

  // -- checkout.session.completed ------------------------------------------

  it("upgrades user on checkout.session.completed", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "webhook@example.com",
        name: "Webhook User",
        stripeCustomerId: "cus_hook",
      },
    });

    mockWebhooksConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_hook",
          metadata: { tier: "coach" },
        },
      },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updated.subscriptionStatus).toBe("active");
    expect(updated.tier).toBe("coach");
  });

  it("defaults to athlete tier when metadata.tier is absent", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "default-tier@example.com",
        name: "Default Tier",
        stripeCustomerId: "cus_default",
      },
    });

    mockWebhooksConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_default",
          metadata: {},
        },
      },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updated.tier).toBe("athlete");
  });

  // -- customer.subscription.updated ---------------------------------------

  it("updates subscription status on customer.subscription.updated", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "subupdate@example.com",
        name: "Sub Update",
        stripeCustomerId: "cus_update",
        subscriptionStatus: "active",
      },
    });

    mockWebhooksConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_update",
          status: "past_due",
        },
      },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updated.subscriptionStatus).toBe("past_due");
  });

  it("maps trialing status correctly", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "trial@example.com",
        name: "Trial User",
        stripeCustomerId: "cus_trial",
      },
    });

    mockWebhooksConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          customer: "cus_trial",
          status: "trialing",
        },
      },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updated.subscriptionStatus).toBe("trialing");
  });

  // -- customer.subscription.deleted ---------------------------------------

  it("downgrades user on customer.subscription.deleted", async () => {
    const dbUser = await db.user.create({
      data: {
        email: "cancel@example.com",
        name: "Cancel User",
        stripeCustomerId: "cus_cancel",
        subscriptionStatus: "active",
      },
    });

    mockWebhooksConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          customer: "cus_cancel",
        },
      },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({
      where: { id: dbUser.id },
    });
    expect(updated.subscriptionStatus).toBe("cancelled");
  });

  // -- Valid signature processes event -------------------------------------

  it("returns { received: true } for a valid but unhandled event type", async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: { object: {} },
    });

    const res = await POST(webhookRequest("{}"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
