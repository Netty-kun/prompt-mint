/**
 * Shared step model for the multi-step transaction progress indicator (#266).
 *
 * The checkout flow walks a purchase through a fixed sequence of real
 * async stages: connecting to the wallet, requesting a signature,
 * submitting the signed transaction to the Stellar network, and waiting
 * for ledger confirmation. Each stage is driven by an actual awaited
 * async operation (see `PromptHashClient.purchasePromptsBulk`) rather
 * than a fixed-duration timer, so the indicator reflects what is really
 * happening.
 */

export type TransactionStepId =
  | "connecting"
  | "signing"
  | "submitting"
  | "confirming"
  | "complete";

export interface TransactionStepMeta {
  id: TransactionStepId;
  label: string;
  description: string;
  /** Rough estimated duration for this step, shown to set user expectations. */
  estimatedSeconds: number;
}

export const TRANSACTION_STEPS: TransactionStepMeta[] = [
  {
    id: "connecting",
    label: "Connecting to wallet",
    description: "Preparing the transaction with your connected wallet.",
    estimatedSeconds: 1,
  },
  {
    id: "signing",
    label: "Signing transaction",
    description: "Awaiting your signature in the wallet.",
    estimatedSeconds: 5,
  },
  {
    id: "submitting",
    label: "Submitting to Stellar",
    description: "Broadcasting the signed transaction to the network.",
    estimatedSeconds: 3,
  },
  {
    id: "confirming",
    label: "Confirming",
    description: "Waiting for the ledger to confirm the transaction.",
    estimatedSeconds: 5,
  },
  {
    id: "complete",
    label: "Complete",
    description: "Transaction confirmed on-chain.",
    estimatedSeconds: 0,
  },
];

export const TRANSACTION_STEP_ORDER: TransactionStepId[] = TRANSACTION_STEPS.map(
  (step) => step.id,
);

export function stepIndex(stepId: TransactionStepId): number {
  return TRANSACTION_STEP_ORDER.indexOf(stepId);
}

export type TransactionStepStatus = "pending" | "active" | "complete" | "error";

export function statusForStep(
  stepId: TransactionStepId,
  currentStepId: TransactionStepId | null,
  hasError: boolean,
): TransactionStepStatus {
  if (currentStepId == null) return "pending";
  const current = stepIndex(currentStepId);
  const target = stepIndex(stepId);

  if (target < current) return "complete";
  if (target > current) return "pending";
  // target === current
  if (hasError) return "error";
  return stepId === "complete" ? "complete" : "active";
}
