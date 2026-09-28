import { useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard/secureClipboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareLinkButtonProps {
  url: string;
  label?: string;
  shareTitle?: string;
  shareText?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Copies a marketplace share URL, and uses the Web Share API when available.
 */
export function ShareLinkButton({
  url,
  label = "Copy link",
  shareTitle = "Prompt Mint",
  shareText,
  className,
  variant = "outline",
  size = "sm",
}: ShareLinkButtonProps) {
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    success: boolean;
    message: string;
  }>({ visible: false, success: false, message: "" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (success: boolean, message: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setFeedback({ visible: true, success, message });
    timeoutRef.current = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleCopy = async () => {
    const result = await copyToClipboard(url);
    showFeedback(
      result.success,
      result.success ? "Link copied" : result.error || "Failed to copy link",
    );
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        showFeedback(true, "Shared");
        return;
      } catch (error) {
        // User cancellation is not an error worth surfacing.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await handleCopy();
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn(
            "border-white/15 bg-white/[0.03] text-white hover:bg-white/10",
            className,
          )}
          onClick={() => void handleCopy()}
          aria-label={label}
        >
          {feedback.visible && feedback.success ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {label}
        </Button>
        {typeof navigator !== "undefined" &&
          typeof navigator.share === "function" && (
            <Button
              type="button"
              variant="ghost"
              size={size === "icon" ? "icon" : size}
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => void handleShare()}
              aria-label="Share link"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
      </div>
      {feedback.visible && (
        <p
          role="status"
          className={
            feedback.success
              ? "text-xs text-emerald-300"
              : "text-xs text-rose-300"
          }
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
