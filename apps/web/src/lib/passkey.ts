import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

export async function registerPasskey(
  options: PublicKeyCredentialCreationOptionsJSON,
) {
  return startRegistration({ optionsJSON: options });
}

export async function authenticatePasskey(
  options: PublicKeyCredentialRequestOptionsJSON,
) {
  return startAuthentication({ optionsJSON: options });
}
