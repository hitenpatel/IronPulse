/**
 * Validates and returns a required environment variable.
 * Throws immediately with a clear message if the variable is missing.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Check .env.example for the expected configuration.`,
    );
  }
  return value;
}

/**
 * Returns an optional environment variable, or the default if unset.
 */
function optional(name: string, defaultValue?: string): string | undefined {
  return process.env[name] ?? defaultValue;
}

/**
 * Validates that a pair of integration credentials are both set.
 * Call this at the point where the integration is actually used,
 * not at startup — integrations are optional.
 */
export function requireIntegrationCredentials(
  provider: string,
): { clientId: string; clientSecret: string } {
  const idKey = `${provider}_CLIENT_ID`;
  const secretKey = `${provider}_CLIENT_SECRET`;
  const clientId = process.env[idKey];
  const clientSecret = process.env[secretKey];

  if (!clientId || !clientSecret) {
    throw new Error(
      `${provider} integration requires ${idKey} and ${secretKey} to be set. ` +
        `Register an OAuth app with the provider and add credentials to .env.`,
    );
  }

  return { clientId, clientSecret };
}

/**
 * Core env vars — validated lazily on first access.
 * Required vars throw on access if missing. Optional vars have safe defaults.
 */
export const env = {
  // Required — app will not function without these
  get NEXTAUTH_SECRET() {
    return required("NEXTAUTH_SECRET");
  },
  get NEXTAUTH_URL() {
    return optional("NEXTAUTH_URL", "http://localhost:3000")!;
  },

  // Storage (defaults safe for local dev with MinIO)
  get S3_ENDPOINT() {
    return optional("S3_ENDPOINT", "http://localhost:9000")!;
  },
  get S3_REGION() {
    return optional("S3_REGION", "us-east-1")!;
  },
  get S3_ACCESS_KEY() {
    return optional("S3_ACCESS_KEY", "minioadmin")!;
  },
  get S3_SECRET_KEY() {
    return optional("S3_SECRET_KEY", "minioadmin")!;
  },
  get S3_BUCKET() {
    return optional("S3_BUCKET", "ironpulse")!;
  },

  // Cache
  get REDIS_URL() {
    return optional("REDIS_URL", "redis://localhost:6379")!;
  },

  // Email
  get RESEND_API_KEY() {
    return optional("RESEND_API_KEY");
  },
  get EMAIL_FROM() {
    return optional("EMAIL_FROM", "IronPulse <noreply@ironpulse.app>")!;
  },

  // Encryption
  get DEVICE_TOKEN_ENCRYPTION_KEY() {
    return optional("DEVICE_TOKEN_ENCRYPTION_KEY");
  },

  // Stripe
  get STRIPE_SECRET_KEY() {
    return optional("STRIPE_SECRET_KEY");
  },

  // PowerSync
  get POWERSYNC_PRIVATE_KEY() {
    return optional("POWERSYNC_PRIVATE_KEY");
  },
  get POWERSYNC_PUBLIC_KEY() {
    return optional("POWERSYNC_PUBLIC_KEY");
  },
  get POWERSYNC_URL() {
    return optional("POWERSYNC_URL", "http://localhost:8080")!;
  },

  // Passkey / WebAuthn
  get WEBAUTHN_RP_ID() {
    return optional("WEBAUTHN_RP_ID", "localhost")!;
  },
  get WEBAUTHN_RP_ORIGIN() {
    return optional("WEBAUTHN_RP_ORIGIN", "http://localhost:3000")!;
  },
} as const;
