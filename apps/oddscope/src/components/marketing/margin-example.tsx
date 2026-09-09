import { Card } from "@/components/ui/card";

/**
 * The coin-flip book, drawn to scale.
 *
 * Two bars at 52.6% each sitting inside a 100% frame — the part that overflows
 * is the margin, and seeing it overflow does more work than the sentence
 * explaining it.
 */
export function MarginExample() {
  const side = (1 / 1.9) * 100; // 52.63%

  return (
    <Card className="p-5">
      <div className="tabular space-y-3.5">
        {["Heads at 1.90", "Tails at 1.90"].map((label) => (
          <div key={label}>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">{label}</span>
              <span className="text-slate-100">implies {side.toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-navy-800">
              <div className="h-full rounded-full bg-slate-400/50" style={{ width: `${side}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-navy-800 pt-4">
        <div className="tabular flex items-baseline justify-between">
          <span className="text-sm text-slate-400">Total implied probability</span>
          <span className="text-lg font-semibold text-slate-100">105.3%</span>
        </div>

        {/* The 5.3% that cannot fit inside a fair book. */}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-navy-800">
          <div className="h-full bg-slate-400/50" style={{ width: `${(100 / 105.263) * 100}%` }} />
          <div className="h-full bg-tier-aggressive" style={{ width: `${(5.263 / 105.263) * 100}%` }} />
        </div>
        <div className="tabular mt-2 flex items-baseline justify-between text-xs">
          <span className="text-slate-400">A fair book: 100%</span>
          <span className="text-tier-aggressive">House margin: 5.3%</span>
        </div>
      </div>

      <p className="mt-5 border-t border-navy-800 pt-4 text-sm text-slate-400">
        Break-even strike rate at 1.90:{" "}
        <span className="tabular font-semibold text-slate-100">52.6%</span>
      </p>
    </Card>
  );
}
