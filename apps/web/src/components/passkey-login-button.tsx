"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { authenticatePasskey } from "@/lib/passkey";

export function PasskeyLoginButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginOptions = trpc.passkey.loginOptions.useMutation();
  const loginVerify = trpc.passkey.loginVerify.useMutation();

  async function handlePasskeyLogin() {
    setError(null);
    setLoading(true);

    try {
      // Step 1: Get challenge from server
      const options = await loginOptions.mutateAsync();

      // Step 2: Trigger browser passkey dialog
      const assertion = await authenticatePasskey(options);

      // Step 3: Verify with server, get login token (pass challenge for exact lookup)
      const { passkeyLoginToken } = await loginVerify.mutateAsync({
        assertion,
        challenge: options.challenge,
      });

      // Step 4: Bridge to NextAuth session
      const result = await signIn("passkey", {
        passkeyLoginToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to create session");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      // User cancelled the dialog or verification failed
      if (err?.name === "NotAllowedError") {
        // User cancelled — do nothing
      } else {
        setError("Passkey authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={handlePasskeyLogin}
        disabled={loading}
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        {loading ? "Verifying..." : "Sign in with passkey"}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </>
  );
}
