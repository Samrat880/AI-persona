import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    STREAM_API_KEY: z.string().min(1),
    STREAM_API_SECRET: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    TAVILY_API_KEY: z.string().optional(),
    YOUTUBE_API_KEY: z.string().optional(),
    FRONTEND_URL: z.string().url().optional(),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    STREAM_API_KEY: process.env.STREAM_API_KEY,
    STREAM_API_SECRET: process.env.STREAM_API_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    FRONTEND_URL: process.env.FRONTEND_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
