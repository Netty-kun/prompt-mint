import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, GitCompare } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { PromptComparisonView } from "@/pages/browse/PromptComparisonView";
import { useComparison } from "@/hooks/useComparison";
import { MIN_COMPARE, decodeComparisonShare } from "@/lib/comparison/state";

export default function ComparePage() {
  const { selected, remove, clear, canView } = useComparison();
  const [searchParams] = useSearchParams();

  const sharedIds = useMemo(
    () => decodeComparisonShare(searchParams.toString()),
    [searchParams],
  );

  useEffect(() => {
    if (sharedIds.length > 0 && selected.length === 0) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("compare");
      const newSearch = params.toString();
      const newUrl = newSearch
        ? `${window.location.pathname}?${newSearch}`
        : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [sharedIds, selected.length, searchParams]);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-400">
              <GitCompare className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-widest">
                Compare
              </span>
            </div>
            <h1 className="text-3xl font-bold">Prompt comparison</h1>
            <p className="mt-2 text-sm text-slate-400">
              Compare up to 4 prompts side by side before you buy.
            </p>
          </div>
          <Button asChild variant="outline" className="border-white/15 bg-white/5">
            <Link to="/browse">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to browse
            </Link>
          </Button>
        </div>

        {sharedIds.length > 0 && selected.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-slate-300">
              Shared comparison link loaded. Select prompts matching the shared
              IDs from the browse page to see them side by side.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              IDs: {sharedIds.join(", ")}
            </p>
            <Button asChild className="mt-6 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400">
              <Link to="/browse">Browse prompts</Link>
            </Button>
          </div>
        ) : !canView ? (
          <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-slate-300">
              Select at least {MIN_COMPARE} prompts to compare.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {selected.length === 1
                ? "You have 1 prompt selected — add one more from the browse page."
                : "Head to the browse page and use the Compare button on any prompt."}
            </p>
            <Button asChild className="mt-6 bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400">
              <Link to="/browse">Browse prompts</Link>
            </Button>
          </div>
        ) : (
          <PromptComparisonView
            selected={selected}
            onRemove={remove}
            onClear={clear}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
