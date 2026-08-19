import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetOrcaRouterCachesForTests,
  invokeOrcaRouter,
  isOrcaRouterModel,
  listOrcaRouterModels,
  orcaRouterModelSlug,
  orcarouterStatus,
} from "../server/ai/orcarouter";

const previousKey = process.env.ORCAROUTER_API_KEY;

beforeEach(() => {
  process.env.ORCAROUTER_API_KEY = "test-orcarouter-key";
  __resetOrcaRouterCachesForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (previousKey === undefined) delete process.env.ORCAROUTER_API_KEY;
  else process.env.ORCAROUTER_API_KEY = previousKey;
  __resetOrcaRouterCachesForTests();
});

describe("OrcaRouter model catalog", () => {
  it("exposes only the configured zero-cost models behind the orcarouter prefix", () => {
    const models = listOrcaRouterModels();
    expect(models.map((model) => model.id)).toEqual([
      "orcarouter:deepseek/deepseek-v4-pro-0813-free",
      "orcarouter:qwen/qwen3.8-max-free",
      "orcarouter:nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    ]);
    expect(models.every((model) => model.free && model.supportsTools)).toBe(true);
    expect(isOrcaRouterModel("orcarouter:qwen/qwen3.8-max-free")).toBe(true);
    expect(isOrcaRouterModel("openrouter/free")).toBe(false);
    expect(orcaRouterModelSlug("orcarouter:qwen/qwen3.8-max-free")).toBe("qwen/qwen3.8-max-free");
  });

  it("reports setup required without pretending inference is operational", async () => {
    delete process.env.ORCAROUTER_API_KEY;
    const status = await orcarouterStatus({ force: true });
    expect(status).toMatchObject({
      provider: "orcarouter",
      configured: false,
      operational: false,
      dailyFreeRequestAllowance: null,
      freeModels: 3,
    });
  });

  it("reports operational when the configured key passes a models check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      ),
    );
    const status = await orcarouterStatus({ force: true });
    expect(status).toMatchObject({
      configured: true,
      operational: true,
      freeModels: 3,
    });
  });
});

describe("OrcaRouter inference", () => {
  it("sends the chosen model with the Bearer key and normalized payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "generation-orca-1",
          created: 1,
          model: "deepseek/deepseek-v4-pro-0813-free",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Ready." },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await invokeOrcaRouter({
      model: "orcarouter:deepseek/deepseek-v4-pro-0813-free",
      messages: [{ role: "user", content: "Hello" }],
      maxTokens: 200,
    });

    expect(response.model).toBe("deepseek/deepseek-v4-pro-0813-free");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.orcarouter.ai/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("deepseek/deepseek-v4-pro-0813-free");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.max_tokens).toBe(200);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-orcarouter-key");
  });

  it("falls back to the first configured model when the client ID is unknown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "generation-orca-2",
          created: 1,
          model: "deepseek/deepseek-v4-pro-0813-free",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "Safe fallback." },
              finish_reason: "stop",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await invokeOrcaRouter({
      model: "orcarouter:someone/paid-model",
      messages: [{ role: "user", content: "Hello" }],
    });

    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(body.model).toBe("deepseek/deepseek-v4-pro-0813-free");
  });

  it("throws a useful error when the request is rejected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: "Insufficient quota" } }), {
          status: 400,
        }),
      ),
    );

    await expect(
      invokeOrcaRouter({
        model: "orcarouter:qwen/qwen3.8-max-free",
        messages: [{ role: "user", content: "Hello" }],
      }),
    ).rejects.toThrow("Insufficient quota");
  });
});