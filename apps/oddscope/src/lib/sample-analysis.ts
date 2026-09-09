import type { TierCardView } from "@/components/tier-card";

/**
 * The worked example shown on the landing page.
 *
 * Every number here is computed with the same functions the live product uses,
 * not written by hand to look persuasive. A page whose entire argument is
 * "check the arithmetic" cannot afford arithmetic that does not check out:
 *
 *   book        1/1.92 + 1/3.50 + 1/3.90 = 1.0630  ->  6.3% margin
 *   safe        0.80 x 1.28 - 1 = +2.4% edge  ->  2.1 units at quarter-Kelly
 *   balanced    0.52 x 2.05 - 1 = +6.6% edge  ->  1.6 units at quarter-Kelly
 *   aggressive  nothing priced above 3.00 clears the bar  ->  no value
 */
export const SAMPLE_MATCH = {
  homeTeam: "Brighton",
  awayTeam: "Crystal Palace",
  competition: "Premier League",
  bookmaker: "Betway",
  kickoff: "Saturday, 15:00",
  margin: 0.063,
  summary:
    "Brighton have won four of their last six at home and press high; Palace have kept one clean sheet in nine on the road. Palace are without their first-choice centre-back through suspension, and both sides have scored in five of the last six meetings.",
};

export const SAMPLE_PICKS: TierCardView[] = [
  {
    tier: "SAFE",
    noValue: false,
    market: "Double Chance",
    selection: "Brighton or Draw",
    odds: 1.28,
    modelProbability: 0.8,
    impliedProbability: 1 / 1.28,
    edgePercent: 0.8 * 1.28 - 1,
    stakeUnits: 2.14,
    stakeAmount: 21.4, // 2.14 units at a R10 unit size
    outcome: "UNMARKED",
    rationale:
      "Brighton have lost once at home in eleven, and Palace's away record this season is two wins in nine. The suspension of Palace's first-choice centre-back matters more than the aggregate table position suggests. The main risk is rotation: Brighton play in Europe on Thursday and have rested starters in this fixture before.",
  },
  {
    tier: "BALANCED",
    noValue: false,
    market: "Over/Under 2.5 Goals",
    selection: "Over 2.5 Goals",
    odds: 2.05,
    modelProbability: 0.52,
    impliedProbability: 1 / 2.05,
    edgePercent: 0.52 * 2.05 - 1,
    stakeUnits: 1.57,
    stakeAmount: 15.7, // 1.57 units at a R10 unit size
    outcome: "UNMARKED",
    rationale:
      "Five of the last six meetings between these sides went over 2.5, and Brighton's high defensive line has conceded in eight of their last ten. Palace score on the counter but concede chances doing it. The risk is weather — heavy rain is forecast, and this fixture has gone under twice in wet conditions.",
  },
  {
    tier: "AGGRESSIVE",
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
    outcome: "UNMARKED",
  },
];
