/**
 * Money.
 *
 * Amounts are integer cents. Everywhere. A rand amount never exists as a
 * float in this codebase: 0.1 + 0.2 is not 0.3, and a monthly total that is
 * one cent out is a total nobody believes again. Cents are parsed at the
 * edge, added as integers, and turned into a string at the very last moment.
 * Format on the way out only.
 *
 * Why the formatting is hand-rolled rather than Intl: `en-ZA` renders
 * 123456 cents as "R 1 234,56" — a space after the symbol and a comma before
 * the cents. Tallie's format is "R1 234.56". Intl is right about the locale
 * and wrong about the house style, and the house style is what the customer
 * has to reconcile against a bank statement, so it wins.
 */

export type Cents = number;

/** Non-breaking, so an amount never wraps across two lines. */
const GROUP_SEPARATOR = " ";
const DECIMAL_SEPARATOR = ".";

export const RAND_SYMBOL = "R";
export const USD_SYMBOL = "$";

/**
 * Payment is processed in US dollars, so a rand figure standing next to a
 * dollar one is always an approximation. Never "=". The Consumer Protection
 * Act reading of this is that the customer must not be surprised by their
 * statement; the typographic reading is that "=" would be a lie.
 */
export const APPROX = "≈";

/** R1 billion. Above this it is a typo, not an expense. */
export const MAX_CENTS = 100_000_000_000;

type CentsDisplay = {
  /**
   * "always" prints the cents even when they are zero (R167.00) — the default,
   * because a ledger column with ragged decimals is unreadable.
   * "auto" drops them when they are zero (R167) — used for prices in prose.
   */
  cents?: "always" | "auto";
};

/* -------------------------------------------------------------------------
   Invariants
   ---------------------------------------------------------------------- */

/**
 * In development a non-integer amount is a programming mistake and should be
 * loud. In production it is not worth blanking someone's account page over,
 * so we round and carry on.
 */
function coerceCents(value: number, label: string): Cents {
  if (Number.isInteger(value)) return value;
  if (process.env.NODE_ENV !== "production") {
    throw new TypeError(
      `${label} must be integer cents, received ${value}. Parse with parseAmountToCents() or randToCents().`,
    );
  }
  return Math.round(value);
}

/* -------------------------------------------------------------------------
   Into cents
   ---------------------------------------------------------------------- */

/**
 * For constants written by a person: randToCents(15.99) === 1599.
 * Not for user input — use parseAmountToCents for that.
 */
export function randToCents(rand: number): Cents {
  if (!Number.isFinite(rand)) {
    throw new RangeError(`Cannot convert ${rand} to cents.`);
  }
  const sign = rand < 0 ? -1 : 1;
  // toPrecision(12) first, or 8.115 * 100 lands on 811.4999999999999 and
  // rounds down to the wrong cent.
  const minor = Math.round(Number((Math.abs(rand) * 100).toPrecision(12)));
  return sign * minor;
}

/**
 * Parses what a person actually types into an amount field.
 *
 * Tolerant on purpose: "R1 234.56", "1234,56", "1 234", "12.5" all land. A
 * South African keyboard and a South African schooling produce both "," and
 * "." as the decimal mark, and refusing one of them is a support ticket.
 *
 * Returns null for anything it cannot read, so the caller can keep Save
 * disabled rather than saving a zero.
 */
