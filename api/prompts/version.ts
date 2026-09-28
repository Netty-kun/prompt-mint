import { withObservability } from "../../src/lib/observability/wrapper";
import { withBodySizeLimit } from "../../src/lib/api/bodySizeLimit";
import connectDb from "../../server/src/db/connectDb";
import Prompt from "../../server/src/models/Prompt";
import PromptVersion from "../../server/src/models/PromptVersion";
import Purchase from "../../server/src/models/Purchase";
import User from "../../server/src/models/User";
import { negotiateVersion } from "../../src/lib/api/versionGuard";
import { withVersion } from "../../src/lib/api/payloadVersion";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";

async function handler(req: any, res: any) {
  await connectDb();

  const apiVersion = negotiateVersion(req, res);
  if (!apiVersion) return;

  // GET /api/prompts/version?promptId=&buyerWallet=
  // Returns the versioned content a buyer is entitled to.
  if (req.method === "GET") {
    const { promptId, buyerWallet } = req.query ?? {};

    if (!promptId || !buyerWallet) {
      res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "promptId and buyerWallet are required.", undefined, apiVersion));
      return;
    }

    const purchase = await Purchase.findOne({
      promptId: String(promptId),
      buyerWallet: String(buyerWallet).toLowerCase(),
    });

    // If no purchase record, fall back to v1 (legacy purchase before versioning).
    const versionIndex = purchase?.versionIndex ?? 1;

    const promptVersion = await PromptVersion.findOne({
      promptId: String(promptId),
      versionIndex,
    });

    const prompt = await Prompt.findById(promptId).lean();

    res.status(200).json(
      withVersion(
        {
          versionIndex,
          content: promptVersion?.content ?? (prompt as any)?.content ?? null,
          changeNote: promptVersion?.changeNote ?? "",
          purchasedAt: purchase?.createdAt ?? null,
        },
        apiVersion,
      ),
    );
    return;
  }

  // POST /api/prompts/version — creator posts a new version.
  if (req.method === "POST") {
    const { promptId, walletAddress, content, changeNote } = req.body ?? {};

    if (!promptId || !walletAddress || !content) {
      res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "promptId, walletAddress, and content are required.", undefined, apiVersion));
      return;
    }

    const user = await User.findOne({ walletAddress: String(walletAddress).toLowerCase() });
    if (!user) {
      res.status(404).json({ apiVersion, error: "User not found." });
      return;
    }

    const prompt = await Prompt.findOne({ _id: promptId, owner: user._id });
    if (!prompt) {
      res.status(403).json({ apiVersion, error: "Prompt not found or not owned by this wallet." });
      return;
    }

    const nextVersion = (prompt.currentVersionIndex ?? 1) + 1;

    await PromptVersion.create({
      promptId: String(prompt._id),
      versionIndex: nextVersion,
      content,
      changeNote: changeNote ?? "",
      createdBy: String(walletAddress).toLowerCase(),
    });

    await Prompt.findByIdAndUpdate(prompt._id, { currentVersionIndex: nextVersion });

    res.status(201).json(withVersion({ message: "Version posted.", versionIndex: nextVersion }, apiVersion));
    return;
  }

  res.status(405).json(apiError(ErrorCode.METHOD_NOT_ALLOWED, "Method not allowed.", undefined, apiVersion));
}

// A version's `content` field can legitimately hold a full prompt body (up
// to LISTING_LIMITS.content, ~50k characters), so this endpoint gets a
// larger cap than the default.
export default withObservability(withBodySizeLimit(handler, 200 * 1024), "prompts/version");
