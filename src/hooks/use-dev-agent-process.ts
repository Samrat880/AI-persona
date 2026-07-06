"use client";

import type { PersonaId } from "~/config/personas";
import { api } from "~/trpc/react";
import { useCallback } from "react";

/** Local dev: Stream webhooks cannot reach localhost without a tunnel. */
export function useDevAgentProcess() {
  const processMessage = api.agent.processMessage.useMutation();

  return useCallback(
    (params: { channelId: string; text: string; personaId: PersonaId }) => {
      if (process.env.NODE_ENV !== "development") return;
      void processMessage.mutateAsync(params);
    },
    [processMessage]
  );
}
