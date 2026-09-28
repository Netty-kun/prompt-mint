import { Link, Navigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  buildCreatorProfileQueryPath,
  parseCreatorAddressParam,
} from "@/lib/marketplace/shareUrls";

/**
 * Canonical shareable creator URL: `/creator/:address`
 * Redirects to the existing public profile query deep link.
 */
export default function CreatorSharePage() {
  const { address } = useParams<{ address: string }>();
  const parsed = parseCreatorAddressParam(address);

  if (!parsed.ok) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navigation />
        <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold">Invalid creator link</h1>
          <p className="mt-3 text-sm text-slate-400">{parsed.error}</p>
          <Button asChild className="mt-8 bg-cyan-200 text-slate-950 hover:bg-cyan-100">
            <Link to="/browse">
              <ArrowLeft className="h-4 w-4" />
              Back to marketplace
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return <Navigate to={buildCreatorProfileQueryPath(parsed.address)} replace />;
}
