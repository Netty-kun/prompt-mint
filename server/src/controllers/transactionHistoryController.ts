import connectDb from "../db/connectDb";
import { AppError } from "../lib/AppError";
import { asyncRoute } from "../lib/asyncRoute";
import {
  listBuyerTransactionHistory,
  listCreatorTransactionHistory,
} from "../services/transactionHistoryService";

export const GetBuyerTransactionHistory = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress } = req.params;

  if (!walletAddress) {
    throw new AppError("walletAddress is required.", 400, "MISSING_FIELDS");
  }

  const result = await listBuyerTransactionHistory(walletAddress);
  res.json(result);
});

export const GetCreatorTransactionHistory = asyncRoute(async (req, res) => {
  await connectDb();
  const { walletAddress } = req.params;

  if (!walletAddress) {
    throw new AppError("walletAddress is required.", 400, "MISSING_FIELDS");
  }

  const result = await listCreatorTransactionHistory(walletAddress);
  res.json(result);
});
