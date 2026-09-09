import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildRecommendations, referenceMarketMargin, resolveMargin } from "./pipeline";
import { parseLooseJson } from "./json";
import { analysisSchema, extractionSuccessSchema } from "./schemas";

const extraction = extractionSuccessSchema.parse({
  home_team: "Brighton",
  away_team: "Crystal Palace",
  competition: "Premier League",
  kickoff: null,
  bookmaker: "Betway",
  markets: [
    { market: "Match Result", selection: "Brighton", odds: 1.92 },
    { market: "Match Result", selection: "Draw", odds: 3.5 },
    { market: "Match Result", selection: "Crystal Palace", odds: 3.9 },
    { market: "Double Chance", selection: "Brighton or Draw", odds: 1.28 },
    { market: "Over/Under 2.5 Goals", selection: "Over 2.5 Goals", odds: 2.05 },
  ],
});

function analysis(picks: unknown[]) {
  return analysisSchema.parse({
    match_summary: "A summary.",
    bookmaker_margin: 0.063,
    picks,
  });
}

const pick = (overrides: Record<string, unknown> = {}) => ({
  tier: "balanced",
  no_value: false,
  market: "Over/Under 2.5 Goals",
  selection: "Over 2.5 Goals",
  odds: 2.05,
  model_probability: 0.52,
  implied_probability: 0.4878,
  edge_percent: 0.066,
  stake_units: 1.57,
  rationale: "Because.",
  ...overrides,
});

describe("referenceMarketMargin", () => {
  it("measures the market with the most selections", () => {
    const margin = referenceMarketMargin(extraction);
    assert.ok(margin !== null);
    assert.ok(Math.abs(margin - 0.0629578754578754) < 1e-12);
  });

  it("returns null when no market has two selections to compare", () => {
    const single = extractionSuccessSchema.parse({
      home_team: "A",
      away_team: "B",
      markets: [{ market: "Match Result", selection: "A", odds: 2 }],
    });
    assert.equal(referenceMarketMargin(single), null);
  });
});

describe("resolveMargin", () => {
  it("prefers the margin computed from the screenshot", () => {
    const margin = resolveMargin(extraction, analysis([pick()]));
    assert.ok(margin !== null && Math.abs(margin - 0.0629578754578754) < 1e-12);
  });

  it("falls back to the model's figure when the book is incomplete", () => {
    const single = extractionSuccessSchema.parse({
      home_team: "A",
      away_team: "B",
      markets: [{ market: "Match Result", selection: "A", odds: 2 }],
    });
    assert.equal(resolveMargin(single, analysis([pick()])), 0.063);
  });
});

