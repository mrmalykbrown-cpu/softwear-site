/** Shared shell for the four static pages linked from the footer. */
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-14">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {updated ? <p className="tabular mt-1 text-sm text-slate-400">{updated}</p> : null}
      <div className="prose-measure mt-8 space-y-6 text-sm leading-relaxed text-slate-400 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-100 [&_a]:text-blue-400 [&_strong]:text-slate-100">
        {children}
      </div>
    </main>
  );
}
