/**
 * Drop-in replacement for expo-auth-session.
 *
 * Stubs that match the API surface used in login.tsx and signup.tsx.
 * Replace with react-native-app-auth for real OAuth flows.
 */

export enum ResponseType {
  Code = "code",
  Token = "token",
  IdToken = "id_token",
}

export interface DiscoveryDocument {
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  revocationEndpoint?: string;
  userInfoEndpoint?: string;
  issuer?: string;
}

export interface AuthRequestConfig {
  clientId: string;
  scopes?: string[];
  redirectUri?: string;
  responseType?: ResponseType;
  extraParams?: Record<string, string>;
}

export interface AuthSessionResult {
  type: "success" | "cancel" | "dismiss" | "error";
  params: Record<string, string>;
  error?: any;
}

export class AuthRequest {
  constructor(public config: AuthRequestConfig) {}

  async promptAsync(
    _discovery: DiscoveryDocument | null,
  ): Promise<AuthSessionResult> {
    console.warn(
      "[auth-session stub] promptAsync is a no-op — install react-native-app-auth",
    );
    return { type: "cancel", params: {} };
  }
}

export function useAutoDiscovery(
  _issuer: string,
): DiscoveryDocument | null {
  // Stub: return a minimal discovery document so callers don't get null-check failures
  return {
    authorizationEndpoint: `${_issuer}/o/oauth2/v2/auth`,
    tokenEndpoint: `${_issuer}/token`,
  };
}

export function makeRedirectUri(options?: {
  scheme?: string;
  path?: string;
}): string {
  const scheme = options?.scheme ?? "ironpulse";
  const path = options?.path ?? "redirect";
  return `${scheme}://${path}`;
}
