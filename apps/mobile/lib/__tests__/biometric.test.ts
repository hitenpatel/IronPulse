import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockHasHardwareAsync,
  mockIsEnrolledAsync,
  mockSupportedAuthenticationTypesAsync,
  mockAuthenticateAsync,
  mockGetItemAsync,
  mockSetItemAsync,
  mockDeleteItemAsync,
} = vi.hoisted(() => ({
  mockHasHardwareAsync: vi.fn(),
  mockIsEnrolledAsync: vi.fn(),
  mockSupportedAuthenticationTypesAsync: vi.fn(),
  mockAuthenticateAsync: vi.fn(),
  mockGetItemAsync: vi.fn(),
  mockSetItemAsync: vi.fn(),
  mockDeleteItemAsync: vi.fn(),
}));

vi.mock("@/lib/biometric-native", () => ({
  hasHardwareAsync: mockHasHardwareAsync,
  isEnrolledAsync: mockIsEnrolledAsync,
  supportedAuthenticationTypesAsync: mockSupportedAuthenticationTypesAsync,
  authenticateAsync: mockAuthenticateAsync,
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

vi.mock("@/lib/secure-store", () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
}));

import {
  isBiometricAvailable,
  getBiometricLabel,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  authenticateWithBiometric,
} from "../biometric";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isBiometricAvailable", () => {
  it("returns false when hardware is unavailable", async () => {
    mockHasHardwareAsync.mockResolvedValue(false);
    expect(await isBiometricAvailable()).toBe(false);
    expect(mockIsEnrolledAsync).not.toHaveBeenCalled();
  });

  it("returns false when hardware present but not enrolled", async () => {
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(false);
    expect(await isBiometricAvailable()).toBe(false);
  });

  it("returns true when hardware present and enrolled", async () => {
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    expect(await isBiometricAvailable()).toBe(true);
  });
});

describe("getBiometricLabel", () => {
  it("returns 'Face ID' when FACIAL_RECOGNITION is supported", async () => {
    mockSupportedAuthenticationTypesAsync.mockResolvedValue([2]);
    expect(await getBiometricLabel()).toBe("Face ID");
  });

  it("returns 'Touch ID' when only FINGERPRINT is supported", async () => {
    mockSupportedAuthenticationTypesAsync.mockResolvedValue([1]);
    expect(await getBiometricLabel()).toBe("Touch ID");
  });

  it("returns 'Biometric' when no recognized type is present", async () => {
    mockSupportedAuthenticationTypesAsync.mockResolvedValue([3]);
    expect(await getBiometricLabel()).toBe("Biometric");
  });

  it("prefers Face ID when both FINGERPRINT and FACIAL_RECOGNITION are present", async () => {
    mockSupportedAuthenticationTypesAsync.mockResolvedValue([1, 2]);
    expect(await getBiometricLabel()).toBe("Face ID");
  });
});

describe("isBiometricEnabled", () => {
  it("returns true when store contains 'true'", async () => {
    mockGetItemAsync.mockResolvedValue("true");
    expect(await isBiometricEnabled()).toBe(true);
  });

  it("returns false when store contains another string", async () => {
    mockGetItemAsync.mockResolvedValue("false");
    expect(await isBiometricEnabled()).toBe(false);
  });

  it("returns false when store returns null", async () => {
    mockGetItemAsync.mockResolvedValue(null);
    expect(await isBiometricEnabled()).toBe(false);
  });
});

describe("enableBiometric", () => {
  it("saves 'true' to store and returns true on successful auth", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    mockSetItemAsync.mockResolvedValue(undefined);

    const result = await enableBiometric();

    expect(result).toBe(true);
    expect(mockSetItemAsync).toHaveBeenCalledWith("biometric-enabled", "true");
  });

  it("returns false without saving when auth fails", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: false });

    const result = await enableBiometric();

    expect(result).toBe(false);
    expect(mockSetItemAsync).not.toHaveBeenCalled();
  });
});

describe("disableBiometric", () => {
  it("deletes the biometric-enabled key from secure store", async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);
    await disableBiometric();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith("biometric-enabled");
  });
});

describe("authenticateWithBiometric", () => {
  it("returns true on successful authentication", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    expect(await authenticateWithBiometric()).toBe(true);
  });

  it("returns false when authentication fails", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: false });
    expect(await authenticateWithBiometric()).toBe(false);
  });

  it("calls authenticateAsync with correct prompt labels", async () => {
    mockAuthenticateAsync.mockResolvedValue({ success: true });
    await authenticateWithBiometric();
    expect(mockAuthenticateAsync).toHaveBeenCalledWith({
      promptMessage: "Unlock IronPulse",
      fallbackLabel: "Use Passcode",
      cancelLabel: "Sign In Instead",
    });
  });
});
