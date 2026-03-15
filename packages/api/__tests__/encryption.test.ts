import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "../src/lib/encryption";

describe("token encryption", () => {
  it("round-trips: encrypt then decrypt returns original", () => {
    const original = "sk_test_abc123_very_secret_token";
    const encrypted = encryptToken(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("produces different ciphertext for same plaintext (random IV)", () => {
    const a = encryptToken("same");
    const b = encryptToken("same");
    expect(a).not.toBe(b);
  });

  it("ciphertext has three colon-separated hex parts", () => {
    const parts = encryptToken("test").split(":");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(/^[0-9a-f]+$/.test(p)).toBe(true));
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("test");
    const tampered = encrypted.slice(0, -2) + "ff";
    expect(() => decryptToken(tampered)).toThrow();
  });
});
