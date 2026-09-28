import React from "react";
import { Skeleton } from "@/components/Skeleton";

/**
 * PromptCardSkeleton
 *
 * Pixel-accurate loading placeholder for a PromptCard.
 * Each skeleton region maps 1-to-1 with the real card's content zones:
 *   - 16:10 image header
 *   - Badge strip (3 pills)
 *   - Title + price row
 *   - Two-line preview text
 *   - Creator row + CTA
 *
 * On-chain access rights are completely unaffected — this is purely visual.
 */
export const PromptCardSkeleton: React.FC = () => {
  return (
    <div
      aria-busy="true"
      aria-label="Loading prompt"
      className="flex flex-col rounded-[24px] border border-white/5 bg-white/[0.02] overflow-hidden"
    >
      {/* Image header – matches aspect-[16/10] */}
      <Skeleton className="aspect-[16/10] w-full rounded-none" />

      <div className="flex flex-col flex-1 p-4 pt-4 sm:p-6 sm:pt-5 space-y-3">
        {/* Badge strip */}
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Title + price row */}
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-3/5 rounded-lg" />
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Skeleton className="h-5 w-20 rounded-lg" />
            <Skeleton className="h-3 w-14 rounded-md" />
          </div>
        </div>

        {/* Preview text – two lines */}
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full rounded-md" />
          <Skeleton className="h-3.5 w-4/5 rounded-md" />
        </div>

        {/* Creator row + CTA */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

/**
 * PromptModalSkeleton
 *
 * Loading placeholder rendered inside the PromptModal while the prompt
 * detail query is in-flight. Mirrors the real modal's metadata section:
 *   - Gradient header bar
 *   - Title + copy-link button row
 *   - Preview content block
 *   - 2×2 metadata grid
 *   - Action button
 */
export const PromptModalSkeleton: React.FC = () => {
  return (
    <div aria-busy="true" aria-label="Loading prompt details">
      {/* Header decoration bar */}
      <Skeleton className="h-2 w-full rounded-none" />

      <div className="p-5 sm:p-8 space-y-6">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 pr-10">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-2/3 rounded-xl" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl shrink-0" />
        </div>

        {/* Preview content block */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-5/6 rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>

        {/* 2×2 metadata grid */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-md" />
              </div>
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          ))}
        </div>

        {/* Action button */}
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
};

/**
 * BuyerLibraryRowSkeleton
 *
 * Loading placeholder for a single row in the Buyer Library list.
 * Mirrors: thumbnail · title/price · badges · action button.
 */
export const BuyerLibraryRowSkeleton: React.FC = () => {
  return (
    <div
      aria-busy="true"
      aria-label="Loading library item"
      className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
    >
      {/* Thumbnail */}
      <Skeleton className="h-14 w-14 rounded-lg shrink-0" />

      {/* Text block */}
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-12 rounded-full" />
        </div>
      </div>

      {/* Action */}
      <Skeleton className="h-9 w-24 rounded-xl shrink-0" />
    </div>
  );
};
