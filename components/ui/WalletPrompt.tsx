"use client";

import * as React from "react";

export function WalletPrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Connect your wallet
        </h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This page is only available to connected wallets. Use the Connect
          button in the navbar to get started.
        </p>
      </div>
    </div>
  );
}
