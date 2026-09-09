import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { breakdownByTier, cumulativeUnits, summarize, type SettledRow } from "./stats";

function row(partial: Partial<SettledRow>): SettledRow {
  return {
    tier: "BALANCED",
    outcome: "UNMARKED",
    odds: 2,
    stakeUnits: 1,
    profitLoss: null,
    settledAt: null,
    ...partial,
  } as SettledRow;
}

const at = (day: number) => new Date(`2026-03-${String(day).padStart(2, "0")}T12:00:00Z`);

describe("summarize", () => {
  it("reports nothing rather than zero for an account with no settled bets", () => {
    const stats = summarize([row({}), row({})]);
    assert.equal(stats.betsSettled, 0);
    assert.equal(stats.strikeRate, null);
    assert.equal(stats.roi, null);
    assert.equal(stats.pending, 2);
  });

  it("computes strike rate over decided bets only", () => {
    const stats = summarize([
      row({ outcome: "WON", profitLoss: 1, settledAt: at(1) }),
      row({ outcome: "LOST", profitLoss: -1, settledAt: at(2) }),
      row({ outcome: "WON", profitLoss: 1, settledAt: at(3) }),
      row({ outcome: "UNMARKED" }),
    ]);
    assert.equal(stats.won, 2);
    assert.equal(stats.lost, 1);
    assert.equal(stats.strikeRate, 2 / 3);
  });

  it("excludes voids from strike rate but counts them as settled", () => {
    const stats = summarize([
      row({ outcome: "WON", profitLoss: 1, settledAt: at(1) }),
      row({ outcome: "VOID", profitLoss: 0, settledAt: at(2) }),
    ]);
    assert.equal(stats.strikeRate, 1);
    assert.equal(stats.voided, 1);
    assert.equal(stats.betsSettled, 2);
  });

  it("computes ROI as profit over turnover", () => {
    // Two units staked in total, one unit of profit.
    const stats = summarize([
      row({ outcome: "WON", stakeUnits: 1, profitLoss: 2, settledAt: at(1) }),
      row({ outcome: "LOST", stakeUnits: 1, profitLoss: -1, settledAt: at(2) }),
    ]);
    assert.equal(stats.unitsStaked, 2);
    assert.equal(stats.netUnits, 1);
    assert.equal(stats.roi, 0.5);
  });

  it("does not divide by a turnover of zero", () => {
    const stats = summarize([row({ outcome: "WON", stakeUnits: 0, profitLoss: 0, settledAt: at(1) })]);
    assert.equal(stats.roi, null);
  });
});

describe("currentStreak", () => {
  it("counts back from the most recently settled bet", () => {
    const stats = summarize([
      row({ outcome: "LOST", profitLoss: -1, settledAt: at(1) }),
      row({ outcome: "WON", profitLoss: 1, settledAt: at(2) }),
      row({ outcome: "WON", profitLoss: 1, settledAt: at(3) }),
    ]);
    assert.deepEqual(stats.currentStreak, { type: "W", length: 2 });
  });

  it("ignores rows that were never marked", () => {
    const stats = summarize([
      row({ outcome: "LOST", profitLoss: -1, settledAt: at(1) }),
      row({ outcome: "UNMARKED" }),
    ]);
    assert.deepEqual(stats.currentStreak, { type: "L", length: 1 });
  });
});

describe("breakdownByTier", () => {
  it("returns all three tiers even when one has no bets", () => {
    const tiers = breakdownByTier([
      row({ tier: "SAFE", outcome: "WON", profitLoss: 0.5, settledAt: at(1) }),
    ]);
    assert.equal(tiers.length, 3);
    assert.deepEqual(
      tiers.map((t) => t.tier),
      ["SAFE", "BALANCED", "AGGRESSIVE"],
    );
    assert.equal(tiers[1].betsSettled, 0);
    assert.equal(tiers[1].roi, null);
  });
});

describe("cumulativeUnits", () => {
  it("is empty when nothing has settled", () => {
    assert.deepEqual(cumulativeUnits([row({})]), []);
  });

  it("starts at zero and accumulates in settlement order", () => {
    const points = cumulativeUnits([
      row({ outcome: "WON", profitLoss: 2, settledAt: at(3) }),
      row({ outcome: "LOST", profitLoss: -1, settledAt: at(1) }),
    ]);
    assert.deepEqual(
      points.map((p) => p.units),
      [0, -1, 1],
    );
  });
});
