"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Spinner } from "@/components/ui/Spinner";
import { WalletPrompt } from "@/components/ui/WalletPrompt";
import { useRegisterDocument } from "@/hooks/useVaultContract";
import { createDocument, uploadPdf } from "@/lib/api";
import { isContractConfigured } from "@/lib/contracts/DocumentVault";

type Phase = "idle" | "uploading" | "registering" | "saving" | "done";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;

interface PendingMeta {
  cid: string;
  title: string;
  description: string;
  documentIdOnChain: number;
}

export default function UploadPage() {
  const { address, isConnected } = useAccount();
  const register = useRegisterDocument();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  const pendingMeta = React.useRef<PendingMeta | null>(null);

  const txBusy =
    phase === "registering" && (register.isPending || register.isConfirming);
  const busy = phase !== "idle" && phase !== "done";

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFieldError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.type !== "application/pdf") {
      setFile(null);
      setFieldError("Only PDF files are allowed.");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFile(null);
      setFieldError("File is larger than 20MB.");
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (!title.trim()) {
      setFieldError("Title is required.");
      return;
    }
    if (!file) {
      setFieldError("Choose a PDF file to upload.");
      return;
    }
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    if (!isContractConfigured()) {
      toast.error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured.");
      return;
    }

    register.reset();
    pendingMeta.current = null;

    try {
      setPhase("uploading");
      const { cid } = await uploadPdf(file);

      setPhase("registering");
      pendingMeta.current = {
        cid,
        title: title.trim(),
        description: description.trim(),
        documentIdOnChain: 0,
      };
      register.register(cid, title.trim());
    } catch (err) {
      setPhase("idle");
      pendingMeta.current = null;
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  // After the tx confirms: parse documentId (from the hook) and save metadata.
  React.useEffect(() => {
    if (phase !== "registering") return;

    if (register.error) {
      toast.error(register.error.message || "Registration transaction failed");
      pendingMeta.current = null;
      setPhase("idle");
      return;
    }

    if (
      register.isSuccess &&
      register.documentId !== undefined &&
      pendingMeta.current
    ) {
      const meta = pendingMeta.current;
      meta.documentIdOnChain = Number(register.documentId);
      setPhase("saving");

      (async () => {
        try {
          await createDocument({
            title: meta.title,
            description: meta.description,
            cid: meta.cid,
            ownerAddress: address ?? "",
            documentIdOnChain: meta.documentIdOnChain,
          });
          pendingMeta.current = null;
          toast.success("Document registered on-chain!");
          setPhase("done");
        } catch (err) {
          pendingMeta.current = null;
          setPhase("idle");
          toast.error(
            `Registered on-chain (ID #${meta.documentIdOnChain}) but saving metadata failed: ${
              err instanceof Error ? err.message : "unknown error"
            }`
          );
        }
      })();
      return;
    }

    if (register.isSuccess && register.documentId === undefined) {
      pendingMeta.current = null;
      setPhase("idle");
      toast.error(
        "Transaction confirmed, but the DocumentRegistered event could not be parsed. Check the contract address."
      );
    }
  }, [phase, register.isSuccess, register.documentId, register.error, address]);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <WalletPrompt />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Document uploaded and registered
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your file lives on IPFS and ownership is recorded on-chain.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/my-documents">
              <Button>Go to My Documents</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => {
                setTitle("");
                setDescription("");
                setFile(null);
                setPhase("idle");
                register.reset();
              }}
            >
              Upload another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const statusLabel =
    phase === "uploading"
      ? "Uploading PDF to IPFS…"
      : phase === "registering"
        ? register.isPending
          ? "Confirm the transaction in your wallet…"
          : "Waiting for transaction confirmation…"
        : phase === "saving"
          ? "Saving metadata…"
          : null;

  return (
    <div className="space-y-6">
      <PageHeader />

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Title"
            placeholder="e.g. Passport scan"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            required
          />

          <Textarea
            label="Description (optional)"
            placeholder="What is this document for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">
              PDF file
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={onFileChange}
              disabled={busy}
              className="flex w-full cursor-pointer rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              PDF only · max 20MB · pinned to IPFS via Pinata
            </p>
          </div>

          {fieldError && (
            <p className="text-sm text-destructive">{fieldError}</p>
          )}

          {statusLabel && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <Spinner />
              <p className="text-sm text-foreground">{statusLabel}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Ownership will be registered by{" "}
              <span className="font-mono">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
            </p>
            <Button
              type="submit"
              loading={busy}
              disabled={busy || txBusy}
              className="min-w-[150px]"
            >
              {busy ? "Working…" : "Upload & Register"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Upload document</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pin a PDF to IPFS, then register its CID on the DocumentVault contract.
      </p>
    </div>
  );
}
