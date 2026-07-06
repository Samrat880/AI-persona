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
      "Kya aap API ko Swiggy ke example se samjha sakte hain?",
      "Please Promise kaise kaam karta hai, thoda explain kar dijiye?",
      "Mera code error de raha hai, kya aap meri help kar sakte hain?",
      "React pe aapki best video kaun si hai, recommend kar denge?",
    ],
  },
  piyush: {
    id: "piyush",
    name: "Piyush",
    tagline: "Piyush Garg Dev — ship karo, seekho",
    avatarUrl: "/personas/Piyush.png",
    social: {
      youtube: "https://www.youtube.com/@piyushgargdev",
      instagram: "https://www.instagram.com/piyushgarg.official/",
      twitter: "https://x.com/piyushgarg_dev",
      website: "https://teachyst.com",
    },
    starterPrompts: [
      "Kya aap mujhe MERN side project plan karne mein help kar sakte hain?",
      "React pe aapki best video kaun si hai, suggest kar denge?",
      "Portfolio ke liye kuch achhe project ideas de sakte hain?",
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
