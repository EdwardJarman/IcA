export type AiProvider =
  | "openrouter"
  | "chatgpt"
  | "orcarouter"
  | "tokenrouter";

export type AiModelSummary = {
  id: string;
  name: string;
  provider: string;
  automatic: boolean;
};

const PREFIXES: Record<Exclude<AiProvider, "openrouter">, string> = {
  chatgpt: "chatgpt:",
  orcarouter: "orcarouter:",
  tokenrouter: "tokenrouter:",
};

export const providerLabel = (provider: AiProvider) => {
  if (provider === "chatgpt") return "ChatGPT";
  if (provider === "orcarouter") return "OrcaRouter";
  if (provider === "tokenrouter") return "TokenRouter";
  return "OpenRouter";
};

export const modelMatchesProvider = (
  modelId: string,
  provider: AiProvider,
) => {
  if (provider === "openrouter")
    return !Object.values(PREFIXES).some((prefix) => modelId.startsWith(prefix));
  return modelId.startsWith(PREFIXES[provider]);
};

export const canonicalModelForProvider = (
  modelId: string,
  provider: AiProvider,
) => {
  if (provider === "openrouter" || modelMatchesProvider(modelId, provider))
    return modelId;
  if (Object.values(PREFIXES).some((prefix) => modelId.startsWith(prefix)))
    return modelId;
  return `${PREFIXES[provider]}${modelId}`;
};

export const modelsForProvider = <T extends { id: string }>(
  models: T[],
  provider: AiProvider,
) => models.filter((model) => modelMatchesProvider(model.id, provider));

export const defaultModelForProvider = <T extends AiModelSummary>(
  models: T[],
  provider: AiProvider,
) => {
  const available = modelsForProvider(models, provider);
  if (provider === "openrouter") {
    return (
      available.find((model) => model.id === "openrouter/free") ??
      available.find((model) => model.automatic) ??
      available[0]
    );
  }
  return available[0];
};
