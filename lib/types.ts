/** Document metadata stored in MongoDB (never the PDF itself). */
export interface DocumentMeta {
  _id: string;
  title: string;
  description?: string;
  cid: string;
  ownerAddress: string;
  documentIdOnChain: number;
  uploadDate: string;
}

/** Payload accepted by POST /api/documents. */
export interface CreateDocumentPayload {
  title: string;
  description?: string;
  cid: string;
  ownerAddress: string;
  documentIdOnChain: number;
}

/** Document struct as returned by the contract's getDocument(). */
export interface OnChainDocument {
  id: bigint;
  cid: string;
  title: string;
  owner: `0x${string}`;
  uploadedAt: bigint;
  exists: boolean;
}

/** On-chain data merged with Mongo metadata for rendering. */
export interface MergedDocument {
  documentId: bigint;
  cid: string;
  title: string;
  owner: string;
  uploadedAt: Date;
  description?: string;
  mongoId?: string;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
