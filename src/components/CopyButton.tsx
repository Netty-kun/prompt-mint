import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard/secureClipboard";
import { cn } from "@/lib/utils";

export type CopyButtonVariant = "icon" | "icon-text" | "inline";

interface CopyButtonProps {
  /** The text value to copy to the clipboard */
  value: string;
  /** Human-readable label used for the aria-label (e.g. "wallet address") */
  label?: string;
  /** Visual style of the button */
  variant?: CopyButtonVariant;
  /** Additional class names for the button element */
  className?: string;
  /** Milliseconds to display the success/error feedback (default: 2000) */
  feedbackDurationMs?: number;
}

/**
 * CopyButton
 *
 * A reusable, accessible button that copies a string value to the system
 * clipboard and displays transient visual feedback.
 *
 * Behaviour:
 * - Success state: icon turns to a green check-mark for `feedbackDurationMs`.
 * - Error state: icon turns to a red exclamation; screen-reader-friendly
 *   role="alert" message is surfaced below the button.
 * - Rapid clicks: the feedback timer is reset so the animation restarts.
 * - Works for wallet addresses, transaction hashes, or any short string.
 *
 * On-chain access authority is unaffected — this component is purely
 * presentational and performs no contract or wallet calls.
 */
export function CopyButton({
  value,
  label = "value",
  variant = "icon",
  className,
  feedbackDurationMs = 2000,
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const result = await copyToClipboard(value);

    if (result.success) {
      setState("success");
      setErrorMsg("");
    } else {
      setState("error");
      setErrorMsg(result.error || "Failed to copy");
    }

    timerRef.current = setTimeout(() => setState("idle"), feedbackDurationMs);
  };

  const ariaLabel =
    state === "success"
      ? `${label} copied`
      : state === "error"
        ? `Failed to copy ${label}`
        : `Copy ${label}`;

  const iconClass = cn(
    "h-3.5 w-3.5 transition-colors",
    state === "success" && "text-emerald-400",
    state === "error" && "text-rose-400",
    state === "idle" && "text-slate-400 group-hover:text-white",
  );

  const buttonBase = cn(
    "group inline-flex items-center gap-1.5 transition-all rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50",
    className,
  );

  return (
    <span className="inline-flex flex-col gap-1">
      {variant === "icon" && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={ariaLabel}
          title={ariaLabel}
          className={cn(
            buttonBase,
            "p-1 rounded-md hover:bg-white/10",
          )}
        >
          {state === "success" ? (
            <Check className={iconClass} />
          ) : (
            <Copy className={iconClass} />
          )}
        </button>
      )}

      {variant === "icon-text" && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={ariaLabel}
          className={cn(
            buttonBase,
            "px-2 py-1 text-xs font-medium hover:bg-white/10",
            state === "success" && "text-emerald-400",
            state === "error" && "text-rose-400",
            state === "idle" && "text-slate-400 hover:text-white",
          )}
        >
          {state === "success" ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      )}

      {variant === "inline" && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={ariaLabel}
          title={ariaLabel}
          className={cn(
            buttonBase,
            "p-0.5 opacity-60 hover:opacity-100",
          )}
        >
          {state === "success" ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3 text-slate-400" />
          )}
        </button>
      )}

      {/* Accessible error feedback */}
      {state === "error" && (
        <span
          role="alert"
          className="text-[10px] text-rose-400 leading-none"
        >
          {errorMsg}
        </span>
      )}
    </span>
  );
}
