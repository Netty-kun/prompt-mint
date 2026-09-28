import Notification from "../models/Notification";
import Purchase from "../models/Purchase";
import User from "../models/User";

export interface PromptUpdatePayload {
  promptId: string;
  promptTitle: string;
  versionIndex: number;
  changelog: string;
}

function truncateMessage(text: string, maxLength = 140) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function buildPromptUpdateMessage(promptTitle: string, versionIndex: number, changelog: string) {
  return `New version of ${promptTitle} is available (v${versionIndex}): ${truncateMessage(changelog)}`;
}

async function getBuyerWallets(promptId: string): Promise<string[]> {
  const purchases = await Purchase.find({ promptId });
  const wallets = new Set<string>();
  for (const purchase of purchases) {
    if (purchase?.buyerWallet) {
      wallets.add(String(purchase.buyerWallet).toLowerCase());
    }
  }
  return Array.from(wallets);
}

export async function createPromptUpdateNotifications(payload: PromptUpdatePayload) {
  const buyerWallets = await getBuyerWallets(payload.promptId);
  if (buyerWallets.length === 0) return;

  const users = await User.find({ walletAddress: { $in: buyerWallets } });
  const message = buildPromptUpdateMessage(payload.promptTitle, payload.versionIndex, payload.changelog);

  await Promise.allSettled(
    users.map(async (user) => {
      if (!user?._id || !user.walletAddress) return;
      await Notification.create({
        promptId: payload.promptId,
        versionIndex: payload.versionIndex,
        userId: user._id,
        walletAddress: user.walletAddress.toLowerCase(),
        message,
      });
    }),
  );
}

export function enqueuePromptUpdateNotifications(payload: PromptUpdatePayload) {
  setImmediate(() => {
    createPromptUpdateNotifications(payload).catch((error) => {
      console.error("[notification] failed to enqueue prompt update notifications", error);
    });
  });
}