describe("buildRecommendations", () => {
  it("always returns exactly three tiers in a fixed order", () => {
    const built = buildRecommendations(extraction, analysis([pick()]), 10);
    assert.deepEqual(
      built.map((r) => r.tier),
      ["SAFE", "BALANCED", "AGGRESSIVE"],
    );
  });

  it("marks a tier the model did not return as no-value", () => {
    const built = buildRecommendations(extraction, analysis([pick()]), 10);
    assert.equal(built[0].noValue, true);
    assert.equal(built[0].odds, null);
    assert.equal(built[2].noValue, true);
  });

  it("recomputes edge and stake rather than trusting the model's arithmetic", () => {
    // The model claims a 40% edge and a 3 unit stake on a price that supports
    // neither. Both are discarded and recomputed from probability and odds.
    const built = buildRecommendations(
      extraction,
      analysis([pick({ edge_percent: 0.4, stake_units: 3, implied_probability: 0.1 })]),
      10,
    );
    const balanced = built[1];
    assert.ok(Math.abs((balanced.edgePercent ?? 0) - 0.066) < 1e-12);
    assert.ok(Math.abs((balanced.impliedProbability ?? 0) - 1 / 2.05) < 1e-12);
    assert.equal(balanced.stakeUnits, 1.57);
  });

  it("converts the stake into money at the user's unit size", () => {
    const built = buildRecommendations(extraction, analysis([pick()]), 10);
    assert.equal(built[1].stakeAmount, 15.71);
  });

  it("leaves the stake amount null when no unit size is set", () => {
    const built = buildRecommendations(extraction, analysis([pick()]), null);
    assert.equal(built[1].stakeAmount, null);
    assert.equal(built[1].stakeUnits, 1.57);
  });

  it("overrules the model when the recomputed edge is negative", () => {
    // 0.45 x 2.05 - 1 = -0.0775, whatever the model asserted.
    const built = buildRecommendations(
      extraction,
      analysis([pick({ model_probability: 0.45, no_value: false, edge_percent: 0.2 })]),
      10,
    );
    assert.equal(built[1].noValue, true);
    assert.equal(built[1].rationale, null);
  });

  it("rejects an edge too small to be distinguishable from noise", () => {
    // 0.4885 x 2.05 - 1 = +0.0014, inside the estimate's own error bars.
    const built = buildRecommendations(
      extraction,
      analysis([pick({ model_probability: 0.4885 })]),
      10,
    );
    assert.equal(built[1].noValue, true);
  });

  it("keeps an edge that clears the threshold", () => {
    // 0.4915 x 2.05 - 1 = +0.0076
    const built = buildRecommendations(
      extraction,
      analysis([pick({ model_probability: 0.4915 })]),
      10,
    );
    assert.equal(built[1].noValue, false);
  });

  it("corrects a price the model drifted from the screenshot", () => {
    const built = buildRecommendations(
      extraction,
      analysis([pick({ odds: 2.4, model_probability: 0.52 })]),
      10,
    );
    // 2.05 is what the screenshot says, so 2.05 is what is used and priced.
    assert.equal(built[1].odds, 2.05);
    assert.ok(Math.abs((built[1].edgePercent ?? 0) - 0.066) < 1e-12);
  });

  it("honours a price for a selection not present in the extraction", () => {
    const built = buildRecommendations(
      extraction,
      analysis([pick({ selection: "Both Teams To Score - Yes", odds: 1.8, model_probability: 0.62 })]),
      10,
    );
    assert.equal(built[1].odds, 1.8);
  });

  it("discards an incoherent pick instead of rendering nonsense", () => {
    for (const broken of [
      pick({ model_probability: 1.4 }),
      pick({ model_probability: null }),
      pick({ odds: 0.5, selection: "Nothing Real" }),
      pick({ selection: null }),
    ]) {
      const built = buildRecommendations(extraction, analysis([broken]), 10);
      assert.equal(built[1].noValue, true);
    }
  });

  it("passes a tier the model explicitly declined straight through", () => {
    const built = buildRecommendations(
      extraction,
      analysis([
        {
          tier: "aggressive",
          no_value: true,
          market: null,
          selection: null,
          odds: null,
          model_probability: null,
          implied_probability: null,
          edge_percent: null,
          stake_units: null,
          rationale: null,
        },
      ]),
      10,
    );
    assert.equal(built[2].noValue, true);
  });
});

describe("parseLooseJson", () => {
  it("parses a clean object", () => {
    assert.deepEqual(parseLooseJson('{"a":1}'), { a: 1 });
  });

  it("strips markdown fences the prompt told the model not to use", () => {
    assert.deepEqual(parseLooseJson('```json\n{"a":1}\n```'), { a: 1 });
    assert.deepEqual(parseLooseJson('```\n{"a":1}\n```'), { a: 1 });
  });

  it("recovers an object buried in prose", () => {
    assert.deepEqual(parseLooseJson('Here you go:\n{"a":1}\nHope that helps.'), { a: 1 });
  });

  it("throws on something that is not JSON at all", () => {
    assert.throws(() => parseLooseJson("I cannot help with that."), SyntaxError);
    assert.throws(() => parseLooseJson('{"a": }'), SyntaxError);
  });
});
