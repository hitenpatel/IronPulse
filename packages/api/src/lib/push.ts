/**
 * Result of attempting to deliver a single push notification.
 *
 * `delivered` is true only when Expo's per-ticket status comes back "ok".
 * `deadToken` is true when the token is definitively unusable
 * (DeviceNotRegistered, InvalidCredentials) and should be removed from the
 * database so we stop paying delivery fees on it. Transient errors
 * (network, 5xx, rate limit) leave `deadToken` false so the caller retries
 * on the next event instead of deleting a valid device.
 */
export interface PushDeliveryResult {
  delivered: boolean;
  deadToken: boolean;
  /** Human-readable reason when delivery failed — surfaced to logs. */
  error?: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoResponseBody {
  data?: ExpoTicket | ExpoTicket[];
  errors?: Array<{ message: string; code?: string }>;
}

/**
 * Errors for which the token is terminally unusable. See
 * https://docs.expo.dev/push-notifications/sending-notifications/#push-receipt-response-format
 */
const DEAD_TOKEN_CODES = new Set([
  "DeviceNotRegistered",
  "InvalidCredentials",
]);

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<PushDeliveryResult> {
  let response: Response;
  try {
    response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data,
        sound: "default",
      }),
    });
  } catch (err) {
    // Network/DNS failure — transient. Do NOT delete the token.
    return {
      delivered: false,
      deadToken: false,
      error: err instanceof Error ? err.message : "Transport failure",
    };
  }

  if (!response.ok) {
    return {
      delivered: false,
      deadToken: false,
      error: `Expo push API ${response.status}`,
    };
  }

  let parsed: ExpoResponseBody;
  try {
    parsed = (await response.json()) as ExpoResponseBody;
  } catch {
    // Empty or malformed body — treat as transient. Token is probably fine.
    return { delivered: false, deadToken: false, error: "Invalid Expo response" };
  }

  // When /send is called with a single `to` (our usage), `data` is an object,
  // not an array. Normalise to an array so both shapes flow through one path.
  const tickets: ExpoTicket[] = parsed.data
    ? Array.isArray(parsed.data)
      ? parsed.data
      : [parsed.data]
    : [];

  if (tickets.length === 0) {
    // Top-level `errors` means the whole request failed. Common example is
    // hitting rate limits — transient.
    const topLevel = parsed.errors?.[0]?.message ?? "Empty Expo response";
    return { delivered: false, deadToken: false, error: topLevel };
  }

  // Exactly one ticket since we send one token per call.
  const ticket = tickets[0]!;
  if (ticket.status === "ok") {
    return { delivered: true, deadToken: false };
  }

  const code = ticket.details?.error;
  return {
    delivered: false,
    deadToken: code ? DEAD_TOKEN_CODES.has(code) : false,
    error: code ?? ticket.message ?? "Unknown Expo ticket error",
  };
}
