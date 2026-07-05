export type PersonaId = "hitesh" | "piyush";

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
  social: SocialLinksUI;
  starterPrompts: string[];
}

export const PERSONAS: Record<PersonaId, PersonaUI> = {
  hitesh: {
    id: "hitesh",
    name: "Hitesh",
    tagline: "Chai aur Code — build karke seekho",
    avatarUrl: "/personas/Hitesh.png",
    social: {
      youtube: "https://www.youtube.com/@chaiaurcode",
      instagram: "https://www.instagram.com/hiteshchoudharyofficial/",
      twitter: "https://x.com/Hiteshdotcom",
      linkedin: "https://www.linkedin.com/in/hiteshchoudhary/",
      website: "https://hiteshchoudhary.com",
    },
    starterPrompts: [
      "API kya hai? Swiggy wale example se samjhao",
      "Promise kaise kaam karta hai?",
      "Mera code error de raha hai, help karo",
      "React pe tumhari best video kaun si hai?",
    ],
  },
  piyush: {
    id: "piyush",
    name: "Piyush",
    tagline: "TeachMe — ship karo, seekho",
    avatarUrl: "/personas/Piyush.png",
    social: {
      youtube: "https://www.youtube.com/@piyushgargdev",
      instagram: "https://www.instagram.com/piyushgarg.official/",
      twitter: "https://x.com/piyushgarg_dev",
      website: "https://teachyst.com",
    },
    starterPrompts: [
      "Help me plan a MERN side project",
      "React pe tumhari best video kaun si hai?",
      "Mujhe portfolio ke liye project ideas do",
    ],
  },
};

export const DEFAULT_PERSONA_ID: PersonaId = "hitesh";

export const PERSONA_LIST = Object.values(PERSONAS);

export function isValidPersonaId(id: string): id is PersonaId {
  return id in PERSONAS;
}

export function getPersona(id: PersonaId): PersonaUI {
  return PERSONAS[id];
}
