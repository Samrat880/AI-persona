import { ReactNode, useCallback, useEffect, useState } from "react";
import { User } from "stream-chat";
import { Chat, useCreateChatClient } from "stream-chat-react";
import { LoadingScreen } from "../components/loading-screen";
import { apiUrl } from "@/lib/api";
import { useTheme } from "../hooks/use-theme";

interface ChatProviderProps {
  user: User;
  children: ReactNode;
}

interface ChatProviderReadyProps extends ChatProviderProps {
  streamApiKey: string;
}

const ChatProviderReady = ({
  user,
  children,
  streamApiKey,
}: ChatProviderReadyProps) => {
  const { theme } = useTheme();

  const tokenProvider = useCallback(async () => {
    if (!user) {
      throw new Error("User not available");
    }

    const response = await fetch(apiUrl("/token"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch token: ${errorText}`);
    }

    const { token } = await response.json();
    return token;
  }, [user]);

  const client = useCreateChatClient({
    apiKey: streamApiKey,
    tokenOrProvider: tokenProvider,
    userData: user,
  });

  if (!client) {
    return <LoadingScreen />;
  }

  return (
    <Chat
      client={client}
      theme={
        theme === "dark" ? "str-chat__theme-dark" : "str-chat__theme-light"
      }
    >
      {children}
    </Chat>
  );
};

export const ChatProvider = ({ user, children }: ChatProviderProps) => {
  const [streamApiKey, setStreamApiKey] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch(apiUrl("/public-config"));
        if (!response.ok) {
          let detail = `Config request failed (${response.status})`;
          try {
            const body = (await response.json()) as { hint?: string; error?: string };
            if (body.hint) detail = body.hint;
            else if (body.error) detail = body.error;
          } catch {
            // ignore JSON parse errors
          }
          throw new Error(detail);
        }
        const data = (await response.json()) as { streamApiKey?: string };
        if (!data.streamApiKey) {
          throw new Error("streamApiKey missing in server config");
        }
        if (!cancelled) {
          setStreamApiKey(data.streamApiKey);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load chat config";
          setConfigError(message);
        }
      }
    };

    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  if (configError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-destructive">
          Chat config failed to load. Is the backend running? ({configError})
        </p>
      </div>
    );
  }

  if (!streamApiKey) {
    return <LoadingScreen />;
  }

  return (
    <ChatProviderReady user={user} streamApiKey={streamApiKey}>
      {children}
    </ChatProviderReady>
  );
};
