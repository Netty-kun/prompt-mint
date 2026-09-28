import React, { useState, useEffect } from "react";
import {
  SEOConfig,
  DEFAULT_SEO_CONFIG,
  canEditSEOControls,
  validateCanonicalUrl,
} from "../../lib/seo/robotsCanonical";

export interface SEOControlsFormProps {
  initialConfig?: Partial<SEOConfig> | null;
  creatorAddress?: string;
  currentUserAddress?: string;
  isModerator?: boolean;
  onSave?: (config: SEOConfig) => Promise<void> | void;
}

export const SEOControlsForm: React.FC<SEOControlsFormProps> = ({
  initialConfig,
  creatorAddress,
  currentUserAddress,
  isModerator = false,
  onSave,
}) => {
  const [config, setConfig] = useState<SEOConfig>({
    ...DEFAULT_SEO_CONFIG,
    ...initialConfig,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const permission = canEditSEOControls(
    currentUserAddress,
    creatorAddress,
    isModerator
  );

  useEffect(() => {
    if (initialConfig) {
      setConfig((prev) => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  const handleCanonicalChange = (val: string) => {
    setConfig((prev) => ({ ...prev, canonicalUrl: val }));
    const result = validateCanonicalUrl(val);
    if (!result.isValid) {
      setValidationError(result.error || "Invalid canonical URL.");
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    if (!permission.allowed) {
      setValidationError(permission.reason || "Permission denied.");
      return;
    }

    const validation = validateCanonicalUrl(config.canonicalUrl);
    if (!validation.isValid) {
      setValidationError(validation.error || "Invalid canonical URL.");
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);

    try {
      if (onSave) {
        await onSave(config);
      }
      setSuccessMessage("SEO controls updated successfully.");
    } catch (err: any) {
      setValidationError(
        err?.message || "Failed to update SEO controls. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="seo-controls-form rounded-lg border border-border p-4 bg-card text-card-foreground">
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight">
          Robots & Canonical URL Controls
        </h3>
        <p className="text-sm text-muted-foreground">
          Manage search engine indexability and canonical link attribution for this listing.
        </p>
      </div>

      {!permission.allowed && (
        <div
          role="alert"
          className="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-sm"
        >
          {permission.reason}
        </div>
      )}

      {validationError && (
        <div
          role="alert"
          className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm"
        >
          {validationError}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm"
        >
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.index}
              disabled={!permission.allowed || isSubmitting}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, index: e.target.checked }))
              }
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-medium">Index (Allow search indexing)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.follow}
              disabled={!permission.allowed || isSubmitting}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, follow: e.target.checked }))
              }
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-medium">Follow (Allow following links)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.noarchive}
              disabled={!permission.allowed || isSubmitting}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, noarchive: e.target.checked }))
              }
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-medium">No archive (Block cache copies)</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.nosnippet}
              disabled={!permission.allowed || isSubmitting}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, nosnippet: e.target.checked }))
              }
              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-sm font-medium">No snippet (Hide preview text)</span>
          </label>
        </div>

        <div className="space-y-1">
          <label htmlFor="canonical-url-input" className="block text-sm font-medium">
            Custom Canonical URL (Optional)
          </label>
          <input
            id="canonical-url-input"
            type="text"
            placeholder="https://example.com/prompts/my-prompt"
            value={config.canonicalUrl || ""}
            disabled={!permission.allowed || isSubmitting}
            onChange={(e) => handleCanonicalChange(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to use default canonical URL format.
          </p>
        </div>

        <button
          type="submit"
          disabled={!permission.allowed || isSubmitting || !!validationError}
          className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
        >
          {isSubmitting ? "Saving..." : "Save SEO Controls"}
        </button>
      </form>
    </div>
  );
};
