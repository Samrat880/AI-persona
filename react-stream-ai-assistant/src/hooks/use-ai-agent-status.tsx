import type { PersonaId } from "@/config/personas";
import { apiUrl } from "@/lib/api";
import {
  persistPersonaSelection,
  resolvePersonaId,
} from "@/lib/persistence";
import { useCallback, useEffect, useState } from "react";

export type AgentStatus = "disconnected" | "connecting" | "connected";

interface UseAIAgentStatusProps {
  channelId: string | null;
}

export const useAIAgentStatus = ({ channelId }: UseAIAgentStatusProps) => {
  const [status, setStatus] = useState<AgentStatus>("disconnected");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>(() =>
    resolvePersonaId(channelId)
  );

  useEffect(() => {
    setActivePersonaId(resolvePersonaId(channelId));
  }, [channelId]);

  const syncPersonaWithBackend = useCallback(
    async (personaId: PersonaId) => {
      if (!channelId) return;

      try {
        await fetch(apiUrl("/set-persona"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel_id: channelId,
            persona_id: personaId,
          }),
        });
      } catch (err) {
        console.error("Error syncing persona with backend:", err);
      }
    },
    [channelId]
  );

  const checkStatus = useCallback(async () => {
    if (!channelId) {
      setStatus("disconnected");
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const response = await fetch(
        apiUrl(`/agent-status?channel_id=${channelId}`)
      );
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);

        const storedPersona = resolvePersonaId(channelId);
        if (data.status === "connected" && data.persona_id) {
          if (data.persona_id !== storedPersona) {
            await syncPersonaWithBackend(storedPersona);
          }
          setActivePersonaId(storedPersona);
        }
      } else {
        setStatus("disconnected");
      }
    } catch (err) {
      console.error("Error checking agent status:", err);
      setStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [channelId, syncPersonaWithBackend]);

  const refreshStatus = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  const connectAgent = useCallback(
    async (personaId?: PersonaId) => {
      if (!channelId || loading) return;

      const persona = personaId ?? resolvePersonaId(channelId);
      setLoading(true);
      setError(null);
      setStatus("connecting");

      try {
        const response = await fetch(apiUrl("/start-ai-agent"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel_id: channelId,
            channel_type: "messaging",
            persona_id: persona,
          }),
        });

        if (!response.ok) {
          let reason = `Failed to start AI agent (${response.status})`;
          try {
            const errorData = await response.json();
            reason = errorData.reason || errorData.error || reason;
          } catch {
            // 504/timeouts often return HTML, not JSON
          }
          console.error(
            `[useAIAgentStatus] Failed to start agent for ${channelId}:`,
            reason
          );
          setError(reason);
          setStatus("disconnected");
        } else {
          setActivePersonaId(persona);
          persistPersonaSelection(persona, channelId);
        }
      } catch (err) {
        console.error(
          `[useAIAgentStatus] Network error starting AI agent for ${channelId}:`,
          err
        );
        setError("Network error starting AI agent");
        setStatus("disconnected");
      } finally {
        await checkStatus();
      }
    },
    [channelId, loading, checkStatus]
  );

  const disconnectAgent = useCallback(async () => {
    if (!channelId || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/stop-ai-agent"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: channelId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `[useAIAgentStatus] Failed to stop agent for ${channelId}:`,
          errorData.reason
        );
        setError(errorData.reason || "Failed to stop AI agent");
      } else {
        setStatus("disconnected");
      }
    } catch (err) {
      console.error(
        `[useAIAgentStatus] Network error stopping AI agent for ${channelId}:`,
        err
      );
      setError("Network error stopping AI agent");
    } finally {
      await checkStatus();
    }
  }, [channelId, loading, checkStatus]);

  const setPersona = useCallback(
    async (personaId: PersonaId) => {
      setActivePersonaId(personaId);
      persistPersonaSelection(personaId, channelId);

      if (status === "connected") {
        await syncPersonaWithBackend(personaId);
      }
    },
    [channelId, status, syncPersonaWithBackend]
  );

  const toggleAgent = useCallback(async () => {
    if (status === "connected") {
      await disconnectAgent();
    } else {
      await connectAgent(activePersonaId);
    }
  }, [status, connectAgent, disconnectAgent, activePersonaId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (channelId) {
      const interval = setInterval(checkStatus, 120000);
      return () => clearInterval(interval);
    }
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
    checkStatus: refreshStatus,
    setStatus,
  };
};
