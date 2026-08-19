import type { InvokeParams, InvokeResult, ToolCall } from "../_core/llm";
import {
  normalizeMessages,
  normalizeToolChoice,
  readJson,
  responseFormatFor,
} from "./openai-compat";
import type { RookAiModel } from "./openrouter";

const ORCAROUTER_API_BASE = "https://api.orcarouter.ai/v1";
export const ORCAROUTER_PREFIX = "orcarouter:";
const STATUS_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 45_000;

type OrcaRouterModelDef = {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextLength: number;
  supportsVision: boolean;
};

const ORCAROUTER_MODELS: OrcaRouterModelDef[] = [
  {
    id: "deepseek/deepseek-v4-pro-0813-free",
    name: "DeepSeek V4 Pro",
    provider: "DeepSeek",
    description: "A zero-cost DeepSeek model routed through Rook's shared OrcaRouter access.",
    contextLength: 128_000,
    supportsVision: false,
  },
  {
    id: "qwen/qwen3.8-max-free",
    name: "Qwen 3.8 Max",
    provider: "Qwen",
    description: "A zero-cost Qwen model routed through Rook's shared OrcaRouter access.",
    contextLength: 128_000,
    supportsVision: false,
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    name: "Nemotron Nano Omni",
    provider: "NVIDIA",
    description: "A zero-cost NVIDIA reasoning model routed through Rook's shared OrcaRouter access.",
    contextLength: 128_000,
    supportsVision: false,
  },
];

export type OrcaRouterStatus = {
  provider: "orcarouter";
  configured: boolean;
  operational: boolean;
  freeModels: number;
  dailyFreeRequestAllowance: 50 | 1000 | null;
  message: string;
};

type CacheValue<T> = { value: T; expiresAt: number };
type OrcaRouterErrorBody = { error?: { message?: string } };
let statusCache: CacheValue<OrcaRouterStatus> | undefined;

const apiKey = () => process.env.ORCAROUTER_API_KEY?.trim() || "";

export const isOrcaRouterConfigured = () => Boolean(apiKey());

export const isOrcaRouterModel = (model: string | undefined) =>
  Boolean(model?.startsWith(ORCAROUTER_PREFIX));

export const orcaRouterModelSlug = (model: string) =>
  model.slice(ORCAROUTER_PREFIX.length);

export function listOrcaRouterModels(): RookAiModel[] {
  return ORCAROUTER_MODELS.map((def) => ({
    id: `${ORCAROUTER_PREFIX}${def.id}`,
    name: def.name,
    provider: def.provider,
    description: def.description,
    contextLength: def.contextLength,
    supportsTools: true,
    supportsVision: def.supportsVision,
    automatic: false,
    free: true,
    usageLabel: "Free · Shared Rook allowance",
  }));
}

const errorMessage = (status: number, body: OrcaRouterErrorBody) => {
  const upstream = body.error?.message?.trim();
  if (status === 401) return "Rook's OrcaRouter connection needs attention.";
  if (status === 402)
    return "The OrcaRouter account cannot accept requests right now.";
  if (status === 429)
    return "Free AI capacity is temporarily full. Please try again later.";
  if (status === 502)
    return "No upstream provider responded. Please try again shortly.";
  return upstream || `OrcaRouter request failed (${status}).`;
};

export async function orcarouterStatus(options?: {
  force?: boolean;
}): Promise<OrcaRouterStatus> {
  if (!options?.force && statusCache?.expiresAt && statusCache.expiresAt > Date.now()) {
    return statusCache.value;
  }

  const models = listOrcaRouterModels();

  if (!isOrcaRouterConfigured()) {
    const status: OrcaRouterStatus = {
      provider: "orcarouter",
      configured: false,
      operational: false,
      freeModels: models.length,
      dailyFreeRequestAllowance: null,
      message: "OrcaRouter setup is required before Bots can respond.",
    };
    statusCache = { value: status, expiresAt: Date.now() + STATUS_TTL_MS };
    return status;
  }

  const response = await fetch(`${ORCAROUTER_API_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    signal: AbortSignal.timeout(15_000),
  });
  const operational = response.ok;
  const status: OrcaRouterStatus = {
    provider: "orcarouter",
    configured: true,
    operational,
    freeModels: models.length,
    dailyFreeRequestAllowance: null,
    message: operational
      ? `${models.length} zero-cost models are available.`
      : "Rook's OrcaRouter connection needs attention.",
  };
  statusCache = { value: status, expiresAt: Date.now() + STATUS_TTL_MS };
  return status;
}

export async function invokeOrcaRouter(
  params: InvokeParams,
): Promise<InvokeResult> {
  if (!isOrcaRouterConfigured())
    throw new Error("OrcaRouter is not configured for this Rook deployment.");

  const requested = params.model
    ? ORCAROUTER_MODELS.find((def) => def.id === orcaRouterModelSlug(params.model as string))
    : undefined;
  const model = requested?.id || ORCAROUTER_MODELS[0]?.id;

  const payload: Record<string, unknown> = {
    model,
    messages: normalizeMessages(params.messages),
    max_tokens: params.max_tokens ?? params.maxTokens ?? 1200,
  };
  if (params.tools?.length) payload.tools = params.tools;
  const toolChoice = normalizeToolChoice(
    params.toolChoice ?? params.tool_choice,
    params.tools,
  );
  if (toolChoice) payload.tool_choice = toolChoice;
  const responseFormat = responseFormatFor(params);
  if (responseFormat) payload.response_format = responseFormat;
  if (params.reasoning) payload.reasoning = params.reasoning;
  if (params.thinking) payload.thinking = params.thinking;

  const response = await fetch(`${ORCAROUTER_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await readJson<OrcaRouterErrorBody>(response);
    throw new Error(errorMessage(response.status, body));
  }

  const result = (await response.json()) as InvokeResult & {
    choices?: Array<{
      message?: { tool_calls?: ToolCall[] };
    }>;
  };
  if (!result.choices?.length)
    throw new Error("The selected OrcaRouter model did not return a response.");
  return result as InvokeResult;
}

export const __resetOrcaRouterCachesForTests = () => {
  statusCache = undefined;
};