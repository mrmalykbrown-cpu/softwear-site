import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  MAX_STAKE_UNITS,
  bookmakerMargin,
  breakEvenStrikeRate,
  edge,
  impliedProbability,
  isWithinEditWindow,
  normalizeMarket,
  overround,
  quarterKellyUnits,
  settlementProfit,
} from "./betting";

const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );

describe("impliedProbability", () => {
  it("inverts decimal odds", () => {
    close(impliedProbability(2), 0.5);
    close(impliedProbability(1.9), 0.5263157894736842);
  });

  it("refuses odds that cannot exist", () => {
    assert.equal(impliedProbability(1), 0);
    assert.equal(impliedProbability(0), 0);
    assert.equal(impliedProbability(-3), 0);
    assert.equal(impliedProbability(Number.NaN), 0);
  });
});

describe("overround and margin", () => {
  it("prices the coin flip from the landing page", () => {
    close(overround([1.9, 1.9]), 1.0526315789473684);
    close(bookmakerMargin([1.9, 1.9]), 0.05263157894736836, 1e-12);
  });

  it("prices the three-way book from the sample analysis", () => {
    // 6.2958%, which the UI renders as the 6.3% quoted in the sample analysis.
    close(bookmakerMargin([1.92, 3.5, 3.9]), 0.0629578754578754, 1e-12);
  });

  it("reports no margin for an empty book rather than a negative one", () => {
    assert.equal(bookmakerMargin([]), 0);
  });
});

describe("normalizeMarket", () => {
  it("strips the margin so the market sums to one", () => {
    const normalized = normalizeMarket([1.92, 3.5, 3.9]);
    close(
      normalized.reduce((sum, value) => sum + value, 0),
      1,
    );
  });

  it("keeps the shortest price the most likely", () => {
    const [home, draw, away] = normalizeMarket([1.92, 3.5, 3.9]);
    assert.ok(home > draw && draw > away);
  });
});

describe("edge", () => {
  it("is zero when the estimate matches the price exactly", () => {
    close(edge(0.5, 2), 0);
  });

  it("matches the worked examples on the landing page", () => {
    close(edge(0.8, 1.28), 0.024, 1e-12);
    close(edge(0.52, 2.05), 0.066, 1e-12);
  });

  it("is negative when the price is short of the true chance", () => {
    assert.ok(edge(0.45, 2) < 0);
  });
});

describe("quarterKellyUnits", () => {
  it("stakes nothing on a non-positive edge", () => {
    assert.equal(quarterKellyUnits(0.5, 2), 0);
    assert.equal(quarterKellyUnits(0.4, 2), 0);
  });

  it("returns a quarter of the full Kelly fraction, in units of one percent", () => {
    // full Kelly = 0.066 / 1.05 = 0.062857 of bankroll; a quarter of that is
    // 1.5714% of bankroll, which is 1.57 units.
    close(quarterKellyUnits(0.52, 2.05), 1.5714285714285714, 1e-9);
  });

  it("caps at three units however large the edge", () => {
    assert.equal(quarterKellyUnits(0.95, 5), MAX_STAKE_UNITS);
  });

  it("never returns a stake for impossible odds", () => {
    assert.equal(quarterKellyUnits(0.9, 1), 0);
  });
});

describe("breakEvenStrikeRate", () => {
  it("is 52.6% at 1.90, not 50%", () => {
    close(breakEvenStrikeRate(1.9), 0.5263157894736842);
  });
});

describe("settlementProfit", () => {
  it("pays the winnings only, not the returned stake", () => {
    close(settlementProfit("WON", 2, 2.5), 3);
  });

  it("loses exactly the stake", () => {
    close(settlementProfit("LOST", 2, 2.5), -2);
  });

  it("treats a void as a refund", () => {
    close(settlementProfit("VOID", 2, 2.5), 0);
  });
});

describe("isWithinEditWindow", () => {
  it("allows an unsettled bet", () => {
    assert.equal(isWithinEditWindow(null), true);
  });

  it("allows an edit an hour after settlement", () => {
    assert.equal(isWithinEditWindow(new Date(Date.now() - 60 * 60 * 1000)), true);
  });

  it("refuses an edit 25 hours after settlement", () => {
    assert.equal(isWithinEditWindow(new Date(Date.now() - 25 * 60 * 60 * 1000)), false);
  });
});
