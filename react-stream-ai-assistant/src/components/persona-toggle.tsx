import type { PersonaId } from "@/config/personas";
import { getPersona, PERSONA_LIST } from "@/config/personas";
import { cn } from "@/lib/utils";
import { Youtube } from "lucide-react";
import React from "react";

interface PersonaToggleProps {
  activePersonaId: PersonaId;
  onPersonaChange: (personaId: PersonaId) => void;
  disabled?: boolean;
  className?: string;
}

export const PersonaToggle: React.FC<PersonaToggleProps> = ({
  activePersonaId,
  onPersonaChange,
  disabled = false,
  className = "",
}) => {
  const activePersona = getPersona(activePersonaId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center rounded-lg border bg-muted/40 p-1 gap-1"
        )}
      >
        {PERSONA_LIST.map((persona) => {
          const isActive = persona.id === activePersonaId;
          return (
            <button
              key={persona.id}
              type="button"
              disabled={disabled}
              onClick={() => onPersonaChange(persona.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60"
              )}
              title={persona.tagline}
            >
              <img
                src={persona.avatarUrl}
                alt={persona.name}
                className="h-5 w-5 rounded-full object-cover"
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
        className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground hover:text-red-500 hover:bg-background transition-colors"
        title={`${activePersona.name}'s YouTube`}
      >
        <Youtube className="h-4 w-4" />
      </a>
    </div>
  );
};

export const ActivePersonaAvatar: React.FC<{ personaId: PersonaId }> = ({
  personaId,
}) => {
  const persona = getPersona(personaId);
  return (
    <img
      src={persona.avatarUrl}
      alt={persona.name}
      className="h-8 w-8 rounded-lg object-cover"
    />
  );
};
