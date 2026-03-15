import { describe, it, expect } from "vitest";
import { BackendConnector } from "../connector";

describe("BackendConnector", () => {
  it("implements PowerSyncBackendConnector interface", () => {
    const connector = new BackendConnector();
    expect(typeof connector.fetchCredentials).toBe("function");
    expect(typeof connector.uploadData).toBe("function");
  });
});
