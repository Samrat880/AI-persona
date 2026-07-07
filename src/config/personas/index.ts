import { hiteshPersona } from "./hitesh";
import { piyushPersona } from "./piyush";
import { personaIdSchema, type PersonaId, type PersonaUI } from "./schema";

export type { PersonaId, PersonaUI, SocialLinksUI } from "./schema";

export const PERSONAS: Record<PersonaId, PersonaUI> = {
  hitesh: hiteshPersona,
  piyush: piyushPersona,
};

export const DEFAULT_PERSONA_ID: PersonaId = "hitesh";

export const PERSONA_LIST = Object.values(PERSONAS);

export function isValidPersonaId(id: string): id is PersonaId {
  return personaIdSchema.safeParse(id).success;
}

export function getPersona(id: PersonaId): PersonaUI {
  return PERSONAS[id];
}
