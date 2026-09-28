import type { Request, Response } from "express";
import connectDb from "../db/connectDb";
import Prompt from "../models/Prompt";
import Purchase from "../models/Purchase";
import Report from "../models/Report";
import User from "../models/User";
import {
  calculateCreatorReputation,
  deriveCreatorActivity,
  type VerifiedCreatorLink,
} from "../services/creatorReputation";

const STELLAR_ACCOUNT = /^G[A-Z2-7]{55}$/;

export default async function creatorReputationHandler(
  req: Request,
  res: Response,
) {
  const address = String(req.query.address ?? "")
    .trim()
    .toUpperCase();
  if (!STELLAR_ACCOUNT.test(address)) {
    res
      .status(400)
      .json({ error: "A valid Stellar creator address is required." });
    return;
  }

  await connectDb();
  const user = await User.findOne({
    walletAddress: address.toLowerCase(),
  }).lean();

  if (!user) {
    res.status(200).json(
      calculateCreatorReputation({
        accountCreatedAt: null,
        completedSales: 0,
        upheldDisputes: 0,
        verifiedLinks: [],
      }),
    );
    return;
  }

  const prompts = await Prompt.find({ owner: (user as any)._id })
    .select("_id onChainId salesCount")
    .lean();
  const promptIds = prompts.flatMap((prompt: any) =>
    [
      String(prompt._id),
      prompt.onChainId ? String(prompt.onChainId) : null,
    ].filter((value): value is string => Boolean(value)),
  );
  const [purchases, disputes] = await Promise.all([
    Purchase.find({ promptId: { $in: promptIds } })
      .select("promptId buyerWallet txHash")
      .lean(),
    Report.find({ promptId: { $in: promptIds }, resolution: "upheld" })
      .select("promptId reporterAddress resolution")
      .lean(),
  ]);
  const activity = deriveCreatorActivity({
    creatorAddress: address,
    promptIds,
    indexedOnChainSales: prompts.reduce(
      (total: number, prompt: any) => total + Number(prompt.salesCount ?? 0),
      0,
    ),
    purchases: purchases.map((purchase: any) => ({
      promptId: String(purchase.promptId),
      buyerWallet: String(purchase.buyerWallet),
      txHash: String(purchase.txHash ?? ""),
    })),
    disputes: disputes.map((dispute: any) => ({
      promptId: String(dispute.promptId),
      reporterAddress: String(dispute.reporterAddress),
      resolution: dispute.resolution ? String(dispute.resolution) : null,
    })),
  });
  const verifiedLinks: VerifiedCreatorLink[] = (
    (user as any).verifiedLinks ?? []
  ).flatMap((link: any) => {
    const verifiedAt = Date.parse(String(link.verifiedAt));
    return Number.isFinite(verifiedAt)
      ? [
          {
            label: String(link.label),
            url: String(link.url),
            verifiedAt: new Date(verifiedAt).toISOString(),
            verificationMethod: String(link.verificationMethod),
          },
        ]
      : [];
  });

  res.status(200).json(
    calculateCreatorReputation({
      accountCreatedAt: (user as any).createdAt
        ? new Date((user as any).createdAt).toISOString()
        : null,
      ...activity,
      verifiedLinks,
    }),
  );
}
