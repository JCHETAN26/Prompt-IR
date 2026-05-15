import { describe, expect, it } from "vitest";

import { densityScore } from "../density";

describe("densityScore", () => {
  it("returns score 0 for empty input", () => {
    expect(densityScore("").score).toBe(0);
    expect(densityScore("   \n  ").score).toBe(0);
  });

  it("returns a low score (<0.4) for filler-heavy prose", () => {
    const fillerHeavy =
      "Hey, I was just wondering if you could maybe write some code " +
      "for me that kind of does what I want? Thanks so much, really!";
    const result = densityScore(fillerHeavy);
    expect(result.filler).toBeGreaterThan(3);
    expect(result.score).toBeLessThan(0.4);
  });

  it("returns a high score (>0.7) for imperative prose with constraints", () => {
    const imperative =
      "Build a REST API in Python with FastAPI. " +
      "Validate every input. Never return null. " +
      "Always log errors to stderr. Must support OAuth2.";
    const result = densityScore(imperative);
    expect(result.constraints).toBeGreaterThanOrEqual(3);
    expect(result.filler).toBe(0);
    expect(result.score).toBeGreaterThan(0.7);
  });

  it("counts constraint phrases accurately", () => {
    const text = "Never do X. Always do Y. Must support Z. Only allow A.";
    const result = densityScore(text);
    expect(result.constraints).toBe(4);
  });

  it("counts filler phrases including multi-word forms", () => {
    const text = "I was wondering if you could maybe write some stuff.";
    const result = densityScore(text);
    expect(result.filler).toBeGreaterThanOrEqual(3);
  });

  it("treats 'hello' as filler alongside 'hi' and 'hey'", () => {
    expect(densityScore("Hello there.").filler).toBeGreaterThanOrEqual(1);
    expect(densityScore("Hi there.").filler).toBeGreaterThanOrEqual(1);
    expect(densityScore("Hey there.").filler).toBeGreaterThanOrEqual(1);
  });
});
