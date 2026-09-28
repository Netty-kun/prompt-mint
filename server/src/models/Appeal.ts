import mongoose from "mongoose";

const appealAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { _id: false },
);

const appealSchema = new mongoose.Schema(
  {
    appealId: { type: String, required: true, unique: true, index: true },
    reviewId: { type: String, required: true, index: true },
    appellantAddress: { type: String, required: true, lowercase: true, index: true },
    reason: { type: String, required: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ["submitted", "under_review", "decision", "resolved", "rejected"],
      default: "submitted",
      index: true,
    },
    attachments: { type: [appealAttachmentSchema], default: [] },
  },
  { timestamps: true },
);

appealSchema.index({ reviewId: 1, appellantAddress: 1 }, { unique: true });

export const Appeal = mongoose.models.Appeal || mongoose.model("Appeal", appealSchema);