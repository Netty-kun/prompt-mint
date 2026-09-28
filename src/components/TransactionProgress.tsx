import { Check, Loader2, X } from "lucide-react";
import {
  TRANSACTION_STEPS,
  statusForStep,
  type TransactionStepId,
} from "@/lib/checkout/transactionSteps";
import { cn } from "@/lib/utils";

export interface TransactionProgressProps {
  /** The step currently in progress, or null if not yet started. */
  currentStepId?: TransactionStepId | null;
  /** True if the current step failed. */
  hasError?: boolean;
  /** Optional message to show alongside a failed step. */
  errorMessage?: string;
  className?: string;
}

/**
 * Step-by-step transaction progress indicator (#266).
 *
 * Renders the fixed sequence of real async stages a purchase goes
 * through -- connecting, signing, submitting, confirming, complete --
 * and highlights whichever one is currently active based on real state
 * transitions reported by the transaction flow, not a fake timer.
 */
export function TransactionProgress({
  currentStepId = null,
  hasError = false,
  errorMessage,
  className,
}: TransactionProgressProps) {
  if (!currentStepId) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-white/10 bg-white/[0.03] p-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <ol className="space-y-3">
        {TRANSACTION_STEPS.map((step, idx) => {
          const status = statusForStep(step.id, currentStepId, hasError);
          const isLast = idx === TRANSACTION_STEPS.length - 1;

          return (
            <li key={step.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                    status === "complete" &&
                      "border-emerald-400/60 bg-emerald-500/20 text-emerald-300",
                    status === "active" &&
                      "border-cyan-400/60 bg-cyan-500/20 text-cyan-300",
                    status === "error" &&
                      "border-red-400/60 bg-red-500/20 text-red-300",
                    status === "pending" &&
                      "border-white/15 bg-white/[0.02] text-slate-500",
                  )}
                >
                  {status === "complete" && <Check className="h-3.5 w-3.5" />}
                  {status === "active" && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {status === "error" && <X className="h-3.5 w-3.5" />}
                  {status === "pending" && idx + 1}
                </span>
                {!isLast && (
                  <span
                    className={cn(
                      "mt-1 h-full w-px flex-1 min-h-[14px]",
                      status === "complete" ? "bg-emerald-400/40" : "bg-white/10",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    status === "pending" ? "text-slate-500" : "text-white",
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">
                  {status === "error" && errorMessage
                    ? errorMessage
                    : step.description}
                </p>
                {status === "pending" && step.estimatedSeconds > 0 && (
                  <p className="text-[11px] text-slate-600">
                    ~{step.estimatedSeconds}s
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
