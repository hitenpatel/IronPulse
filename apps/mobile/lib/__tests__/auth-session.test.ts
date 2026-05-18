import { describe, it, expect } from "vitest";
import {
  ResponseType,
  AuthRequest,
  useAutoDiscovery,
  makeRedirectUri,
  type AuthRequestConfig,
  type DiscoveryDocument,
} from "../auth-session";

describe("ResponseType", () => {
  it("Code is the string 'code'", () => {
    expect(ResponseType.Code).toBe("code");
  });

  it("Token is the string 'token'", () => {
    expect(ResponseType.Token).toBe("token");
  });

  it("IdToken is the string 'id_token'", () => {
    expect(ResponseType.IdToken).toBe("id_token");
  });
});

describe("AuthRequest", () => {
  it("stores the config on the instance", () => {
    const config: AuthRequestConfig = { clientId: "my-client", scopes: ["openid"] };
    const req = new AuthRequest(config);
    expect(req.config).toBe(config);
  });

  it("promptAsync resolves with type cancel", async () => {
    const req = new AuthRequest({ clientId: "my-client" });
    const result = await req.promptAsync(null);
    expect(result.type).toBe("cancel");
  });

  it("promptAsync resolves with an empty params object", async () => {
    const req = new AuthRequest({ clientId: "my-client" });
    const result = await req.promptAsync(null);
    expect(result.params).toEqual({});
  });

  it("promptAsync resolves with cancel even when a discovery document is supplied", async () => {
    const req = new AuthRequest({ clientId: "my-client" });
    const discovery: DiscoveryDocument = {
      authorizationEndpoint: "https://example.com/auth",
      tokenEndpoint: "https://example.com/token",
    };
    const result = await req.promptAsync(discovery);
    expect(result.type).toBe("cancel");
  });
});

describe("useAutoDiscovery", () => {
  it("returns a non-null discovery document", () => {
    expect(useAutoDiscovery("https://accounts.example.com")).not.toBeNull();
  });

  it("constructs authorizationEndpoint from the issuer", () => {
    const doc = useAutoDiscovery("https://accounts.google.com");
    expect(doc?.authorizationEndpoint).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
  });

  it("constructs tokenEndpoint from the issuer", () => {
    const doc = useAutoDiscovery("https://accounts.google.com");
    expect(doc?.tokenEndpoint).toBe("https://accounts.google.com/token");
  });

  it("works for arbitrary issuers", () => {
    const doc = useAutoDiscovery("https://sso.mycompany.internal");
    expect(doc?.authorizationEndpoint).toBe(
      "https://sso.mycompany.internal/o/oauth2/v2/auth",
    );
    expect(doc?.tokenEndpoint).toBe("https://sso.mycompany.internal/token");
  });
});

describe("makeRedirectUri", () => {
  it("defaults to ironpulse://redirect with no options", () => {
    expect(makeRedirectUri()).toBe("ironpulse://redirect");
  });

  it("uses a custom scheme when provided", () => {
    expect(makeRedirectUri({ scheme: "myapp" })).toBe("myapp://redirect");
  });

  it("uses a custom path when provided", () => {
    expect(makeRedirectUri({ path: "callback" })).toBe("ironpulse://callback");
  });

  it("combines custom scheme and path", () => {
    expect(makeRedirectUri({ scheme: "myapp", path: "oauth" })).toBe(
      "myapp://oauth",
    );
  });

  it("returns an empty-options call identically to no-args call", () => {
    expect(makeRedirectUri({})).toBe(makeRedirectUri());
  });
});
