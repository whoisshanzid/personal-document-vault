"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { WalletPrompt } from "@/components/ui/WalletPrompt";
import { Spinner } from "@/components/ui/Spinner";
import { useDashboardCounts } from "@/hooks/useDocuments";
import { shortAddress } from "@/lib/types";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const {
    totalDocuments,
    sharedWithMeCount,
    sharedByMeCount,
    isLoading,
    isSharedByMeLoading,
    error,
  } = useDashboardCounts();

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <WalletPrompt />
      </div>
    );
  }

  const stats = [
    {
      label: "My documents",
      value: totalDocuments !== undefined ? totalDocuments.toString() : "—",
      hint: "Registered by your wallet",
      href: "/my-documents",
    },
    {
      label: "Shared by me",
      value: isSharedByMeLoading
        ? "…"
        : sharedByMeCount !== null
          ? String(sharedByMeCount)
          : "—",
      hint: "Docs with at least one active grantee",
      href: "/my-documents",
    },
    {
      label: "Shared with me",
      value: sharedWithMeCount !== undefined ? sharedWithMeCount.toString() : "—",
      hint: "Docs other wallets granted you",
      href: "/shared-with-me",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Connected as{" "}
        <span className="font-mono text-foreground">
          {shortAddress(address ?? "")}
        </span>{" "}
        · Sepolia
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Spinner className="h-8 w-8" />
          <p className="text-sm">Reading the vault contract…</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition-colors hover:border-primary/60">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-4xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{stat.hint}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <QuickAction
          href="/upload"
          title="Upload a document"
          body="Pin a PDF to IPFS and register ownership on-chain."
        />
        <QuickAction
          href="/shared-with-me"
          title="View shared documents"
          body="Open the PDFs other wallets have granted you access to."
        />
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your vault at a glance — totals come straight from the smart contract.
      </p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-colors hover:border-primary/60">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </Card>
    </Link>
  );
}
