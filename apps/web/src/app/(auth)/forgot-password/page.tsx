"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => setSent(true),
    onError: () => setSent(true), // Always show success to prevent enumeration
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    requestReset.mutate({ email });
  }

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists with that email, we&apos;ve sent a reset link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Reset your password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1.5"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={requestReset.isPending}
        >
          {requestReset.isPending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-4 block text-center text-sm text-primary hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
