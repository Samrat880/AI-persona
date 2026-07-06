"use client";

import type { PersonaId } from "~/config/personas";
import { DEFAULT_PERSONA_ID } from "~/config/personas";
import {
  persistPersonaSelection,
  resolvePersonaId,
} from "~/lib/persistence";
import { api } from "~/trpc/react";
import { useCallback, useEffect, useRef, useState } from "react";

export type AgentStatus = "disconnected" | "connecting" | "connected";

interface UseAIAgentStatusProps {
  channelId: string | null;
}

export const useAIAgentStatus = ({ channelId }: UseAIAgentStatusProps) => {
  const [status, setStatus] = useState<AgentStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] =
    useState<PersonaId>(DEFAULT_PERSONA_ID);

  const utils = api.useUtils();
  const utilsRef = useRef(utils);
  utilsRef.current = utils;

  const setPersonaMutation = api.persona.setForChannel.useMutation();
  const startMutation = api.agent.start.useMutation();
  const stopMutation = api.agent.stop.useMutation();

  const setPersonaAsyncRef = useRef(setPersonaMutation.mutateAsync);
  setPersonaAsyncRef.current = setPersonaMutation.mutateAsync;
  const startAsyncRef = useRef(startMutation.mutateAsync);
  startAsyncRef.current = startMutation.mutateAsync;
  const stopAsyncRef = useRef(stopMutation.mutateAsync);
  stopAsyncRef.current = stopMutation.mutateAsync;

  const channelIdRef = useRef(channelId);
  channelIdRef.current = channelId;

  const checkStatus = useCallback(async (options?: { preserveConnected?: boolean }) => {
    const id = channelIdRef.current;
    if (!id) {
      setStatus("disconnected");
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const data = await utilsRef.current.agent.status.fetch({ channelId: id });
      setStatus(data.status as AgentStatus);

      const storedPersona = resolvePersonaId(id);
      if (data.status === "connected" && data.persona_id) {
        if (data.persona_id !== storedPersona) {
          await setPersonaAsyncRef.current({ channelId: id, personaId: storedPersona });
        }
        setActivePersonaId(storedPersona);
      }
    } catch (err) {
      console.error("Error checking agent status:", err);
      if (!options?.preserveConnected) {
        setStatus("disconnected");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const connectAgent = useCallback(async (personaId?: PersonaId) => {
    const id = channelIdRef.current;
    if (!id) return;

    const persona = personaId ?? resolvePersonaId(id);
    setLoading(true);
    setError(null);
    setStatus("connecting");

    try {
      await startAsyncRef.current({ channelId: id, personaId: persona });
      setActivePersonaId(persona);
      persistPersonaSelection(persona, id);
      setStatus("connected");
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Failed to start AI agent";
      console.error(`[useAIAgentStatus] Failed to start agent for ${id}:`, reason);
      setError(reason);
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectAgent = useCallback(async () => {
    const id = channelIdRef.current;
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      await stopAsyncRef.current({ channelId: id });
      setStatus("disconnected");
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Failed to stop AI agent";
      console.error(`[useAIAgentStatus] Failed to stop agent for ${id}:`, reason);
      setError(reason);
    } finally {
      setLoading(false);
      await checkStatus();
    }
  }, [checkStatus]);

  const setPersona = useCallback(
    async (personaId: PersonaId) => {
      setActivePersonaId(personaId);
      persistPersonaSelection(personaId, channelIdRef.current);

      if (status === "connected" && channelIdRef.current) {
        await setPersonaAsyncRef.current({
          channelId: channelIdRef.current,
          personaId,
        });
      }
    },
    [status]
  );

  const toggleAgent = useCallback(async () => {
    if (status === "connected") {
      await disconnectAgent();
    } else {
      await connectAgent(activePersonaId);
    }
  }, [status, connectAgent, disconnectAgent, activePersonaId]);

  useEffect(() => {
    if (!channelId) {
      setStatus("disconnected");
      return;
    }

    setActivePersonaId(resolvePersonaId(channelId));

    let cancelled = false;

    void (async () => {
      try {
        const data = await utilsRef.current.agent.status.fetch({ channelId });
        if (cancelled) return;

        setStatus(data.status as AgentStatus);
        const storedPersona = resolvePersonaId(channelId);
        if (data.status === "connected") {
          setActivePersonaId(storedPersona);
          return;
        }

        await connectAgent(storedPersona);
      } catch (err) {
        console.error("Error initializing agent for channel:", err);
        if (!cancelled) {
          setStatus("disconnected");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, connectAgent]);

  useEffect(() => {
    if (!channelId) return;
    const interval = setInterval(() => {
      void checkStatus();
    }, 120000);
    return () => clearInterval(interval);
  }, [channelId, checkStatus]);

  return {
    status,
    loading,
    error,
    activePersonaId,
    connectAgent,
    disconnectAgent,
    toggleAgent,
    setPersona,
    checkStatus: () => checkStatus(),
    setStatus,
  };
};
