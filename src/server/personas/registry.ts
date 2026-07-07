import type { Persona, PersonaId, PersonaMeta, SocialLinks } from "./schema";
import {
  isValidPersonaId,
  parsePersonaId,
  personaIdSchema,
} from "./schema";
import { hiteshMeta } from "./hitesh/meta";
import { piyushMeta } from "./piyush/meta";

export const DEFAULT_PERSONA_ID: PersonaId = "hitesh";

export const PERSONA_IDS = personaIdSchema.options;

const PERSONA_META: Record<PersonaId, PersonaMeta> = {
  hitesh: hiteshMeta,
  piyush: piyushMeta,
};

const promptCache = new Map<PersonaId, string>();

const promptLoaders: Record<
  PersonaId,
  () => Promise<{ systemPrompt: string }>
> = {
  hitesh: () => import("./hitesh/prompt"),
  piyush: () => import("./piyush/prompt"),
};

export function getPersonaMeta(id: PersonaId): PersonaMeta {
  return PERSONA_META[id];
}

export async function getPersonaPrompt(id: PersonaId): Promise<string> {
  const cached = promptCache.get(id);
  if (cached) return cached;

  const mod = await promptLoaders[id]();
  promptCache.set(id, mod.systemPrompt);
  return mod.systemPrompt;
}

/** Loads prompt lazily for the selected persona only. */
export async function getPersona(id: PersonaId): Promise<Persona> {
  const meta = getPersonaMeta(id);
  const systemPrompt = await getPersonaPrompt(id);
  return { ...meta, systemPrompt };
}

export function formatSocialLinksForPrompt(social: SocialLinks): string {
  const lines: string[] = [`- YouTube: ${social.youtube}`];
  if (social.instagram) lines.push(`- Instagram: ${social.instagram}`);
  if (social.twitter) lines.push(`- Twitter/X: ${social.twitter}`);
  if (social.linkedin) lines.push(`- LinkedIn: ${social.linkedin}`);
  if (social.website) lines.push(`- Website: ${social.website}`);
  return lines.join("\n");
}

export function getPublicPersonas() {
  return PERSONA_IDS.map((id) => getPersonaMeta(id));
}

export { isValidPersonaId, parsePersonaId };
export type { Persona, PersonaId, PersonaMeta, SocialLinks };
