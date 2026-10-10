import type { CreateDocumentPayload, DocumentMeta } from "@/lib/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Uploads a PDF to IPFS via Pinata.
 *
 * The server issues a short-lived signed URL (PINATA_JWT never leaves the
 * server); the browser then uploads the file directly to Pinata, so large
 * files are not limited by the serverless request-body size.
 */
export async function uploadPdf(file: File): Promise<{ cid: string }> {
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed");
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("File exceeds the 20MB size limit");
  }

  const { url } = await request<{ url: string }>("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size }),
  });

  const form = new FormData();
  form.append("file", file, file.name);

  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    let message = `Upload failed with status ${res.status}`;
    try {
      const errBody = (await res.json()) as {
        error?: string;
        message?: string;
      };
      message = errBody.error ?? errBody.message ?? message;
    } catch {
      /* non-JSON body */
    }
    throw new Error(message);
  }

  const body = (await res.json()) as {
    cid?: string;
    data?: { cid?: string; files?: { cid?: string }[] };
  } | null;

  const cid =
    body?.data?.cid ?? body?.cid ?? body?.data?.files?.[0]?.cid;

  if (!cid) {
    throw new Error("Upload succeeded but no CID was returned");
  }
  return { cid };
}

/** Saves document metadata in MongoDB. */
export async function createDocument(
  payload: CreateDocumentPayload
): Promise<{ document: DocumentMeta }> {
  return request<{ document: DocumentMeta }>("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Deletes metadata (only allowed for the owner). */
export async function deleteDocument(
  mongoId: string,
  requester: string
): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(
    `/api/documents/${mongoId}?requester=${encodeURIComponent(requester)}`,
    { method: "DELETE" }
  );
}
