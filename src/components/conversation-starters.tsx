interface ConversationStartersProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  title?: string;
}

export function ConversationStarters({
  prompts,
  onSelect,
  title = "Try a conversation starter",
}: ConversationStartersProps) {
  return (
    <div className="mb-6 text-left">
      <h2 className="font-bebas text-xl tracking-wide text-foreground mb-4 uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="relative p-3 pl-8 text-left text-sm rounded-none border-l-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-foreground/90 hover:text-foreground"
          >
            <span
              className="absolute left-2.5 top-3 text-primary text-xs"
              aria-hidden="true"
            >
              →
            </span>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
