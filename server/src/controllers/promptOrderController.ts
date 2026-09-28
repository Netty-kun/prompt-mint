import connectDb from "../db/connectDb";
import PromptOrder from "../models/PromptOrder";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";

const MAX_ORDER_LENGTH = 1000;

export const GetPromptOrder = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress } = req.query;

  if (!walletAddress) {
    throw new AppError("walletAddress query param is required.", 400, "MISSING_FIELDS");
  }

  const doc = await PromptOrder.findOne({
    walletAddress: String(walletAddress).toLowerCase(),
  });

  res.json({ order: doc?.order ?? [] });
});

export const SetPromptOrder = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress, order } = req.body;

  if (!walletAddress || typeof walletAddress !== "string") {
    throw new AppError("walletAddress is required.", 400, "MISSING_FIELDS");
  }

  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    throw new AppError("order must be an array of prompt id strings.", 400, "INVALID_INPUT");
  }

  if (order.length > MAX_ORDER_LENGTH) {
    throw new AppError(`order cannot exceed ${MAX_ORDER_LENGTH} entries.`, 400, "INVALID_INPUT");
  }

  const updated = await PromptOrder.findOneAndUpdate(
    { walletAddress: walletAddress.toLowerCase() },
    { $set: { order } },
    { new: true, upsert: true },
  );

  res.json({ order: updated.order });
});
