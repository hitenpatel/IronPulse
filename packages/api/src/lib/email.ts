import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Zor <noreply@zor.app>";

export async function sendMagicLinkEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/api/auth/magic-link?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Sign in to Zor",
    text: `Click this link to sign in to Zor:\n\n${link}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/reset-password?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Zor password",
    text: `Click this link to reset your password:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}

export async function sendEmailChangeVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/confirm-email-change?token=${token}`;

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: "Confirm your new email address for Zor",
    text: `Click this link to confirm your new email address:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
  });
}
