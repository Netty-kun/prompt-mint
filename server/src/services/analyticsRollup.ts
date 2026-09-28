import mongoose from "mongoose";
import Purchase from "../models/Purchase";
import { AnalyticsRollup } from "../models/AnalyticsRollup";

/** Returns the current UTC calendar day as "YYYY-MM-DD". */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfUtcDay(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function endOfUtcDay(date: string): Date {
  return new Date(`${date}T23:59:59.999Z`);
}

interface RollupTotals {
  salesCount: number;
  volumeStroops: number;
  activeUsers: number;
}

/**
 * Aggregates today's Purchase records — joined against Prompt for price —
 * into { salesCount, volumeStroops, activeUsers }. `volumeStroops` sums each
 * purchase's price at the time of aggregation (not a purchase-time snapshot,
 * since Purchase doesn't currently store the paid amount); if a prompt's
 * price changes intraday, earlier purchases in the same rollup re-price at
 * the current price on every re-run. Documented limitation rather than a
 * schema change to Purchase, which is out of scope here.
 */
async function computeDailyTotals(date: string): Promise<RollupTotals> {
  const start = startOfUtcDay(date);
  const end = endOfUtcDay(date);

  const [result] = await Purchase.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $lookup: {
        from: "prompts",
        let: { promptId: "$promptId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", { $toObjectId: "$$promptId" }],
              },
            },
          },
          { $project: { price: 1 } },
        ],
        as: "prompt",
      },
    },
    { $unwind: { path: "$prompt", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        salesCount: { $sum: 1 },
        volumeStroops: { $sum: { $ifNull: ["$prompt.price", 0] } },
        buyers: { $addToSet: "$buyerWallet" },
      },
    },
    {
      $project: {
        _id: 0,
        salesCount: 1,
        volumeStroops: 1,
        activeUsers: { $size: "$buyers" },
      },
    },
  ]);

  return (
    result ?? {
      salesCount: 0,
      volumeStroops: 0,
      activeUsers: 0,
    }
  );
}

/**
 * Recomputes and upserts today's analytics rollup document. Safe to call
 * repeatedly (e.g. every 5 minutes via cron) — each run replaces the day's
 * totals with a fresh aggregate rather than incrementing, so a crashed or
 * skipped run never causes drift.
 */
export async function runAnalyticsRollup(): Promise<void> {
  // Only attempt the aggregation once Mongoose has an active connection —
  // matches the indexer's own defensive posture around startup ordering.
  if (mongoose.connection.readyState !== 1) return;

  const date = todayUtc();
  try {
    const totals = await computeDailyTotals(date);
    await AnalyticsRollup.findOneAndUpdate(
      { date },
      { ...totals, lastRolledUpAt: new Date() },
      { upsert: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    console.error("[analyticsRollup] Failed to compute rollup for", date, err);
  }
}

/**
 * Returns rollup documents for the last `days` UTC calendar days
 * (including today), oldest first.
 */
export async function getRecentRollups(days: number): Promise<unknown[]> {
  const boundedDays = Math.min(Math.max(days, 1), 365);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - boundedDays + 1);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  return AnalyticsRollup.find({ date: { $gte: cutoffDate } })
    .sort({ date: 1 })
    .lean();
}
