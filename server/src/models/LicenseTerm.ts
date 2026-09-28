import mongoose from "mongoose";

const licenseTermSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    supersededAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

licenseTermSchema.index({ isActive: 1, version: -1 });

const LicenseTerm = mongoose.models.LicenseTerm || mongoose.model("LicenseTerm", licenseTermSchema);
export default LicenseTerm;
