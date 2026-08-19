import type { InvokeParams, InvokeResult } from "../_core/llm";
import type { Request } from "express";
import {
  invokeOpenRouter,
  listOpenRouterModels,
  openRouterStatus,
  type RookAiModel,
  type RookAiStatus,
} from "./openrouter";
import { invokeChatGPT, isChatGPTModel, listChatGPTModels } from "./chatgpt";

export type AiModel = RookAiModel;
export type AiBackendStatus = RookAiStatus;

export const listAiModels = async (request?: Request) => {
  const openRouter = await listOpenRouterModels();
  const chatGPT = request ? await listChatGPTModels(request) : [];
  return [...chatGPT, ...openRouter];
};
export const getAiBackendStatus = () => openRouterStatus();
export const invokeAi = (params: InvokeParams, request?: Request): Promise<InvokeResult> => {
  if (isChatGPTModel(params.model)) {
    if (!request) throw new Error("ChatGPT needs an authenticated Rook request.");
    return invokeChatGPT(params, request).catch((error) => {
      console.warn("[AI] ChatGPT unavailable; using OpenRouter fallback", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return invokeOpenRouter({ ...params, model: "openrouter/free" });
    });
  }
  return invokeOpenRouter(params);
};
