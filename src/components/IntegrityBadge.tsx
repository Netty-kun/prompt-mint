import { ShieldCheck, ShieldX, ShieldOff } from "lucide-react";
import type { IntegrityMetadata } from "@/lib/prompts/unlock";

export interface IntegrityBadgeProps {
  integrity: IntegrityMetadata;
}

const CONFIG = {
  verified: {
    label: "Hash verified",
    title: "Content integrity verified",
    description:
      "SHA-256 of the decrypted content matches the hash committed on-chain by the creator.",
    container:
      "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200",
    icon: ShieldCheck,
    iconClass: "text-emerald-400",
    hashLabel: "On-chain hash",
  },
  failed: {
    label: "Integrity mismatch",
    title: "Content integrity check failed",
    description:
      "The decrypted content does not match the on-chain hash. Content has been withheld. Contact support with the prompt ID.",
    container: "border-rose-400/25 bg-rose-400/[0.07] text-rose-200",
    icon: ShieldX,
    iconClass: "text-rose-400",
    hashLabel: "Expected hash",
  },
  unavailable: {
    label: "Hash unavailable",
    title: "No on-chain hash for this listing",
    description:
      "This prompt was listed before on-chain content hashing was introduced. Provenance cannot be verified cryptographically.",
    container: "border-slate-500/25 bg-slate-500/[0.06] text-slate-400",
    icon: ShieldOff,
    iconClass: "text-slate-500",
    hashLabel: null,
  },
} as const;

/**
 * Displays the cryptographic provenance status for an unlocked prompt.
 * Renders one of three states: verified, failed, or unavailable.
 */
export function IntegrityBadge({ integrity }: IntegrityBadgeProps) {
  const cfg = CONFIG[integrity.status];
  const Icon = cfg.icon;

  const displayHash =
    integrity.status === "failed"
      ? integrity.storedHash
      : integrity.computedHash;

  return (
    <div
      role="status"
      aria-label={cfg.title}
      className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${cfg.container}`}
    >
      {/* Status row */}
      <div className="flex items-center gap-1.5">
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${cfg.iconClass}`}
          aria-hidden="true"
        />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-slate-400">
        {cfg.description}
      </p>

      {/* Hash display — shown when a hash is available to the buyer */}
      {cfg.hashLabel && displayHash && (
        <div className="flex flex-col gap-0.5 pt-0.5">
          <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
            {cfg.hashLabel}
          </span>
          <code
            className="break-all font-mono text-[10px] text-slate-400 select-all"
            title={displayHash}
          >
            {displayHash}
          </code>
        </div>
      )}
    </div>
  );
}