export function parseAmountToCents(input: string): Cents | null {
  if (typeof input !== "string") return null;

  // Strip the symbol, every kind of space, and the unicode minus.
  let text = input
    .replace(/[R$]/gi, "")
    .replace(/[\s  ]/g, "")
    .replace(/−/g, "-")
    .trim();

  if (text === "") return null;

  let sign = 1;
  if (text.startsWith("-")) {
    sign = -1;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }

  if (!/^[\d.,]+$/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  const lastSeparator = Math.max(lastDot, lastComma);

  let integerText: string;
  let fractionText: string;

  if (lastSeparator === -1) {
    integerText = text;
    fractionText = "";
  } else {
    const digitsAfter = text.length - lastSeparator - 1;
    // Three digits after the last separator is grouping ("1 500" typed as
    // "1,500" or "1.500"), not a decimal — money does not have three
    // decimals. It has to be preceded by a digit, so ".500" still reads as
    // fifty cents rather than five hundred rand.
    const isGrouping = digitsAfter === 3 && lastSeparator > 0;

    if (isGrouping) {
      integerText = text.replace(/[.,]/g, "");
      fractionText = "";
    } else {
      integerText = text.slice(0, lastSeparator).replace(/[.,]/g, "");
      fractionText = text.slice(lastSeparator + 1);
    }
  }

  if (integerText === "" && fractionText === "") return null;
  if (!/^\d*$/.test(integerText) || !/^\d*$/.test(fractionText)) return null;

  const whole = integerText === "" ? 0 : Number(integerText);
  if (!Number.isSafeInteger(whole)) return null;

  const twoDigits = (fractionText + "00").slice(0, 2);
  let minor = whole * 100 + Number(twoDigits);

  // Round a third decimal rather than truncating it.
  const thirdDigit = fractionText[2];
  if (thirdDigit !== undefined && Number(thirdDigit) >= 5) minor += 1;

  if (!Number.isSafeInteger(minor) || minor > MAX_CENTS) return null;

  return sign * minor;
}

/* -------------------------------------------------------------------------
   Out of cents
   ---------------------------------------------------------------------- */

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

function formatMinorUnits(value: Cents, symbol: string, display: CentsDisplay): string {
  const amount = coerceCents(value, "amount");
  const showCents = display.cents ?? "always";

  const negative = amount < 0;
  const absolute = Math.abs(amount);
  const whole = Math.trunc(absolute / 100);
  const fraction = absolute % 100;

  const grouped = groupThousands(String(whole));
  const body =
    showCents === "always" || fraction !== 0
      ? `${grouped}${DECIMAL_SEPARATOR}${String(fraction).padStart(2, "0")}`
      : grouped;

  return `${negative ? "-" : ""}${symbol}${body}`;
}

/** 123456 -> "R1 234.56". Always render this in the numeral face. */
export function formatRand(cents: Cents, display: CentsDisplay = {}): string {
  return formatMinorUnits(cents, RAND_SYMBOL, display);
}

/** 1045 -> "$10.45". USD minor units, for the FX half of a price. */
export function formatUsd(cents: Cents, display: CentsDisplay = {}): string {
  return formatMinorUnits(cents, USD_SYMBOL, display);
}

/**
 * The rand figure first, the dollar figure second, joined by "≈".
 * The only sanctioned way to show a price: formatApprox(16700, 1045)
 * gives "R167 ≈ $10.45".
 */
export function formatApprox(
  randCents: Cents,
  usdCents: Cents,
  display: CentsDisplay = { cents: "auto" },
): string {
  return `${formatRand(randCents, display)} ${APPROX} ${formatUsd(usdCents, display)}`;
}

/**
 * Machine-readable: "1234.56". For CSV export and form values, where a
 * non-breaking space and a rand symbol would be someone else's parsing
 * problem.
 */
export function centsToDecimalString(cents: Cents): string {
  const amount = coerceCents(cents, "amount");
  const negative = amount < 0;
  const absolute = Math.abs(amount);
  return `${negative ? "-" : ""}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------
   Arithmetic
   ---------------------------------------------------------------------- */

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((total, value) => total + coerceCents(value, "amount"), 0);
}

/**
 * Percentage of a budget used, as a number (not a string): 8000 of 10000
 * gives 80. A limit of zero reads as fully spent the moment anything is
 * logged against it, which is what an unset limit should feel like.
 */
export function percentOf(part: Cents, whole: Cents): number {
  const numerator = coerceCents(part, "part");
  const denominator = coerceCents(whole, "whole");
  if (denominator <= 0) return numerator > 0 ? 100 : 0;
  return (numerator / denominator) * 100;
}

/** 33.333 -> "33%". Whole numbers by default; percentages are not money. */
export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}
