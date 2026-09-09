import { RiskTier } from "@prisma/client";
import {
  bookmakerMargin,
  edge as computeEdge,
  impliedProbability,
  quarterKellyUnits,
} from "./betting";
import {
  isUsableMarket,
  type ExtractionSuccess,
  type ModelAnalysis,
  type ModelPick,
} from "./schemas";

/**
 * Turning a model response into the rows we will show and stand behind.
 *
 * The model is trusted for exactly two things: which selection to back, and
 * what the true probability of it is. Everything else — implied probability,
 * edge, stake size, house margin — is arithmetic, and arithmetic is recomputed
 * here from the odds on the screenshot. If the product's promise is that you
 * see the math before you stake, the math has to be ours.
 */

/**
 * An edge below half a percent is inside the error bars of any probability
 * estimate built from six results and an injury list. The analysis prompt says
 * so; this constant is that instruction made binding, so a tier cannot be
 * filled by a rounding artefact.
 */
export const MIN_MEANINGFUL_EDGE = 0.005;

/** Odds that disagree with the screenshot by more than this are corrected. */
const ODDS_DRIFT_TOLERANCE = 0.01;

const TIER_ORDER: RiskTier[] = [RiskTier.SAFE, RiskTier.BALANCED, RiskTier.AGGRESSIVE];

export type BuiltRecommendation = {
  tier: RiskTier;
  noValue: boolean;
  market: string | null;
  selection: string | null;
  odds: number | null;
  modelProbability: number | null;
  impliedProbability: number | null;
  edgePercent: number | null;
  stakeUnits: number | null;
  stakeAmount: number | null;
  rationale: string | null;
};

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * The market whose margin we quote to the user: the one with the most
 * selections, which on a football screenshot is almost always the match result.
 * A single-selection group tells us nothing about the overround, so it is
 * skipped.
 */
export function referenceMarketMargin(extraction: ExtractionSuccess): number | null {
  const groups = new Map<string, number[]>();

  for (const row of extraction.markets) {
    if (!isUsableMarket(row)) continue;
    const key = normalizeLabel(row.market) || "unlabelled";
    const bucket = groups.get(key);
    if (bucket) bucket.push(row.odds);
    else groups.set(key, [row.odds]);
  }

  let best: number[] | null = null;
  for (const odds of groups.values()) {
    if (odds.length < 2) continue;
    if (!best || odds.length > best.length) best = odds;
  }

  return best ? bookmakerMargin(best) : null;
}

/**
 * The price the screenshot actually shows for this selection, when we can find
 * it. The screenshot is ground truth: if the model has drifted from it, even
 * slightly, the extracted number wins.
 */
function reconcileOdds(
  pick: ModelPick,
  extraction: ExtractionSuccess,
): { odds: number | null; corrected: boolean } {
  const modelOdds = pick.odds;
  const wanted = normalizeLabel(pick.selection);
  if (!wanted) return { odds: modelOdds, corrected: false };

  const candidates = extraction.markets.filter(isUsableMarket);

  const match =
    candidates.find(
      (row) =>
        normalizeLabel(row.selection) === wanted &&
        normalizeLabel(row.market) === normalizeLabel(pick.market),
    ) ?? candidates.find((row) => normalizeLabel(row.selection) === wanted);

  if (!match) return { odds: modelOdds, corrected: false };
  if (modelOdds == null) return { odds: match.odds, corrected: true };

  const drift = Math.abs(match.odds - modelOdds) / match.odds;
  return drift > ODDS_DRIFT_TOLERANCE
    ? { odds: match.odds, corrected: true }
    : { odds: modelOdds, corrected: false };
}

function emptyTier(tier: RiskTier): BuiltRecommendation {
  return {
    tier,
    noValue: true,
    market: null,
    selection: null,
    odds: null,
    modelProbability: null,
    impliedProbability: null,
    edgePercent: null,
    stakeUnits: null,
    stakeAmount: null,
    rationale: null,
  };
}

/**
 * Build exactly three recommendations, one per tier, in fixed order.
 *
 * A tier collapses to no-value when the model declined it, when it came back
 * incoherent, or when the recomputed edge does not clear MIN_MEANINGFUL_EDGE.
 * That last case is the one that matters: the model may believe it found value
 * and still be overruled by its own numbers.
 */
export function buildRecommendations(
  extraction: ExtractionSuccess,
  analysis: ModelAnalysis,
  stakeUnitSize: number | null | undefined,
): BuiltRecommendation[] {
  const unitSize = stakeUnitSize && stakeUnitSize > 0 ? stakeUnitSize : null;

  return TIER_ORDER.map((tier) => {
    const pick = analysis.picks.find((p) => p.tier.toUpperCase() === tier);
    if (!pick || pick.no_value) return emptyTier(tier);

    const { odds } = reconcileOdds(pick, extraction);
    const probability = pick.model_probability;

    const coherent =
      odds != null &&
      odds > 1 &&
      probability != null &&
      probability > 0 &&
      probability < 1 &&
      Boolean(pick.selection);

    if (!coherent) return emptyTier(tier);

    const edge = computeEdge(probability, odds);
    if (edge < MIN_MEANINGFUL_EDGE) return emptyTier(tier);

    const stakeUnits = quarterKellyUnits(probability, odds);
    if (stakeUnits <= 0) return emptyTier(tier);

    return {
      tier,
      noValue: false,
      market: pick.market,
      selection: pick.selection,
      odds,
      modelProbability: probability,
      impliedProbability: impliedProbability(odds),
      edgePercent: edge,
      stakeUnits: Number(stakeUnits.toFixed(2)),
      stakeAmount: unitSize ? Number((stakeUnits * unitSize).toFixed(2)) : null,
      rationale: pick.rationale,
    };
  });
}

/**
 * The house margin we display. Ours when the screenshot gave us a complete
 * market to measure, the model's reported figure only as a fallback.
 */
export function resolveMargin(
  extraction: ExtractionSuccess,
  analysis: ModelAnalysis,
): number | null {
  const computed = referenceMarketMargin(extraction);
  if (computed != null) return computed;
  const reported = analysis.bookmaker_margin;
  return reported != null && reported >= 0 && reported < 1 ? reported : null;
}

/** Parse the model's free-text kickoff into a Date, or give up quietly. */
export function parseKickoff(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
