import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { connectDB } from "@/lib/mongodb";
import { DocumentModel } from "@/models/Document";

export const runtime = "nodejs";

function serialize(doc: {
  _id: unknown;
  title: string;
  description?: string;
  cid: string;
  ownerAddress: string;
  documentIdOnChain: number;
  uploadDate?: Date;
}) {
  return {
    _id: String(doc._id),
    title: doc.title,
    description: doc.description ?? "",
    cid: doc.cid,
    ownerAddress: doc.ownerAddress,
    documentIdOnChain: doc.documentIdOnChain,
    uploadDate: (doc.uploadDate ?? new Date()).toISOString(),
  };
}

/**
 * GET /api/documents?owner=0x...      -> metadata for an owner
 * GET /api/documents?ids=1,2,3        -> metadata for on-chain ids
 */
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner");
  const ids = req.nextUrl.searchParams.get("ids");

  if (!owner && !ids) {
    return NextResponse.json(
      { error: "Provide ?owner=0x... or ?ids=1,2,3" },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    let query: Record<string, unknown>;
    if (owner) {
      if (!isAddress(owner)) {
        return NextResponse.json(
          { error: "Invalid owner address" },
          { status: 400 }
        );
      }
      query = { ownerAddress: owner.toLowerCase() };
    } else {
      const parsed = (ids ?? "")
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0);
      if (parsed.length === 0) {
        return NextResponse.json({ documents: [] });
      }
      query = { documentIdOnChain: { $in: parsed } };
    }

    const documents = await DocumentModel.find(query)
      .sort({ documentIdOnChain: -1 })
      .lean();

    return NextResponse.json({ documents: documents.map(serialize) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Body: { title, description?, cid, ownerAddress, documentIdOnChain }
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, cid, ownerAddress, documentIdOnChain } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof cid !== "string" || !cid.trim()) {
    return NextResponse.json({ error: "cid is required" }, { status: 400 });
  }
  if (typeof ownerAddress !== "string" || !isAddress(ownerAddress)) {
    return NextResponse.json(
      { error: "ownerAddress must be a valid address" },
      { status: 400 }
    );
  }
  if (
    typeof documentIdOnChain !== "number" ||
    !Number.isInteger(documentIdOnChain) ||
    documentIdOnChain < 0
  ) {
    return NextResponse.json(
      { error: "documentIdOnChain must be a non-negative integer" },
      { status: 400 }
    );
  }
  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json(
      { error: "description must be a string" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const document = await DocumentModel.create({
      title: title.trim(),
      description: (description ?? "").trim(),
      cid: cid.trim(),
      ownerAddress: ownerAddress.toLowerCase(),
      documentIdOnChain,
    });
    return NextResponse.json({ document: serialize(document) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
