import { withObservability } from "../../src/lib/observability/wrapper";
import { withBodySizeLimit } from "../../src/lib/api/bodySizeLimit";
import connectDb from "../../server/src/db/connectDb";
import WebhookSubscription from "../../server/src/models/WebhookSubscription";
import { randomBytes } from "crypto";
import { negotiateVersion } from "../../src/lib/api/versionGuard";
import { withVersion } from "../../src/lib/api/payloadVersion";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";

async function handler(req: any, res: any) {
  await connectDb();

  const version = negotiateVersion(req, res);
  if (!version) return;

  if (req.method === "GET") {
    const { walletAddress } = req.query ?? {};
    if (!walletAddress) {
      res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "walletAddress query param is required.", undefined, version));
      return;
    }
    const sub = await WebhookSubscription.findOne({
      walletAddress: String(walletAddress).toLowerCase(),
    }).select("-secret");
    if (!sub) {
      res.status(404).json({ apiVersion: version, error: "No webhook registered for this wallet." });
      return;
    }
    res.status(200).json(withVersion({ webhook: sub }, version));
    return;
  }

  if (req.method === "POST") {
    const { walletAddress, url, events } = req.body ?? {};
    if (!walletAddress || !url) {
      res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "walletAddress and url are required.", undefined, version));
      return;
    }
    try {
      new URL(url);
    } catch {
      res.status(400).json(apiError(ErrorCode.INVALID_INPUT, "url must be a valid URL.", undefined, version));
      return;
    }

    const secret = randomBytes(32).toString("hex");
    const allowedEvents = ["PromptPurchased"];
    const resolvedEvents = Array.isArray(events)
      ? events.filter((e: string) => allowedEvents.includes(e))
      : ["PromptPurchased"];

    const existing = await WebhookSubscription.findOne({
      walletAddress: String(walletAddress).toLowerCase(),
    });

    if (existing) {
      existing.url = url;
      existing.events = resolvedEvents;
      existing.active = true;
      existing.failureCount = 0;
      await existing.save();
      res.status(200).json(withVersion({ message: "Webhook updated.", id: existing._id, secret }, version));
      return;
    }

    const sub = new WebhookSubscription({
      walletAddress: String(walletAddress).toLowerCase(),
      url,
      secret,
      events: resolvedEvents,
    });
    await sub.save();
    res.status(201).json(withVersion({ message: "Webhook registered.", id: sub._id, secret }, version));
    return;
  }

  if (req.method === "DELETE") {
    const { walletAddress } = req.body ?? {};
    if (!walletAddress) {
      res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "walletAddress is required.", undefined, version));
      return;
    }
    await WebhookSubscription.deleteOne({ walletAddress: String(walletAddress).toLowerCase() });
    res.status(200).json(withVersion({ message: "Webhook removed." }, version));
    return;
  }

  res.status(405).json(apiError(ErrorCode.METHOD_NOT_ALLOWED, "Method not allowed.", undefined, version));
}

export default withObservability(withBodySizeLimit(handler), "webhooks");
