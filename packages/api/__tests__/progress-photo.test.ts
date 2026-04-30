import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@ironpulse/db";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser, cleanupTestData } from "./helpers";
import { progressPhotoRouter } from "../src/routers/progress-photo";

vi.mock("../src/lib/s3", () => ({
  getPresignedUploadUrl: vi.fn().mockResolvedValue("https://s3.example.com/upload"),
  getPresignedDownloadUrl: vi.fn().mockResolvedValue("https://s3.example.com/download"),
}));

const db = new PrismaClient();
const createCaller = createCallerFactory(progressPhotoRouter);

function photoCaller(session: { user: any } | null = null) {
  return createCaller(createTRPCContext({ db, session }));
}

let testUser: ReturnType<typeof createTestUser>;

beforeAll(async () => {
  await db.$connect();
});

afterAll(async () => {
  await db.$disconnect();
});

beforeEach(async () => {
  await cleanupTestData(db);
  testUser = createTestUser({ email: "photo@test.com" });
  await db.user.create({
    data: { id: testUser.id, email: testUser.email, name: testUser.name },
  });
});

describe("progressPhoto.getUploadUrl", () => {
  it("returns a presigned upload URL and a storage key", async () => {
    const caller = photoCaller({ user: testUser });
    const result = await caller.getUploadUrl({ contentType: "image/jpeg" });

    expect(result.uploadUrl).toBe("https://s3.example.com/upload");
    expect(result.photoUrl).toMatch(
      new RegExp(`^progress-photos/${testUser.id}/\\d+\\.jpeg$`)
    );
  });

  it("derives the extension from the content type", async () => {
    const caller = photoCaller({ user: testUser });
    const result = await caller.getUploadUrl({ contentType: "image/png" });

    expect(result.photoUrl).toMatch(/\.png$/);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = photoCaller();
    await expect(
      caller.getUploadUrl({ contentType: "image/jpeg" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("progressPhoto.create", () => {
  it("creates a progress photo record", async () => {
    const caller = photoCaller({ user: testUser });
    const result = await caller.create({
      photoUrl: "progress-photos/user123/1234567890.jpg",
      date: "2026-04-01",
    });

    expect(result.userId).toBe(testUser.id);
    expect(result.photoUrl).toBe("progress-photos/user123/1234567890.jpg");
  });

  it("stores an optional note", async () => {
    const caller = photoCaller({ user: testUser });
    const result = await caller.create({
      photoUrl: "progress-photos/user123/note.jpg",
      date: "2026-04-01",
      notes: "Looking good",
    });

    expect(result.notes).toBe("Looking good");
  });

  it("rejects unauthenticated calls", async () => {
    const caller = photoCaller();
    await expect(
      caller.create({ photoUrl: "x.jpg", date: "2026-04-01" })
    ).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("progressPhoto.list", () => {
  it("returns photos with presigned download URLs", async () => {
    const caller = photoCaller({ user: testUser });
    await caller.create({ photoUrl: "progress-photos/user/a.jpg", date: "2026-03-01" });
    await caller.create({ photoUrl: "progress-photos/user/b.jpg", date: "2026-04-01" });

    const result = await caller.list();

    expect(result.length).toBe(2);
    expect(result[0]!.imageUrl).toBe("https://s3.example.com/download");
  });

  it("does not return photos belonging to another user", async () => {
    const other = createTestUser({ email: "other-photo@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: other.id, email: other.email, name: other.name } });
    await db.progressPhoto.create({
      data: { userId: other.id, photoUrl: "other.jpg", date: new Date() },
    });

    const caller = photoCaller({ user: testUser });
    const result = await caller.list();

    expect(result.length).toBe(0);
  });

  it("rejects unauthenticated calls", async () => {
    const caller = photoCaller();
    await expect(caller.list()).rejects.toThrow("UNAUTHORIZED");
  });
});

describe("progressPhoto.delete", () => {
  it("deletes a photo by id", async () => {
    const caller = photoCaller({ user: testUser });
    const photo = await caller.create({
      photoUrl: "progress-photos/user/del.jpg",
      date: "2026-04-01",
    });

    const result = await caller.delete({ id: photo.id });

    expect(result.success).toBe(true);
    const gone = await db.progressPhoto.findUnique({ where: { id: photo.id } });
    expect(gone).toBeNull();
  });

  it("silently succeeds when deleting a non-existent id", async () => {
    const caller = photoCaller({ user: testUser });
    const result = await caller.delete({ id: crypto.randomUUID() });

    expect(result.success).toBe(true);
  });

  it("does not delete another user's photo", async () => {
    const other = createTestUser({ email: "other2-photo@test.com", id: crypto.randomUUID() });
    await db.user.create({ data: { id: other.id, email: other.email, name: other.name } });
    const photo = await db.progressPhoto.create({
      data: { userId: other.id, photoUrl: "protected.jpg", date: new Date() },
    });

    const caller = photoCaller({ user: testUser });
    await caller.delete({ id: photo.id });

    const still = await db.progressPhoto.findUnique({ where: { id: photo.id } });
    expect(still).not.toBeNull();
  });

  it("rejects unauthenticated calls", async () => {
    const caller = photoCaller();
    await expect(caller.delete({ id: crypto.randomUUID() })).rejects.toThrow("UNAUTHORIZED");
  });
});
