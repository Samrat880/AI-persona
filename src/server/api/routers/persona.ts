import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  getPublicPersonas,
  getPersonaMeta,
  parsePersonaId,
} from "~/server/personas/config";
import { getServerClient } from "~/server/stream/serverClient";
import {
  getChannelWithState,
  isStreamDeletedUserError,
  updateChannelAgentState,
} from "~/server/services/channelAgentState";
import { setPersonaInputSchema } from "~/server/schemas/chat";

export const personaRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return { personas: getPublicPersonas() };
  }),

  setForChannel: publicProcedure
    .input(setPersonaInputSchema)
    .mutation(async ({ input }) => {
      const personaId = parsePersonaId(input.personaId);

      await updateChannelAgentState(input.channelType, input.channelId, {
        ai_persona_id: personaId,
      });

      const { state } = await getChannelWithState(
        input.channelType,
        input.channelId
      );

      if (state.ai_bot_user_id) {
        const persona = getPersonaMeta(personaId);
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

      return { personaId };
    }),
});
