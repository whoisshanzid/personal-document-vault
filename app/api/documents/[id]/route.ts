import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAddress } from "viem";
import { connectDB } from "@/lib/mongodb";
import { DocumentModel } from "@/models/Document";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  try {
    await connectDB();
    const document = await DocumentModel.findById(id).lean();
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({
      document: {
        _id: String(document._id),
        title: document.title,
        description: document.description ?? "",
        cid: document.cid,
        ownerAddress: document.ownerAddress,
        documentIdOnChain: document.documentIdOnChain,
        uploadDate: (document.uploadDate ?? new Date()).toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/documents/[id]?requester=0x...
 * Only the wallet recorded as ownerAddress may delete the metadata.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  const requester = req.nextUrl.searchParams.get("requester");
  if (!requester || !isAddress(requester)) {
    return NextResponse.json(
      { error: "A valid ?requester=0x... address is required" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const document = await DocumentModel.findById(id).lean();
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (document.ownerAddress !== requester.toLowerCase()) {
      return NextResponse.json(
        { error: "Only the document owner may delete this record" },
        { status: 403 }
      );
    }
    await DocumentModel.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
