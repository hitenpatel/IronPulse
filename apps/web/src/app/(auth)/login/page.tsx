"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { PasskeyLoginButton } from "@/components/passkey-login-button";

type View = "credentials" | "magic-link" | "magic-link-sent";

export default function LoginPage() {
  const [view, setView] = useState<View>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendMagicLink = trpc.auth.sendMagicLink.useMutation({
    onSuccess: () => setView("magic-link-sent"),
    onError: () => setError("Something went wrong. Please try again."),
  });

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = "/dashboard";
  }

  function handleMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    sendMagicLink.mutate({ email: magicEmail });
  }

  if (view === "magic-link-sent") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mt-4 font-display font-semibold text-[22px]">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to{" "}
          <span className="font-medium text-foreground">{magicEmail}</span>
        </p>
        <button
          onClick={() => setView("credentials")}
          className="mt-6 text-sm text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  if (view === "magic-link") {
    return (
      <div>
        <h2 className="font-display font-semibold text-[22px]">Sign in with email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll send you a magic link
        </p>

        <form onSubmit={handleMagicLinkSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="magic-email">Email</Label>
            <Input
              id="magic-email"
              type="email"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="mt-1.5"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={sendMagicLink.isPending}
          >
            {sendMagicLink.isPending ? "Sending..." : "Send link"}
          </Button>
        </form>

        <button
          onClick={() => {
            setView("credentials");
            setError(null);
          }}
          className="mt-4 block w-full text-center text-sm text-primary hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display font-semibold text-[22px]">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Sign in to your account
      </p>

      <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            data-testid="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="mt-1.5"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            data-testid="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1.5"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full" disabled={loading} data-testid="login-button">
          {loading ? "Signing in..." : "Log In"}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Social buttons — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("google")}
        >
          <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("apple")}
        >
          <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple
        </Button>
      </div>

      {/* Passkey + Magic link */}
      <div className="mt-3 flex flex-col items-center gap-2">
        <PasskeyLoginButton />
        <button
          onClick={() => {
            setView("magic-link");
            setError(null);
          }}
          className="text-sm text-primary hover:underline"
        >
          <Mail className="mr-1.5 inline-block h-3.5 w-3.5 align-text-bottom" />
          Email me a sign-in link
        </button>
      </div>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
