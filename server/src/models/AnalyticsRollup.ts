import mongoose from "mongoose";

/**
 * Daily rollup of on-chain marketplace activity (issue #288). One document
 * per UTC calendar day, keyed by `date` (YYYY-MM-DD) and upserted on every
 * cron run so a partial day's numbers only grow more accurate over the day
 * rather than producing a new document per run.
 */
const analyticsRollupSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD", UTC
      required: true,
      unique: true,
      index: true,
    },
    salesCount: {
      type: Number,
      required: true,
      default: 0,
    },
    volumeStroops: {
      type: Number,
      required: true,
      default: 0,
    },
    activeUsers: {
      type: Number,
      required: true,
      default: 0,
    },
    lastRolledUpAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

export const AnalyticsRollup =
  mongoose.models.AnalyticsRollup || mongoose.model("AnalyticsRollup", analyticsRollupSchema);
