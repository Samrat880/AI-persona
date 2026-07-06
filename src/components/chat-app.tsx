"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useToast } from "~/components/ui/use-toast";
import type { PersonaId } from "~/config/personas";
import {
  getLastChannelRoute,
  persistPersonaSelection,
  setLastChannelRoute,
  clearChannelPersona,
  clearLastRouteIfMatches,
} from "~/lib/persistence";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Channel, User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { v4 as uuidv4 } from "uuid";
import { ChatProvider } from "~/providers/chat-provider";
import { ChatInterface } from "~/components/chat-interface";
import { ChatSidebar } from "~/components/chat-sidebar";
import { api } from "~/trpc/react";
import { useAgentProcess } from "~/hooks/use-agent-process";

interface ChatAppProps {
  user: User;
  onLogout: () => void;
  channelId?: string;
}

function ChatAppCore({ user, onLogout, channelId }: ChatAppProps) {
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { client, setActiveChannel } = useChatContext();
  const router = useRouter();
  const startAgent = api.agent.start.useMutation();
  const processAgentMessage = useAgentProcess();

  useEffect(() => {
    if (!client || channelId) return;
    const savedRoute = getLastChannelRoute();
    if (savedRoute && savedRoute !== "/chat") {
      router.replace(savedRoute);
    }
  }, [client, channelId, router]);

  useEffect(() => {
    if (channelId) {
      setLastChannelRoute(`/chat/${channelId}`);
    } else {
      setLastChannelRoute("/chat");
    }
  }, [channelId]);

  useEffect(() => {
    const syncChannelWithUrl = async () => {
      if (!client) return;

      if (channelId) {
        const channel = client.channel("messaging", channelId);
        await channel.watch();
        setActiveChannel(channel);
      } else {
        setActiveChannel(undefined);
      }
    };
    void syncChannelWithUrl();
  }, [channelId, client, setActiveChannel]);

  const handleNewChatMessage = useCallback(
    async (message: { text: string }, personaId: PersonaId) => {
      if (!user.id || !client) return;

      persistPersonaSelection(personaId);

      try {
        const newChannel = client.channel("messaging", uuidv4(), {
          name: message.text.substring(0, 50),
          members: [user.id],
        });
        await newChannel.watch();

        const memberAddedPromise = new Promise<void>((resolve) => {
          const unsubscribe = newChannel.on("member.added", (event) => {
            if (event.member?.user?.id && event.member.user.id !== user.id) {
              unsubscribe.unsubscribe();
              resolve();
            }
          });
        });

        await startAgent.mutateAsync({
          channelId: newChannel.id!,
          personaId,
        });

        setActiveChannel(newChannel);
        router.push(`/chat/${newChannel.id}`);

        await memberAddedPromise;
        const { message: sentMessage } = await newChannel.sendMessage({
          text: message.text,
          custom: { persona_id: personaId },
        });

        processAgentMessage({
          channelId: newChannel.id!,
          text: message.text,
          personaId,
          messageId: sentMessage.id,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Something went wrong";
        console.error("Error creating new chat:", errorMessage);
        toast({
          title: "Could not start chat",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [client, user.id, router, startAgent, toast, processAgentMessage]
  );

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  const handleNewChatClick = () => {
    setActiveChannel(undefined);
    router.push("/chat");
    setSidebarOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!channelToDelete?.id) {
      setShowDeleteDialog(false);
      setChannelToDelete(null);
      return;
    }

    const deletedId = channelToDelete.id;
    const deletedRoute = `/chat/${deletedId}`;

    try {
      if (channelId === deletedId) {
        router.push("/chat");
      }
      await channelToDelete.delete();
      clearChannelPersona(deletedId);
      clearLastRouteIfMatches(deletedRoute);
      toast({
        title: "Chat deleted",
        description: "The conversation was removed from your history.",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Could not delete chat";
      console.error("Error deleting channel:", errorMessage);
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    }

    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Connecting to chat...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        onNewChat={handleNewChatClick}
        onChannelDelete={(channel) => {
          setChannelToDelete(channel);
          setShowDeleteDialog(true);
        }}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          onToggleSidebar={handleToggleSidebar}
          onNewChatMessage={handleNewChatMessage}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-bebas text-2xl uppercase tracking-wide">
              Delete Chat
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-primary hover:bg-primary/90 uppercase tracking-wider text-xs font-bold"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ChatApp({ user, onLogout, channelId }: ChatAppProps) {
  return (
    <ChatProvider user={user}>
      <ChatAppCore user={user} onLogout={onLogout} channelId={channelId} />
    </ChatProvider>
  );
}
