import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the SDK before importing judge.
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate };
    },
  };
});

beforeEach(() => {
  mockCreate.mockReset();
  // judge.ts caches the client via getClient() in anthropic.ts; we need
  // a key so getClient doesn't throw before our SDK mock is consulted.
  process.env.ANTHROPIC_API_KEY = "sk-test-key";
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

// Import after mocks are wired.
const { callJudge } = await import("../judge");

function judgeResponse(rawText: string, usage = { input_tokens: 80, output_tokens: 40 }) {
  return {
    content: [{ type: "text" as const, text: rawText }],
    usage,
  };
}

describe("callJudge", () => {
  it("returns clamped integer scores on a well-formed response", async () => {
    mockCreate.mockResolvedValueOnce(
      judgeResponse(`{"specificity": 8, "constraint_clarity": 9, "formatting": 7}`)
    );

    const result = await callJudge("raw source", "compiled IR");
    expect(result).not.toBeNull();
    expect(result!.score).toEqual({
      specificity: 8,
      constraint_clarity: 9,
      formatting: 7,
    });
    expect(result!.usage.input_tokens).toBe(80);
  });

  it("clamps out-of-range values into [0, 10]", async () => {
    mockCreate.mockResolvedValueOnce(
      judgeResponse(`{"specificity": 15, "constraint_clarity": -3, "formatting": 5.7}`)
    );

    const result = await callJudge("s", "ir");
    expect(result!.score).toEqual({
      specificity: 10,
      constraint_clarity: 0,
      formatting: 6, // 5.7 rounded
    });
  });

  it("returns null on malformed JSON", async () => {
    mockCreate.mockResolvedValueOnce(judgeResponse("not a json object"));

    const result = await callJudge("s", "ir");
    expect(result).toBeNull();
  });

  it("returns null when a required field is missing", async () => {
    mockCreate.mockResolvedValueOnce(judgeResponse(`{"specificity": 8, "formatting": 7}`));

    const result = await callJudge("s", "ir");
    expect(result).toBeNull();
  });

  it("returns null when the SDK throws", async () => {
    mockCreate.mockRejectedValueOnce(new Error("rate limit"));

    const result = await callJudge("s", "ir");
    expect(result).toBeNull();
  });

  it("returns null when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    // Force a new client init by invalidating the cached module state isn't
    // worth it — getClient() will throw AnthropicNotConfiguredError, which
    // judge catches and returns null.
    const result = await callJudge("s", "ir");
    expect(result).toBeNull();
  });
});
