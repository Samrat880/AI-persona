import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { processServerlessMessage } from "~/server/services/serverlessMessageProcessor";
import {
  getServerlessAgentStatus,
  resolvePersonaIdFromInput,
  startServerlessAgent,
  stopServerlessAgent,
} from "~/server/services/serverlessAgentLifecycle";
import {
  channelInputSchema,
  optionalPersonaIdSchema,
  processMessageInputSchema,
} from "~/server/schemas/chat";

export const agentRouter = createTRPCRouter({
  start: publicProcedure
    .input(
      channelInputSchema.extend({
        personaId: optionalPersonaIdSchema,
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

  stop: publicProcedure.input(channelInputSchema).mutation(async ({ input }) => {
    await stopServerlessAgent(input.channelType, input.channelId);
    return { ok: true };
  }),

  status: publicProcedure.input(channelInputSchema).query(async ({ input }) => {
    return getServerlessAgentStatus(input.channelType, input.channelId);
  }),

  /**
   * Process a user message server-side. Used in all environments because Stream
   * webhooks cannot reach localhost; on Vercel they may also be misconfigured.
   */
  processMessage: publicProcedure
    .input(processMessageInputSchema)
    .mutation(async ({ input }) => {
      const personaId = resolvePersonaIdFromInput(input.personaId);
      await processServerlessMessage(input.channelType, input.channelId, {
        id: input.messageId,
        text: input.text,
        custom: { persona_id: personaId },
      });
      return { ok: true };
    }),
});
