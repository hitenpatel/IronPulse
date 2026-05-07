import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDbInstance = { name: "mock-db" };
const MockPowerSyncDatabase = vi.fn(() => mockDbInstance);
const MockWASQLiteOpenFactory = vi.fn();

vi.mock("@powersync/web", () => ({
  PowerSyncDatabase: MockPowerSyncDatabase,
  WASQLiteOpenFactory: MockWASQLiteOpenFactory,
}));

vi.mock("@ironpulse/sync", () => ({
  AppSchema: { tables: [] },
}));

beforeEach(() => {
  vi.resetModules();
  MockPowerSyncDatabase.mockClear();
  MockWASQLiteOpenFactory.mockClear();
});

async function importFresh() {
  const mod = await import("../powersync/system");
  return mod;
}

describe("getPowerSyncDatabase", () => {
  it("returns a PowerSyncDatabase instance", async () => {
    const { getPowerSyncDatabase } = await importFresh();
    const db = getPowerSyncDatabase();
    expect(MockPowerSyncDatabase).toHaveBeenCalledOnce();
    expect(db).toBe(mockDbInstance);
  });

  it("returns the same instance on subsequent calls (singleton)", async () => {
    const { getPowerSyncDatabase } = await importFresh();
    const first = getPowerSyncDatabase();
    const second = getPowerSyncDatabase();
    expect(first).toBe(second);
    expect(MockPowerSyncDatabase).toHaveBeenCalledOnce();
  });

  it("configures WASQLiteOpenFactory with correct dbFilename and worker path", async () => {
    const { getPowerSyncDatabase } = await importFresh();
    getPowerSyncDatabase();
    expect(MockWASQLiteOpenFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        dbFilename: "ironpulse.db",
        worker: "/@powersync/worker/WASQLiteDB.umd.js",
      })
    );
  });

  it("passes AppSchema and disableSSRWarning to PowerSyncDatabase", async () => {
    const { AppSchema } = await import("@ironpulse/sync");
    const { getPowerSyncDatabase } = await importFresh();
    getPowerSyncDatabase();
    expect(MockPowerSyncDatabase).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: AppSchema,
        flags: { disableSSRWarning: true },
        sync: { worker: "/@powersync/worker/SharedSyncImplementation.umd.js" },
      })
    );
  });

  it("sets enableMultiTabs to true when SharedWorker is defined", async () => {
    (globalThis as any).SharedWorker = class {};
    const { getPowerSyncDatabase } = await importFresh();
    getPowerSyncDatabase();
    expect(MockWASQLiteOpenFactory).toHaveBeenCalledWith(
      expect.objectContaining({ flags: { enableMultiTabs: true } })
    );
    delete (globalThis as any).SharedWorker;
  });

  it("sets enableMultiTabs to false when SharedWorker is undefined", async () => {
    delete (globalThis as any).SharedWorker;
    const { getPowerSyncDatabase } = await importFresh();
    getPowerSyncDatabase();
    expect(MockWASQLiteOpenFactory).toHaveBeenCalledWith(
      expect.objectContaining({ flags: { enableMultiTabs: false } })
    );
  });
});
