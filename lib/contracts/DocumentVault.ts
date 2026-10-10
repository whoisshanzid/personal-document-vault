import type { Abi } from "viem";

/**
 * ABI of the deployed DocumentVault contract (Solidity ^0.8.20).
 * Address is read from NEXT_PUBLIC_CONTRACT_ADDRESS at runtime.
 */
export const documentVaultAbi = [
  {
    type: "function",
    name: "registerDocument",
    stateMutability: "nonpayable",
    inputs: [
      { name: "cid", type: "string" },
      { name: "title", type: "string" },
    ],
    outputs: [{ name: "documentId", type: "uint256" }],
  },
  {
    type: "function",
    name: "grantAccess",
    stateMutability: "nonpayable",
    inputs: [
      { name: "documentId", type: "uint256" },
      { name: "grantee", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeAccess",
    stateMutability: "nonpayable",
    inputs: [
      { name: "documentId", type: "uint256" },
      { name: "grantee", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "checkAccess",
    stateMutability: "view",
    inputs: [
      { name: "documentId", type: "uint256" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getDocument",
    stateMutability: "view",
    inputs: [{ name: "documentId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "cid", type: "string" },
          { name: "title", type: "string" },
          { name: "owner", type: "address" },
          { name: "uploadedAt", type: "uint256" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getMyDocuments",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getDocumentsSharedWithMe",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "getDocumentCount",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getSharedWithMeCount",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "nextDocumentId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "DocumentRegistered",
    inputs: [
      { name: "documentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "cid", type: "string", indexed: false },
      { name: "title", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AccessGranted",
    inputs: [
      { name: "documentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "grantee", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "AccessRevoked",
    inputs: [
      { name: "documentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "grantee", type: "address", indexed: true },
    ],
  },
] as const satisfies Abi;

export const documentVaultAddress = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined;

export function isContractConfigured(): boolean {
  return Boolean(documentVaultAddress);
}

export function assertContractConfigured(): `0x${string}` {
  if (!documentVaultAddress) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Add the deployed contract address to .env.local."
    );
  }
  return documentVaultAddress;
}
