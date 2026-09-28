/**
 * BundleLibraryCard
 *
 * Displays a purchased bundle in the buyer's library. Shows a collapsible
 * list of member prompts; each prompt can be individually copy-pasted after
 * the full bundle unlock completes.
 */
import { useState } from "react";
import {
  BookOpenCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Layers,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { UnlockExplainer, type UnlockState } from "@/components/UnlockExplainer";
import { copyToClipboard } from "@/lib/clipboard/secureClipboard";
import { shortenAddress } from "@/lib/utils";
import type { BundleRecord } from "@/lib/stellar/promptHashClient";
import type { UnlockedBundleItem } from "@/lib/prompts/unlockBundle";

interface BundleLibraryCardProps {
  bundle: BundleRecord;
  unlockedItems: UnlockedBundleItem[];
  unlockState: UnlockState;
  isBusy: boolean;
  onUnlock: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const result = await copyToClipboard(text);
    if (result.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
      onClick={handleCopy}
      aria-label="Copy prompt text"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function UnlockedItem({ item }: { item: UnlockedBundleItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-300/10 bg-emerald-300/[0.03] overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-white truncate">
            {item.title}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-200 rounded bg-black/30 p-2.5">
            {item.plaintext}
          </pre>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-600 truncate">
              {item.contentHash.slice(0, 12)}…
            </span>
            <CopyButton text={item.plaintext} />
          </div>
        </div>
      )}
    </div>
  );
}

export function BundleLibraryCard({
  bundle,
  unlockedItems,
  unlockState,
  isBusy,
  onUnlock,
}: BundleLibraryCardProps) {
  const isUnlocked = unlockedItems.length > 0;
  const showExplainer =
    unlockState !== "idle" && unlockState !== "success";

  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1419] transition-colors hover:border-white/[0.18]">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
              <Layers className="h-4 w-4 text-violet-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">
                  {bundle.title}
                </h3>
                <Badge className="bg-violet-600/20 text-violet-300 border-violet-500/30 text-[10px]">
                  Bundle
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {shortenAddress(bundle.creator)} ·{" "}
                {bundle.promptIds.length} prompt
                {bundle.promptIds.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-violet-400 font-mono">
              <CurrencyPrice stroops={bundle.priceStroops} />
            </p>
            <p className="text-[10px] text-slate-600 uppercase tracking-tight">
              paid
            </p>
          </div>
        </div>

        {/* Description */}
        {bundle.description && (
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
            {bundle.description}
          </p>
        )}

        {/* Unlock explainer */}
        {showExplainer && (
          <UnlockExplainer
            state={unlockState}
            onRetry={
              unlockState === "rejected" ||
              unlockState === "expired" ||
              unlockState === "failed"
                ? onUnlock
                : undefined
            }
          />
        )}

        {/* Unlocked items */}
        {isUnlocked && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-1">
              <BookOpenCheck className="h-3 w-3" />
              Decrypted prompts
            </div>
            {unlockedItems.map((item) => (
              <UnlockedItem key={item.promptId} item={item} />
            ))}
          </div>
        )}

        {/* Action button */}
        <Button
          className="h-9 w-full bg-cyan-200 text-slate-950 hover:bg-cyan-100 disabled:opacity-50 text-xs font-bold"
          onClick={onUnlock}
          disabled={
            isBusy ||
            unlockState === "signing" ||
            unlockState === "verifying"
          }
        >
          {isBusy ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Unlocking…
            </>
          ) : isUnlocked ? (
            <>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Re-unlock bundle
            </>
          ) : (
            <>
              <LockKeyhole className="h-3.5 w-3.5 mr-1.5" />
              Unlock all {bundle.promptIds.length} prompts
            </>
          )}
        </Button>
      </div>
    </article>
  );
}
