"use client";

import { useCallback, useMemo } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEventLogs } from "viem";
import {
  assertContractConfigured,
  documentVaultAbi,
} from "@/lib/contracts/DocumentVault";
import { contractChainId } from "@/lib/wagmi";

export interface WriteState {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  error: Error | null;
  hash?: `0x${string}`;
  reset: () => void;
}

export function useRegisterDocument(): WriteState & {
  register: (cid: string, title: string) => void;
  documentId: bigint | undefined;
} {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const register = useCallback(
    (cid: string, title: string) => {
      const address = assertContractConfigured();
      writeContract({
        abi: documentVaultAbi,
        address,
        functionName: "registerDocument",
        args: [cid, title],
        chainId: contractChainId,
      });
    },
    [writeContract]
  );

  const documentId = useMemo<bigint | undefined>(() => {
    if (!receipt) return undefined;
    try {
      const logs = parseEventLogs({
        logs: receipt.logs,
        abi: documentVaultAbi,
        eventName: "DocumentRegistered",
        strict: false,
      });
      const match = logs.find(
        (log) =>
          log.address.toLowerCase() === receipt.to?.toLowerCase() &&
          typeof log.args?.documentId === "bigint"
      );
      return match?.args?.documentId;
    } catch {
      return undefined;
    }
  }, [receipt]);

  return {
    register,
    documentId,
    isPending,
    isConfirming,
    isSuccess: isSuccess && documentId !== undefined,
    error: (error ?? receiptError) as Error | null,
    hash,
    reset,
  };
}

function useAccessWrite(functionName: "grantAccess" | "revokeAccess") {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const submit = useCallback(
    (documentId: bigint, grantee: `0x${string}`) => {
      const address = assertContractConfigured();
      writeContract({
        abi: documentVaultAbi,
        address,
        functionName,
        args: [documentId, grantee],
        chainId: contractChainId,
      });
    },
    [writeContract, functionName]
  );

  return {
    submit,
    isPending,
    isConfirming,
    isSuccess,
    error: (error ?? receiptError) as Error | null,
    hash,
    reset,
  };
}

export function useGrantAccess() {
  return useAccessWrite("grantAccess");
}

export function useRevokeAccess() {
  return useAccessWrite("revokeAccess");
}
