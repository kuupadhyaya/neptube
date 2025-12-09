import { z } from "zod";
import { eq, desc, and, isNull, sql } from "drizzle-orm";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { comments, users } from "@/db/schema";

export const commentsRouter = createTRPCRouter({
  // Get comments for a video
  getByVideo: baseProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const videoComments = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          parentId: comments.parentId,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(
          and(eq(comments.videoId, input.videoId), isNull(comments.parentId))
        )
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return videoComments;
    }),

  // Get replies for a comment
  getReplies: baseProcedure
    .input(
      z.object({
        parentId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const replies = await ctx.db
        .select({
          id: comments.id,
          content: comments.content,
          likeCount: comments.likeCount,
          createdAt: comments.createdAt,
          user: {
            id: users.id,
            name: users.name,
            imageURL: users.imageURL,
          },
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.parentId, input.parentId))
        .orderBy(desc(comments.createdAt))
        .limit(input.limit);

      return replies;
    }),

  // Create comment
  create: protectedProcedure
    .input(
      z.object({
        videoId: z.string().uuid(),
        content: z.string().min(1).max(2000),
        parentId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const newComment = await ctx.db
        .insert(comments)
        .values({
          content: input.content,
          videoId: input.videoId,
          userId: ctx.user.id,
          parentId: input.parentId,
        })
        .returning();

      return newComment[0];
    }),

  // Update comment
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(comments)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)))
        .returning();

      return updated[0];
    }),

  // Delete comment
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(comments)
        .where(and(eq(comments.id, input.id), eq(comments.userId, ctx.user.id)));

      return { success: true };
    }),

  // Like comment
  like: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(comments)
        .set({
          likeCount: sql`${comments.likeCount} + 1`,
        })
        .where(eq(comments.id, input.id));

      return { success: true };
    }),
});
