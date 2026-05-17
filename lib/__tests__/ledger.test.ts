// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearLedger, getLedger, recordCompile } from "../ledger";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("ledger", () => {
  it("returns zeroed entry when storage is empty", () => {
    expect(getLedger()).toEqual({ tokens_saved: 0, dollars_saved: 0, compiles_count: 0 });
  });

  it("returns zeroed entry on malformed JSON", () => {
    window.localStorage.setItem("prompt-ir.ledger", "{not json");
    expect(getLedger()).toEqual({ tokens_saved: 0, dollars_saved: 0, compiles_count: 0 });
  });

  it("returns zeroed entry when shape is wrong", () => {
    window.localStorage.setItem("prompt-ir.ledger", JSON.stringify({ tokens_saved: "lots" }));
    expect(getLedger()).toEqual({ tokens_saved: 0, dollars_saved: 0, compiles_count: 0 });
  });

  it("accumulates positive savings across compiles", () => {
    recordCompile({ saved_tokens: 100, saved_dollars: 0.0003 });
    recordCompile({ saved_tokens: 50, saved_dollars: 0.0001 });
    const result = getLedger();
    expect(result.tokens_saved).toBe(150);
    expect(result.compiles_count).toBe(2);
    expect(result.dollars_saved).toBeCloseTo(0.0004, 8);
  });

  it("honestly records negative savings (IR was bigger than source)", () => {
    recordCompile({ saved_tokens: 100, saved_dollars: 0.0003 });
    recordCompile({ saved_tokens: -44, saved_dollars: -0.00013 });
    const result = getLedger();
    expect(result.tokens_saved).toBe(56);
    expect(result.compiles_count).toBe(2);
    // floating-point math fuzz tolerance
    expect(result.dollars_saved).toBeCloseTo(0.00017, 8);
  });

  it("can result in net-negative savings if losses exceed wins", () => {
    recordCompile({ saved_tokens: 10, saved_dollars: 0.00003 });
    recordCompile({ saved_tokens: -50, saved_dollars: -0.00015 });
    const result = getLedger();
    expect(result.tokens_saved).toBe(-40);
    expect(result.dollars_saved).toBeLessThan(0);
  });

  it("clearLedger resets to zero", () => {
    recordCompile({ saved_tokens: 999, saved_dollars: 9.99 });
    expect(getLedger().tokens_saved).toBe(999);
    clearLedger();
    expect(getLedger()).toEqual({ tokens_saved: 0, dollars_saved: 0, compiles_count: 0 });
  });

  it("returns the new entry from recordCompile so the caller can use it without a re-read", () => {
    const result = recordCompile({ saved_tokens: 42, saved_dollars: 0.0001 });
    expect(result.tokens_saved).toBe(42);
    expect(result.compiles_count).toBe(1);
  });

  it("dispatches the LEDGER_CHANGED_EVENT on recordCompile", () => {
    let fired = 0;
    const handler = () => (fired += 1);
    window.addEventListener("prompt-ir.ledger.changed", handler);
    recordCompile({ saved_tokens: 1, saved_dollars: 0.000001 });
    window.removeEventListener("prompt-ir.ledger.changed", handler);
    expect(fired).toBe(1);
  });

  it("dispatches the LEDGER_CHANGED_EVENT on clearLedger", () => {
    let fired = 0;
    const handler = () => (fired += 1);
    window.addEventListener("prompt-ir.ledger.changed", handler);
    clearLedger();
    window.removeEventListener("prompt-ir.ledger.changed", handler);
    expect(fired).toBe(1);
  });
});
