import { ArrowUpRight, Layers, LockKeyhole, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CurrencyPrice } from "@/components/CurrencyPrice";
import { SafeImage } from "@/components/ui/SafeImage";
import { shortenAddress } from "@/lib/utils";
import type { BundleRecord } from "@/lib/stellar/promptHashClient";

interface BundleCardProps {
  bundle: BundleRecord;
  hasAccess: boolean;
  /** Open the detail / checkout modal. */
  // eslint-disable-next-line no-unused-vars
  openModal: (_bundle: BundleRecord) => void;
}

export function BundleCard({ bundle, hasAccess, openModal }: BundleCardProps) {
  return (
    <Card
      className="group relative flex flex-col border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1 cursor-pointer overflow-hidden rounded-[24px]"
      onClick={() => openModal(bundle)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(bundle);
        }
      }}
      aria-label={`Open bundle: ${bundle.title}`}
    >
      {/* Visual Header */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <SafeImage
          src={bundle.imageUrl}
          alt={bundle.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />

        {/* Bundle badge top-left */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="bg-violet-600/90 backdrop-blur-md border-none text-white font-bold">
            <Layers className="h-3 w-3 mr-1" />
            Bundle
          </Badge>
          {bundle.salesCount >= 5 && (
            <Badge className="bg-amber-500 text-slate-950 border-none font-bold text-xs">
              Popular
            </Badge>
          )}
        </div>

        {/* Item count chip top-right */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {bundle.promptIds.length}{" "}
            {bundle.promptIds.length === 1 ? "prompt" : "prompts"}
          </span>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col p-4 pt-4 sm:p-6 sm:pt-5">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {bundle.active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Inactive
            </span>
          )}

          {hasAccess ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Owned
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Layers className="h-3 w-3" />
              Bundle
            </span>
          )}
        </div>

        {/* Title + price */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold leading-tight transition-colors group-hover:text-violet-400 sm:text-lg">
              {bundle.title}
            </h3>
            <div className="text-right shrink-0">
              <p className="text-lg font-black text-violet-400 sm:text-xl font-mono tracking-tight">
                <CurrencyPrice stroops={bundle.priceStroops} />
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                full bundle
              </p>
            </div>
          </div>

          <p className="line-clamp-2 text-sm text-slate-400 leading-relaxed">
            {bundle.description}
          </p>

          {/* Prompt count summary */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5 text-violet-400/70" />
            <span>
              {bundle.promptIds.length} prompt
              {bundle.promptIds.length !== 1 ? "s" : ""} included
            </span>
            <span className="mx-1 text-white/10">·</span>
            <span>{bundle.salesCount} sold</span>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 sm:mt-6 sm:pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <p className="truncate text-xs font-medium text-slate-400">
              {shortenAddress(bundle.creator)}
            </p>
          </div>

          {hasAccess ? (
            <Button
              size="sm"
              variant="ghost"
              className="text-violet-400 hover:text-violet-300 hover:bg-violet-400/10 font-bold"
            >
              Owned <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <LockKeyhole className="h-3 w-3" /> Get Bundle
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
