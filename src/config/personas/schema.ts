import { z } from "zod";

export const personaIdSchema = z.enum(["hitesh", "piyush"]);
export type PersonaId = z.infer<typeof personaIdSchema>;

export interface SocialLinksUI {
  youtube: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface PersonaUI {
  id: PersonaId;
  name: string;
  tagline: string;
  avatarUrl: string;
  landingHeroUrl: string;
  landingHeadline: string;
  landingKeywords: { left: [string, string]; right: [string, string] };
  social: SocialLinksUI;
  starterPrompts: string[];
}
