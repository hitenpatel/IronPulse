import { describe, it, expect } from "vitest";
import {
  ResponseType,
  AuthRequest,
  useAutoDiscovery,
  makeRedirectUri,
} from "../auth-session";

describe("ResponseType", () => {
  it("has the correct Code value", () => {
    expect(ResponseType.Code).toBe("code");
  });

  it("has the correct Token value", () => {
    expect(ResponseType.Token).toBe("token");
  });

  it("has the correct IdToken value", () => {
    expect(ResponseType.IdToken).toBe("id_token");
  });
});

describe("AuthRequest", () => {
  const config = {
    clientId: "test-client",
    scopes: ["openid", "profile"],
    redirectUri: "ironpulse://redirect",
    responseType: ResponseType.Code,
  };

  it("stores the config on construction", () => {
    const req = new AuthRequest(config);
    expect(req.config).toBe(config);
  });

  it("promptAsync resolves with type cancel", async () => {
    const req = new AuthRequest(config);
    const result = await req.promptAsync(null);
    expect(result.type).toBe("cancel");
  });

  it("promptAsync resolves with empty params", async () => {
    const req = new AuthRequest(config);
    const result = await req.promptAsync(null);
    expect(result.params).toEqual({});
  });

  it("promptAsync resolves with a discovery document argument", async () => {
    const req = new AuthRequest(config);
    const discovery = {
      authorizationEndpoint: "https://example.com/auth",
      tokenEndpoint: "https://example.com/token",
    };
    const result = await req.promptAsync(discovery);
    expect(result.type).toBe("cancel");
  });

  it("promptAsync does not include an error field on cancel", async () => {
    const req = new AuthRequest(config);
    const result = await req.promptAsync(null);
    expect(result.error).toBeUndefined();
  });
});

describe("useAutoDiscovery", () => {
  it("returns a non-null discovery document", () => {
    const doc = useAutoDiscovery("https://accounts.google.com");
    expect(doc).not.toBeNull();
  });

  it("builds the authorizationEndpoint from the issuer", () => {
    const doc = useAutoDiscovery("https://accounts.google.com");
    expect(doc?.authorizationEndpoint).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
  });

  it("builds the tokenEndpoint from the issuer", () => {
    const doc = useAutoDiscovery("https://accounts.google.com");
    expect(doc?.tokenEndpoint).toBe("https://accounts.google.com/token");
  });

  it("handles an issuer with a path segment", () => {
    const doc = useAutoDiscovery("https://auth.example.com/realms/myrealm");
    expect(doc?.authorizationEndpoint).toBe(
      "https://auth.example.com/realms/myrealm/o/oauth2/v2/auth",
    );
    expect(doc?.tokenEndpoint).toBe(
      "https://auth.example.com/realms/myrealm/token",
    );
  });
});

describe("makeRedirectUri", () => {
  it("returns the default ironpulse://redirect when called with no options", () => {
    expect(makeRedirectUri()).toBe("ironpulse://redirect");
  });

  it("uses a custom scheme", () => {
    expect(makeRedirectUri({ scheme: "myapp" })).toBe("myapp://redirect");
  });

  it("uses a custom path", () => {
    expect(makeRedirectUri({ path: "auth/callback" })).toBe(
      "ironpulse://auth/callback",
    );
  });

  it("uses both custom scheme and path", () => {
    expect(makeRedirectUri({ scheme: "myapp", path: "oauth" })).toBe(
      "myapp://oauth",
    );
  });

  it("uses the default scheme when scheme is undefined", () => {
    expect(makeRedirectUri({ path: "done" })).toBe("ironpulse://done");
  });

  it("uses the default path when path is undefined", () => {
    expect(makeRedirectUri({ scheme: "pulse" })).toBe("pulse://redirect");
  });
});
