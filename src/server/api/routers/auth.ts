import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getServerClient } from "~/server/stream/serverClient";

export const authRouter = createTRPCRouter({
  createStreamToken: publicProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .mutation(({ input }) => {
      const now = Math.floor(Date.now() / 1000);
      // Backdate `iat` by a safety buffer to absorb clock skew between this
      // server and Stream's servers. A slightly-fast local clock otherwise
      // produces a token whose `iat` is in the future, which Stream rejects
      // with: "token used before issue at (iat)".
      const CLOCK_SKEW_BUFFER_SECONDS = 60;
      const issuedAt = now - CLOCK_SKEW_BUFFER_SECONDS;
      const expiration = now + 60 * 60;
      const token = getServerClient().createToken(
        input.userId,
        expiration,
        issuedAt
      );
      return { token };
    }),
});
