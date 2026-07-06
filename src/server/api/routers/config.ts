import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getApiKey } from "~/server/stream/serverClient";

export const configRouter = createTRPCRouter({
  getPublic: publicProcedure.query(() => {
    return { streamApiKey: getApiKey() };
  }),
});
