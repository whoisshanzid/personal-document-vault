import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Document Vault",
  description:
    "Upload PDFs to IPFS, register ownership on-chain, and share access with other wallets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
              Personal Document Vault · Files on IPFS · Ownership on Sepolia
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
