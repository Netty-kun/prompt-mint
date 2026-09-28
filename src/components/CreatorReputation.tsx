import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  ExternalLink,
  Info,
  Scale,
  ShoppingBag,
} from "lucide-react";

export interface CreatorReputation {
  version: "creator-reputation-v1";
  calculatedAt: string;
  accountCreatedAt: string | null;
  accountAgeDays: number | null;
  completedSales: number;
  upheldDisputes: number;
  disputeRate: number | null;
  historyStatus: "new" | "established";
  historyLabel: string;
  verifiedLinks: Array<{
    label: string;
    url: string;
    verifiedAt: string;
    verificationMethod: string;
  }>;
}

async function fetchCreatorReputation(
  address: string,
): Promise<CreatorReputation> {
  const response = await fetch(
    `/api/creators/reputation?address=${encodeURIComponent(address)}`,
  );
  if (!response.ok)
    throw new Error("Creator reputation is temporarily unavailable.");
  return response.json() as Promise<CreatorReputation>;
}

function accountAgeLabel(reputation: CreatorReputation) {
  if (reputation.accountAgeDays === null) return "No indexed activity yet";
  if (reputation.accountAgeDays === 0) return "Joined today";
  if (reputation.accountAgeDays < 30)
    return `${reputation.accountAgeDays} days`;
  const months = Math.floor(reputation.accountAgeDays / 30);
  return `${months} ${months === 1 ? "month" : "months"}`;
}

export function CreatorReputationSignals({
  reputation,
}: {
  reputation: CreatorReputation;
}) {
  const signals = [
    {
      label: "Marketplace age",
      value: accountAgeLabel(reputation),
      explanation: "Time since this wallet's first indexed creator activity.",
      icon: CalendarDays,
    },
    {
      label: "Completed sales",
      value: reputation.completedSales.toLocaleString(),
      explanation:
        "Unique non-creator buyers with transaction evidence, capped by indexed on-chain sales.",
      icon: ShoppingBag,
    },
    {
      label: "Dispute rate",
      value:
        reputation.disputeRate === null
          ? "Not enough history"
          : `${reputation.disputeRate}%`,
      explanation:
        reputation.disputeRate === null
          ? "Shown after 3 completed sales so new creators are not judged from a tiny sample."
          : `${reputation.upheldDisputes} upheld buyer disputes across eligible completed sales.`,
      icon: Scale,
    },
  ];

  return (
    <section
      aria-labelledby="creator-reputation-title"
      className="rounded-2xl border border-white/10 bg-[#0d1117] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
            Verifiable activity
          </p>
          <h2
            id="creator-reputation-title"
            className="mt-2 text-xl font-semibold text-white"
          >
            Creator reputation signals
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Marketplace facts are shown separately so buyers can make their own
            judgment.
          </p>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-medium ${
            reputation.historyStatus === "new"
              ? "border-cyan-200/20 bg-cyan-200/10 text-cyan-100"
              : "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
          }`}
        >
          {reputation.historyLabel}
        </span>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {signals.map(({ label, value, explanation, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
              <Icon aria-hidden="true" className="h-4 w-4 text-cyan-200" />
              {label}
            </dt>
            <dd className="mt-2 text-lg font-semibold text-white">{value}</dd>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {explanation}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-400">
            <BadgeCheck aria-hidden="true" className="h-4 w-4 text-cyan-200" />
            Verified links
          </dt>
          <dd className="mt-2">
            {reputation.verifiedLinks.length === 0 ? (
              <span className="text-sm text-slate-400">None verified yet</span>
            ) : (
              <ul className="space-y-2">
                {reputation.verifiedLinks.map((link) => (
                  <li key={`${link.url}:${link.verifiedAt}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open verified ${link.label} link in a new tab`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-100 underline decoration-cyan-200/40 underline-offset-4 hover:text-white"
                    >
                      {link.label}
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    </a>
                    <span className="mt-1 block text-xs text-slate-500">
                      Verified via {link.verificationMethod}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Only links with recorded verification evidence are displayed.
          </p>
        </div>
      </dl>

      <details className="mt-4 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
          <Info aria-hidden="true" className="h-4 w-4 text-cyan-200" />
          How these signals are calculated
        </summary>
        <p className="mt-3 leading-6">
          Policy {reputation.version}: sales are deduplicated by prompt and
          buyer, creator-wallet purchases are excluded, and only upheld disputes
          from eligible buyers count. This is activity evidence, not a safety
          guarantee.
        </p>
      </details>
    </section>
  );
}

export function CreatorReputationPanel({ address }: { address: string }) {
  const query = useQuery({
    queryKey: ["creator-reputation", address],
    queryFn: () => fetchCreatorReputation(address),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400"
      >
        Loading creator reputation signals…
      </div>
    );
  }

  if (!query.data) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400"
      >
        Creator reputation signals are temporarily unavailable.
      </div>
    );
  }

  return <CreatorReputationSignals reputation={query.data} />;
}
