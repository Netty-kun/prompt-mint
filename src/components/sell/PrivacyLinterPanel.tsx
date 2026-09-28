import { AlertTriangle, Shield, ShieldAlert, Info } from "lucide-react";
import { usePrivacyLinter } from "@/hooks/usePrivacyLinter";
import type { LinterInput } from "@/lib/privacy/linter";

interface PrivacyLinterPanelProps {
  input: LinterInput;
}

function severityIcon(severity: string) {
  switch (severity) {
    case "high":
      return <ShieldAlert className="h-4 w-4 text-red-400" aria-hidden="true" />;
    case "medium":
      return <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />;
    default:
      return <Info className="h-4 w-4 text-sky-400" aria-hidden="true" />;
  }
}

function severityClass(severity: string) {
  switch (severity) {
    case "high":
      return "border-red-400/20 bg-red-500/10";
    case "medium":
      return "border-amber-400/20 bg-amber-500/10";
    default:
      return "border-sky-400/20 bg-sky-500/10";
  }
}

function severityTextClass(severity: string) {
  switch (severity) {
    case "high":
      return "text-red-200";
    case "medium":
      return "text-amber-200";
    default:
      return "text-sky-200";
  }
}

export function PrivacyLinterPanel({ input }: PrivacyLinterPanelProps) {
  const { findings, blockingCount, hasBlocking, hasWarnings } = usePrivacyLinter(input);

  if (findings.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <h3 className="text-sm font-bold text-emerald-400">Privacy Check</h3>
        </div>
        {hasBlocking ? (
          <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
            {blockingCount} blocking
          </span>
        ) : hasWarnings ? (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
            Warnings
          </span>
        ) : null}
      </div>

      {hasBlocking ? (
        <p className="text-xs text-red-300">
          High-confidence secrets detected. Resolve all blocking issues before
          publishing on-chain.
        </p>
      ) : null}

      <div className="space-y-2">
        {findings.map((finding, idx) => (
          <div
            key={`${finding.field}-${idx}`}
            className={`rounded-xl border p-3 ${severityClass(finding.severity)}`}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">
                {severityIcon(finding.severity)}
              </span>
              <div className="min-w-0">
                <div className={`text-xs font-semibold uppercase tracking-wide ${severityTextClass(finding.severity)}`}>
                  {finding.field}
                </div>
                <p className={`mt-0.5 text-sm font-medium ${severityTextClass(finding.severity)}`}>
                  {finding.message}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {finding.risk}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
