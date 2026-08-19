import { describe, expect, it } from "vitest";

import {
  defaultModelForProvider,
  modelMatchesProvider,
  modelsForProvider,
  providerLabel,
} from "../lib/ai-provider";

const models = [
  { id: "openrouter/free", name: "Auto", provider: "OpenRouter", automatic: true },
  { id: "meta/free", name: "Meta", provider: "Meta", automatic: false },
  { id: "orcarouter:deepseek/deepseek-v4-pro-0813-free", name: "DeepSeek V4 Pro", provider: "DeepSeek", automatic: false },
  { id: "orcarouter:qwen/qwen3.8-max-free", name: "Qwen 3.8 Max", provider: "Qwen", automatic: false },
  { id: "chatgpt:gpt-5", name: "GPT-5", provider: "ChatGPT", automatic: false },
];

describe("AI provider preference", () => {
  it("separates ChatGPT, OrcaRouter, and OpenRouter models", () => {
    expect(modelsForProvider(models, "chatgpt").map((model) => model.id)).toEqual(["chatgpt:gpt-5"]);
    expect(modelsForProvider(models, "orcarouter").map((model) => model.id)).toEqual([
      "orcarouter:deepseek/deepseek-v4-pro-0813-free",
      "orcarouter:qwen/qwen3.8-max-free",
    ]);
    expect(modelsForProvider(models, "openrouter").map((model) => model.id)).toEqual(["openrouter/free", "meta/free"]);
    expect(modelMatchesProvider("chatgpt:gpt-5", "chatgpt")).toBe(true);
    expect(modelMatchesProvider("chatgpt:gpt-5", "openrouter")).toBe(false);
    expect(modelMatchesProvider("chatgpt:gpt-5", "orcarouter")).toBe(false);
    expect(modelMatchesProvider("orcarouter:qwen/qwen3.8-max-free", "orcarouter")).toBe(true);
    expect(modelMatchesProvider("orcarouter:qwen/qwen3.8-max-free", "openrouter")).toBe(false);
    expect(modelMatchesProvider("meta/free", "orcarouter")).toBe(false);
  });

  it("chooses OpenRouter auto, the first OrcaRouter model, and the first connected ChatGPT model as safe defaults", () => {
    expect(defaultModelForProvider(models, "openrouter")?.id).toBe("openrouter/free");
    expect(defaultModelForProvider(models, "chatgpt")?.id).toBe("chatgpt:gpt-5");
    expect(defaultModelForProvider(models, "orcarouter")?.id).toBe("orcarouter:deepseek/deepseek-v4-pro-0813-free");
    expect(defaultModelForProvider(models.filter((model) => !model.id.startsWith("chatgpt:")), "chatgpt")).toBeUndefined();
    expect(providerLabel("openrouter")).toBe("OpenRouter");
    expect(providerLabel("chatgpt")).toBe("ChatGPT");
    expect(providerLabel("orcarouter")).toBe("OrcaRouter");
  });
});