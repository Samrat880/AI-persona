import { z } from "zod";

export const personaIdSchema = z.enum(["hitesh", "piyush"]);
export type PersonaId = z.infer<typeof personaIdSchema>;

export const socialLinksSchema = z.object({
  youtube: z.string().url(),
  youtubeChannelId: z.string().optional(),
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional(),
});

export type SocialLinks = z.infer<typeof socialLinksSchema>;

export const personaMetaSchema = z.object({
  id: personaIdSchema,
  name: z.string().min(1),
  tagline: z.string().min(1),
  botDisplayName: z.string().min(1),
  avatarUrl: z.string().url(),
  social: socialLinksSchema,
  starterPrompts: z.array(z.string().max(300)).max(12).optional(),
});

export type PersonaMeta = z.infer<typeof personaMetaSchema>;

export const personaPromptSchema = z.object({
  systemPrompt: z.string().min(100).max(16000),
});

export type Persona = PersonaMeta & { systemPrompt: string };

export function isValidPersonaId(id: string): id is PersonaId {
  return personaIdSchema.safeParse(id).success;
}

export function parsePersonaId(id: string): PersonaId {
  return personaIdSchema.parse(id);
}
