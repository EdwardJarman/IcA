import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM, listLLMModels } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  workroom: router({
    reply: publicProcedure
      .input(
        z.object({
          botName: z.string().min(1).max(80),
          botRole: z.string().min(1).max(120),
          botPurpose: z.string().min(1).max(500),
          message: z.string().min(1).max(4000),
          recentContext: z.array(z.object({ author: z.enum(["user", "bot", "system"]), body: z.string().max(2000) })).max(8),
        }),
      )
      .mutation(async ({ input }) => {
        const catalog = await listLLMModels();
        const ids = catalog.data.map((model) => model.id);
        const model = ids.find((id) => id === "gpt-5-mini") ?? ids.find((id) => id.includes("mini")) ?? ids[0];
        if (!model) throw new Error("No model is currently available for this workroom.");
        const recentMessages = input.recentContext.map((entry) => {
          if (entry.author === "bot") return { role: "assistant" as const, content: entry.body };
          if (entry.author === "system") return { role: "system" as const, content: entry.body };
          return { role: "user" as const, content: entry.body };
        });

        const response = await invokeLLM({
          model,
          messages: [
            {
              role: "system" as const,
              content: `You are ${input.botName}, a ${input.botRole} in the Luma Workroom. Purpose: ${input.botPurpose}

You are a calm, precise AI teammate. Respond with a short, useful working note, typically under 180 words. State assumptions when information is missing. Keep all actions within the workroom unless the user explicitly asks otherwise. Never claim to have used a browser, logged into an account, sent a message, scheduled a background job, accessed a file, or completed an external action. If the request would send, publish, purchase, delete, change permissions, access sensitive data, or otherwise create a material consequence, say that approval is required before proceeding and describe the safe next step. Do not ask for passwords, one-time codes, or secrets.`,
            },
            ...recentMessages,
            { role: "user" as const, content: input.message },
          ],
          maxTokens: 360,
        });

        const text = response.choices[0]?.message?.content;
        return {
          text: typeof text === "string" && text.trim() ? text.trim() : "I received the task, but the current model did not return a usable answer. Please try again.",
          model,
          capability: "Server-side text response. External tools, browser control, and background execution are not connected in this build.",
        };
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
