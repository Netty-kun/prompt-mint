import { Server, Contract } from "@stellar/stellar-sdk/rpc";
import Prompt from "../models/Prompt";

const CONTRACT_ID = process.env.PUBLIC_PROMPT_HASH_CONTRACT_ID;
const rpc = new Server(process.env.PUBLIC_STELLAR_RPC_URL!, { timeout: 15_000 });

interface ReconciliationResult {
  totalChecked: number;
  discrepancies: Array<{
    onChainId: string;
    issue: string;
    dbValue: any;
    contractValue: any;
  }>;
  fixed: number;
  errors: Array<{ onChainId: string; error: string }>;
}

/**
 * Reconcile indexed database state against on-chain contract state.
 * Checks for discrepancies in price, sale status, and existence.
 */
export async function reconcileIndexerState(): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    totalChecked: 0,
    discrepancies: [],
    fixed: 0,
    errors: [],
  };

  try {
    // Fetch all prompts that have an onChainId
    const prompts = await Prompt.find({ onChainId: { $ne: null } })
      .select("_id onChainId price isActive")
      .lean();

    result.totalChecked = prompts.length;

    for (const prompt of prompts) {
      try {
        // Query contract state for this prompt
        const contractData = await fetchPromptFromContract(prompt.onChainId);

        if (!contractData) {
          result.discrepancies.push({
            onChainId: prompt.onChainId,
            issue: "Prompt exists in DB but not found in contract",
            dbValue: { price: prompt.price, isActive: prompt.isActive },
            contractValue: null,
          });
          continue;
        }

        // Check price discrepancy (convert stroops to XLM)
        const contractPriceXLM = contractData.price / 10_000_000;
        if (Math.abs(prompt.price - contractPriceXLM) > 0.0000001) {
          result.discrepancies.push({
            onChainId: prompt.onChainId,
            issue: "Price mismatch",
            dbValue: prompt.price,
            contractValue: contractPriceXLM,
          });

          // Auto-fix: update DB to match contract
          await Prompt.findByIdAndUpdate(prompt._id, { price: contractPriceXLM });
          result.fixed++;
        }

        // Check active status discrepancy
        if (prompt.isActive !== contractData.isActive) {
          result.discrepancies.push({
            onChainId: prompt.onChainId,
            issue: "Active status mismatch",
            dbValue: prompt.isActive,
            contractValue: contractData.isActive,
          });

          // Auto-fix: update DB to match contract
          await Prompt.findByIdAndUpdate(prompt._id, { isActive: contractData.isActive });
          result.fixed++;
        }
      } catch (err: any) {
        result.errors.push({
          onChainId: prompt.onChainId,
          error: err.message || "Unknown error",
        });
      }
    }

    console.log("[Reconciliation] Complete:", result);
    return result;
  } catch (err: any) {
    console.error("[Reconciliation] Fatal error:", err);
    throw err;
  }
}

/**
 * Fetch a single prompt's data from the contract.
 * This is a simplified example - adapt based on your contract's storage structure.
 */
async function fetchPromptFromContract(
  promptId: string,
): Promise<{ price: number; isActive: boolean } | null> {
  try {
    // This is a placeholder - you'll need to invoke the contract's read method
    // Example: rpc.simulateTransaction() with a read-only contract call
    // For now, return null to indicate the method needs implementation
    
    // TODO: Implement actual contract read call using Soroban SDK
    // const result = await contract.call('get_prompt', { prompt_id: promptId });
    
    console.warn(
      `[Reconciliation] Contract read not yet implemented for prompt ${promptId}`,
    );
    return null;
  } catch (err) {
    console.error(`[Reconciliation] Failed to fetch prompt ${promptId} from contract:`, err);
    return null;
  }
}

/**
 * Schedule periodic reconciliation (e.g., daily)
 */
export function startReconciliationScheduler() {
  const RECONCILIATION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    console.log("[Reconciliation] Starting scheduled reconciliation...");
    try {
      await reconcileIndexerState();
    } catch (err) {
      console.error("[Reconciliation] Scheduled run failed:", err);
    }
  }, RECONCILIATION_INTERVAL);

  console.log("[Reconciliation] Scheduler started (runs every 24h)");
}
