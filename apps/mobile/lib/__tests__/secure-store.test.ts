import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetGenericPassword, mockSetGenericPassword, mockResetGenericPassword } =
  vi.hoisted(() => ({
    mockGetGenericPassword: vi.fn(),
    mockSetGenericPassword: vi.fn(),
    mockResetGenericPassword: vi.fn(),
  }));

vi.mock("react-native-keychain", () => ({
  getGenericPassword: mockGetGenericPassword,
  setGenericPassword: mockSetGenericPassword,
  resetGenericPassword: mockResetGenericPassword,
}));

import { getItemAsync, setItemAsync, deleteItemAsync } from "../secure-store";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getItemAsync", () => {
  it("returns the password when keychain finds a match", async () => {
    mockGetGenericPassword.mockResolvedValue({ username: "key", password: "secret" });

    const result = await getItemAsync("token");

    expect(result).toBe("secret");
  });

  it("returns null when keychain returns false (no stored value)", async () => {
    mockGetGenericPassword.mockResolvedValue(false);

    const result = await getItemAsync("token");

    expect(result).toBeNull();
  });

  it("returns null when keychain returns an object with empty password", async () => {
    mockGetGenericPassword.mockResolvedValue({ username: "key", password: "" });

    const result = await getItemAsync("token");

    expect(result).toBeNull();
  });

  it("returns null when keychain throws", async () => {
    mockGetGenericPassword.mockRejectedValue(new Error("keychain locked"));

    const result = await getItemAsync("token");

    expect(result).toBeNull();
  });

  it("passes the key with ironpulse_ prefix as the service name", async () => {
    mockGetGenericPassword.mockResolvedValue(false);

    await getItemAsync("my_key");

    expect(mockGetGenericPassword).toHaveBeenCalledWith({ service: "ironpulse_my_key" });
  });
});

describe("setItemAsync", () => {
  it("calls setGenericPassword with the key, value, and prefixed service", async () => {
    mockSetGenericPassword.mockResolvedValue(true);

    await setItemAsync("auth_token", "abc123");

    expect(mockSetGenericPassword).toHaveBeenCalledWith("auth_token", "abc123", {
      service: "ironpulse_auth_token",
    });
  });

  it("uses ironpulse_ prefix in the service option", async () => {
    mockSetGenericPassword.mockResolvedValue(true);

    await setItemAsync("session", "xyz");

    expect(mockSetGenericPassword).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ service: "ironpulse_session" }),
    );
  });
});

describe("deleteItemAsync", () => {
  it("calls resetGenericPassword with the prefixed service name", async () => {
    mockResetGenericPassword.mockResolvedValue(true);

    await deleteItemAsync("auth_token");

    expect(mockResetGenericPassword).toHaveBeenCalledWith({ service: "ironpulse_auth_token" });
  });

  it("uses ironpulse_ prefix in the service option", async () => {
    mockResetGenericPassword.mockResolvedValue(true);

    await deleteItemAsync("refresh_token");

    expect(mockResetGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({ service: "ironpulse_refresh_token" }),
    );
  });
});
