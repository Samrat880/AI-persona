import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  getPublicPersonas,
  getPersona,
  isValidPersonaId,
} from "~/server/personas/config";
import { getServerClient } from "~/server/stream/serverClient";
import {
  getChannelWithState,
  isStreamDeletedUserError,
  updateChannelAgentState,
} from "~/server/services/channelAgentState";

const channelInput = z.object({
  channelId: z.string().min(1),
  channelType: z.string().default("messaging"),
});

export const personaRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return { personas: getPublicPersonas() };
  }),

  setForChannel: publicProcedure
    .input(
      channelInput.extend({
        personaId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      if (!isValidPersonaId(input.personaId)) {
        throw new Error("Invalid persona_id");
      }

      await updateChannelAgentState(
        input.channelType,
        input.channelId,
        { ai_persona_id: input.personaId }
      );

      const { state } = await getChannelWithState(
        input.channelType,
        input.channelId
      );

      if (state.ai_bot_user_id) {
        const persona = getPersona(input.personaId);
        try {
          await getServerClient().upsertUser({
            id: state.ai_bot_user_id,
            name: persona.botDisplayName,
            image: persona.avatarUrl,
          });
        } catch (error) {
          if (!isStreamDeletedUserError(error)) {
            throw error;
          }
        }
      }

      return { personaId: input.personaId };
    }),
});
