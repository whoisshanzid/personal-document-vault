import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { connectDB } from "@/lib/mongodb";
import { DocumentModel } from "@/models/Document";

export const runtime = "nodejs";

/**
 * GET /api/documents/shared?address=0x...&ids=1,2,3
 *
 * The source of truth for "shared with me" lives on-chain
 * (DocumentVault.getDocumentsSharedWithMe). This route only serves the
 * Mongo metadata for a set of on-chain ids, so the client can merge it
 * with the chain results.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const ids = req.nextUrl.searchParams.get("ids");

  if (!address || !isAddress(address)) {
    return NextResponse.json(
      { error: "A valid ?address=0x... is required" },
      { status: 400 }
    );
  }

  const parsedIds = (ids ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0);

  if (parsedIds.length === 0) {
    return NextResponse.json({ documents: [] });
  }

  try {
    await connectDB();
    const documents = await DocumentModel.find({
      documentIdOnChain: { $in: parsedIds },
    })
      .sort({ documentIdOnChain: -1 })
      .lean();

    return NextResponse.json({
      documents: documents.map((doc) => ({
        _id: String(doc._id),
        title: doc.title,
        description: doc.description ?? "",
        cid: doc.cid,
        ownerAddress: doc.ownerAddress,
        documentIdOnChain: doc.documentIdOnChain,
        uploadDate: (doc.uploadDate ?? new Date()).toISOString(),
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load shared documents";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
