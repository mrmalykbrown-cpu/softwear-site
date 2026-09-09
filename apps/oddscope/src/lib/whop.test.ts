import assert from "node:assert/strict";
import crypto from "node:crypto";
import { beforeAll, describe, it } from "vitest";
import { checkoutUrlFor, toDate, verifyWhopSignature } from "./whop";

const SECRET = "whsec_test_secret";
const BODY = JSON.stringify({ action: "membership.went_valid", data: { id: "mem_1" } });

const sign = (payload: string, secret = SECRET) =>
  crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");

beforeAll(() => {
  process.env.WHOP_WEBHOOK_SECRET = SECRET;
  process.env.WHOP_CHECKOUT_URL = "https://whop.com/checkout/plan_abc";
});

describe("verifyWhopSignature", () => {
  it("accepts a bare hex digest of the raw body", () => {
    assert.equal(verifyWhopSignature(BODY, sign(BODY)), true);
  });

  it("accepts the timestamped v1 form", () => {
    const t = Math.floor(Date.now() / 1000);
    assert.equal(verifyWhopSignature(BODY, `t=${t},v1=${sign(`${t}.${BODY}`)}`), true);
  });

  it("accepts a v1 signature computed over the bare body", () => {
    const t = Math.floor(Date.now() / 1000);
    assert.equal(verifyWhopSignature(BODY, `t=${t},v1=${sign(BODY)}`), true);
  });

  it("rejects a replayed signature outside the tolerance window", () => {
    const stale = Math.floor(Date.now() / 1000) - 3600;
    assert.equal(
      verifyWhopSignature(BODY, `t=${stale},v1=${sign(`${stale}.${BODY}`)}`),
      false,
    );
  });

  it("rejects a signature made with the wrong secret", () => {
    assert.equal(verifyWhopSignature(BODY, sign(BODY, "wrong")), false);
  });

  it("rejects a body that was tampered with after signing", () => {
    const signature = sign(BODY);
    const tampered = BODY.replace("mem_1", "mem_2");
    assert.equal(verifyWhopSignature(tampered, signature), false);
  });

  it("rejects a missing, empty or malformed header", () => {
    assert.equal(verifyWhopSignature(BODY, null), false);
    assert.equal(verifyWhopSignature(BODY, ""), false);
    assert.equal(verifyWhopSignature(BODY, "not-hex-at-all"), false);
    assert.equal(verifyWhopSignature(BODY, "t=123,v1="), false);
    // A truncated digest must not pass by being a prefix of the real one.
    assert.equal(verifyWhopSignature(BODY, sign(BODY).slice(0, 32)), false);
  });
});

describe("checkoutUrlFor", () => {
  it("carries the OddScope user id as metadata", () => {
    const url = new URL(checkoutUrlFor("user_123"));
    assert.equal(url.searchParams.get("metadata[oddscope_user_id]"), "user_123");
  });

  it("appends rather than clobbers an existing query string", () => {
    process.env.WHOP_CHECKOUT_URL = "https://whop.com/checkout/plan_abc?ref=x";
    const url = new URL(checkoutUrlFor("user_123"));
    assert.equal(url.searchParams.get("ref"), "x");
    assert.equal(url.searchParams.get("metadata[oddscope_user_id]"), "user_123");
    process.env.WHOP_CHECKOUT_URL = "https://whop.com/checkout/plan_abc";
  });
});

describe("toDate", () => {
  it("reads seconds-since-epoch", () => {
    assert.equal(toDate(1772000000)?.toISOString(), new Date(1772000000000).toISOString());
  });

  it("reads milliseconds-since-epoch", () => {
    assert.equal(toDate(1772000000000)?.toISOString(), new Date(1772000000000).toISOString());
  });

  it("reads an ISO string", () => {
    assert.equal(toDate("2026-04-01T00:00:00Z")?.toISOString(), "2026-04-01T00:00:00.000Z");
  });

  it("returns null for anything unusable", () => {
    assert.equal(toDate(null), null);
    assert.equal(toDate(undefined), null);
    assert.equal(toDate("tomorrow"), null);
  });
});
