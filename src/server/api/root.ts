import { agentRouter } from "~/server/api/routers/agent";
import { authRouter } from "~/server/api/routers/auth";
import { configRouter } from "~/server/api/routers/config";
import { personaRouter } from "~/server/api/routers/persona";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  config: configRouter,
  auth: authRouter,
  persona: personaRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
