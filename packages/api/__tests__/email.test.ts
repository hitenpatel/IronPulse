import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn().mockResolvedValue({});

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: mockSend } })),
}));

import {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendEmailChangeVerificationEmail,
} from "../src/lib/email";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendMagicLinkEmail", () => {
  it("calls emails.send with correct from, to, subject, and link", async () => {
    await sendMagicLinkEmail("user@example.com", "abc123");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe("user@example.com");
    expect(args.subject).toContain("Sign in");
    expect(args.text).toContain("abc123");
    expect(args.text).toContain("/api/auth/magic-link?token=abc123");
  });

  it("uses default FROM address when EMAIL_FROM is not set", async () => {
    delete process.env.EMAIL_FROM;
    await sendMagicLinkEmail("user@example.com", "tok");

    const args = mockSend.mock.calls[0][0];
    expect(args.from).toBe("IronPulse <noreply@ironpulse.app>");
  });
});

describe("sendPasswordResetEmail", () => {
  it("calls emails.send with correct subject and reset link", async () => {
    await sendPasswordResetEmail("user@example.com", "reset-tok-456");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe("user@example.com");
    expect(args.subject).toBe("Reset your IronPulse password");
    expect(args.text).toContain("/reset-password?token=reset-tok-456");
  });
});

describe("sendEmailChangeVerificationEmail", () => {
  it("calls emails.send with subject containing Confirm and correct link", async () => {
    await sendEmailChangeVerificationEmail("new@example.com", "change-tok-789");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe("new@example.com");
    expect(args.subject).toContain("Confirm");
    expect(args.text).toContain("/confirm-email-change?token=change-tok-789");
  });
});
