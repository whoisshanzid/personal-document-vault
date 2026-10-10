"use client";

import * as React from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { DocumentCard } from "@/components/DocumentCard";
import { ShareModal } from "@/components/ShareModal";
import { Button } from "@/components/ui/Button";
import { WalletPrompt } from "@/components/ui/WalletPrompt";
import { LoadingState } from "@/components/ui/Spinner";
import { useMyDocuments } from "@/hooks/useDocuments";
import { deleteDocument } from "@/lib/api";
import type { MergedDocument } from "@/lib/types";

export default function MyDocumentsPage() {
  const { address, isConnected } = useAccount();
  const { documents, isLoading, error, refetch } = useMyDocuments();

  const [modal, setModal] = React.useState<{
    doc: MergedDocument;
    mode: "grant" | "revoke";
  } | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (doc: MergedDocument) => {
    if (!doc.mongoId) {
      toast.error(
        "This document is registered on-chain but has no metadata record to delete. Only the metadata entry can be removed — the on-chain record and IPFS file always remain."
      );
      return;
    }
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }
    const confirmed = window.confirm(
      `Delete the metadata record for "${doc.title}"? The on-chain entry and IPFS file are not removed.`
    );
    if (!confirmed) return;

    setDeletingId(doc.mongoId);
    try {
      await deleteDocument(doc.mongoId, address);
      toast.success("Metadata deleted");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <WalletPrompt />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {isLoading ? (
        <LoadingState label="Loading your documents…" />
      ) : error ? (
        <div className="space-y-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button size="sm" variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium text-foreground">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first PDF to get started.
          </p>
          <Link href="/upload" className="mt-4 inline-block">
            <Button>Upload a document</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.documentId.toString()}
              doc={doc}
              onShare={(d) => setModal({ doc: d, mode: "grant" })}
              onRevoke={(d) => setModal({ doc: d, mode: "revoke" })}
              onDelete={doc.mongoId ? handleDelete : undefined}
              deleting={deletingId !== null && doc.mongoId === deletingId}
            />
          ))}
        </div>
      )}

      <ShareModal
        open={modal !== null}
        mode={modal?.mode ?? "grant"}
        document={modal?.doc ?? null}
        onClose={() => setModal(null)}
        onSuccess={refetch}
      />
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documents owned by your wallet — open, share, revoke, or delete their
          metadata.
        </p>
      </div>
      <Link href="/upload">
        <Button size="sm">+ New upload</Button>
      </Link>
    </div>
  );
}
