import { z } from "zod";

import { normalizeWorkroomSnapshot } from "../shared/workroom-snapshot";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { getAiBackendStatus, listAiModels } from "./ai";
import * as db from "./db";
import { runRookAgent } from "./integrations/excel-agent";
import { executeValidatedExcelWrite, type ExcelToolName } from "./integrations/excel-tools";
import {
  createMicrosoftAuthorizationUrl,
  listExcelTables,
  listExcelWorkbooks,
  listExcelWorksheets,
  microsoftConnectionStatus,
  readExcelRange,
} from "./integrations/microsoft-excel";
import { sendExpoPushAlert } from "./push-alerts";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  workroom: router({
    reply: protectedProcedure.input(z.object({
      botId: z.string().min(1).max(128),
      taskId: z.string().min(1).max(128),
      botName: z.string().min(1).max(80),
      botRole: z.string().min(1).max(120),
      botPurpose: z.string().min(1).max(500),
      model: z.string().min(1).max(180).optional(),
      message: z.string().min(1).max(4000),
      recentContext: z.array(z.object({
        author: z.enum(["user", "bot", "system"]),
        body: z.string().max(2000),
      })).max(8),
    })).mutation(async ({ ctx, input }) => {
      const result = await runRookAgent({ userId: ctx.user.id, ...input });
      const preferences = await db.getNotificationPreferences(ctx.user.id);
      const needsApproval = result.approvals.length > 0;
      const notificationEnabled = needsApproval
        ? preferences?.approvalEnabled !== false
        : preferences?.completionEnabled !== false;
      const devices = notificationEnabled ? await db.getPushDevicesForUser(ctx.user.id) : [];
      const deliveries = await Promise.all(
        devices
          .filter((device) => needsApproval ? device.approvalEnabled : device.completionEnabled)
          .map((device) => sendExpoPushAlert({
            expoPushToken: device.expoPushToken,
            kind: needsApproval ? "approval" : "completion",
            title: needsApproval ? `${input.botName} prepared an Excel change` : `${input.botName} completed a task`,
            body: result.text.slice(0, 170),
            url: needsApproval ? "/activity" : "/",
          })),
      );
      return {
        ...result,
        pushDelivery: {
          accepted: deliveries.some((delivery) => delivery.accepted),
          recipients: deliveries.filter((delivery) => delivery.accepted).length,
        },
      };
    }),
  }),
  ai: router({
    status: protectedProcedure.query(() => getAiBackendStatus()),
    models: protectedProcedure.query(async () => ({
      provider: "openrouter" as const,
      models: await listAiModels(),
    })),
  }),
  excel: router({
    status: protectedProcedure.query(({ ctx }) => microsoftConnectionStatus(ctx.user.id)),
    authorizationUrl: protectedProcedure
      .input(z.object({ returnTo: z.string().url().max(500).optional() }))
      .mutation(({ ctx, input }) => createMicrosoftAuthorizationUrl(ctx.user.id, input.returnTo)),
    disconnect: protectedProcedure.mutation(({ ctx }) => db.deleteMicrosoftConnection(ctx.user.id)),
    workbooks: protectedProcedure.query(({ ctx }) => listExcelWorkbooks(ctx.user.id)),
    workbookStructure: protectedProcedure
      .input(z.object({ driveId: z.string().min(1).max(255), itemId: z.string().min(1).max(255) }))
      .query(async ({ ctx, input }) => {
        const [worksheets, tables] = await Promise.all([
          listExcelWorksheets(ctx.user.id, input.driveId, input.itemId),
          listExcelTables(ctx.user.id, input.driveId, input.itemId),
        ]);
        return { worksheets, tables };
      }),
    readRange: protectedProcedure
      .input(z.object({
        driveId: z.string().min(1).max(255),
        itemId: z.string().min(1).max(255),
        worksheet: z.string().min(1).max(31),
        address: z.string().min(2).max(40),
      }))
      .query(({ ctx, input }) => readExcelRange(ctx.user.id, input)),
    resolveAction: protectedProcedure
      .input(z.object({ actionId: z.string().min(1).max(96), decision: z.enum(["approve", "decline"]) }))
      .mutation(async ({ ctx, input }) => {
        const action = await db.getExcelPendingAction(ctx.user.id, input.actionId);
        if (!action || action.state !== "pending") throw new Error("This Excel action is no longer pending");
        if (action.expiresAt.getTime() <= Date.now()) {
          await db.resolveExcelPendingAction(ctx.user.id, action.id, { state: "expired" });
          throw new Error("This Excel approval expired. Ask the Bot to prepare it again");
        }
        if (input.decision === "decline") {
          await db.resolveExcelPendingAction(ctx.user.id, action.id, { state: "declined" });
          return {
            executed: false,
            declined: true,
            summary: action.summary,
            botId: action.botClientId,
            taskId: action.taskClientId,
          };
        }
        const result = await executeValidatedExcelWrite(
          ctx.user.id,
          action.toolName as ExcelToolName,
          action.arguments as Record<string, unknown>,
        );
        await db.resolveExcelPendingAction(ctx.user.id, action.id, { state: "executed", result });
        return {
          executed: true,
          declined: false,
          summary: action.summary,
          result,
          botId: action.botClientId,
          taskId: action.taskClientId,
        };
      }),
  }),
  notifications: router({
    register: protectedProcedure.input(z.object({
      installationId: z.string().min(12).max(96),
      expoPushToken: z.string().min(12).max(255),
      approvalEnabled: z.boolean(),
      completionEnabled: z.boolean(),
    })).mutation(({ ctx, input }) => db.upsertPushDevice(ctx.user.id, input).then((registered) => ({ registered }))),
    deliver: protectedProcedure.input(z.object({
      kind: z.enum(["approval", "completion"]),
      title: z.string().min(1).max(120),
      body: z.string().min(1).max(500),
      url: z.string().min(1).max(160),
    })).mutation(async ({ ctx, input }) => {
      const preferences = await db.getNotificationPreferences(ctx.user.id);
      const enabled = input.kind === "approval" ? preferences?.approvalEnabled !== false : preferences?.completionEnabled !== false;
      if (!enabled) return { accepted: false, recipients: 0 };
      const devices = await db.getPushDevicesForUser(ctx.user.id);
      const deliveries = await Promise.all(
        devices
          .filter((device) => input.kind === "approval" ? device.approvalEnabled : device.completionEnabled)
          .map((device) => sendExpoPushAlert({ expoPushToken: device.expoPushToken, ...input })),
      );
      return {
        accepted: deliveries.some((delivery) => delivery.accepted),
        recipients: deliveries.filter((delivery) => delivery.accepted).length,
      };
    }),
  }),
  cloud: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      const record = await db.getWorkroomSnapshot(ctx.user.id);
      return { snapshot: record?.snapshot ?? null, updatedAt: record?.updatedAt?.toISOString() ?? null };
    }),
    save: protectedProcedure.input(z.object({ snapshot: z.record(z.string(), z.unknown()) })).mutation(async ({ ctx, input }) => {
      const snapshot = normalizeWorkroomSnapshot(input.snapshot);
      const [saved, normalized] = await Promise.all([
        db.upsertWorkroomSnapshot(ctx.user.id, snapshot),
        db.syncNormalizedWorkroomRecords(ctx.user.id, snapshot),
      ]);
      return { saved: saved && normalized };
    }),
  }),
  records: router({ list: protectedProcedure.query(({ ctx }) => db.listNormalizedWorkroomRecords(ctx.user.id)) }),
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const stored = await db.getNotificationPreferences(ctx.user.id);
      return { approval: stored?.approvalEnabled ?? true, completion: stored?.completionEnabled ?? true };
    }),
    save: protectedProcedure
      .input(z.object({ approval: z.boolean(), completion: z.boolean() }))
      .mutation(({ ctx, input }) => db.upsertNotificationPreferences(ctx.user.id, {
        approvalEnabled: input.approval,
        completionEnabled: input.completion,
      })),
  }),
  accountData: router({
    export: protectedProcedure.query(({ ctx }) => db.exportAccountWorkroomData(ctx.user.id)),
    delete: protectedProcedure
      .input(z.object({ confirmation: z.literal("DELETE") }))
      .mutation(({ ctx }) => db.deleteAccountWorkroomData(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
