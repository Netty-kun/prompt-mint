import { hasAccess, type PromptHashConfig } from "../../src/lib/stellar/promptHashClient";
import { withBodySizeLimit } from "../../src/lib/api/bodySizeLimit";
import { getReviews } from "./data";
import { negotiateVersion } from "../../src/lib/api/versionGuard";
import { withVersion } from "../../src/lib/api/payloadVersion";
import { apiError, ErrorCode } from "../../src/lib/api/errorCodes";

function getServerConfig(): PromptHashConfig {
  const rpcUrl = process.env.PUBLIC_STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
  const networkPassphrase =
    process.env.PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";
  const promptHashContractId = process.env.PUBLIC_PROMPT_HASH_CONTRACT_ID ?? "";
  const nativeAssetContractId =
    process.env.PUBLIC_STELLAR_NATIVE_ASSET_CONTRACT_ID ??
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const simulationAccount =
    process.env.PUBLIC_STELLAR_SIMULATION_ACCOUNT ?? process.env.UNLOCK_PUBLIC_KEY ?? "";

  return {
    rpcUrl,
    networkPassphrase,
    promptHashContractId,
    nativeAssetContractId,
    simulationAccount,
    allowHttp: new URL(rpcUrl).hostname === "localhost",
  };
}

async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const version = negotiateVersion(req, res);
  if (!version) return;

  const promptId = (req.query?.promptId || req.body?.promptId) as string;
  const userAddress = (req.query?.userAddress || req.body?.userAddress) as string;

  if (!promptId || !userAddress) {
    res.status(400).json(apiError(ErrorCode.MISSING_FIELDS, "Missing required promptId or userAddress", undefined, version));
    return;
  }

  try {
    const config = getServerConfig();

    let verified = false;
    try {
      verified = await hasAccess(config, userAddress, promptId);
    } catch {
      verified = false;
    }

    if (!verified) {
      res.status(200).json(
        withVersion(
          {
            eligible: false,
            verified: false,
            alreadyReviewed: false,
            reason: "Only verified purchasers with on-chain access can submit reviews.",
          },
          version,
        ),
      );
      return;
    }

    const existingReviews = getReviews(promptId);
    const alreadyReviewed = existingReviews.some(
      (r) => r.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    if (alreadyReviewed) {
      res.status(200).json(
        withVersion(
          {
            eligible: false,
            verified: true,
            alreadyReviewed: true,
            reason: "You have already submitted a review for this prompt.",
          },
          version,
        ),
      );
      return;
    }

    res.status(200).json(
      withVersion(
        {
          eligible: true,
          verified: true,
          alreadyReviewed: false,
          reason: "Verified purchaser eligible to review.",
        },
        version,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to check review eligibility";
    console.error("Eligibility check error:", message);
    res.status(500).json(apiError(ErrorCode.TEMPORARY_FAILURE, message, undefined, version));
  }
}

export default withBodySizeLimit(handler);
