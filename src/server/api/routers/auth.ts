import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getServerClient } from "~/server/stream/serverClient";

export const authRouter = createTRPCRouter({
  createStreamToken: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(({ input }) => {
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiration = issuedAt + 60 * 60;
      const token = getServerClient().createToken(
        input.userId,
        expiration,
        issuedAt
      );
      return { token };
    }),
});
