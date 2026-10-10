import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface DocumentAttrs {
  title: string;
  description?: string;
  cid: string;
  ownerAddress: string;
  documentIdOnChain: number;
  uploadDate?: Date;
}

const DocumentSchema = new Schema<DocumentAttrs>({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  cid: { type: String, required: true, index: true },
  ownerAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  documentIdOnChain: { type: Number, required: true, index: true },
  uploadDate: { type: Date, default: Date.now },
});

export const DocumentModel: Model<DocumentAttrs> =
  (models.Document as Model<DocumentAttrs>) ||
  model<DocumentAttrs>("Document", DocumentSchema);
