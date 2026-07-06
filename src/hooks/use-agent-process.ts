"use client";

import type { PersonaId } from "~/config/personas";
import { api } from "~/trpc/react";
import { useCallback } from "react";

/** Triggers server-side AI processing after the user sends a message. */
export function useAgentProcess() {
  const processMessage = api.agent.processMessage.useMutation();

  return useCallback(
    (params: {
      channelId: string;
      text: string;
      personaId: PersonaId;
      messageId?: string;
    }) => {
      void processMessage.mutateAsync(params).catch((error: unknown) => {
        console.error("[agent] processMessage failed:", error);
      });
    },
    [processMessage]
  );
}
