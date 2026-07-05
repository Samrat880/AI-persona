import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getLastChannelRoute,
  resolvePersonaId,
  setLastChannelRoute,
} from "@/lib/persistence";
import { apiUrl } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Channel, ChannelFilters, ChannelSort, User } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { v4 as uuidv4 } from "uuid";
import { ChatProvider } from "../providers/chat-provider";
import { ChatInterface } from "./chat-interface";
import { ChatSidebar } from "./chat-sidebar";

interface AuthenticatedAppProps {
  user: User;
  onLogout: () => void;
}

export const AuthenticatedApp = ({ user, onLogout }: AuthenticatedAppProps) => (
  <ChatProvider user={user}>
    <AuthenticatedCore user={user} onLogout={onLogout} />
  </ChatProvider>
);

const AuthenticatedCore = ({ user, onLogout }: AuthenticatedAppProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null);
  const { client, setActiveChannel } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { channelId } = useParams<{ channelId: string }>();

  useEffect(() => {
    if (!client || channelId || location.pathname !== "/") return;

    const savedRoute = getLastChannelRoute();
    if (savedRoute && savedRoute !== "/") {
      navigate(savedRoute, { replace: true });
    }
  }, [client, channelId, location.pathname, navigate]);

  useEffect(() => {
    if (channelId) {
      setLastChannelRoute(`/chat/${channelId}`);
    } else if (location.pathname === "/") {
      setLastChannelRoute("/");
    }
  }, [channelId, location.pathname]);

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
    syncChannelWithUrl();
  }, [channelId, client, setActiveChannel]);

  const handleNewChatMessage = async (message: { text: string }) => {
    if (!user.id) return;

    const personaId = resolvePersonaId();

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

      const response = await fetch(apiUrl("/start-ai-agent"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_id: newChannel.id,
          channel_type: "messaging",
          persona_id: personaId,
        }),
      });

      if (!response.ok) {
        throw new Error("AI agent failed to join the chat.");
      }

      setActiveChannel(newChannel);
      navigate(`/chat/${newChannel.id}`);

      await memberAddedPromise;
      await newChannel.sendMessage({
        text: message.text,
        custom: { persona_id: personaId },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong";
      console.error("Error creating new chat:", errorMessage);
    }
  };

  const handleNewChatClick = () => {
    setActiveChannel(undefined);
    navigate("/");
    setSidebarOpen(false);
  };

  const handleDeleteClick = (channel: Channel) => {
    setChannelToDelete(channel);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (channelToDelete) {
      try {
        if (channelId === channelToDelete.id) {
          navigate("/");
        }
        await channelToDelete.delete();
      } catch (error) {
        console.error("Error deleting channel:", error);
      }
    }
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setChannelToDelete(null);
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">
          Connecting to chat...
        </p>
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
        onChannelDelete={handleDeleteClick}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatInterface
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNewChatMessage={handleNewChatMessage}
        />
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone and all messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
