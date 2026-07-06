"use client";

import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { ArrowRight, Square, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

export interface ChatInputProps {
  className?: string;
  sendMessage: (message: { text: string }) => Promise<void> | void;
  isGenerating?: boolean;
  onStopGenerating?: () => void;
  placeholder?: string;
  value: string;
  onValueChange: (text: string) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function ChatInput({
  className,
  sendMessage,
  isGenerating,
  onStopGenerating,
  placeholder = "Type your message...",
  value,
  onValueChange,
  textareaRef: externalTextareaRef,
}: ChatInputProps) {
  const [isLoading, setIsLoading] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;

  const updateTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120;
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [textareaRef]);

  useEffect(() => {
    updateTextareaHeight();
  }, [value, updateTextareaHeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || isGenerating) return;

    setIsLoading(true);
    try {
      await sendMessage({ text: value.trim() });
      onValueChange("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  return (
    <div className={cn("flex flex-col bg-card/95", className)}>
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "flex items-end border border-border bg-background transition-colors",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[48px] max-h-[120px] flex-1 resize-none border-0 bg-transparent py-3 pl-4 pr-2 text-sm shadow-none",
              "focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            )}
            disabled={isLoading || isGenerating}
          />

          {value.trim() && !isLoading && !isGenerating && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onValueChange("")}
              className="mb-1 h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
              title="Clear text"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {isGenerating ? (
            <Button
              type="button"
              onClick={onStopGenerating}
              className="mb-1 mr-1 h-9 w-9 shrink-0 rounded-none p-0"
              variant="destructive"
              title="Stop generating"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!value.trim() || isLoading || isGenerating}
              className={cn(
                "mb-1 mr-1 h-9 shrink-0 rounded-none px-3 uppercase tracking-wider text-[0.65rem] font-bold",
                "disabled:opacity-40"
              )}
              variant="default"
            >
              <span className="hidden sm:inline mr-1">Send</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
