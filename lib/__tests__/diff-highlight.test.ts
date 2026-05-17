import { describe, expect, it } from "vitest";

import { findFirstSpans } from "../diff-highlight";

describe("findFirstSpans", () => {
  it("returns empty for empty needle list", () => {
    expect(findFirstSpans("hello world", [])).toEqual([]);
  });

  it("skips empty needles", () => {
    expect(findFirstSpans("hello", [{ needle: "", className: "x" }])).toEqual([]);
  });

  it("finds the first occurrence of each needle", () => {
    const spans = findFirstSpans("hello world", [
      { needle: "hello", className: "red" },
      { needle: "world", className: "green" },
    ]);
    expect(spans).toEqual([
      { start: 0, end: 5, className: "red", title: undefined },
      { start: 6, end: 11, className: "green", title: undefined },
    ]);
  });

  it("returns spans sorted by start position", () => {
    const spans = findFirstSpans("alpha beta gamma", [
      { needle: "gamma", className: "c" },
      { needle: "alpha", className: "a" },
      { needle: "beta", className: "b" },
    ]);
    expect(spans.map((s) => s.className)).toEqual(["a", "b", "c"]);
  });

  it("skips needles that don't appear", () => {
    const spans = findFirstSpans("hello", [
      { needle: "hello", className: "found" },
      { needle: "missing", className: "lost" },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0].className).toBe("found");
  });

  it("uses only the FIRST occurrence (not all)", () => {
    const spans = findFirstSpans("abc abc abc", [{ needle: "abc", className: "x" }]);
    expect(spans).toHaveLength(1);
    expect(spans[0]).toEqual({ start: 0, end: 3, className: "x", title: undefined });
  });

  it("drops overlapping later spans (earlier wins)", () => {
    // "build a chatbot" — needle1 finds "build a chat" (0..12), needle2 finds
    // "chatbot" at 8..15 which overlaps. Earlier wins, second dropped.
    const spans = findFirstSpans("build a chatbot", [
      { needle: "build a chat", className: "first" },
      { needle: "chatbot", className: "second" },
    ]);
    expect(spans).toHaveLength(1);
    expect(spans[0].className).toBe("first");
  });

  it("forwards title for tooltip", () => {
    const spans = findFirstSpans("hi there", [{ needle: "hi", className: "x", title: "greeting" }]);
    expect(spans[0].title).toBe("greeting");
  });
});
