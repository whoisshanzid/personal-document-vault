"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  {
    title: "Upload to IPFS",
    body: "PDFs are pinned to IPFS via Pinata — only the CID and metadata are stored off-chain.",
  },
  {
    title: "Own it on-chain",
    body: "Every upload is registered by your wallet on the DocumentVault contract on Sepolia.",
  },
  {
    title: "Share by address",
    body: "Grant or revoke access to any wallet in one transaction. Grantees see docs in their vault.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16 py-8 md:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-block rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          IPFS + Smart Contracts + Next.js
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Your documents.{" "}
          <span className="text-primary">Your keys.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
          Upload PDFs to IPFS, prove ownership on-chain, and share access with
          specific wallets — no intermediaries, no custodians.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ConnectButton.Custom>
            {({ mounted, account, openConnectModal }) =>
              mounted ? (
                account ? (
                  <Link href="/dashboard">
                    <Button size="lg" className="min-w-[190px]">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    onClick={openConnectModal}
                    className="min-w-[190px]"
                  >
                    Connect Wallet
                  </Button>
                )
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  disabled
                  className="min-w-[190px]"
                >
                  Connect Wallet
                </Button>
              )
            }
          </ConnectButton.Custom>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Browse the vault
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <h3 className="text-sm font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-2xl rounded-xl border border-dashed border-border px-6 py-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">How it works</h2>
        <ol className="mx-auto mt-4 max-w-md space-y-2 text-left text-sm text-muted-foreground">
          <li>1. Connect your wallet (Sepolia testnet).</li>
          <li>2. Upload a PDF — it&apos;s pinned to IPFS via Pinata.</li>
          <li>3. Register it on-chain to prove ownership.</li>
          <li>4. Share it with any wallet address; revoke anytime.</li>
        </ol>
      </section>
    </div>
  );
}
