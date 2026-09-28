import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Eye, Code } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownPreviewProps {
  /** Raw markdown string to render */
  content: string;
  /** Optional additional class names for the wrapper */
  className?: string;
  /**
   * When true the component renders in "preview-only" mode with no toggle.
   * Useful when the caller already provides the tab switcher in the parent.
   */
  previewOnly?: boolean;
  /** Label shown above the rendered content (default: "Preview") */
  label?: string;
}

/**
 * MarkdownPreview
 *
 * Renders a piece of markdown text with an optional toggle between
 * the raw source and the rendered output. The rendered output is
 * sandboxed to the parent container and styled to match the app's
 * dark-mode palette.
 *
 * Behaviour / edge cases:
 * - Empty strings: renders a muted placeholder instead of blank space.
 * - Very long strings: the container scrolls vertically; it never
 *   overflows the page layout.
 * - Malicious HTML: react-markdown does NOT use dangerouslySetInnerHTML
 *   for inline HTML by default, so script injection is prevented.
 * - On-chain access rights are unaffected – this component is purely
 *   presentational and performs no contract calls.
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className,
  previewOnly = false,
  label = "Preview",
}) => {
  const [showRaw, setShowRaw] = useState(false);

  const isEmpty = !content || content.trim() === "";

  return (
    <div className={cn("rounded-xl border border-white/5 bg-white/5 overflow-hidden", className)}>
      {/* Header */}
      {!previewOnly && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            {label}
          </p>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              type="button"
              onClick={() => setShowRaw(false)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors",
                !showRaw
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
              aria-pressed={!showRaw}
              aria-label="Show rendered preview"
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setShowRaw(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium transition-colors",
                showRaw
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
              aria-pressed={showRaw}
              aria-label="Show raw markdown source"
            >
              <Code className="h-3 w-3" />
              Raw
            </button>
          </div>
        </div>
      )}

      {previewOnly && (
        <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            {label}
          </p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3 max-h-[320px] overflow-y-auto">
        {isEmpty ? (
          <p className="text-sm italic text-slate-500">No description provided.</p>
        ) : showRaw && !previewOnly ? (
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        ) : (
          <div
            className={cn(
              "prose prose-sm prose-invert max-w-none",
              "prose-p:text-slate-300 prose-p:leading-relaxed prose-p:my-1.5",
              "prose-headings:text-white prose-headings:font-semibold",
              "prose-h1:text-base prose-h2:text-sm prose-h3:text-xs",
              "prose-strong:text-white prose-em:text-slate-300",
              "prose-code:text-cyan-300 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded prose-code:text-xs",
              "prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:text-xs",
              "prose-ul:text-slate-300 prose-ol:text-slate-300",
              "prose-li:my-0.5",
              "prose-blockquote:border-cyan-500/50 prose-blockquote:text-slate-400",
              "prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline",
              "prose-hr:border-white/10",
            )}
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
