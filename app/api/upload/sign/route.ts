import { NextRequest, NextResponse } from "next/server";
import { getPinata } from "@/lib/pinata";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * POST /api/upload/sign  (JSON: { name, size })
 *
 * Returns a short-lived Pinata signed upload URL. The browser uploads the PDF
 * directly to Pinata, which keeps PINATA_JWT server-side and avoids the
 * serverless request-body limit (Vercel caps function bodies at ~4.5MB).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const name = (body as { name?: unknown } | null)?.name;
  const size = (body as { size?: unknown } | null)?.size;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof size === "number" && size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 20MB size limit" },
      { status: 400 }
    );
  }

  try {
    const pinata = getPinata();
    const url = await pinata.upload.public.createSignedURL({
      expires: SIGNED_URL_TTL_SECONDS,
      maxFileSize: MAX_SIZE_BYTES,
      name: name.trim(),
      mimeTypes: ["application/pdf"],
    });
    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
