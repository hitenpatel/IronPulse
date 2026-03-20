"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Fingerprint,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { registerPasskey, authenticatePasskey } from "@/lib/passkey";

export default function SecurityPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.passkey.list.useQuery();
  const { data: userData } = trpc.user.me.useQuery();
  const registerOptions = trpc.passkey.registerOptions.useMutation();
  const registerVerify = trpc.passkey.registerVerify.useMutation();
  const loginOptions = trpc.passkey.loginOptions.useMutation();
  const renameMutation = trpc.passkey.rename.useMutation({
    onSuccess: () => utils.passkey.list.invalidate(),
  });
  const deleteMutation = trpc.passkey.delete.useMutation({
    onSuccess: () => utils.passkey.list.invalidate(),
  });
  const removePasswordMutation = trpc.passkey.removePassword.useMutation();
  const changePasswordMutation = trpc.auth.changePassword.useMutation();

  const [addingPasskey, setAddingPasskey] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordRemovalPassword, setPasswordRemovalPassword] = useState("");
  const [showPasswordRemoval, setShowPasswordRemoval] = useState(false);
  const [reAuthMethod, setReAuthMethod] = useState<"password" | "passkey">("password");

  // Change password form state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  async function handleAddPasskey() {
    setError(null);
    setAddingPasskey(true);
    try {
      const options = await registerOptions.mutateAsync();
      const attestation = await registerPasskey(options);
      const name = prompt("Name this passkey (optional):", "") ?? undefined;
      await registerVerify.mutateAsync({
        attestation,
        name: name || undefined,
      });
      utils.passkey.list.invalidate();
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setError(err?.message ?? "Failed to register passkey");
      }
    } finally {
      setAddingPasskey(false);
    }
  }

  function handleStartRename(id: string, currentName: string | null) {
    setEditingId(id);
    setEditName(currentName ?? "");
  }

  function handleSaveRename(id: string) {
    renameMutation.mutate({ passkeyId: id, name: editName });
    setEditingId(null);
  }

  const [deletePasskeyId, setDeletePasskeyId] = useState<string | null>(null);

  function handleDelete() {
    if (!deletePasskeyId) return;
    deleteMutation.mutate(
      { passkeyId: deletePasskeyId },
      { onError: (err) => setError(err.message) },
    );
    setDeletePasskeyId(null);
  }

  async function handleRemovePassword() {
    setError(null);
    try {
      if (reAuthMethod === "passkey") {
        const options = await loginOptions.mutateAsync();
        const assertion = await authenticatePasskey(options);
        await removePasswordMutation.mutateAsync({ passkeyAssertion: assertion });
      } else {
        await removePasswordMutation.mutateAsync({
          currentPassword: passwordRemovalPassword,
        });
      }
      setShowPasswordRemoval(false);
      setPasswordRemovalPassword("");
    } catch (err: any) {
      if (err?.name !== "NotAllowedError") {
        setError(err?.message ?? "Failed to remove password");
      }
    }
  }

  async function handleChangePassword() {
    setError(null);
    setChangePasswordSuccess(false);

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setChangePasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePassword(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to change password");
    }
  }

  const passkeys = data?.passkeys ?? [];
  const atLimit = passkeys.length >= 5;
  const hasOAuth = (userData?.user as any)?.accounts?.some(
    (a: any) => a.provider !== "email",
  );
  const canRemovePassword = passkeys.length > 0 || hasOAuth;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/profile">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">Security</h1>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {changePasswordSuccess && (
        <div className="rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-success">
          Password changed successfully.
        </div>
      )}

      {/* Change Password Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Change Password</h2>
        </div>
        {showChangePassword ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              type="password"
              placeholder="New password (min. 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleChangePassword}
                disabled={
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  changePasswordMutation.isPending
                }
              >
                {changePasswordMutation.isPending ? "Saving..." : "Save new password"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowChangePassword(true)}>
            Change password
          </Button>
        )}
      </div>

      {/* Passkeys Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Fingerprint className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Passkeys</h2>
        </div>
        <div className="space-y-3">
          {passkeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No passkeys registered. Add one to sign in without a password.
            </p>
          ) : (
            passkeys.map((pk) => (
              <div
                key={pk.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex-1">
                  {editingId === pk.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 w-48"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSaveRename(pk.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">{pk.name ?? "Unnamed passkey"}</p>
                      <p className="text-xs text-muted-foreground">
                        {pk.deviceType === "multiDevice" ? "Synced" : "Single device"}{" "}
                        &middot; Added {new Date(pk.createdAt).toLocaleDateString()}
                        {pk.lastUsedAt && ` · Last used ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                      </p>
                    </>
                  )}
                </div>
                {editingId !== pk.id && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleStartRename(pk.id, pk.name)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletePasskeyId(pk.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}

          <Button variant="outline" className="w-full" onClick={handleAddPasskey} disabled={addingPasskey || atLimit}>
            <Plus className="h-4 w-4" />
            {atLimit ? "Maximum passkeys reached (5)" : addingPasskey ? "Registering..." : "Add passkey"}
          </Button>
        </div>
      </div>

      {/* Password / Passwordless Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Password</h2>
        </div>
        {showPasswordRemoval ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Make sure you have access to your passkey device. If you lose it
              and have no OAuth provider linked, you&apos;ll be locked out.
            </p>
            <div className="flex gap-2 mb-2">
              <Button variant={reAuthMethod === "password" ? "default" : "outline"} size="sm" onClick={() => setReAuthMethod("password")}>
                Confirm with password
              </Button>
              {passkeys.length > 0 && (
                <Button variant={reAuthMethod === "passkey" ? "default" : "outline"} size="sm" onClick={() => setReAuthMethod("passkey")}>
                  Confirm with passkey
                </Button>
              )}
            </div>
            {reAuthMethod === "password" && (
              <Input
                type="password"
                placeholder="Enter current password to confirm"
                value={passwordRemovalPassword}
                onChange={(e) => setPasswordRemovalPassword(e.target.value)}
              />
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemovePassword}
                disabled={(reAuthMethod === "password" && !passwordRemovalPassword) || removePasswordMutation.isPending}
              >
                {removePasswordMutation.isPending ? "Removing..." : reAuthMethod === "passkey" ? "Verify passkey & remove" : "Remove password"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowPasswordRemoval(false); setPasswordRemovalPassword(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowPasswordRemoval(true)} disabled={!canRemovePassword}>
            Remove password (go passwordless)
          </Button>
        )}
        {!canRemovePassword && (
          <p className="mt-2 text-xs text-muted-foreground">
            Register a passkey or link an OAuth provider before removing your password.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!deletePasskeyId}
        onOpenChange={(open) => !open && setDeletePasskeyId(null)}
        title="Delete passkey"
        description="Delete this passkey? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
