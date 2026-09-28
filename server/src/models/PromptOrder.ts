import mongoose from "mongoose";

const promptOrderSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    order: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const PromptOrder = mongoose.models.PromptOrder || mongoose.model("PromptOrder", promptOrderSchema);

export default PromptOrder;
