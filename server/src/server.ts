import "dotenv/config";
import express from "express";
import cors from "cors";
import { TestPromptProxy } from "./controllers/controllers";
import { proxyrouter } from "./routes/proxyRoutes";
import { promptRouter } from "./routes/promptRoutes";
import { userRouter } from "./routes/userRoutes";
import { chatRouter } from "./routes/chatRoutes";
import { webhookRouter } from "./routes/webhookRoutes";
import { versioningRouter } from "./routes/versioningRoutes";
import { governanceRouter } from "./routes/governanceRoutes"; // Issue #113
import { appealRouter } from "./routes/appealRoutes";
import { robotsRouter } from "./routes/robotsRoutes";
import { licenseTermsRouter } from "./routes/licenseTermsRoutes";
import { runBackup, getBackupHealth } from "./services/backupService";
import { runRestoreDrill } from "./services/restoreService";
import { IndexerState } from "./models/IndexerState"; 
import creatorReputationHandler from "./controllers/creatorReputationController";
import cron from "node-cron";
import { JSON_BODY_LIMIT, jsonBodyTooLargeHandler } from "./middleware/bodySizeLimit";
import { idempotency } from "./middleware/idempotency";
import { sendWeeklyCreatorMetricsDigests } from "./services/creatorMetricsDigest";

const app = express();

const port = 5000;

app.use(cors());

app.use(express.json({ limit: JSON_BODY_LIMIT }));

// Body-parser throws a 413 "entity.too.large" error before any route runs;
// surface it as a clean JSON response instead of an HTML stack trace.
app.use(jsonBodyTooLargeHandler);

// Replays the cached response for a retried state-changing request that
// carries a matching Idempotency-Key header; a no-op for every other
// request, so this is safe to apply ahead of all routers. (Issue #89)
app.use(idempotency());

app.use(robotsRouter);

app.use("/api/improve-proxy", proxyrouter);

app.use("/api/prompts", promptRouter);

app.use("/api/user", userRouter);

app.use("/api/chat", chatRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/versions", versioningRouter);
app.use("/api/governance", governanceRouter); // Issue #113
app.get("/api/creators/reputation", creatorReputationHandler);

app.post("/api/test-prompt", TestPromptProxy);

app.get("/health", async (req, res) => {
  const [state, backupHealth] = await Promise.all([
    IndexerState.findOne({ key: "prompt_hash_contract" }),
    getBackupHealth(),
  ]);
  res.json({
    status: "ok",
    indexer: {
      lastProcessedLedger: state?.lastIndexedLedger || 0,
      timestamp: new Date(),
    },
    backup: backupHealth,
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);

  const creatorDigestSchedule = process.env.CREATOR_METRICS_DIGEST_CRON || "0 9 * * 1";
  cron.schedule(
    creatorDigestSchedule,
    () => {
      sendWeeklyCreatorMetricsDigests().catch((err) => {
        console.error("[creatorMetricsDigest] Scheduled digest run failed:", err?.message ?? err);
      });
    },
    { timezone: "UTC" },
  );
  console.log(`[creatorMetricsDigest] Weekly schedule started (${creatorDigestSchedule} UTC).`);

  // STARTS THE INDEXER HERE
  // startIndexer().catch((err: any) => {
  //   console.error("Failed to start Soroban Indexer:", err);
  // });

  // DAILY AUTOMATED BACKUP — runs immediately on startup then every 24 h.
  // Use BACKUP_S3_BUCKET env var to enable; silently skips if not configured.
  if (process.env.BACKUP_S3_BUCKET) {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const triggerBackup = () => {
      runBackup().catch((err) => {
        console.error("[backup] Scheduled backup failed:", err?.message ?? err);
      });
    };
    // Run once on startup, then on a 24-hour interval.
    triggerBackup();
    setInterval(triggerBackup, TWENTY_FOUR_HOURS);
    console.log("[backup] Daily backup scheduler started.");
    // DAILY RESTORE DRILL — optional, controlled via ENABLE_RESTORE_DRILL env var
    if (process.env.ENABLE_RESTORE_DRILL) {
      const schedule = process.env.RESTORE_DRILL_CRON || '0 3 * * *'; // default 03:00 UTC daily
      cron.schedule(schedule, () => {
        runRestoreDrill().catch((err: any) => {
          console.error('[restore] Scheduled drill failed:', err?.message ?? err);
        });
      });
      console.log('[restore] Restore drill scheduler started.');
    }
  }
});
