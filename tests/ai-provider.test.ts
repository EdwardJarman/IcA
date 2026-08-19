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
  { id: "chatgpt:gpt-5", name: "GPT-5", provider: "ChatGPT", automatic: false },
];

describe("AI provider preference", () => {
  it("separates ChatGPT subscription models from OpenRouter models", () => {
    expect(modelsForProvider(models, "chatgpt").map((model) => model.id)).toEqual(["chatgpt:gpt-5"]);
    expect(modelsForProvider(models, "openrouter").map((model) => model.id)).toEqual(["openrouter/free", "meta/free"]);
    expect(modelMatchesProvider("chatgpt:gpt-5", "chatgpt")).toBe(true);
    expect(modelMatchesProvider("chatgpt:gpt-5", "openrouter")).toBe(false);
  });

  it("chooses OpenRouter auto and the first connected ChatGPT model as safe defaults", () => {
    expect(defaultModelForProvider(models, "openrouter")?.id).toBe("openrouter/free");
    expect(defaultModelForProvider(models, "chatgpt")?.id).toBe("chatgpt:gpt-5");
    expect(defaultModelForProvider(models.filter((model) => !model.id.startsWith("chatgpt:")), "chatgpt")).toBeUndefined();
    expect(providerLabel("openrouter")).toBe("OpenRouter");
    expect(providerLabel("chatgpt")).toBe("ChatGPT");
  });
});
