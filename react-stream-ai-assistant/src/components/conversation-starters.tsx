interface ConversationStartersProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  title?: string;
}

export const ConversationStarters = ({
  prompts,
  onSelect,
  title = "Try a conversation starter",
}: ConversationStartersProps) => (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-foreground mb-4">{title}</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          className="p-3 text-left text-sm rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-muted/50 hover:border-muted group"
        >
          <span className="text-foreground group-hover:text-primary transition-colors">
            {prompt}
          </span>
        </button>
      ))}
    </div>
  </div>
);
