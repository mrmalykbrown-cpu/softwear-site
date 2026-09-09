/**
 * Display formatting for every number the user sees.
 *
 * Kept deliberately narrow: fixed decimal places so values do not change width
 * between renders, which is what makes a column of odds readable at a glance.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  KES: "KSh",
  GHS: "GH₵",
  AUD: "A$",
  CAD: "C$",
  INR: "₹",
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_SYMBOLS);

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/** Decimal odds always carry two places: 2.10, never 2.1. */
export function formatOdds(odds: number | null | undefined): string {
  if (odds == null || !Number.isFinite(odds)) return "—";
  return odds.toFixed(2);
}

/** A probability in [0,1] rendered as a percentage with one decimal. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Edge and ROI always carry their sign — the sign is the information. */
export function formatSignedPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(decimals)}%`;
}

export function formatUnits(units: number | null | undefined, decimals = 2): string {
  if (units == null || !Number.isFinite(units)) return "—";
  const sign = units > 0 ? "+" : units < 0 ? "−" : "";
  return `${sign}${Math.abs(units).toFixed(decimals)}`;
}

/**
 * Stake sizes are unsigned — "1.57 units", not "+1.57 units" — and carry two
 * decimals so that units x unit size visibly equals the currency amount printed
 * beside them. At one decimal, 1.57 units renders as "1.6 units (R15.71)", and
 * a product whose whole argument is "check the arithmetic" cannot print a line
 * that fails when you check it.
 */
export function formatStakeUnits(units: number | null | undefined): string {
  if (units == null || !Number.isFinite(units)) return "—";
  return units.toFixed(2);
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "ZAR",
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const symbol = currencySymbol(currency);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  // Whole amounts lose the decimals; part-amounts keep both places.
  const body =
    Number.isInteger(abs)
      ? abs.toLocaleString("en-US")
      : abs.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  return `${negative ? "−" : ""}${symbol}${body}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDate(d)}, ${d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

/** "3 days", "1 day", "today" — used for the trial banner. */
export function formatDaysRemaining(target: Date | string | null | undefined): string {
  if (!target) return "—";
  const d = typeof target === "string" ? new Date(target) : target;
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "today";
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days === 1 ? "1 day" : `${days} days`;
}
