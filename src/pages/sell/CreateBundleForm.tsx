/**
 * CreateBundleForm
 *
 * Lets a creator group their active prompts into a purchasable bundle.
 * The form:
 *   1. Fetches the creator's existing prompts from the contract.
 *   2. Lets them select 1–20 active prompts to include.
 *   3. Sets a bundle title, description, optional image URL, and price.
 *   4. Submits via createBundle() (mock → real Soroban when client is wired).
 *
 * No encryption is performed here — bundle membership is fully on-chain.
 */
import { useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Layers, Loader2, PlusCircle, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/hooks/useWallet";
import { browserStellarConfig } from "@/lib/stellar/browserConfig";
import {
  createBundle,
  getPromptsByCreator,
  type PromptRecord,
} from "@/lib/stellar/promptHashClient";
import { xlmToStroops, stroopsToXlmString } from "@/lib/stellar/format";
import { useNetworkState } from "@/hooks/useNetworkState";

const MAX_ITEMS = 20;
const MAX_TITLE = 120;
const MAX_DESC = 512;
const MAX_IMAGE_URL = 512;

interface FormData {
  title: string;
  description: string;
  imageUrl: string;
  priceXlm: string;
}

const emptyForm = (): FormData => ({
  title: "",
  description: "",
  imageUrl: "",
  priceXlm: "10",
});

interface CreateBundleFormProps {
  onCreated?: () => void;
}

export function CreateBundleForm({ onCreated }: CreateBundleFormProps) {
  const { address, signTransaction } = useWallet();
  const networkState = useNetworkState();
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch creator's existing prompts
  const promptsQuery = useQuery<PromptRecord[]>({
    queryKey: ["creator-prompts", address],
    queryFn: () =>
      address
        ? getPromptsByCreator(browserStellarConfig, address)
        : Promise.resolve([]),
    enabled: Boolean(address),
  });

  const activePrompts = useMemo(
    () => (promptsQuery.data ?? []).filter((p) => p.active),
    [promptsQuery.data],
  );

  // ── Field handlers ────────────────────────────────────────────────────────

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const togglePrompt = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_ITEMS) return prev; // cap silently
        next.add(id);
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.promptIds;
      return next;
    });
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const next: Record<string, string> = {};

    if (!formData.title.trim()) {
      next.title = "Title is required.";
    } else if (formData.title.length > MAX_TITLE) {
      next.title = `Title must be ${MAX_TITLE} characters or fewer.`;
    }

    if (formData.description.length > MAX_DESC) {
      next.description = `Description must be ${MAX_DESC} characters or fewer.`;
    }

    if (formData.imageUrl && formData.imageUrl.length > MAX_IMAGE_URL) {
      next.imageUrl = `Image URL must be ${MAX_IMAGE_URL} characters or fewer.`;
    }

    const priceNum = Number(formData.priceXlm);
    if (isNaN(priceNum) || priceNum <= 0) {
      next.priceXlm = "Enter a price greater than 0 XLM.";
    }

    if (selectedIds.size === 0) {
      next.promptIds = "Select at least one prompt to include.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (submittingRef.current || isSubmitting) return;
    setSubmitError(null);
    setSuccessMessage(null);

    if (!networkState.canTrustConfirmation) {
      setSubmitError(
        "Network connection lost. Bundle submission is disabled until restored.",
      );
      return;
    }

    if (!validate()) return;

    if (!address || !signTransaction) {
      setSubmitError("Connect a Stellar wallet before creating a bundle.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const promptIdsBig = Array.from(selectedIds).map((id) => BigInt(id));
      const { bundleId } = await createBundle(
        browserStellarConfig,
        { signTransaction },
        address,
        {
          title: formData.title.trim(),
          description: formData.description.trim(),
          imageUrl: formData.imageUrl.trim(),
          promptIds: promptIdsBig,
          priceStroops: xlmToStroops(formData.priceXlm),
        },
      );

      setSuccessMessage(`Bundle #${bundleId} created successfully.`);
      setFormData(emptyForm());
      setSelectedIds(new Set());
      onCreated?.();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create bundle.",
      );
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const isConfigured = Boolean(
    address && browserStellarConfig.promptHashContractId,
  );

  return (
    <div className="space-y-8">
      {/* Config warning */}
      {!isConfigured && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Connect your wallet and configure{" "}
          <code>PUBLIC_PROMPT_HASH_CONTRACT_ID</code> before creating a bundle.
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Check className="h-4 w-4 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Error */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {submitError}
        </div>
      )}

      {/* Bundle details */}
      <section className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Bundle details
        </h2>

        <div className="grid gap-5 md:grid-cols-2">
          {/* Title */}
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              Bundle title <span className="text-rose-400">*</span>
            </label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Developer Starter Pack"
              maxLength={MAX_TITLE}
              className="bg-white/5 border-white/10"
            />
            {errors.title && (
              <p className="text-xs text-rose-400">{errors.title}</p>
            )}
            <p className="text-right text-[10px] text-slate-600">
              {formData.title.length}/{MAX_TITLE}
            </p>
          </div>

          {/* Description */}
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what buyers get from this bundle…"
              rows={3}
              maxLength={MAX_DESC}
              className="bg-white/5 border-white/10 resize-none"
            />
            {errors.description && (
              <p className="text-xs text-rose-400">{errors.description}</p>
            )}
            <p className="text-right text-[10px] text-slate-600">
              {formData.description.length}/{MAX_DESC}
            </p>
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <label htmlFor="imageUrl" className="text-sm font-medium">
              Cover image URL
            </label>
            <Input
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://…"
              className="bg-white/5 border-white/10"
            />
            {errors.imageUrl && (
              <p className="text-xs text-rose-400">{errors.imageUrl}</p>
            )}
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label htmlFor="priceXlm" className="text-sm font-medium">
              Bundle price (XLM) <span className="text-rose-400">*</span>
            </label>
            <Input
              id="priceXlm"
              name="priceXlm"
              type="number"
              min="0.01"
              step="0.01"
              value={formData.priceXlm}
              onChange={handleChange}
              className="bg-white/5 border-white/10"
            />
            {errors.priceXlm && (
              <p className="text-xs text-rose-400">{errors.priceXlm}</p>
            )}
            <p className="text-[10px] text-slate-600">
              Single price for the entire bundle.
            </p>
          </div>
        </div>
      </section>

      {/* Prompt selector */}
      <section className="space-y-4 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Select prompts
          </h2>
          <span className="text-xs text-slate-600">
            {selectedIds.size}/{MAX_ITEMS} selected
          </span>
        </div>

        {errors.promptIds && (
          <p className="text-xs text-rose-400">{errors.promptIds}</p>
        )}

        {promptsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your prompts…
          </div>
        ) : activePrompts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
            You have no active prompts yet.{" "}
            <span className="text-emerald-400">
              Create a prompt listing first, then bundle them here.
            </span>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {activePrompts.map((prompt) => {
              const id = prompt.id.toString();
              const selected = selectedIds.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePrompt(id)}
                  aria-pressed={selected}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-violet-400 bg-violet-500"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {prompt.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-500">
                        {prompt.category}
                      </span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-violet-400 font-mono">
                        {stroopsToXlmString(prompt.priceStroops)} XLM
                      </span>
                    </div>
                  </div>
                  {selected && (
                    <Badge className="ml-auto shrink-0 bg-violet-600/20 text-violet-300 border-violet-500/30 text-[10px]">
                      ✓
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected summary */}
      {selectedIds.size > 0 && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Layers className="h-4 w-4" />
            {selectedIds.size} prompt{selectedIds.size !== 1 ? "s" : ""} in
            this bundle
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedIds).map((id) => {
              const p = activePrompts.find((ap) => ap.id.toString() === id);
              if (!p) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-600/10 px-2.5 py-1 text-xs text-violet-300"
                >
                  {p.title}
                  <button
                    type="button"
                    className="ml-1 text-violet-400/60 hover:text-violet-300"
                    onClick={() => togglePrompt(id)}
                    aria-label={`Remove ${p.title}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Submit */}
      <Button
        className="h-11 w-full bg-violet-600 text-white hover:bg-violet-500 font-bold disabled:opacity-50"
        onClick={handleSubmit}
        disabled={!isConfigured || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Creating bundle…
          </>
        ) : (
          <>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create bundle
          </>
        )}
      </Button>
    </div>
  );
}
