import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { usersRouter } from "./users";
import { videosRouter } from "./videos";
import { commentsRouter } from "./comments";
import { subscriptionsRouter } from "./subscriptions";

export const appRouter = createTRPCRouter({
  // Keep hello for testing
  hello: baseProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .query((opts) => {
      return {
        greeting: `hello ${opts.input.text}`,
      };
    }),

  // Sub-routers
  users: usersRouter,
  videos: videosRouter,
  comments: commentsRouter,
  subscriptions: subscriptionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;