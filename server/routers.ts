import { COOKIE_NAME } from "../shared/const";
import { normalizeWorkroomSnapshot } from "../shared/workroom-snapshot";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import * as db from "./db";
import { sendExpoPushAlert } from "./push-alerts";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  workroom: router({
    reply: protectedProcedure.input(z.object({ botName: z.string().min(1).max(80), botRole: z.string().min(1).max(120), botPurpose: z.string().min(1).max(500), message: z.string().min(1).max(4000), recentContext: z.array(z.object({ author: z.enum(["user", "bot", "system"]), body: z.string().max(2000) })).max(8) })).mutation(async ({ ctx, input }) => {
      const catalog = await listLLMModels();
      const ids = catalog.data.map((model) => model.id);
      const model = ids.find((id) => id === "gpt-5-mini") ?? ids.find((id) => id.includes("mini")) ?? ids[0];
      if (!model) throw new Error("No model is currently available for this workroom.");
      const recentMessages = input.recentContext.map((entry) => entry.author === "bot" ? { role: "assistant" as const, content: entry.body } : entry.author === "system" ? { role: "system" as const, content: entry.body } : { role: "user" as const, content: entry.body });
      const response = await invokeLLM({ model, messages: [{ role: "system" as const, content: `You are ${input.botName}, a ${input.botRole} in UmU. Purpose: ${input.botPurpose}\n\nYou are a calm, precise AI teammate. Respond with a short, useful working note, typically under 180 words. State assumptions when information is missing. Keep all actions within UmU unless the user explicitly asks otherwise. Never claim to have used a browser, logged into an account, sent a message, scheduled a background job, accessed a file, or completed an external action. If the request would send, publish, purchase, delete, change permissions, access sensitive data, or otherwise create a material consequence, say that approval is required before proceeding and describe the safe next step. Do not ask for passwords, one-time codes, or secrets.` }, ...recentMessages, { role: "user" as const, content: input.message }], maxTokens: 360 });
      const text = response.choices[0]?.message?.content;
      const messageText = typeof text === "string" && text.trim() ? text.trim() : "I received the task, but the current model did not return a usable answer. Please try again.";
      const preferences = await db.getNotificationPreferences(ctx.user.id);
      const devices = preferences?.completionEnabled === false ? [] : await db.getPushDevicesForUser(ctx.user.id);
      const deliveries = await Promise.all(devices.filter((device) => device.completionEnabled).map((device) => sendExpoPushAlert({ expoPushToken: device.expoPushToken, kind: "completion", title: `${input.botName} completed a task`, body: messageText.slice(0, 170), url: "/" })));
      return { text: messageText, model, capability: "Server-side text response. External tools, browser control, and background execution are not connected in this build.", pushDelivery: { accepted: deliveries.some((delivery) => delivery.accepted), recipients: deliveries.filter((delivery) => delivery.accepted).length } };
    }),
  }),
  notifications: router({
    register: protectedProcedure.input(z.object({ installationId: z.string().min(12).max(96), expoPushToken: z.string().min(12).max(255), approvalEnabled: z.boolean(), completionEnabled: z.boolean() })).mutation(({ ctx, input }) => db.upsertPushDevice(ctx.user.id, input).then((registered) => ({ registered }))),
    deliver: protectedProcedure.input(z.object({ kind: z.enum(["approval", "completion"]), title: z.string().min(1).max(120), body: z.string().min(1).max(500), url: z.string().min(1).max(160) })).mutation(async ({ ctx, input }) => {
      const preferences = await db.getNotificationPreferences(ctx.user.id);
      const enabled = input.kind === "approval" ? preferences?.approvalEnabled !== false : preferences?.completionEnabled !== false;
      if (!enabled) return { accepted: false, recipients: 0 };
      const devices = await db.getPushDevicesForUser(ctx.user.id);
      const deliveries = await Promise.all(devices.filter((device) => input.kind === "approval" ? device.approvalEnabled : device.completionEnabled).map((device) => sendExpoPushAlert({ expoPushToken: device.expoPushToken, ...input })));
      return { accepted: deliveries.some((delivery) => delivery.accepted), recipients: deliveries.filter((delivery) => delivery.accepted).length };
    }),
  }),
  cloud: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      const record = await db.getWorkroomSnapshot(ctx.user.id);
      return { snapshot: record?.snapshot ?? null, updatedAt: record?.updatedAt?.toISOString() ?? null };
    }),
    save: protectedProcedure.input(z.object({ snapshot: z.record(z.string(), z.unknown()) })).mutation(async ({ ctx, input }) => {
      const snapshot = normalizeWorkroomSnapshot(input.snapshot);
      const [saved, normalized] = await Promise.all([db.upsertWorkroomSnapshot(ctx.user.id, snapshot), db.syncNormalizedWorkroomRecords(ctx.user.id, snapshot)]);
      return { saved: saved && normalized };
    }),
  }),
  records: router({ list: protectedProcedure.query(({ ctx }) => db.listNormalizedWorkroomRecords(ctx.user.id)) }),
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => { const stored = await db.getNotificationPreferences(ctx.user.id); return { approval: stored?.approvalEnabled ?? true, completion: stored?.completionEnabled ?? true }; }),
    save: protectedProcedure.input(z.object({ approval: z.boolean(), completion: z.boolean() })).mutation(({ ctx, input }) => db.upsertNotificationPreferences(ctx.user.id, { approvalEnabled: input.approval, completionEnabled: input.completion })),
  }),
  accountData: router({
    export: protectedProcedure.query(({ ctx }) => db.exportAccountWorkroomData(ctx.user.id)),
    delete: protectedProcedure.input(z.object({ confirmation: z.literal("DELETE") })).mutation(({ ctx }) => db.deleteAccountWorkroomData(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
