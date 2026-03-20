"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export default function ConfirmEmailChangePage() {
  return (
    <Suspense>
      <ConfirmEmailChangeForm />
    </Suspense>
  );
}

function ConfirmEmailChangeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [confirmed, setConfirmed] = useState(false);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  const confirmEmailChange = trpc.user.confirmEmailChange.useMutation({
    onSuccess: (data) => {
      setNewEmail(data.newEmail);
      setConfirmed(true);
    },
  });

  useEffect(() => {
    if (token && !confirmed && !confirmEmailChange.isPending && !confirmEmailChange.isError) {
      confirmEmailChange.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Invalid link</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This email change link is missing or invalid.
        </p>
        <Link href="/profile" className="mt-6 inline-block text-sm text-primary hover:underline">
          Back to profile
        </Link>
      </div>
    );
  }

  if (confirmEmailChange.isPending) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Confirming...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please wait while we confirm your new email address.
        </p>
      </div>
    );
  }

  if (confirmEmailChange.isError) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Link expired or invalid</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {confirmEmailChange.error.message}
        </p>
        <Link href="/profile" className="mt-6 inline-block text-sm text-primary hover:underline">
          Back to profile
        </Link>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-bold">Email updated</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your email address has been changed to{" "}
          <span className="font-medium text-foreground">{newEmail}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please sign in again with your new email address.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return null;
}
