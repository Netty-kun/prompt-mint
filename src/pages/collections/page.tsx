import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Folder, Archive } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreatorCollections } from "@/hooks/useCreatorCollections";
import { paginateCollection } from "@/lib/collections/store";
import { useWallet } from "@/hooks/useWallet";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const { getById } = useCreatorCollections();
  const [page, setPage] = useState(1);
  const perPage = 20;

  const collection = id ? getById(id) : undefined;

  const paginated = useMemo(() => {
    if (!id || !address) return null;
    return paginateCollection(id, address, page, perPage);
  }, [id, address, page]);

  if (!collection) {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <Navigation />
        <main className="mx-auto max-w-3xl px-4 pb-24 pt-20 text-center sm:px-6">
          <Archive className="mx-auto mb-4 h-12 w-12 text-slate-500" />
          <h1 className="text-2xl font-bold">Collection not found</h1>
          <p className="mt-2 text-sm text-slate-400">
            This collection may have been deleted or the link is invalid.
          </p>
          <Button asChild className="mt-6">
            <Link to="/browse">Browse prompts</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navigation />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
        <Button asChild variant="outline" className="mb-6 border-white/15 bg-white/5">
          <Link to="/browse">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to browse
          </Link>
        </Button>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-emerald-400">
            <Folder className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              Collection
            </span>
            {collection.archived ? (
              <Badge variant="outline" className="border-slate-600 text-slate-400">
                Archived
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-2 text-3xl font-bold">{collection.name}</h1>
          {collection.description ? (
            <p className="mt-2 text-sm text-slate-400">{collection.description}</p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            {collection.promptIds.length} prompt{collection.promptIds.length !== 1 ? "s" : ""}
          </p>
        </div>

        {paginated && paginated.prompts.length > 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginated.prompts.map((promptId) => (
                <div
                  key={promptId}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="text-sm font-medium text-slate-200">
                    Prompt #{promptId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ID: {promptId}
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="link"
                    className="mt-2 h-auto p-0 text-emerald-400"
                  >
                    <Link to={`/prompt/${promptId}`}>View details</Link>
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {paginated.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border-white/10 text-slate-300"
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-400">
                  Page {paginated.page} of {paginated.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= paginated.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="border-white/10 text-slate-300"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
            <p className="text-slate-400">This collection is empty.</p>
            <Button asChild className="mt-4 bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <Link to="/browse">Browse prompts to add</Link>
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

