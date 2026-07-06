import type { PersonaId } from "~/config/personas";
import { getPersona, PERSONA_LIST } from "~/config/personas";
import { cn } from "~/lib/utils";
import { Video } from "lucide-react";

interface PersonaToggleProps {
  activePersonaId: PersonaId;
  onPersonaChange: (personaId: PersonaId) => void;
  disabled?: boolean;
  className?: string;
}

export function PersonaToggle({
  activePersonaId,
  onPersonaChange,
  disabled = false,
  className = "",
}: PersonaToggleProps) {
  const activePersona = getPersona(activePersonaId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center border border-border bg-muted/30 p-0 gap-0">
        {PERSONA_LIST.map((persona) => {
          const isActive = persona.id === activePersonaId;
          return (
            <button
              key={persona.id}
              type="button"
              disabled={disabled}
              onClick={() => onPersonaChange(persona.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={persona.tagline}
            >
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
              />
              <span className="hidden sm:inline">{persona.name}</span>
            </button>
          );
        })}
      </div>
      <a
        href={activePersona.social.youtube}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-8 w-8 items-center justify-center border border-border bg-muted/30 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
        title={`${activePersona.name}'s YouTube`}
      >
        <Video className="h-4 w-4" />
      </a>
    </div>
  );
}

export function ActivePersonaAvatar({ personaId }: { personaId: PersonaId }) {
  const persona = getPersona(personaId);
  return (
    <img
      src={persona.avatarUrl}
      alt={persona.name}
      className="h-8 w-8 rounded-full object-cover ring-2 ring-primary"
    />
  );
}
