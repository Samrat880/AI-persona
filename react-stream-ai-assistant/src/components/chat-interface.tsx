import { getPersona, PERSONA_LIST, type PersonaId } from "@/config/personas";
import { persistPersonaSelection, resolvePersonaId } from "@/lib/persistence";
import { useAIAgentStatus } from "@/hooks/use-ai-agent-status";
import { Bot, Menu, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import {
  Channel,
  MessageList,
  useAIState,
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
  Window,
} from "stream-chat-react";
import { AIAgentControl } from "./ai-agent-control";
import { ConversationStarters } from "./conversation-starters";
import { ChatInput, ChatInputProps } from "./chat-input";
import ChatMessage from "./chat-message";
import {
  ActivePersonaAvatar,
  PersonaToggle,
} from "./persona-toggle";
import { Button } from "./ui/button";

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (
    message: { text: string },
    personaId: PersonaId
  ) => Promise<void>;
}

const EmptyStateWithInput: React.FC<{
  onNewChatMessage: ChatInputProps["sendMessage"];
  activePersonaId: PersonaId;
  onPersonaChange: (id: PersonaId) => void;
}> = ({ onNewChatMessage, activePersonaId, onPersonaChange }) => {
  const [inputText, setInputText] = useState("");
  const persona = getPersona(activePersonaId);

  const handleSend = async (message: { text: string }) => {
    await onNewChatMessage(message);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-3xl w-full">
          <div className="mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse"></div>
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="h-12 w-12 rounded-2xl relative z-10 object-cover"
              />
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Chat with {persona.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {persona.tagline}. Switch personas anytime below.
            </p>
            <div className="flex justify-center mb-4">
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
            {PERSONA_LIST.map((persona) => (
              <div
                key={persona.id}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <img
                  src={persona.avatarUrl}
                  alt={persona.name}
                  className="h-6 w-6 rounded-full"
                />
                <span>{persona.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t bg-background/95 backdrop-blur-sm">
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
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Press Enter to send</span>
            <span>•</span>
            <span>Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MessageListEmptyIndicator = ({
  persona,
  agentConnected,
  onStarterSelect,
}: {
  persona: ReturnType<typeof getPersona>;
  agentConnected: boolean;
  onStarterSelect: (prompt: string) => void;
}) => (
  <div className="h-full flex items-center justify-center overflow-y-auto p-6">
    <div className="text-center max-w-2xl w-full">
      <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
        <div className="absolute inset-0 bg-primary/10 rounded-xl"></div>
        <Bot className="h-6 w-6 text-primary/80 relative z-10" />
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">
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
          onSelect={onStarterSelect}
        />
      )}
    </div>
  </div>
);

const MessageListContent = ({
  persona,
  agentConnected,
  activePersonaId,
}: {
  persona: ReturnType<typeof getPersona>;
  agentConnected: boolean;
  activePersonaId: PersonaId;
}) => {
  const { messages, thread } = useChannelStateContext();
  const { sendMessage } = useChannelActionContext();
  const isThread = !!thread;

  if (isThread) return null;

  const handleStarterSelect = async (prompt: string) => {
    await sendMessage({
      text: prompt,
      custom: { persona_id: activePersonaId },
    });
  };

  return (
    <div className="flex-1 min-h-0">
      {!messages?.length ? (
        <MessageListEmptyIndicator
          persona={persona}
          agentConnected={agentConnected}
          onStarterSelect={(prompt) => {
            void handleStarterSelect(prompt);
          }}
        />
      ) : (
        <MessageList Message={ChatMessage} />
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onToggleSidebar,
  onNewChatMessage,
}) => {
  const { channel } = useChatContext();
  const [draftPersonaId, setDraftPersonaId] = useState<PersonaId>(() =>
    resolvePersonaId()
  );
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

  const ChannelMessageInputComponent = () => {
    const { sendMessage } = useChannelActionContext();
    const { channel, messages } = useChannelStateContext();
    const { aiState } = useAIState(channel);
    const [inputText, setInputText] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const isGenerating =
      aiState === "AI_STATE_THINKING" ||
      aiState === "AI_STATE_GENERATING" ||
      aiState === "AI_STATE_EXTERNAL_SOURCES";

    const handleStopGenerating = () => {
      if (channel) {
        const aiMessage = [...messages]
          .reverse()
          .find((m) => m.user?.id.startsWith("ai-bot"));
        if (aiMessage) {
          channel.sendEvent({
            type: "ai_indicator.stop",
            cid: channel.cid,
            message_id: aiMessage.id,
          });
        }
      }
    };

    const handleSendMessage = async (message: { text: string }) => {
      await sendMessage({
        text: message.text,
        custom: { persona_id: agentStatus.activePersonaId },
      });
    };

    return (
      <ChatInput
        sendMessage={handleSendMessage}
        value={inputText}
        onValueChange={setInputText}
        textareaRef={textareaRef}
        placeholder={`Message ${activePersona.name}...`}
        className="!p-4"
        isGenerating={isGenerating}
        onStopGenerating={handleStopGenerating}
      />
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-b bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="lg:hidden h-9 w-9 flex-shrink-0"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <ActivePersonaAvatar personaId={agentStatus.activePersonaId} />
              {channel?.id && agentStatus.status === "connected" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
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
              <ChannelMessageInputComponent />
            </Window>
          </Channel>
        )}
      </div>
    </div>
  );
};
