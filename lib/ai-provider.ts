export type AiProvider = "openrouter" | "chatgpt" | "orcarouter";
export type AiBackendProvider = "openrouter" | "orcarouter";

export type AiModelSummary = {
  id: string;
  name: string;
  provider: string;
  automatic: boolean;
};

export const providerLabel = (provider: AiProvider) =>
  provider === "chatgpt" ? "ChatGPT" : provider === "orcarouter" ? "OrcaRouter" : "OpenRouter";

export const modelMatchesProvider = (modelId: string, provider: AiProvider) => {
  if (provider === "chatgpt") return modelId.startsWith("chatgpt:");
  if (provider === "orcarouter") return modelId.startsWith("orcarouter:");
  return !modelId.startsWith("chatgpt:") && !modelId.startsWith("orcarouter:");
};

export const modelsForProvider = <T extends { id: string }>(models: T[], provider: AiProvider) =>
  models.filter((model) => modelMatchesProvider(model.id, provider));

export const defaultModelForProvider = <T extends AiModelSummary>(models: T[], provider: AiProvider) => {
  const available = modelsForProvider(models, provider);
  if (provider === "openrouter") {
    return available.find((model) => model.id === "openrouter/free") ??
      available.find((model) => model.automatic) ??
      available[0];
  }
  return available[0];
};