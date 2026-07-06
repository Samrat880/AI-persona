"use client";

import { getPersona, PERSONA_LIST, DEFAULT_PERSONA_ID, type PersonaId } from "~/config/personas";
import { persistPersonaSelection, resolvePersonaId } from "~/lib/persistence";
import { useAIAgentStatus } from "~/hooks/use-ai-agent-status";
import { Bot, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Channel,
  MessageList,
  useAIState,
  useChannelStateContext,
  useChatContext,
  Window,
} from "stream-chat-react";
import { AIAgentControl } from "~/components/ai-agent-control";
import { ConversationStarters } from "~/components/conversation-starters";
import { ChatInput, type ChatInputProps } from "~/components/chat-input";
import ChatMessage from "~/components/chat-message";
import {
  ActivePersonaAvatar,
  PersonaToggle,
} from "~/components/persona-toggle";
import { Button } from "~/components/ui/button";
import { useAgentProcess } from "~/hooks/use-agent-process";

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (
    message: { text: string },
    personaId: PersonaId
  ) => Promise<void>;
}

function EmptyStateWithInput({
  onNewChatMessage,
  activePersonaId,
  onPersonaChange,
}: {
  onNewChatMessage: ChatInputProps["sendMessage"];
  activePersonaId: PersonaId;
  onPersonaChange: (id: PersonaId) => void;
}) {
  const [inputText, setInputText] = useState("");
  const persona = getPersona(activePersonaId);

  const handleSend = async (message: { text: string }) => {
    await onNewChatMessage(message);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-3xl w-full">
          <div className="mb-6 p-5 border border-border bg-card/50 text-left">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              You&apos;re chatting with
            </p>
            <div className="flex items-center gap-4">
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-primary"
              />
              <div>
                <h1 className="font-bebas text-3xl tracking-wide text-foreground uppercase leading-none">
                  {persona.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {persona.tagline}
                </p>
              </div>
            </div>
            <div className="flex justify-start mt-4">
              <PersonaToggle
                activePersonaId={activePersonaId}
                onPersonaChange={onPersonaChange}
              />
            </div>
          </div>

          <ConversationStarters
            prompts={persona.starterPrompts}
            onSelect={(prompt) => setInputText(prompt)}
          />

          <div className="flex items-center justify-center gap-4 flex-wrap">
            {PERSONA_LIST.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <img
                  src={p.avatarUrl}
                  alt={p.name}
                  className="h-6 w-6 rounded-full"
                />
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="p-4">
          <ChatInput
            sendMessage={handleSend}
            placeholder="Say hello to start a new chat..."
            value={inputText}
            onValueChange={setInputText}
            className="!p-4"
            isGenerating={false}
            onStopGenerating={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

function MessageListContent({
  persona,
  agentConnected,
  activePersonaId,
}: {
  persona: ReturnType<typeof getPersona>;
  agentConnected: boolean;
  activePersonaId: PersonaId;
}) {
  const { messages, thread, channel } = useChannelStateContext();
  const isThread = !!thread;

  if (isThread) return null;

  const handleStarterSelect = async (prompt: string) => {
    if (!channel) return;
    await channel.sendMessage({
      text: prompt,
      custom: { persona_id: activePersonaId },
    });
  };

  return (
    <div className="flex-1 min-h-0">
      {!messages?.length ? (
        <div className="h-full flex items-center justify-center overflow-y-auto p-6">
          <div className="text-center max-w-2xl w-full">
            <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
              <div className="absolute inset-0 bg-primary/10 rounded-xl" />
              <Bot className="h-6 w-6 text-primary/80 relative z-10" />
            </div>
            <h2 className="font-bebas text-xl tracking-wide text-foreground mb-4 uppercase">
              Start chatting with {persona.name}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {agentConnected
                ? "Pick a conversation starter or type your message below."
                : "Click Connect above, then send a message to begin."}
            </p>
            {agentConnected && (
              <ConversationStarters
                prompts={persona.starterPrompts}
                onSelect={(prompt) => {
                  void handleStarterSelect(prompt);
                }}
              />
            )}
          </div>
        </div>
      ) : (
        <MessageList Message={ChatMessage} />
      )}
    </div>
  );
}

function ChannelMessageInput({
  activePersonaId,
  personaName,
}: {
  activePersonaId: PersonaId;
  personaName: string;
}) {
  const { channel: activeChannel, messages } = useChannelStateContext();
  const { aiState } = useAIState(activeChannel);
  const processAgentMessage = useAgentProcess();
  const [inputText, setInputText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGenerating =
    aiState === "AI_STATE_THINKING" ||
    aiState === "AI_STATE_GENERATING" ||
    aiState === "AI_STATE_EXTERNAL_SOURCES";

  const handleStopGenerating = () => {
    if (activeChannel) {
      const aiMessage = [...(messages ?? [])]
        .reverse()
        .find((m) => m.user?.id.startsWith("ai-bot"));
      if (aiMessage) {
        void activeChannel.sendEvent({
          type: "ai_indicator.stop",
          cid: activeChannel.cid,
          message_id: aiMessage.id,
        });
      }
    }
  };

  const handleSendMessage = async (message: { text: string }) => {
    if (!activeChannel?.id) throw new Error("No active channel");
    const { message: sentMessage } = await activeChannel.sendMessage({
      text: message.text,
      custom: { persona_id: activePersonaId },
    });

    processAgentMessage({
      channelId: activeChannel.id,
      text: message.text,
      personaId: activePersonaId,
      messageId: sentMessage.id,
    });
  };

  return (
    <ChatInput
      sendMessage={handleSendMessage}
      value={inputText}
      onValueChange={setInputText}
      textareaRef={textareaRef}
      placeholder={`Message ${personaName}...`}
      className="!p-4"
      isGenerating={isGenerating}
      onStopGenerating={handleStopGenerating}
    />
  );
}

export function ChatInterface({
  onToggleSidebar,
  onNewChatMessage,
}: ChatInterfaceProps) {
  const { channel } = useChatContext();
  const router = useRouter();
  const [draftPersonaId, setDraftPersonaId] =
    useState<PersonaId>(DEFAULT_PERSONA_ID);

  useEffect(() => {
    setDraftPersonaId(resolvePersonaId());
  }, []);
  const agentStatus = useAIAgentStatus({
    channelId: channel?.id ?? null,
  });

  const activePersona = getPersona(
    channel ? agentStatus.activePersonaId : draftPersonaId
  );

  const handleDraftPersonaChange = (personaId: PersonaId) => {
    setDraftPersonaId(personaId);
    persistPersonaSelection(personaId);
  };

  const handleNewChatFromEmpty = async (message: { text: string }) => {
    await onNewChatMessage(message, draftPersonaId);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-sm z-10 relative before:absolute before:bottom-0 before:left-0 before:right-0 before:h-px before:bg-primary before:content-['']">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden h-9 w-9 flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="hidden sm:block font-bebas text-lg tracking-widest uppercase text-primary hover:opacity-80 transition-opacity shrink-0"
          >
            Guru Ji
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <ActivePersonaAvatar personaId={agentStatus.activePersonaId} />
              {channel?.id && agentStatus.status === "connected" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bebas text-lg tracking-wide text-foreground truncate uppercase leading-none">
                {channel?.data?.name || "New Chat"}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {activePersona.name} • {activePersona.tagline}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <PersonaToggle
            activePersonaId={agentStatus.activePersonaId}
            onPersonaChange={agentStatus.setPersona}
            disabled={agentStatus.loading}
          />
          {channel?.id && (
            <AIAgentControl
              status={agentStatus.status}
              loading={agentStatus.loading}
              error={agentStatus.error}
              toggleAgent={agentStatus.toggleAgent}
              checkStatus={agentStatus.checkStatus}
              channelId={channel.id}
            />
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        {!channel ? (
          <EmptyStateWithInput
            onNewChatMessage={handleNewChatFromEmpty}
            activePersonaId={draftPersonaId}
            onPersonaChange={handleDraftPersonaChange}
          />
        ) : (
          <Channel channel={channel}>
            <Window>
              <MessageListContent
                persona={activePersona}
                agentConnected={agentStatus.status === "connected"}
                activePersonaId={agentStatus.activePersonaId}
              />
              <ChannelMessageInput
                activePersonaId={agentStatus.activePersonaId}
                personaName={activePersona.name}
              />
            </Window>
          </Channel>
        )}
      </div>
    </div>
  );
}
