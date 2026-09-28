import { useMemo } from "react";
import { EyeOff, Lock } from "lucide-react";

interface WatermarkedPreviewProps {
  content: string;
  previewLength?: number;
  hasAccess?: boolean;
  className?: string;
}

const OBFUSCATION_CHAR = "\u2591";

function buildWatermarkedText(content: string, previewLength: number): string {
  const sanitized = content ?? "";
  if (sanitized.length <= previewLength) return sanitized;
  const visible = sanitized.slice(0, previewLength);
  const remaining = sanitized.slice(previewLength);
  const obfuscated = remaining.replace(/\S/g, OBFUSCATION_CHAR);
  return visible + obfuscated;
}

export function WatermarkedPreview({
  content,
  previewLength = 200,
  hasAccess = false,
  className = "",
}: WatermarkedPreviewProps) {
  const watermarked = useMemo(
    () => buildWatermarkedText(content, previewLength),
    [content, previewLength],
  );

  if (!content) {
    return (
      <div
        className={`rounded-xl border border-white/5 bg-white/5 p-4 text-sm text-slate-500 italic ${className}`}
      >
        No preview available.
      </div>
    );
  }

  if (hasAccess) {
    return (
      <div className={`rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 ${className}`}>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-100 font-mono">
          {content}
        </pre>
      </div>
    );
  }

  const isWatermarked = content.length > previewLength;

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-amber-500/10">
        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-medium text-amber-300">
          Watermarked preview
        </span>
        <span className="ml-auto text-[10px] text-slate-500">
          {content.length} chars
        </span>
      </div>
      <div className="px-4 py-3 max-h-[320px] overflow-y-auto relative">
        <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-300 font-mono">
          {watermarked}
        </pre>
        {isWatermarked && (
          <div className="sticky bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-3 bg-gradient-to-t from-white/5 to-transparent">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs text-slate-400">
              Purchase to reveal full content
            </span>
          </div>
        )}
      </div>
    </div>
  );
}