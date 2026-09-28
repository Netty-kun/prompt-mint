import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Base skeleton primitive. Renders a pulsing placeholder block.
 * Prefer the higher-level `Skeleton*` variants below when you know the
 * shape of the content being loaded — they help match final layout
 * dimensions and reduce cumulative layout shift (CLS).
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = "", ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-800/50 border border-white/5 ${className}`}
      {...props}
    />
  );
};

export interface SkeletonTextProps extends SkeletonProps {
  /** Number of text lines to render. Defaults to 1. */
  lines?: number;
  /** Tailwind width class applied to the final (shorter) line. */
  lastLineWidth?: string;
}

/**
 * Placeholder for one or more lines of text. Mirrors typical paragraph /
 * heading dimensions so the layout doesn't jump once real text loads.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  className = "",
  lines = 1,
  lastLineWidth = "w-2/3",
  ...props
}) => {
  return (
    <div className={`space-y-2 ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 w-full ${i === lines - 1 && lines > 1 ? lastLineWidth : ""}`}
        />
      ))}
    </div>
  );
};

export interface SkeletonAvatarProps extends SkeletonProps {
  /** Diameter in pixels. Defaults to 40. */
  size?: number;
}

/** Circular placeholder for user/creator avatars. */
export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  className = "",
  size = 40,
  style,
  ...props
}) => {
  return (
    <Skeleton
      className={`rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  );
};

export interface SkeletonCardProps extends SkeletonProps {
  /** Renders an image/media placeholder block above the text lines. */
  withMedia?: boolean;
  /** Number of body text lines. Defaults to 2. */
  lines?: number;
}

/**
 * Placeholder for a typical prompt/listing card: media block, title line,
 * and a couple of body lines. Matches the dimensions used by prompt and
 * marketplace cards elsewhere in the app.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = "",
  withMedia = true,
  lines = 2,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-xl border border-white/10 bg-[#0f1419] p-4 space-y-3 ${className}`}
      {...props}
    >
      {withMedia && <Skeleton className="h-32 w-full" />}
      <Skeleton className="h-4 w-3/4" />
      <SkeletonText lines={lines} />
    </div>
  );
};

export interface SkeletonTableProps extends SkeletonProps {
  /** Number of data rows to render. Defaults to 5. */
  rows?: number;
  /** Number of columns per row. Defaults to 4. */
  columns?: number;
  /** Whether to render a header row. Defaults to true. */
  withHeader?: boolean;
}

/**
 * Placeholder for tabular data — matches a header row plus N data rows so
 * the table doesn't resize once real rows arrive.
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  className = "",
  rows = 5,
  columns = 4,
  withHeader = true,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-xl border border-white/10 ${className}`}
      {...props}
    >
      {withHeader && (
        <div className="flex gap-4 border-b border-white/10 bg-white/[0.03] p-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      )}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 p-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export interface SkeletonChartProps extends SkeletonProps {
  /** Height of the chart area in pixels. Defaults to 220. */
  height?: number;
}

/**
 * Placeholder for chart/analytics widgets: a title bar plus a block sized
 * to the eventual chart canvas, avoiding layout shift as data loads.
 */
export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  className = "",
  height = 220,
  ...props
}) => {
  return (
    <div className={`space-y-3 ${className}`} {...props}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="w-full" style={{ height }} />
      <div className="flex gap-2">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-2.5 w-12" />
      </div>
    </div>
  );
};
