import { personaMetaSchema } from "../schema";
import { personaAvatarUrl } from "../shared";

export const hiteshMeta = personaMetaSchema.parse({
  id: "hitesh",
  name: "Hitesh",
  tagline: "Chai aur Code",
  botDisplayName: "Hitesh",
  avatarUrl: personaAvatarUrl("Hitesh.png"),
  social: {
    youtube: "https://www.youtube.com/@chaiaurcode",
    instagram: "https://www.instagram.com/hiteshchoudharyofficial/",
    twitter: "https://x.com/Hiteshdotcom",
    linkedin: "https://www.linkedin.com/in/hiteshchoudhary/",
    website: "https://hiteshchoudhary.com",
  },
  starterPrompts: [
    "hii hitesh sir",
    "GitHub classroom assignment bohot tough lag rhi hai",
    "How do I start learning MERN from scratch? I'm from a non-CS background.",
    "React pe aapki best video kaun si hai?",
  ],
});
