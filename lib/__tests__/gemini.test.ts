import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the SDK before importing gemini.
const mockGenerateContent = vi.fn();
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: mockGenerateContent };
    },
  };
});

beforeEach(() => {
  mockGenerateContent.mockReset();
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

const { callGemini } = await import("../gemini");

function geminiResponse(
  jsonText: string,
  usage: { prompt?: number; output?: number; cached?: number } = {}
) {
  return {
    text: jsonText,
    usageMetadata: {
      promptTokenCount: usage.prompt ?? 100,
      candidatesTokenCount: usage.output ?? 50,
      cachedContentTokenCount: usage.cached ?? 0,
    },
  };
}

describe("callGemini", () => {
  it("returns raw text + normalized usage on a well-formed response", async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse(`{"ok": true}`, { prompt: 200, output: 80, cached: 0 })
    );

    const result = await callGemini("source", "gemini");
    expect(result.raw).toBe(`{"ok": true}`);
    expect(result.usage).toEqual({
      input_tokens: 200,
      output_tokens: 80,
      cached_input_tokens: 0,
    });
    expect(result.model).toBe("gemini-2.5-flash");
  });

  it("splits cached vs non-cached input correctly", async () => {
    mockGenerateContent.mockResolvedValueOnce(
      geminiResponse(`{"x": 1}`, { prompt: 1500, output: 100, cached: 1100 })
    );

    const result = await callGemini("source", "gemini");
    expect(result.usage.input_tokens).toBe(400); // 1500 - 1100
    expect(result.usage.cached_input_tokens).toBe(1100);
  });

  it("requests JSON via responseMimeType and threads the system prompt", async () => {
    mockGenerateContent.mockResolvedValueOnce(geminiResponse(`{"x": 1}`));
    await callGemini("hello", "gemini");

    const args = mockGenerateContent.mock.calls[0][0];
    expect(args.model).toBe("gemini-2.5-flash");
    expect(args.config.responseMimeType).toBe("application/json");
    expect(typeof args.config.systemInstruction).toBe("string");
    expect(args.contents).toEqual([{ role: "user", parts: [{ text: "hello" }] }]);
  });

  it("appends retry contents (role: model + role: user) when previousAttempt is set", async () => {
    mockGenerateContent.mockResolvedValueOnce(geminiResponse(`{"x": 1}`));
    await callGemini("hello", "gemini", {
      previousAttempt: { raw: "garbage", parseError: "Schema mismatch: ir.task" },
    });

    const contents = mockGenerateContent.mock.calls[0][0].contents;
    expect(contents).toHaveLength(3);
    expect(contents[1].role).toBe("model");
    expect(contents[1].parts[0].text).toBe("garbage");
    expect(contents[2].role).toBe("user");
    expect(contents[2].parts[0].text).toMatch(/Schema mismatch: ir\.task/);
  });

  it("throws when the response has no text", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "",
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0, cachedContentTokenCount: 0 },
    });

    await expect(callGemini("s", "gemini")).rejects.toThrow(/no text content/);
  });

  it("throws GeminiNotConfiguredError when key is missing", async () => {
    // Module-level client cache means we need a fresh import to exercise the
    // no-key path — same pattern as openai.test.ts.
    vi.resetModules();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const fresh = await import("../gemini");
    await expect(fresh.callGemini("s", "gemini")).rejects.toBeInstanceOf(
      fresh.GeminiNotConfiguredError
    );
  });
});
