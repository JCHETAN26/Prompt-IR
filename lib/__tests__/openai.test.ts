import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the SDK before importing openai.
const mockCreate = vi.fn();
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
    },
  };
});

beforeEach(() => {
  mockCreate.mockReset();
  process.env.OPENAI_API_KEY = "sk-test-key";
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

const { callOpenAI, OpenAINotConfiguredError } = await import("../openai");

function openaiResponse(
  jsonText: string,
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
  } = {}
) {
  return {
    model: "gpt-4o",
    choices: [{ message: { content: jsonText } }],
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 100,
      completion_tokens: usage.completion_tokens ?? 50,
      prompt_tokens_details: { cached_tokens: usage.cached_tokens ?? 0 },
    },
  };
}

describe("callOpenAI", () => {
  it("returns raw text + normalized usage on a well-formed response", async () => {
    mockCreate.mockResolvedValueOnce(
      openaiResponse(`{"ok": true}`, {
        prompt_tokens: 200,
        completion_tokens: 80,
        cached_tokens: 0,
      })
    );

    const result = await callOpenAI("source", "openai");
    expect(result.raw).toBe(`{"ok": true}`);
    expect(result.usage).toEqual({
      input_tokens: 200,
      output_tokens: 80,
      cached_input_tokens: 0,
    });
    expect(result.model).toBe("gpt-4o");
  });

  it("splits cached vs non-cached input correctly", async () => {
    mockCreate.mockResolvedValueOnce(
      openaiResponse(`{"x": 1}`, {
        prompt_tokens: 1500,
        completion_tokens: 100,
        cached_tokens: 1100,
      })
    );

    const result = await callOpenAI("source", "openai");
    expect(result.usage.input_tokens).toBe(400); // 1500 - 1100
    expect(result.usage.cached_input_tokens).toBe(1100);
  });

  it("requests response_format: json_object and the openai mode prompt", async () => {
    mockCreate.mockResolvedValueOnce(openaiResponse(`{"x":1}`));
    await callOpenAI("hello", "openai");

    const args = mockCreate.mock.calls[0][0];
    expect(args.response_format).toEqual({ type: "json_object" });
    expect(args.model).toBe("gpt-4o");
    // System prompt + user source
    expect(args.messages[0].role).toBe("system");
    expect(args.messages[1].role).toBe("user");
    expect(args.messages[1].content).toBe("hello");
  });

  it("appends retry messages when previousAttempt is supplied", async () => {
    mockCreate.mockResolvedValueOnce(openaiResponse(`{"x":1}`));
    await callOpenAI("hello", "openai", {
      previousAttempt: { raw: "garbage", parseError: "Invalid JSON: foo" },
    });

    const messages = mockCreate.mock.calls[0][0].messages;
    expect(messages).toHaveLength(4); // system, user, assistant (prior raw), user (retry)
    expect(messages[2].role).toBe("assistant");
    expect(messages[2].content).toBe("garbage");
    expect(messages[3].role).toBe("user");
    expect(messages[3].content).toMatch(/Invalid JSON: foo/);
  });

  it("throws when the SDK returns no content", async () => {
    mockCreate.mockResolvedValueOnce({
      model: "gpt-4o",
      choices: [{ message: { content: null } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 0,
        prompt_tokens_details: { cached_tokens: 0 },
      },
    });

    await expect(callOpenAI("s", "openai")).rejects.toThrow(/no text content/);
  });

  it("throws OpenAINotConfiguredError when key is missing", async () => {
    // The module caches the client at first successful getClient(), so we
    // need a fresh module instance for this test to exercise the no-key path.
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;

    const fresh = await import("../openai");
    await expect(fresh.callOpenAI("s", "openai")).rejects.toBeInstanceOf(
      fresh.OpenAINotConfiguredError
    );
  });
});
