# Personal Document Vault

A full-stack dApp where users connect a wallet, upload PDFs to IPFS (Pinata), store metadata in MongoDB, and register ownership on a Solidity smart contract. Owners can grant/revoke access to other wallet addresses; grantees can view documents shared with them.

## Tech stack

- **Next.js 14 (App Router) + TypeScript** — UI + API route handlers
- **Wagmi v2 + Viem + RainbowKit** — wallet connection & contract reads/writes
- **MongoDB + Mongoose** — document metadata only (never the PDFs)
- **Pinata SDK** — IPFS uploads (server-side, JWT never reaches the browser)
- **Tailwind CSS** — dark-first, minimal styling

## Project structure

```
app/
  layout.tsx                    # Providers (Wagmi + RainbowKit + toasts) + Navbar
  page.tsx                      # Public landing page with Connect Wallet
  dashboard/page.tsx            # Totals: my docs / shared by me / shared with me
  upload/page.tsx               # PDF upload → IPFS → on-chain registration → Mongo
  my-documents/page.tsx         # Owned docs + share/revoke/delete
  shared-with-me/page.tsx       # Docs shared with the connected wallet
  api/
    upload/sign/route.ts        # POST → Pinata signed upload URL (server-side JWT)
    documents/route.ts          # GET (owner / ids) + POST (save metadata)
    documents/[id]/route.ts     # GET / DELETE (owner-only delete)
    documents/shared/route.ts   # GET metadata for on-chain ids
components/
  Providers.tsx  Navbar.tsx  ConnectButton.tsx  DocumentCard.tsx  ShareModal.tsx
  ui/                           # Button, Input, Textarea, Card, Modal, Spinner…
lib/
  wagmi.ts  mongodb.ts  pinata.ts  api.ts  ipfs.ts  types.ts
  contracts/DocumentVault.ts    # ABI + NEXT_PUBLIC_CONTRACT_ADDRESS
models/Document.ts              # Mongoose schema
hooks/
  useDocuments.ts               # my docs / shared-with-me / dashboard counts
  useVaultContract.ts           # registerDocument / grantAccess / revokeAccess
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | client | WalletConnect Cloud project id — get one at <https://cloud.walletconnect.com> (free) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | client | Deployed `DocumentVault` address (Sepolia) |
| `NEXT_PUBLIC_CHAIN_ID` | client | Chain id — `11155111` (Sepolia) |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | client | Optional custom Sepolia RPC (Alchemy/Infura). Falls back to the public RPC |
| `MONGODB_URI` | server | MongoDB connection string (Atlas or local) |
| `PINATA_JWT` | server | Pinata API JWT — **never** prefix with `NEXT_PUBLIC_` |
| `PINATA_GATEWAY` | server | Gateway base URL used by the Pinata SDK (default `https://gateway.pinata.cloud`) |

Optional:

- `NEXT_PUBLIC_PINATA_GATEWAY` — gateway used for client-side "Open" links (defaults to `https://gateway.pinata.cloud`). Set it to match `PINATA_GATEWAY` if you use a custom gateway.
- `NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK` — block number of the contract deployment. Used to bound the `getLogs` scan that computes **Shared by me**; without it the scan starts at block 0.

### 3. Deploy the contract

The contract lives in `document-vault-contracts/` (`contracts/documentVault.sol`).

```bash
cd document-vault-contracts
npm install
npx hardhat compile
```

`document-vault-contracts/.env` already contains the Sepolia RPC URL. Add the
private key of your **testnet-only** deployer wallet (export from MetaMask:
_account menu → Account details → Show private key_):

```
PRIVATE_KEY=0xyourtestnetonlyprivatekey
```

Then deploy (plain ethers script — no Hardhat plugin required):

```bash
node scripts/deploy.js
```

