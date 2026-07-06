"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";
import type { User } from "stream-chat";
import { Chat, useCreateChatClient } from "stream-chat-react";
import { LoadingScreen } from "~/components/loading-screen";
import { useTheme } from "~/hooks/use-theme";
import { api } from "~/trpc/react";

interface ChatProviderProps {
  user: User;
  children: ReactNode;
}

function ChatProviderReady({
  user,
  children,
  streamApiKey,
}: ChatProviderProps & { streamApiKey: string }) {
  const { theme } = useTheme();
  const createTokenMutation = api.auth.createStreamToken.useMutation();

  const userIdRef = useRef(user.id);
  userIdRef.current = user.id;

  const mutateAsyncRef = useRef(createTokenMutation.mutateAsync);
  mutateAsyncRef.current = createTokenMutation.mutateAsync;

  const tokenProvider = useCallback(async () => {
    const { token } = await mutateAsyncRef.current({ userId: userIdRef.current });
    return token;
  }, []);

  const userData = useMemo(
    () => ({
      id: user.id,
      name: user.name,
      image: user.image,
    }),
    [user.id, user.name, user.image]
  );

  const client = useCreateChatClient({
    apiKey: streamApiKey,
    tokenOrProvider: tokenProvider,
    userData,
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
}

export function ChatProvider({ user, children }: ChatProviderProps) {
  const { data, error, isLoading } = api.config.getPublic.useQuery();

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-destructive">
          Chat config failed to load. Check server env vars. ({error.message})
        </p>
      </div>
    );
  }

  if (isLoading || !data?.streamApiKey) {
    return <LoadingScreen />;
  }

  return (
    <ChatProviderReady user={user} streamApiKey={data.streamApiKey}>
      {children}
    </ChatProviderReady>
  );
}
