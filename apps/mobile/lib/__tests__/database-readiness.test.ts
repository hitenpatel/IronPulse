import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DATABASE_MIGRATION_OPTIONS,
  ensureDatabaseReady,
  resetDatabaseReadinessForTests,
  type DatabaseFilesAdapter,
  type DatabaseMigrationProgress,
  type DatabaseMigrationResult,
} from "../database-readiness";

function result(overrides: Partial<DatabaseMigrationResult> = {}): DatabaseMigrationResult {
  return {
    databaseName: "zor.db",
    migrated: false,
    integrity: "ok",
    pendingUploadRows: 0,
    ...overrides,
  };
}

function adapterWith(value: DatabaseMigrationResult): DatabaseFilesAdapter {
  return { ensureReady: vi.fn().mockResolvedValue(value) };
}

describe("ensureDatabaseReady", () => {
  beforeEach(() => resetDatabaseReadinessForTests());

  it.each([
    ["fresh install", result()],
    ["old database only", result({ migrated: true, pendingUploadRows: 3 })],
    ["valid destination only", result({ pendingUploadRows: 2 })],
    ["both names with valid destination", result({ pendingUploadRows: 4 })],
    ["old database with WAL/SHM", result({ migrated: true, pendingUploadRows: 5 })],
    ["interrupted promotion", result({ migrated: true, pendingUploadRows: 1 })],
  ])("returns zor.db for %s", async (_label, migrationResult) => {
    const adapter = adapterWith(migrationResult);

    await expect(ensureDatabaseReady(adapter)).resolves.toBe("zor.db");
    expect(adapter.ensureReady).toHaveBeenCalledWith(DATABASE_MIGRATION_OPTIONS);
  });

  it.each(["invalid destination", "copy failure", "busy WAL checkpoint"])(
    "rejects %s without constructing PowerSync",
    async (message) => {
      const adapter: DatabaseFilesAdapter = {
        ensureReady: vi.fn().mockRejectedValue(new Error(message)),
      };
      const openPowerSync = vi.fn();

      await expect(
        ensureDatabaseReady(adapter).then(openPowerSync),
      ).rejects.toThrow(message);
      expect(openPowerSync).not.toHaveBeenCalled();
    },
  );

  it("shares one native migration across concurrent and repeated callers", async () => {
    let release: ((value: DatabaseMigrationResult) => void) | undefined;
    const adapter: DatabaseFilesAdapter = {
      ensureReady: vi.fn(() => new Promise<DatabaseMigrationResult>((resolve) => { release = resolve; })),
    };

    const first = ensureDatabaseReady(adapter);
    const second = ensureDatabaseReady(adapter);
    release?.(result({ migrated: true }));

    await expect(Promise.all([first, second])).resolves.toEqual(["zor.db", "zor.db"]);
    await expect(ensureDatabaseReady(adapter)).resolves.toBe("zor.db");
    expect(adapter.ensureReady).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid native results and permits a clean retry", async () => {
    const adapter: DatabaseFilesAdapter = {
      ensureReady: vi.fn()
        .mockResolvedValueOnce({ ...result(), integrity: "corrupt" } as never)
        .mockResolvedValueOnce(result()),
    };

    await expect(ensureDatabaseReady(adapter)).rejects.toThrow("integrity");
    await expect(ensureDatabaseReady(adapter)).resolves.toBe("zor.db");
    expect(adapter.ensureReady).toHaveBeenCalledTimes(2);
  });

  it("forwards monotonic multi-chunk progress without blocking the event loop", async () => {
    const progress: DatabaseMigrationProgress[] = [];
    let heartbeat = false;
    const adapter: DatabaseFilesAdapter = {
      async ensureReady(_options, onProgress) {
        for (const bytesCopied of [0, 256, 512, 1024]) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          onProgress?.({ phase: "copy", bytesCopied, totalBytes: 1024 });
        }
        return result({ migrated: true });
      },
    };
    setTimeout(() => { heartbeat = true; }, 0);

    await ensureDatabaseReady(adapter, (event) => progress.push(event));

    expect(heartbeat).toBe(true);
    expect(progress.map((event) => event.bytesCopied)).toEqual([0, 256, 512, 1024]);
    expect(progress.at(-1)).toMatchObject({ bytesCopied: 1024, totalBytes: 1024 });
  });
});
