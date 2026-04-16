import { describe, it, expect, vi } from "vitest";

vi.mock("@simplewebauthn/browser", () => ({
  startRegistration: vi.fn().mockResolvedValue({ id: "cred-1", type: "public-key" }),
  startAuthentication: vi.fn().mockResolvedValue({ id: "auth-1", type: "public-key" }),
}));

import { registerPasskey, authenticatePasskey } from "../passkey";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

describe("registerPasskey", () => {
  it("delegates to startRegistration with optionsJSON", async () => {
    const options = { rp: { name: "IronPulse" } } as any;
    const result = await registerPasskey(options);

    expect(startRegistration).toHaveBeenCalledWith({ optionsJSON: options });
    expect(result).toEqual({ id: "cred-1", type: "public-key" });
  });
});

describe("authenticatePasskey", () => {
  it("delegates to startAuthentication with optionsJSON", async () => {
    const options = { rpId: "localhost" } as any;
    const result = await authenticatePasskey(options);

    expect(startAuthentication).toHaveBeenCalledWith({ optionsJSON: options });
    expect(result).toEqual({ id: "auth-1", type: "public-key" });
  });
});
