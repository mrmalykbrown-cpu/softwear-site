import { Crosshair } from "@/components/brand/crosshair";

/** Empty states get the crosshair. It is the only place it appears besides the loader. */
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-[12px] border border-navy-800 bg-navy-900 px-6 py-14 text-center">
      <Crosshair className="size-12 text-navy-800" />
      <h3 className="mt-5 text-base font-semibold text-slate-100">{title}</h3>
      {body ? (
        <p className="prose-measure mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
