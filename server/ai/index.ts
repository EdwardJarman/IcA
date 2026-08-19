import type { InvokeParams, InvokeResult } from "../_core/llm";
import {
  invokeOpenRouter,
  listOpenRouterModels,
  openRouterStatus,
  type RookAiModel,
  type RookAiStatus,
} from "./openrouter";

export type AiModel = RookAiModel;
export type AiBackendStatus = RookAiStatus;

export const listAiModels = () => listOpenRouterModels();
export const getAiBackendStatus = () => openRouterStatus();
export const invokeAi = (params: InvokeParams): Promise<InvokeResult> =>
  invokeOpenRouter(params);
