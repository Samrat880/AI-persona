import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { processServerlessMessage } from "~/server/services/serverlessMessageProcessor";
import {
  getServerlessAgentStatus,
  resolvePersonaIdFromInput,
  startServerlessAgent,
  stopServerlessAgent,
} from "~/server/services/serverlessAgentLifecycle";

const channelInput = z.object({
  channelId: z.string().min(1),
  channelType: z.string().default("messaging"),
});

export const agentRouter = createTRPCRouter({
  start: publicProcedure
    .input(
      channelInput.extend({
        personaId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const personaId = resolvePersonaIdFromInput(input.personaId);
      await startServerlessAgent(
        input.channelType,
        input.channelId,
        personaId
      );
      return { personaId };
    }),

  stop: publicProcedure
    .input(channelInput)
    .mutation(async ({ input }) => {
      await stopServerlessAgent(input.channelType, input.channelId);
      return { ok: true };
    }),

  status: publicProcedure.input(channelInput).query(async ({ input }) => {
    return getServerlessAgentStatus(input.channelType, input.channelId);
  }),

  /** Local dev only: Stream webhooks cannot reach localhost without a tunnel. */
  processMessage: publicProcedure
    .input(
      channelInput.extend({
        text: z.string().min(1),
        personaId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (env.NODE_ENV !== "development") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const personaId = resolvePersonaIdFromInput(input.personaId);
      await processServerlessMessage(input.channelType, input.channelId, {
        text: input.text,
        custom: { persona_id: personaId },
      });
      return { ok: true };
    }),
});
