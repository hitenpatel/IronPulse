import { describe, expect, it } from "vitest";
import {
  stravaWebhookSchema, garminWebhookSchema, ouraWebhookSchema,
  withingsWebhookSchema, polarWebhookSchema,
  stravaEventKey, garminEventKey, ouraEventKey,
  withingsEventKey, polarEventKey,
} from "../src/lib/webhook-schemas";

describe("stravaWebhookSchema", () => {
  it("accepts a well-formed create event", () => {
    expect(stravaWebhookSchema.safeParse({ object_type: "activity", aspect_type: "create", object_id: 42, owner_id: 7 }).success).toBe(true);
  });
  it("rejects missing owner_id", () => {
    expect(stravaWebhookSchema.safeParse({ object_type: "activity", aspect_type: "create", object_id: 42 }).success).toBe(false);
  });
});

describe("stravaEventKey", () => {
  it("maps owner_id -> providerAccountId and object_id -> externalId", () => {
    const p = stravaWebhookSchema.parse({ object_type: "activity", aspect_type: "create", object_id: 42, owner_id: 7 });
    expect(stravaEventKey(p)).toEqual({ providerAccountId: "7", externalId: "42" });
  });
});

describe("garminWebhookSchema", () => {
  it("accepts a batch, an empty batch, and a batchless payload", () => {
    expect(garminWebhookSchema.safeParse({ activityDetails: [{ userId: "u", activityId: 1 }] }).success).toBe(true);
    expect(garminWebhookSchema.safeParse({ activityDetails: [] }).success).toBe(true);
    expect(garminWebhookSchema.safeParse({}).success).toBe(true);
  });
  it("rejects an activity entry missing activityId", () => {
    expect(garminWebhookSchema.safeParse({ activityDetails: [{ userId: "u" }] }).success).toBe(false);
  });
});

describe("garminEventKey", () => {
  it("returns null providerAccountId (per-activity lookup happens in dispatcher) and null externalId (hash fallback)", () => {
    const p = garminWebhookSchema.parse({ activityDetails: [{ userId: "u1", activityId: 1 }] });
    expect(garminEventKey(p)).toEqual({ providerAccountId: null, externalId: null });
  });
  it("returns nulls for an empty batch too", () => {
    const p = garminWebhookSchema.parse({ activityDetails: [] });
    expect(garminEventKey(p)).toEqual({ providerAccountId: null, externalId: null });
  });
});

describe("ouraWebhookSchema", () => {
  it("accepts a sleep event", () => {
    expect(ouraWebhookSchema.safeParse({ event_type: "create", data_type: "sleep", user_id: "u1", event_date: "2026-09-06" }).success).toBe(true);
  });
  it("rejects missing event_date", () => {
    expect(ouraWebhookSchema.safeParse({ event_type: "create", data_type: "sleep", user_id: "u1" }).success).toBe(false);
  });
});

describe("ouraEventKey", () => {
  it("maps user_id -> providerAccountId and composes externalId from user_id, data_type, event_date", () => {
    const p = ouraWebhookSchema.parse({ event_type: "create", data_type: "sleep", user_id: "u1", event_date: "2026-09-06" });
    expect(ouraEventKey(p)).toEqual({ providerAccountId: "u1", externalId: "u1:sleep:2026-09-06" });
  });
});

describe("withingsWebhookSchema", () => {
  it("coerces appli/startdate/enddate from strings (form-urlencoded)", () => {
    const r = withingsWebhookSchema.safeParse({ userid: "42", appli: "1", startdate: "100", enddate: "200" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual({ userid: "42", appli: 1, startdate: 100, enddate: 200 });
  });
  it("rejects missing userid", () => {
    expect(withingsWebhookSchema.safeParse({ appli: 1, startdate: 0, enddate: 0 }).success).toBe(false);
  });
});

describe("withingsEventKey", () => {
  it("maps userid and returns null externalId (hash fallback)", () => {
    const p = withingsWebhookSchema.parse({ userid: "42", appli: 1, startdate: 100, enddate: 200 });
    expect(withingsEventKey(p)).toEqual({ providerAccountId: "42", externalId: null });
  });
});

describe("polarWebhookSchema", () => {
  it("accepts an EXERCISE event with all fields", () => {
    expect(polarWebhookSchema.safeParse({ event: "EXERCISE", user_id: "9", entity_id: "abc", timestamp: "t", url: "u" }).success).toBe(true);
  });
  it("rejects numeric user_id (current route treats user_id as string)", () => {
    expect(polarWebhookSchema.safeParse({ event: "EXERCISE", user_id: 9, entity_id: "abc", timestamp: "t", url: "u" }).success).toBe(false);
  });
});

describe("polarEventKey", () => {
  it("maps user_id -> providerAccountId and entity_id -> externalId", () => {
    const p = polarWebhookSchema.parse({ event: "EXERCISE", user_id: "9", entity_id: "abc", timestamp: "t", url: "u" });
    expect(polarEventKey(p)).toEqual({ providerAccountId: "9", externalId: "abc" });
  });
});
