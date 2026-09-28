import { Link } from "react-router-dom";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useComparison } from "@/hooks/useComparison";
import { MIN_COMPARE, MAX_COMPARE } from "@/lib/comparison/state";

/**
 * #277 – Floating tray summarising the current comparison selection and
 * linking to the /compare view. Hidden when nothing is selected.
 */
export function ComparisonTray() {
  const { selected, remove, clear, canView } = useComparison();

  if (selected.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-40 px-4 sm:bottom-4"
      role="region"
      aria-label="Prompt comparison selection"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/95 p-3 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <GitCompare className="h-4 w-4 text-emerald-400" />
          Compare ({selected.length}/{MAX_COMPARE})
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2">
          {selected.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200"
            >
              <span className="max-w-[140px] truncate">{p.title}</span>
              <button
                onClick={() => remove(p.id)}
                aria-label={`Remove ${p.title} from comparison`}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            className="text-slate-400 hover:text-white"
          >
            Clear
          </Button>
          <Button
            asChild={canView}
            size="sm"
            disabled={!canView}
            className="bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {canView ? (
              <Link to="/compare">Compare</Link>
            ) : (
              <span>Select {MIN_COMPARE - selected.length} more</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
