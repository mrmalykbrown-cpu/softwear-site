import { formatDaysRemaining } from "@/lib/format";

/**
 * Shown while the account is on trial. It states the remaining time and links
 * out to Whop — and it does not use a countdown clock, a colour change as the
 * deadline nears, or any other pressure device.
 */
export function TrialBanner({
  trialEndsAt,
  checkoutUrl,
}: {
  trialEndsAt: Date | null;
  checkoutUrl: string;
}) {
  if (!trialEndsAt) return null;

  const remaining = formatDaysRemaining(trialEndsAt);
  const ended = trialEndsAt.getTime() <= Date.now();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-navy-800 bg-navy-900 px-4 py-3">
      <p className="text-sm text-slate-100">
        {ended ? (
          "Your trial has ended."
        ) : (
          <>
            Trial ends in <span className="tabular font-medium">{remaining}</span>.
          </>
        )}{" "}
        <span className="text-slate-400">R147/month after that. Cancel anytime.</span>
      </p>
      <a
        href={checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-blue-400 hover:text-blue-500"
      >
        Subscribe on Whop
      </a>
    </div>
  );
}
