"use client";

import * as React from "react";
import { useAccount, usePublicClient, useReadContract, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type Address, type PublicClient } from "viem";
import {
  documentVaultAbi,
  documentVaultAddress,
  isContractConfigured,
} from "@/lib/contracts/DocumentVault";
import { contractChainId } from "@/lib/wagmi";
import type { DocumentMeta, MergedDocument, OnChainDocument } from "@/lib/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/** Non-null only when NEXT_PUBLIC_CONTRACT_ADDRESS is configured. */
const contractAddress = documentVaultAddress as `0x${string}`;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error;
    throw new Error(message ?? `Request failed with status ${res.status}`);
  }
  return body as T;
}

function normalize(raw: unknown): OnChainDocument | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const [id, cid, title, owner, uploadedAt, exists] = raw as [
      bigint,
      string,
      string,
      `0x${string}`,
      bigint,
      boolean,
    ];
    return { id, cid, title, owner, uploadedAt, exists };
  }
  const obj = raw as Partial<OnChainDocument>;
  if (typeof obj.id === "bigint" && typeof obj.cid === "string") {
    return {
      id: obj.id,
      cid: obj.cid,
      title: obj.title ?? "",
      owner: (obj.owner ?? ZERO_ADDRESS) as `0x${string}`,
      uploadedAt: obj.uploadedAt ?? 0n,
      exists: obj.exists ?? true,
    };
  }
  return null;
}

function mergeDocs(
  chainDocs: OnChainDocument[],
  metas: DocumentMeta[] | undefined
): MergedDocument[] {
  const byId = new Map<number, DocumentMeta>();
  for (const meta of metas ?? []) {
    byId.set(meta.documentIdOnChain, meta);
  }
  return chainDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const meta = byId.get(Number(doc.id));
      return {
        documentId: doc.id,
        cid: doc.cid,
        title: doc.title,
        owner: doc.owner,
        uploadedAt: new Date(Number(doc.uploadedAt) * 1000),
        description: meta?.description,
        mongoId: meta?._id,
      } satisfies MergedDocument;
    })
    .sort((a, b) => Number(b.documentId - a.documentId));
}

function useOwnerMetas(owner: Address | undefined) {
  return useQuery({
    queryKey: ["documents", "owner", owner],
    enabled: Boolean(owner) && isContractConfigured(),
    queryFn: async () => {
      const data = await fetchJson<{ documents: DocumentMeta[] }>(
        `/api/documents?owner=${owner}`
      );
      return data.documents;
    },
  });
}

