import { useRef, useState } from "react";
import { Check, Link2, Send } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard/secureClipboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildTelegramShareUrl,
  buildTwitterShareUrl,
} from "@/lib/marketplace/shareIntents";

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface SocialShareButtonsProps {
  /** Absolute shareable URL for the listing. */
  url: string;
  /** Human-readable share message (e.g. the prompt title). */
  shareText: string;
  className?: string;
}

/**
 * Twitter/X, Telegram and copy-link share controls for an individual prompt (#285).
 *
 * External intents open in a new tab via a plain anchor so the user's session
 * cookies for the target site are used. Copy-link reuses the shared
 * {@link copyToClipboard} helper and surfaces the same inline status text as
 * {@link ShareLinkButton} (this repo has no globally mounted toast host).
 */
export function SocialShareButtons({
  url,
  shareText,
  className,
}: SocialShareButtonsProps) {
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    success: boolean;
    message: string;
  }>({ visible: false, success: false, message: "" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (success: boolean, message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
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

  const twitterHref = buildTwitterShareUrl({ url, text: shareText });
  const telegramHref = buildTelegramShareUrl({ url, text: shareText });

  const externalButtonClass =
    "border-white/15 bg-white/[0.03] text-white hover:bg-white/10";

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className={externalButtonClass}
        >
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X (Twitter)"
          >
            <TwitterIcon className="h-4 w-4" />
            X
          </a>
        </Button>
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          className={externalButtonClass}
        >
          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Telegram"
          >
            <Send className="h-4 w-4" />
            Telegram
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={externalButtonClass}
          onClick={() => void handleCopy()}
          aria-label="Copy link"
        >
          {feedback.visible && feedback.success ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Copy link
        </Button>
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
