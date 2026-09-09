import { cn } from "@/lib/utils";

/**
 * A surface. 12px radius, one-pixel border, never a drop shadow — depth in this
 * product comes from background lightness, so a card sits on the page by being
 * lighter than it, not by floating above it.
 */
export function Card({
  className,
  as: Component = "div",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { as?: React.ElementType }) {
  return (
    <Component
      className={cn(
        "rounded-[12px] border border-navy-800 bg-navy-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-navy-800 px-5 py-4", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** A section heading inside a card or a page. */
export function SectionTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold text-slate-100", className)} {...props} />;
}

/** A field label or column header. Sentence case — never an all-caps eyebrow. */
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("block text-sm font-medium text-slate-400", className)} {...props} />
  );
}
