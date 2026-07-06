"use client";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Bot, Check, Copy } from "lucide-react";
import React, { isValidElement, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  useAIState,
  useChannelStateContext,
  useMessageContext,
  useMessageTextStreaming,
} from "stream-chat-react";

function getCodeText(children: React.ReactNode): string {
  if (typeof children === "string") return children.replace(/\n$/, "");
  if (Array.isArray(children)) {
    return children.map((child) => getCodeText(child)).join("").replace(/\n$/, "");
  }
  if (isValidElement(children)) {
    const props = children.props as { children?: React.ReactNode };
    if (props.children) {
      return getCodeText(props.children).replace(/\n$/, "");
    }
  }
  return String(children ?? "").replace(/\n$/, "");
}

function MarkdownCodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeText = getCodeText(children);

  const copyCode = async () => {
    if (!codeText) return;
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={copyCode}
        className="absolute top-2 right-2 z-10 h-7 px-2 text-xs bg-background/80 hover:bg-background border border-border/50"
        aria-label="Copy code"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 mr-1 text-green-600" />
            <span className="text-green-600">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3 mr-1" />
            <span>Copy</span>
          </>
        )}
      </Button>
      <pre className="p-3 pt-10 rounded-md overflow-x-auto text-xs font-mono bg-black/5 dark:bg-white/5 border border-border/30">
        {children}
      </pre>
    </div>
  );
}

export default function ChatMessage() {
  const { message } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { aiState } = useAIState(channel);

  const { streamedMessageText } = useMessageTextStreaming({
    text: message.text ?? "",
    renderingLetterCount: 3,
    streamingLetterIntervalMs: 20,
  });

  const isUser = !message.user?.id?.startsWith("ai-bot");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (streamedMessageText) {
      await navigator.clipboard.writeText(streamedMessageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getAiStateMessage = () => {
    switch (aiState) {
      case "AI_STATE_THINKING":
        return "Thinking...";
      case "AI_STATE_GENERATING":
        return "Generating response...";
      case "AI_STATE_EXTERNAL_SOURCES":
        return "Accessing external sources...";
      case "AI_STATE_ERROR":
        return "An error occurred.";
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={cn(
        "flex w-full mb-4 px-4 group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[70%] sm:max-w-[60%] lg:max-w-[50%]",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {!isUser && (
          <div className="flex-shrink-0 mr-3 self-end">
            <Avatar className="h-8 w-8 ring-2 ring-primary/30">
              <AvatarFallback className="bg-muted text-muted-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div className="flex flex-col space-y-1">
          <div
            className={cn(
              "px-4 py-3 text-sm leading-relaxed transition-all duration-200",
              isUser
                ? "str-chat__message-bubble str-chat__message-bubble--me rounded-none rounded-br-sm"
                : "str-chat__message-bubble rounded-none rounded-bl-sm bg-white/5 dark:bg-white/8 border border-border/40"
            )}
          >
            <div className="break-words">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                  ),
                  pre: ({ children }) => (
                    <MarkdownCodeBlock>{children}</MarkdownCodeBlock>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className?.includes("language-");
                    return isInline ? (
                      <code
                        className="px-1.5 py-0.5 rounded text-xs font-mono bg-black/10 dark:bg-white/10"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className="font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  ul: ({ children }) => (
                    <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-4 mb-3 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {streamedMessageText || message.text || ""}
              </ReactMarkdown>
            </div>

            {aiState && !streamedMessageText && !message.text && (
              <div className="flex items-center gap-2 mt-2 pt-2">
                <span className="text-xs opacity-70">{getAiStateMessage()}</span>
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70" />
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70" />
                  <div className="w-1 h-1 bg-current rounded-full typing-dot opacity-70" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground/70">
              {formatTime(message.created_at ?? new Date())}
            </span>

            {!isUser && !!streamedMessageText && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-6 px-2 text-xs hover:bg-muted rounded-md"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
