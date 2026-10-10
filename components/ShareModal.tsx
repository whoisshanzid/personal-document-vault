"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { isAddress } from "viem";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useGrantAccess, useRevokeAccess } from "@/hooks/useVaultContract";
import { shortAddress, type MergedDocument } from "@/lib/types";

interface ShareModalProps {
  open: boolean;
  mode: "grant" | "revoke";
  document: MergedDocument | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareModal({
  open,
  mode,
  document,
  onClose,
  onSuccess,
}: ShareModalProps) {
  const [grantee, setGrantee] = React.useState("");
  const [fieldError, setFieldError] = React.useState("");

  const grant = useGrantAccess();
  const revoke = useRevokeAccess();
  const action = mode === "grant" ? grant : revoke;

  // Clear previous tx state whenever the modal opens.
  React.useEffect(() => {
    if (!open) return;
    grant.reset();
    revoke.reset();
    setGrantee("");
    setFieldError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!action.isSuccess) return;
    toast.success(
      mode === "grant"
        ? `Access granted to ${shortAddress(grantee)}`
        : `Access revoked for ${shortAddress(grantee)}`
    );
    grant.reset();
    revoke.reset();
    onSuccess?.();
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.isSuccess]);

  React.useEffect(() => {
    if (!action.error) return;
    toast.error(action.error.message || "Transaction failed");
    grant.reset();
    revoke.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action.error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");

    if (!document) return;
    if (!isAddress(grantee)) {
      setFieldError("Enter a valid wallet address (0x…)");
      return;
    }
    if (grantee.toLowerCase() === document.owner.toLowerCase()) {
      setFieldError("That address already owns this document.");
      return;
    }

    try {
      action.submit(document.documentId, grantee as `0x${string}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const busy = action.isPending || action.isConfirming;
  const busyLabel = action.isPending
    ? "Confirm in your wallet…"
    : "Waiting for confirmation…";

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={mode === "grant" ? "Share document" : "Revoke access"}
    >
      {document && (
        <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <p className="truncate text-sm font-medium text-foreground">
            {document.title}
          </p>
          <p className="text-xs text-muted-foreground">
            On-chain ID #{document.documentId.toString()}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Wallet address"
          placeholder="0x0000…"
          value={grantee}
          onChange={(e) => setGrantee(e.target.value)}
          error={fieldError}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          {mode === "grant"
            ? "The address will be able to view this document on the Shared With Me page."
            : "The address will immediately lose access to this document."}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={mode === "grant" ? "default" : "destructive"}
            loading={busy}
          >
            {busy
              ? busyLabel
              : mode === "grant"
                ? "Grant Access"
                : "Revoke Access"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
