"use client";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { useTheme } from "~/hooks/use-theme";
import {
  Home,
  LogOut,
  MessageCircle,
  MessageSquare,
  Moon,
  PlusCircle,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { Channel, ChannelFilters, ChannelSort } from "stream-chat";
import { ChannelList, useChatContext } from "stream-chat-react";

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNewChat: () => void;
  onChannelDelete: (channel: Channel) => void;
}

function ChannelListEmptyStateIndicator() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4">
        <div className="w-16 h-16 bg-primary/10 rounded-none flex items-center justify-center border border-primary/20">
          <MessageCircle className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2 max-w-xs">
        <h3 className="font-bebas text-xl tracking-wide text-foreground uppercase">
          No chats yet
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Start a new chat to talk with your AI gurus.
        </p>
      </div>
    </div>
  );
}

export function ChatSidebar({
  isOpen,
  onClose,
  onLogout,
  onNewChat,
  onChannelDelete,
}: ChatSidebarProps) {
  const { client, setActiveChannel } = useChatContext();
  const { user } = client;
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  if (!user) return null;

  const filters: ChannelFilters = {
    type: "messaging",
    members: { $in: [user.id] },
  };
  const sort: ChannelSort = { last_message_at: -1 };
  const options = { state: true, presence: true, limit: 10 };

  const handleHome = () => {
    router.push("/");
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-80 bg-card border-r border-border flex flex-col transform transition-transform duration-300 ease-in-out",
          "before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-primary before:content-['']",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-border flex justify-between items-center pt-5">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Guru Ji
            </p>
            <h2 className="font-bebas text-2xl tracking-wide text-foreground uppercase leading-none">
              Chats
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-3 pt-2">
          <Button
            variant="outline"
            onClick={handleHome}
            className="w-full justify-start border-border/60 hover:border-primary hover:text-primary"
          >
            <Home className="mr-2 h-4 w-4 text-primary" />
            Home
          </Button>
        </div>

        <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]]:overflow-x-visible">
          <div className="p-3 space-y-0 chat-sidebar-history">
            <p className="px-2 pb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              History
            </p>
            <ChannelList
              filters={filters}
              sort={sort}
              options={options}
              EmptyStateIndicator={ChannelListEmptyStateIndicator}
              Preview={(previewProps) => (
                <div
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 p-2 cursor-pointer transition-colors mb-1 border-l-2 min-w-0 w-full",
                    previewProps.active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-transparent hover:bg-muted/50"
                  )}
                  onClick={() => {
                    setActiveChannel(previewProps.channel);
                    router.push(`/chat/${previewProps.channel.id}`);
                    onClose();
                  }}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate text-sm font-medium min-w-0">
                    {previewProps.channel.data?.name || "New Chat"}
                  </span>
                  <button
                    type="button"
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "border border-primary/50 bg-primary/10 text-primary",
                      "hover:bg-primary hover:text-primary-foreground transition-colors"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChannelDelete(previewProps.channel);
                    }}
                    aria-label="Delete chat"
                    title="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Button
            onClick={onNewChat}
            className="w-full justify-start uppercase tracking-wider text-xs font-bold"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="p-3 border-t border-border bg-card">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start items-center p-2 h-auto"
              >
                <Avatar className="w-8 h-8 mr-2 ring-2 ring-primary/40">
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback>
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" />
                )}
                <span>
                  Switch to {theme === "dark" ? "Light" : "Dark"} Theme
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
