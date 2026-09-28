import connectDb from "../db/connectDb";
import { asyncRoute } from "../lib/asyncRoute";
import { getRecentRollups, runAnalyticsRollup } from "../services/analyticsRollup";

/** Returns the last N days (default 30, max 365) of daily analytics rollups. */
export const GetAnalyticsRollups = asyncRoute(async (req, res) => {
  await connectDb();
  const days = Number(req.query.days) || 30;
  const rollups = await getRecentRollups(days);
  res.json(rollups);
});

/**
 * Manually triggers a rollup recompute for today, in addition to the
 * 5-minute cron schedule — useful for tests/ops without waiting for the
 * next tick.
 */
export const TriggerAnalyticsRollup = asyncRoute(async (_req, res) => {
  await connectDb();
  await runAnalyticsRollup();
  res.status(200).json({ message: "Rollup triggered." });
});
