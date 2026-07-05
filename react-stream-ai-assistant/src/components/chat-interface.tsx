import { getPersona, PERSONA_LIST } from "@/config/personas";
import { resolvePersonaId } from "@/lib/persistence";
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
import { ChatInput, ChatInputProps } from "./chat-input";
import ChatMessage from "./chat-message";
import {
  ActivePersonaAvatar,
  PersonaToggle,
} from "./persona-toggle";
import { Button } from "./ui/button";

interface ChatInterfaceProps {
  onToggleSidebar: () => void;
  onNewChatMessage: (message: { text: string }) => Promise<void>;
  backendUrl: string;
}

const EmptyStateWithInput: React.FC<{
  onNewChatMessage: ChatInputProps["sendMessage"];
}> = ({ onNewChatMessage }) => {
  const [inputText, setInputText] = useState("");
  const defaultPersona = getPersona(resolvePersonaId());

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-6">
        <div className="text-center max-w-3xl w-full">
          <div className="mb-6">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-pulse"></div>
              <img
                src={defaultPersona.avatarUrl}
                alt={defaultPersona.name}
                className="h-12 w-12 rounded-2xl relative z-10 object-cover"
              />
              <Sparkles className="h-4 w-4 text-primary/60 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Chat with {defaultPersona.name}
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {defaultPersona.tagline}. Switch personas anytime from the chat
              header.
            </p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Try a conversation starter
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {defaultPersona.starterPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(prompt)}
                  className="p-3 text-left text-sm rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-muted/50 hover:border-muted group"
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
            sendMessage={onNewChatMessage}
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
  personaName,
}: {
  personaName: string;
}) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center px-4">
      <div className="relative inline-flex items-center justify-center w-12 h-12 mb-4">
        <div className="absolute inset-0 bg-primary/10 rounded-xl"></div>
        <Bot className="h-6 w-6 text-primary/80 relative z-10" />
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">
        Start chatting with {personaName}
      </h2>
      <p className="text-sm text-muted-foreground">
        Connect the AI and send a message to begin.
      </p>
    </div>
  </div>
);

const MessageListContent = ({ personaName }: { personaName: string }) => {
  const { messages, thread } = useChannelStateContext();
  const isThread = !!thread;

  if (isThread) return null;

  return (
    <div className="flex-1 min-h-0">
      {!messages?.length ? (
        <MessageListEmptyIndicator personaName={personaName} />
      ) : (
        <MessageList Message={ChatMessage} />
      )}
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onToggleSidebar,
  onNewChatMessage,
  backendUrl,
}) => {
  const { channel } = useChatContext();
  const agentStatus = useAIAgentStatus({
    channelId: channel?.id ?? null,
    backendUrl,
  });

  const activePersona = getPersona(agentStatus.activePersonaId);

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
          <EmptyStateWithInput onNewChatMessage={onNewChatMessage} />
        ) : (
          <Channel channel={channel}>
            <Window>
              <MessageListContent personaName={activePersona.name} />
              <ChannelMessageInputComponent />
            </Window>
          </Channel>
        )}
      </div>
    </div>
  );
};