The script prints the contract address and deployment block. Copy both into
`.env.local`:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK=1234567
```

> The frontend never holds private keys — all writes are signed by the connected wallet through RainbowKit/wagmi. The deployer key stays in `document-vault-contracts/.env`, which is gitignored.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

## Using the app

1. **Connect wallet** — click *Connect Wallet* (top right), pick a wallet, and switch to **Sepolia**. Fund it with Sepolia ETH (e.g. <https://sepoliafaucet.com>).
2. **Upload** — go to `/upload`, add a title (required), optional description, and a PDF under 20MB. The file is pinned to IPFS, then `registerDocument(cid, title)` is sent on-chain; after confirmation, metadata is saved to MongoDB.
3. **My Documents** — see everything your wallet owns:
   - **Open** — view the PDF via the IPFS gateway
   - **Share** — enter another wallet address → `grantAccess(documentId, grantee)`
   - **Revoke** — remove a grantee → `revokeAccess(documentId, grantee)`
   - **Delete** — removes the MongoDB metadata record (owner-only; on-chain data and the IPFS pin are untouched)
4. **Shared With Me** — connect with the grantee wallet; each entry is verified with `checkAccess(id, myAddress)` before it renders.
5. **Dashboard** — totals from `getDocumentCount` / `getSharedWithMeCount`, plus **Shared by me** computed from `AccessGranted`/`AccessRevoked` events via `getLogs`.

## API reference

| Route | Method | Description |
| --- | --- | --- |
| `/api/upload/sign` | POST | `{ name, size }` → `{ url }`, a short-lived Pinata signed upload URL (browser then uploads the file directly to Pinata) |
| `/api/documents?owner=0x…` | GET | Metadata for an owner |
| `/api/documents?ids=1,2,3` | GET | Metadata for on-chain ids |
| `/api/documents` | POST | `{ title, description?, cid, ownerAddress, documentIdOnChain }` → saved record |
| `/api/documents/[id]` | GET | Single record by Mongo `_id` |
| `/api/documents/[id]?requester=0x…` | DELETE | Owner-only delete (403 otherwise) |
| `/api/documents/shared?address=0x…&ids=1,2` | GET | Metadata for docs shared with `address` |

## Design notes

- **No PDFs in Mongo** — only `{ title, description, cid, ownerAddress, documentIdOnChain, uploadDate }`.
- **No client-side secrets** — `PINATA_JWT` and `MONGODB_URI` are read only in route handlers (`app/api/**`), which run on the server.
- **Large uploads bypass the server** — the browser uploads the PDF straight to Pinata using a short-lived signed URL, so the serverless request-body limit (≈4.5MB on Vercel) never applies. The 20MB cap is enforced by the client, the sign route, and Pinata itself.
- **On-chain writes** always go through wagmi hooks (`useWriteContract` + `useWaitForTransactionReceipt`) and are signed by the user's wallet.
- **"Shared by me"** is derived from `AccessGranted` / `AccessRevoked` logs (net active grants per document). If the RPC rejects the log range, the dashboard shows `—` instead of failing; setting `NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK` makes it fast and reliable.
- Protected pages render a **Connect your wallet** prompt when no wallet is connected.

## Deploying to Vercel

The app deploys as-is on Vercel (Next.js App Router). The contract stays on Sepolia (testnet), so this is a public site that uses test ETH.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Personal Document Vault"
git remote add origin git@github.com:<you>/personal-document-vault.git
git push -u origin main
```

`.env.local` and `document-vault-contracts/.env` are gitignored — never commit them.

### 2. Import into Vercel

- **Add New → Project** → import the repo. Framework auto-detects **Next.js**; root directory `./`; Node **20.x** (see `.nvmrc`).
- Add these Environment Variables (Production + Preview):

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | your WalletConnect project id |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | deployed `DocumentVault` address |
| `NEXT_PUBLIC_CHAIN_ID` | `11155111` |
| `NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK` | deployment block number |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | *(optional)* custom Sepolia RPC |
| `MONGODB_URI` | MongoDB connection string |
| `PINATA_JWT` | Pinata API JWT |
| `PINATA_GATEWAY` | `https://gateway.pinata.cloud` |
| `NEXT_PUBLIC_PINATA_GATEWAY` | *(optional)* gateway for "Open" links |

Then **Deploy**.

### 3. Allow the deployment in external services

- **MongoDB Atlas → Network Access:** Vercel functions use dynamic egress IPs, so add `0.0.0.0/0` (credentials are still required), or use the official **Atlas + Vercel integration**.
- **WalletConnect Cloud → Allowed Domains:** add your `*.vercel.app` domain (and any custom domain), or WalletConnect will reject the origin.
- **Pinata:** no domain configuration needed — the JWT stays server-side.

### 4. Post-deploy check

Connect a Sepolia wallet → upload a PDF → confirm the transaction on Sepolia Etherscan and the MongoDB record, then test Share/Revoke from a second wallet. Server logs are under **Vercel → Deployments → Functions**.

> **Security:** rotate any API keys or DB passwords that have been shared in plaintext, and treat the deployer private key as compromised if it was exposed. Rotating the deployer key only affects future deploys — the deployed contract is unchanged.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "NEXT_PUBLIC_CONTRACT_ADDRESS is not configured" | Set it in `.env.local` and restart `npm run dev` |
| Upload fails with 502 | Check `PINATA_JWT` in `.env.local`; verify with `pinata.testAuthentication()` |
| Upload fails from Pinata with 4xx | File must be `application/pdf` and ≤20MB; the signed URL only permits PDFs |
| "Metadata failed" toast after tx | Check `MONGODB_URI`; the on-chain registration already succeeded — the record can be re-added |
| Nothing on Shared With Me | Confirm the grantee wallet is connected on Sepolia and the owner didn't revoke |
| Wrong network errors | Switch the wallet to Sepolia (RainbowKit prompts automatically) |
