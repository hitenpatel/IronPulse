import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  defineTask,
  isTaskRegisteredAsync,
  unregisterAllTasksAsync,
  unregisterTaskAsync,
} from "../task-manager";

beforeEach(async () => {
  await unregisterAllTasksAsync();
});

describe("defineTask", () => {
  it("registers a task so it is subsequently found by isTaskRegisteredAsync", async () => {
    defineTask("my-task", async () => {});
    expect(await isTaskRegisteredAsync("my-task")).toBe(true);
  });

  it("overwrites an existing registration when called again with the same name", async () => {
    const first = vi.fn();
    const second = vi.fn();
    defineTask("my-task", first);
    defineTask("my-task", second);
    expect(await isTaskRegisteredAsync("my-task")).toBe(true);
  });

  it("registers multiple tasks independently", async () => {
    defineTask("task-a", async () => {});
    defineTask("task-b", async () => {});
    expect(await isTaskRegisteredAsync("task-a")).toBe(true);
    expect(await isTaskRegisteredAsync("task-b")).toBe(true);
  });
});

describe("isTaskRegisteredAsync", () => {
  it("returns false for an unknown task name", async () => {
    expect(await isTaskRegisteredAsync("not-registered")).toBe(false);
  });

  it("returns true after the task is registered", async () => {
    defineTask("check-task", async () => {});
    expect(await isTaskRegisteredAsync("check-task")).toBe(true);
  });

  it("returns false after the task has been unregistered", async () => {
    defineTask("ephemeral", async () => {});
    await unregisterTaskAsync("ephemeral");
    expect(await isTaskRegisteredAsync("ephemeral")).toBe(false);
  });
});

describe("unregisterTaskAsync", () => {
  it("removes the named task", async () => {
    defineTask("to-remove", async () => {});
    await unregisterTaskAsync("to-remove");
    expect(await isTaskRegisteredAsync("to-remove")).toBe(false);
  });

  it("does not affect other registered tasks", async () => {
    defineTask("keep", async () => {});
    defineTask("drop", async () => {});
    await unregisterTaskAsync("drop");
    expect(await isTaskRegisteredAsync("keep")).toBe(true);
    expect(await isTaskRegisteredAsync("drop")).toBe(false);
  });

  it("does not throw when called for a task that was never registered", async () => {
    await expect(unregisterTaskAsync("ghost")).resolves.toBeUndefined();
  });
});

describe("unregisterAllTasksAsync", () => {
  it("clears all registered tasks", async () => {
    defineTask("alpha", async () => {});
    defineTask("beta", async () => {});
    await unregisterAllTasksAsync();
    expect(await isTaskRegisteredAsync("alpha")).toBe(false);
    expect(await isTaskRegisteredAsync("beta")).toBe(false);
  });

  it("is idempotent when called with no registered tasks", async () => {
    await expect(unregisterAllTasksAsync()).resolves.toBeUndefined();
    await expect(unregisterAllTasksAsync()).resolves.toBeUndefined();
  });
});
