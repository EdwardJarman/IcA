import type { Message } from "../_core/llm";
import type { Request } from "express";
import { invokeAi } from "../ai";
import * as db from "../db";
import {
  EXCEL_TOOLS,
  EXCEL_WRITE_TOOL_NAMES,
  excelWriteSummary,
  executeExcelReadTool,
  parseExcelToolArguments,
  type ExcelToolName,
} from "./excel-tools";
import { isMicrosoftExcelConfigured, makeExcelActionId, microsoftConnectionStatus } from "./microsoft-excel";

const toolResultText = (value: unknown) => {
  const serialized = JSON.stringify(value);
  return serialized.length <= 24_000
    ? serialized
    : `${serialized.slice(0, 24_000)}… (result truncated; request a smaller range)`;
};

export type ExcelAgentApproval = {
  actionId: string;
  title: string;
  detail: string;
  risk: "Medium";
};

export async function runRookAgent(input: {
  userId: number;
  request?: Request;
  botId: string;
  taskId: string;
  botName: string;
  botRole: string;
  botPurpose: string;
  model?: string;
  message: string;
  recentContext: Array<{ author: "user" | "bot" | "system"; body: string }>;
}) {
  const requestedModel = input.model?.trim() || "openrouter/free";

  const connection = isMicrosoftExcelConfigured()
    ? await microsoftConnectionStatus(input.userId)
    : { configured: false, connected: false, needsReauthorization: false };
  const tools = connection.connected ? EXCEL_TOOLS : undefined;
  const connectionNote = connection.connected
    ? "Microsoft Excel is connected. Use the Excel tools whenever the user asks about a workbook. Never guess workbook, worksheet, range, table, value, or formula data: inspect it with tools. Read tools may run immediately. Every write tool is only a proposal and is never executed until the user approves it in Rook Updates. Prepare no more than one write action per turn unless the user explicitly requests a batch."
    : connection.needsReauthorization
      ? "Microsoft Excel needs to be reconnected. Tell the user to open Account → Microsoft Excel and reconnect it if this request needs workbook access."
      : connection.configured
        ? "Microsoft Excel is available but not connected for this user. Tell them to open Account → Microsoft Excel and connect it if this request needs workbook access."
        : "Microsoft Excel is not configured for this deployment. Do not claim workbook access.";

  const messages: Message[] = [
    {
      role: "system",
      content: `You are ${input.botName}, a ${input.botRole} in Rook. Purpose: ${input.botPurpose}\n\nYou are a calm, precise AI teammate. Respond with a concise, useful working note. State assumptions when information is missing. ${connectionNote} Never claim an external action succeeded unless its tool result explicitly confirms success. Never reveal internal IDs, access tokens, or raw tool implementation details.`,
    },
    ...input.recentContext.map((entry) => ({
      role: entry.author === "bot" ? "assistant" as const : entry.author === "system" ? "system" as const : "user" as const,
      content: entry.body,
    })),
    { role: "user", content: input.message },
  ];

  const approvals: ExcelAgentApproval[] = [];
  const usedTools: string[] = [];
  let resolvedModel = requestedModel;

  for (let round = 0; round < 6; round += 1) {
    const response = await invokeAi(
      { model: requestedModel, messages, tools, toolChoice: tools ? "auto" : undefined, maxTokens: 900 },
      input.request,
    );
    resolvedModel = response.model || resolvedModel;
    const answer = response.choices[0]?.message;
    if (!answer) throw new Error("The model did not return a response");
    const calls = answer.tool_calls ?? [];
    if (!calls.length) {
      const text = typeof answer.content === "string" ? answer.content.trim() : "";
      return {
        text: text || (approvals.length ? "I prepared the Excel change and paused for your approval in Updates." : "I could not produce a usable answer. Please try again."),
        model: resolvedModel,
        approvals,
        usedTools,
        excelConnected: connection.connected,
      };
    }

    messages.push({ role: "assistant", content: typeof answer.content === "string" ? answer.content : "", tool_calls: calls });

    for (const call of calls) {
      const name = call.function.name as ExcelToolName;
      usedTools.push(name);
      let toolResult: unknown;
      try {
        const args = parseExcelToolArguments(name, call.function.arguments);
        if (EXCEL_WRITE_TOOL_NAMES.has(name)) {
          if (approvals.length) {
            toolResult = {
              status: "not_prepared",
              message: "One Excel change is already waiting for approval. Do not propose another write in this turn.",
            };
          } else {
            const summary = excelWriteSummary(name, args);
            const actionId = makeExcelActionId();
            await db.createExcelPendingAction({
              id: actionId,
              userId: input.userId,
              botClientId: input.botId,
              taskClientId: input.taskId,
              toolName: name,
              arguments: args,
              summary,
              state: "pending",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            });
            approvals.push({
              actionId,
              title: "Approve Excel change",
              detail: summary,
              risk: "Medium",
            });
            toolResult = { status: "approval_required", action_id: actionId, summary };
          }
        } else {
          toolResult = { status: "completed", result: await executeExcelReadTool(input.userId, name, args) };
        }
      } catch (error) {
        toolResult = {
          status: "error",
          message: error instanceof Error ? error.message : "Excel tool failed",
        };
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: toolResultText(toolResult) });
    }
  }

  return {
    text: approvals.length
      ? "I prepared the Excel change and paused for your approval in Updates."
      : "I reached the Excel tool limit for this turn. Try asking for a smaller workbook range or one operation at a time.",
    model: resolvedModel,
    approvals,
    usedTools,
    excelConnected: connection.connected,
  };
}
