import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-navy-800 bg-navy-950 px-3 text-slate-100 placeholder:text-slate-400/60 " +
  "transition-colors focus:border-blue-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 " +
  "focus-visible:outline-blue-400 disabled:opacity-60";

export function Input({
  className,
  numeric,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { numeric?: boolean }) {
  return (
    <input className={cn(base, "h-11", numeric && "tabular", className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(base, "h-11 pr-8", className)} {...props} />;
}

/** Inline validation or helper text under a field. */
export function FieldNote({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "error";
}) {
  return (
    <p className={cn("mt-1.5 text-xs", tone === "error" ? "text-negative" : "text-slate-400")}>
      {children}
    </p>
  );
}
