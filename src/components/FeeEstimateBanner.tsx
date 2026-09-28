import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeeEstimate } from "@/lib/checkout/feeEstimation";
import { formatFeeEstimate } from "@/lib/checkout/feeEstimation";

interface FeeEstimateBannerProps {
  fee: FeeEstimate | null;
  isLoading: boolean;
  className?: string;
}

export function FeeEstimateBanner({ fee, isLoading, className }: FeeEstimateBannerProps) {
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400", className)}>
        <span className="h-3 w-3 animate-pulse rounded-full bg-slate-600" />
        Estimating network fees...
      </div>
    );
  }

  if (!fee) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs",
        className,
      )}
    >
      <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className="text-slate-400">
        Network fee:{" "}
        <span className="font-medium text-slate-200">
          {formatFeeEstimate(fee)}
        </span>
      </span>
      <span className="group relative ml-auto shrink-0">
        <Info className="h-3 w-3 cursor-help text-slate-600 hover:text-slate-400" />
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          This fee goes to Stellar validators, not the platform. Actual fee may
          vary based on network conditions.
        </span>
      </span>
    </div>
  );
}