export interface DocumentsResult {
  documents: MergedDocument[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMyDocuments(): DocumentsResult {
  const { address, isConnected } = useAccount();
  const enabled =
    isConnected && Boolean(address) && isContractConfigured();

  const idsQuery = useReadContract({
    abi: documentVaultAbi,
    address: contractAddress,
    functionName: "getMyDocuments",
    account: address,
    chainId: contractChainId,
    query: { enabled },
  });

  const ids = React.useMemo(() => (idsQuery.data ?? []) as bigint[], [idsQuery.data]);

  const docsQuery = useReadContracts({
    allowFailure: false,
    contracts: ids.map((id) => ({
      abi: documentVaultAbi,
      address: contractAddress,
      functionName: "getDocument" as const,
      args: [id],
      chainId: contractChainId,
    })),
    query: { enabled: ids.length > 0 },
  });

  const metasQuery = useOwnerMetas(address);

  const documents = React.useMemo(() => {
    const chainDocs = ((docsQuery.data ?? []) as unknown[])
      .map(normalize)
      .filter((d): d is OnChainDocument => d !== null);
    return mergeDocs(chainDocs, metasQuery.data);
  }, [docsQuery.data, metasQuery.data]);

  const error =
    (idsQuery.error as Error | null) ??
    (docsQuery.error as Error | null) ??
    (metasQuery.error as Error | null);

  return {
    documents,
    isLoading: enabled && (idsQuery.isPending || docsQuery.isFetching || metasQuery.isFetching),
    error,
    refetch: () => {
      void idsQuery.refetch();
      void docsQuery.refetch();
      void metasQuery.refetch();
    },
  };
}

export function useSharedWithMe(): DocumentsResult & { accessLoading: boolean } {
  const { address, isConnected } = useAccount();
  const enabled = isConnected && Boolean(address) && isContractConfigured();

  const idsQuery = useReadContract({
    abi: documentVaultAbi,
    address: contractAddress,
    functionName: "getDocumentsSharedWithMe",
    account: address,
    chainId: contractChainId,
    query: { enabled },
  });

  const ids = React.useMemo(() => (idsQuery.data ?? []) as bigint[], [idsQuery.data]);
  const me = (address ?? ZERO_ADDRESS) as `0x${string}`;

  const docsQuery = useReadContracts({
    allowFailure: false,
    contracts: ids.map((id) => ({
      abi: documentVaultAbi,
      address: contractAddress,
      functionName: "getDocument" as const,
      args: [id],
      chainId: contractChainId,
    })),
    query: { enabled: ids.length > 0 },
  });

  const accessQuery = useReadContracts({
    allowFailure: false,
    contracts: ids.map((id) => ({
      abi: documentVaultAbi,
      address: contractAddress,
      functionName: "checkAccess" as const,
      args: [id, me],
      chainId: contractChainId,
    })),
    query: { enabled: ids.length > 0 && Boolean(address) },
  });

  const idsKey = ids.map(String).join(",");
  const metasQuery = useQuery({
    queryKey: ["documents", "shared", address, idsKey],
    enabled: Boolean(address) && ids.length > 0,
    queryFn: async () => {
      const params = new URLSearchParams({ address: me });
      params.set("ids", idsKey.split(",").join(","));
      const data = await fetchJson<{ documents: DocumentMeta[] }>(
        `/api/documents/shared?${params.toString()}`
      );
      return data.documents;
    },
  });

  const documents = React.useMemo(() => {
    const chainDocs = ((docsQuery.data ?? []) as unknown[])
      .map(normalize)
      .filter((d): d is OnChainDocument => d !== null);

    const access = accessQuery.data ?? [];
    const allowed = chainDocs.filter((doc, index) => access[index] === true);
    return mergeDocs(allowed, metasQuery.data);
  }, [docsQuery.data, accessQuery.data, metasQuery.data]);

  const error =
    (idsQuery.error as Error | null) ??
    (docsQuery.error as Error | null) ??
    (accessQuery.error as Error | null) ??
    (metasQuery.error as Error | null);

  return {
    documents,
    isLoading:
      enabled &&
      (idsQuery.isPending ||
        docsQuery.isFetching ||
        accessQuery.isFetching ||
        metasQuery.isFetching),
    accessLoading: accessQuery.isFetching,
    error,
    refetch: () => {
      void idsQuery.refetch();
      void docsQuery.refetch();
      void accessQuery.refetch();
      void metasQuery.refetch();
    },
  };
}

// -------------------- Dashboard --------------------

const accessGrantedEvent = parseAbiItem(
  "event AccessGranted(uint256 indexed documentId, address indexed owner, address indexed grantee)"
);
const accessRevokedEvent = parseAbiItem(
  "event AccessRevoked(uint256 indexed documentId, address indexed owner, address indexed grantee)"
);

interface AccessLogs {
  granted: { documentId: bigint }[];
  revoked: { documentId: bigint }[];
}

async function fetchAccessLogs(
  client: PublicClient,
  contract: `0x${string}`,
  owner: Address
): Promise<AccessLogs | null> {
  const deployBlock = BigInt(
    process.env.NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK ?? "0"
  );
  const latest = await client.getBlockNumber();

  const getRange = async (from: bigint, to: bigint) => {
    const [granted, revoked] = await Promise.all([
      client.getLogs({
        address: contract,
        event: accessGrantedEvent,
        args: { owner },
        fromBlock: from,
        toBlock: to,
      }),
      client.getLogs({
        address: contract,
        event: accessRevokedEvent,
        args: { owner },
        fromBlock: from,
        toBlock: to,
      }),
    ]);
    return {
      granted: granted
        .map((log) => log.args?.documentId)
        .filter((id): id is bigint => typeof id === "bigint")
        .map((documentId) => ({ documentId })),
      revoked: revoked
        .map((log) => log.args?.documentId)
        .filter((id): id is bigint => typeof id === "bigint")
        .map((documentId) => ({ documentId })),
    };
  };

  // Fast path: whole range in a single request.
  try {
    return await getRange(deployBlock, latest);
  } catch {
    /* provider rejected the range — fall through to chunked scan */
  }

  // Fallback: bounded chunked scan walking backwards from the latest block.
  const chunkSize = 25_000n;
  const maxChunks = 40;
  const granted: { documentId: bigint }[] = [];
  const revoked: { documentId: bigint }[] = [];
  let to = latest;

  for (let i = 0; i < maxChunks && to > deployBlock; i++) {
    const from = to - chunkSize > deployBlock ? to - chunkSize : deployBlock;
    try {
      const chunk = await getRange(from, to);
      granted.push(...chunk.granted);
      revoked.push(...chunk.revoked);
    } catch {
      return granted.length || revoked.length ? { granted, revoked } : null;
    }
    to = from;
  }

  return { granted, revoked };
}

export interface DashboardCounts {
  totalDocuments: bigint | undefined;
  sharedWithMeCount: bigint | undefined;
  sharedByMeCount: number | null;
  isLoading: boolean;
  isSharedByMeLoading: boolean;
  error: Error | null;
}

export function useDashboardCounts(): DashboardCounts {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: contractChainId });
  const enabled = isConnected && Boolean(address) && isContractConfigured();

