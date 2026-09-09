import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Buttons. Minimum height 48px on the variants used in the analysis flow —
 * that flow is used one-handed, standing in front of a bookmaker's app.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-500 disabled:bg-navy-800 disabled:text-slate-400",
  secondary:
    "bg-navy-900 text-slate-100 border border-navy-800 hover:border-blue-400 hover:text-blue-400 disabled:text-slate-400 disabled:hover:border-navy-800",
  ghost:
    "text-slate-400 hover:text-slate-100 disabled:text-navy-800",
  danger:
    "bg-navy-900 text-slate-100 border border-navy-800 hover:border-negative hover:text-negative",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg",
  md: "h-11 px-4 text-sm rounded-lg",
  lg: "min-h-12 px-6 text-base rounded-lg",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400",
    "disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  external,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  href: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        className={classes(variant, size, className)}
        {...props}
      />
    );
  }
  return <Link href={href} className={classes(variant, size, className)} {...props} />;
}
