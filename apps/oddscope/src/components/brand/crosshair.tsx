import { cn } from "@/lib/utils";

/**
 * The crosshair ring: a thin circle broken by four tick marks.
 *
 * This is the one recurring graphic device in the product, lifted straight out
 * of the logo. It appears as the loading indicator and as the empty-state icon,
 * and deliberately nowhere else — a motif used everywhere stops being a motif.
 */
export function Crosshair({
  className,
  spinning = false,
  strokeWidth = 1.5,
}: {
  className?: string;
  spinning?: boolean;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-12", className)}
    >
      <g
        className={spinning ? "crosshair-spin" : undefined}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      >
        {/* Ring, broken at the four cardinal points. */}
        <path d="M24 6.5a17.5 17.5 0 0 1 17.5 17.5" opacity="0.9" />
        <path d="M41.5 24A17.5 17.5 0 0 1 24 41.5" opacity="0.55" />
        <path d="M24 41.5A17.5 17.5 0 0 1 6.5 24" opacity="0.35" />
        <path d="M6.5 24A17.5 17.5 0 0 1 24 6.5" opacity="0.2" />
        {/* Tick marks. */}
        <path d="M24 1.5v6M24 40.5v6M1.5 24h6M40.5 24h6" />
      </g>
    </svg>
  );
}

/**
 * The full logo mark: the crosshair with the bar chart at its centre. The ring
 * inherits the surrounding text colour so it works on any surface; the bars
 * stay electric blue because they are the reading being taken.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
    >
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <path d="M24 7.5a16.5 16.5 0 0 1 16.5 16.5" />
        <path d="M40.5 24A16.5 16.5 0 0 1 24 40.5" />
        <path d="M24 40.5A16.5 16.5 0 0 1 7.5 24" />
        <path d="M7.5 24A16.5 16.5 0 0 1 24 7.5" />
        <path d="M24 2.5v6M24 39.5v6M2.5 24h6M39.5 24h6" />
      </g>
      <g fill="var(--color-blue-500)">
        <rect x="14" y="25" width="5" height="9" rx="1.4" />
        <rect x="21.5" y="16" width="5" height="18" rx="1.4" />
        <rect x="29" y="20.5" width="5" height="13.5" rx="1.4" />
      </g>
    </svg>
  );
}

/** Wordmark plus mark, as it appears in the header and the footer. */
export function Logo({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-7 shrink-0 text-slate-100", markClassName)} />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-slate-100">Odd</span>
        <span className="text-blue-500">Scope</span>
      </span>
    </span>
  );
}