  const totalQuery = useReadContract({
    abi: documentVaultAbi,
    address: contractAddress,
    functionName: "getDocumentCount",
    args: [address ?? ZERO_ADDRESS],
    chainId: contractChainId,
    query: { enabled },
  });

  const sharedQuery = useReadContract({
    abi: documentVaultAbi,
    address: contractAddress,
    functionName: "getSharedWithMeCount",
    args: [address ?? ZERO_ADDRESS],
    chainId: contractChainId,
    query: { enabled },
  });

  const [sharedByMe, setSharedByMe] = React.useState<number | null>(null);
  const [isSharedByMeLoading, setSharedByMeLoading] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || !publicClient || !address) {
      setSharedByMe(null);
      setSharedByMeLoading(false);
      return;
    }
    let cancelled = false;
    setSharedByMeLoading(true);
    (async () => {
      try {
        const logs = await fetchAccessLogs(publicClient, contractAddress, address);
        if (cancelled) return;
        if (!logs) {
          setSharedByMe(null);
          return;
        }
        const net = new Map<string, number>();
        for (const log of logs.granted) {
          const key = log.documentId.toString();
          net.set(key, (net.get(key) ?? 0) + 1);
        }
        for (const log of logs.revoked) {
          const key = log.documentId.toString();
          net.set(key, (net.get(key) ?? 0) - 1);
        }
        setSharedByMe([...net.values()].filter((v) => v > 0).length);
      } catch {
        if (!cancelled) setSharedByMe(null);
      } finally {
        if (!cancelled) setSharedByMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, publicClient, address]);

  return {
    totalDocuments: totalQuery.data,
    sharedWithMeCount: sharedQuery.data,
    sharedByMeCount: sharedByMe,
    isLoading: enabled && (totalQuery.isPending || sharedQuery.isPending),
    isSharedByMeLoading,
    error: (totalQuery.error as Error | null) ?? (sharedQuery.error as Error | null),
  };
}
