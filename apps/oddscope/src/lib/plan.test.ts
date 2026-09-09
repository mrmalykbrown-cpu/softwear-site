import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accessDenialReason, hasAnalysisAccess, isTrialing, trialEndDate } from "./plan";
import { hasAnalysisAccessFromToken } from "./access-token";

const now = new Date("2026-03-15T12:00:00Z");
const future = new Date("2026-03-20T12:00:00Z");
const past = new Date("2026-03-10T12:00:00Z");

describe("trialEndDate", () => {
  it("is three days out", () => {
    assert.equal(
      trialEndDate(now).toISOString(),
      new Date("2026-03-18T12:00:00Z").toISOString(),
    );
  });
});

describe("hasAnalysisAccess", () => {
  it("allows a trial that has not lapsed", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "TRIAL", trialEndsAt: future, subscriptionEndsAt: null }, now),
      true,
    );
  });

  it("refuses a lapsed trial", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "TRIAL", trialEndsAt: past, subscriptionEndsAt: null }, now),
      false,
    );
  });

  it("refuses a trial with no end date at all", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "TRIAL", trialEndsAt: null, subscriptionEndsAt: null }, now),
      false,
    );
  });

  it("allows an active subscription with no end date recorded", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "ACTIVE", trialEndsAt: null, subscriptionEndsAt: null }, now),
      true,
    );
  });

  it("honours a cancelled subscription until the period it paid for ends", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "ACTIVE", trialEndsAt: null, subscriptionEndsAt: future }, now),
      true,
    );
  });

  it("closes an active subscription once its period has passed", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "ACTIVE", trialEndsAt: null, subscriptionEndsAt: past }, now),
      false,
    );
  });

  it("always refuses EXPIRED, whatever the dates say", () => {
    assert.equal(
      hasAnalysisAccess({ plan: "EXPIRED", trialEndsAt: future, subscriptionEndsAt: future }, now),
      false,
    );
  });
});

describe("isTrialing", () => {
  it("is false once the trial window closes", () => {
    assert.equal(isTrialing({ plan: "TRIAL", trialEndsAt: past, subscriptionEndsAt: null }, now), false);
    assert.equal(isTrialing({ plan: "TRIAL", trialEndsAt: future, subscriptionEndsAt: null }, now), true);
  });
});

describe("accessDenialReason", () => {
  it("says nothing when access is granted", () => {
    assert.equal(
      accessDenialReason({ plan: "ACTIVE", trialEndsAt: null, subscriptionEndsAt: null }, now),
      null,
    );
  });

  it("explains which door closed", () => {
    assert.match(
      accessDenialReason({ plan: "TRIAL", trialEndsAt: past, subscriptionEndsAt: null }, now) ?? "",
      /trial/i,
    );
    assert.match(
      accessDenialReason({ plan: "EXPIRED", trialEndsAt: null, subscriptionEndsAt: null }, now) ?? "",
      /no longer active/i,
    );
  });
});

describe("hasAnalysisAccessFromToken", () => {
  it("mirrors the database check for known plans", () => {
    assert.equal(hasAnalysisAccessFromToken("ACTIVE", null, now), true);
    assert.equal(hasAnalysisAccessFromToken("EXPIRED", future.toISOString(), now), false);
    assert.equal(hasAnalysisAccessFromToken("TRIAL", future.toISOString(), now), true);
    assert.equal(hasAnalysisAccessFromToken("TRIAL", past.toISOString(), now), false);
  });

  it("defers to the server rather than blocking on an unreadable snapshot", () => {
    // Middleware must never lock a paying user out because a token was empty
    // or malformed; the analysis route re-reads the User row regardless.
    assert.equal(hasAnalysisAccessFromToken(undefined, undefined, now), true);
    assert.equal(hasAnalysisAccessFromToken("SOMETHING_ELSE", null, now), true);
    assert.equal(hasAnalysisAccessFromToken("TRIAL", "not-a-date", now), false);
    assert.equal(hasAnalysisAccessFromToken("TRIAL", 12345, now), true);
  });
});
