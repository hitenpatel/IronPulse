"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: async (data) => {
      // Auto sign-in with the new password
      await signIn("credentials", {
        email: data.email,
        password,
        redirect: false,
      });
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Invalid reset link</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This reset link is missing or invalid.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetPassword.mutate({ token: token!, password });
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Set new password</h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1.5"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            At least 8 characters
          </p>
        </div>

        <div>
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1.5"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={resetPassword.isPending}
        >
          {resetPassword.isPending ? "Resetting..." : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
