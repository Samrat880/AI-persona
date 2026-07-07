import { z } from "zod";
import { personaIdSchema } from "~/server/personas/schema";

export const channelIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9!_-]+$/, "Invalid channel id");

export const channelTypeSchema = z.enum(["messaging"]).default("messaging");

export const userMessageTextSchema = z
  .string()
  .trim()
  .min(1, "Message cannot be empty")
  .max(4000, "Message too long");

export const streamMessageIdSchema = z.string().min(1).max(128);

export const channelInputSchema = z.object({
  channelId: channelIdSchema,
  channelType: channelTypeSchema,
});

export const optionalPersonaIdSchema = personaIdSchema.optional();

export const processMessageInputSchema = channelInputSchema.extend({
  text: userMessageTextSchema,
  personaId: optionalPersonaIdSchema,
  messageId: streamMessageIdSchema.optional(),
});

export const setPersonaInputSchema = channelInputSchema.extend({
  personaId: personaIdSchema,
});

export const personaMessageCustomSchema = z
  .object({
    persona_id: personaIdSchema.optional(),
    generating: z.boolean().optional(),
  })
  .passthrough();

export const processServerlessMessageInputSchema = z.object({
  id: streamMessageIdSchema.optional(),
  text: userMessageTextSchema,
  ai_generated: z.boolean().optional(),
  user: z.object({ id: z.string().max(128).optional() }).optional(),
  custom: personaMessageCustomSchema.optional(),
});

export const webhookEventSchema = z.object({
  type: z.string().optional(),
  channel_id: channelIdSchema.optional(),
  channel_type: z.string().optional(),
  message: z
    .object({
      id: streamMessageIdSchema.optional(),
      text: userMessageTextSchema.optional(),
      ai_generated: z.boolean().optional(),
      user: z.object({ id: z.string().max(128).optional() }).optional(),
      custom: personaMessageCustomSchema.optional(),
    })
    .optional(),
});

export type ProcessServerlessMessageInput = z.infer<
  typeof processServerlessMessageInputSchema
>;
