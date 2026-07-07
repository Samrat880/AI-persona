import { personaMetaSchema } from "../schema";
import { personaAvatarUrl } from "../shared";

export const piyushMeta = personaMetaSchema.parse({
  id: "piyush",
  name: "Piyush",
  tagline: "Founder of Teachyst",
  botDisplayName: "Piyush",
  avatarUrl: personaAvatarUrl("Piyush.png"),
  social: {
    youtube: "https://www.youtube.com/@piyushgargdev",
    instagram: "https://www.instagram.com/piyushgarg.official/",
    twitter: "https://x.com/piyushgarg_dev",
    website: "https://teachyst.com",
  },
  starterPrompts: [
    "hii piyush sir kaise ho",
    "Docker aur Kubernetes mein kya difference hai?",
    "MERN side project kaise plan karun?",
    "React pe aapki best video kaun si hai?",
  ],
});
