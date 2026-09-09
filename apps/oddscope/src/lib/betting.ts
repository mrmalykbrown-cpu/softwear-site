/**
 * The arithmetic the product exists to show.
 *
 * Nothing here is heuristic — every function is the textbook definition, kept
 * in one file so the landing page, the analysis pipeline and the history table
 * can never disagree about what "edge" means.
 */

/** Quarter-Kelly. Full Kelly is correct but ruinous in practice at real variance. */
export const KELLY_FRACTION = 0.25;

/** No single recommendation may ever suggest more than three units. */
export const MAX_STAKE_UNITS = 3;

/**
 * One unit is one percent of bankroll — the ordinary staking-plan convention.
 *
 * Kelly returns a fraction of bankroll, so converting it to units means
 * multiplying by 100. This is what makes MAX_STAKE_UNITS meaningful: three
 * units is three percent of bankroll on a single bet, a real ceiling. Read as
 * a bare fraction instead, quarter-Kelly could never approach 3.0 and the cap
 * would be decoration.
 */
export const UNITS_PER_BANKROLL = 100;

/**
 * The bookmaker's implied probability for a decimal price.
 *
 * This is the number the whole product turns on: 1/1.90 = 0.526, so a coin
 * flip priced at 1.90 is being sold to you as a 52.6% event.
 */
export function impliedProbability(odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) return 0;
  return 1 / odds;
}

/**
 * Sum of implied probabilities across a market. A fair market sums to 1.0;
 * anything above is the bookmaker's book, i.e. the overround.
 */
export function overround(oddsInMarket: number[]): number {
  return oddsInMarket.reduce((sum, odds) => sum + impliedProbability(odds), 0);
}

/**
 * The house margin: what the book sums to, minus the 1.0 it would sum to if it
 * were fair. Two sides at 1.90 give 1.0526 — a 5.26% margin.
 */
export function bookmakerMargin(oddsInMarket: number[]): number {
  const total = overround(oddsInMarket);
  return total > 0 ? total - 1 : 0;
}

/**
 * Strip the margin out of a market by scaling each implied probability down in
 * proportion, so the set sums to 1.0. This is the bookmaker's own view of the
 * match with its mark-up removed — the honest baseline to argue against.
 */
export function normalizeMarket(oddsInMarket: number[]): number[] {
  const total = overround(oddsInMarket);
  if (total <= 0) return oddsInMarket.map(() => 0);
  return oddsInMarket.map((odds) => impliedProbability(odds) / total);
}

/**
 * Expected value per unit staked, as a fraction.
 *
 *   edge = (model probability x odds) - 1
 *
 * Zero means the bet is exactly fair. Positive means the price is longer than
 * the true chance justifies. Negative means you are paying the house to play.
 */
export function edge(modelProbability: number, odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) return -1;
  return modelProbability * odds - 1;
}

/**
 * Quarter-Kelly stake in units, clamped to [0, MAX_STAKE_UNITS].
 *
 *   f* = (p x odds - 1) / (odds - 1)      full Kelly, as a bankroll fraction
 *   stake = f* x 0.25 x 100               quarter Kelly, in units
 *
 * A non-positive edge returns 0 units: there is no stake size that rescues a
 * bad price. Full Kelly is theoretically optimal and practically ruinous at
 * real-world variance, which is why the quarter is not adjustable.
 */
export function quarterKellyUnits(modelProbability: number, odds: number): number {
  if (!Number.isFinite(odds) || odds <= 1) return 0;
  const advantage = edge(modelProbability, odds);
  if (advantage <= 0) return 0;
  const bankrollFraction = (advantage / (odds - 1)) * KELLY_FRACTION;
  return Math.min(Math.max(bankrollFraction * UNITS_PER_BANKROLL, 0), MAX_STAKE_UNITS);
}

/**
 * The strike rate you need just to break even at a given price. At 1.90 it is
 * 52.6%, not 50% — the gap between those two numbers is the entire game.
 */
export function breakEvenStrikeRate(odds: number): number {
  return impliedProbability(odds);
}

/**
 * Profit or loss in units once a bet settles.
 *
 * A won bet returns the stake plus winnings, so the profit is the winnings
 * alone. A void bet is a refund, not a result: zero P/L, and it is excluded
 * from strike rate elsewhere.
 */
export function settlementProfit(
  outcome: "WON" | "LOST" | "VOID",
  stakeUnits: number,
  odds: number,
): number {
  switch (outcome) {
    case "WON":
      return stakeUnits * (odds - 1);
    case "LOST":
      return -stakeUnits;
    case "VOID":
      return 0;
  }
}

/** Outcomes may be corrected within this window, then they are final. */
export const SETTLEMENT_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinEditWindow(settledAt: Date | null | undefined): boolean {
  if (!settledAt) return true;
  return Date.now() - settledAt.getTime() <= SETTLEMENT_EDIT_WINDOW_MS;
}
