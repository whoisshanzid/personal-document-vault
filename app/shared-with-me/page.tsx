"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/Button";
import { WalletPrompt } from "@/components/ui/WalletPrompt";
import { LoadingState } from "@/components/ui/Spinner";
import { useSharedWithMe } from "@/hooks/useDocuments";

export default function SharedWithMePage() {
  const { isConnected } = useAccount();
  const { documents, isLoading, error, refetch } = useSharedWithMe();

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
        <LoadingState label="Checking shared access…" />
      ) : error ? (
        <div className="space-y-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button size="sm" variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium text-foreground">Nothing shared with you</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When another wallet grants you access, the documents appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.documentId.toString()} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Shared With Me</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documents other wallets have granted your address access to — access
          is verified on-chain before display.
        </p>
      </div>
      <Link href="/dashboard">
        <Button size="sm" variant="outline">
          Dashboard
        </Button>
      </Link>
    </div>
  );
}
