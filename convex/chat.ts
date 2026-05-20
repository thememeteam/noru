import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

async function assertChatAccess(ctx: any, ridePostId: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("You must be signed in.");

  const ridePost = await ctx.db.get(ridePostId);
  if (!ridePost) throw new Error("Ride not found.");

  if (ridePost.userId === userId) {
    return { userId, ridePost };
  }

  const join = await ctx.db
    .query("rideJoins")
    .withIndex("by_user_and_ride", (q: any) => q.eq("userId", userId).eq("ridePostId", ridePostId))
    .first();

  if (!join || join.status !== "accepted") {
    throw new Error("Only accepted participants can access the chat.");
  }

  return { userId, ridePost };
}

export const getMessages = query({
  args: { ridePostId: v.id("ridePosts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) return null;

    const isHost = ridePost.userId === userId;
    if (!isHost) {
      const join = await ctx.db
        .query("rideJoins")
        .withIndex("by_user_and_ride", (q: any) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
        .first();
      if (!join || join.status !== "accepted") return null;
    }

    const messages = await ctx.db
      .query("rideMessages")
      .withIndex("by_ride_post_id_and_created_at", (q: any) => q.eq("ridePostId", args.ridePostId))
      .order("asc")
      .take(200);

    return await Promise.all(
      messages.map(async (msg: any) => {
        const rawReactions = await ctx.db
          .query("messageReactions")
          .withIndex("by_message_id", (q) => q.eq("messageId", msg._id))
          .collect();

        const reactionMap = new Map<string, { count: number; didReact: boolean }>();
        for (const r of rawReactions) {
          const entry = reactionMap.get(r.emoji) ?? { count: 0, didReact: false };
          entry.count += 1;
          if (r.userId === userId) entry.didReact = true;
          reactionMap.set(r.emoji, entry);
        }

        const reactions = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          didReact: data.didReact,
        }));

        return {
          ...msg,
          isOwnMessage: msg.userId === userId,
          reactions,
        };
      }),
    );
  },
});

export const sendMessage = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    text: v.string(),
    replyToId: v.optional(v.id("rideMessages")),
  },
  handler: async (ctx, args) => {
    const { userId, ridePost } = await assertChatAccess(ctx, args.ridePostId);

    const text = args.text.trim();
    if (!text) throw new Error("Message cannot be empty.");
    if (text.length > 500) throw new Error("Message too long.");
    if (ridePost.isStopped) throw new Error("This ride has ended.");

    let replyToText: string | undefined;
    let replyToSenderName: string | undefined;
    if (args.replyToId) {
      const replyTarget = await ctx.db.get(args.replyToId);
      if (replyTarget && replyTarget.ridePostId === args.ridePostId) {
        replyToText = replyTarget.text;
        replyToSenderName = replyTarget.senderName;
      }
    }

    const user = await ctx.db.get(userId);
    const senderName = user?.name?.trim() || user?.email?.trim() || "Student";

    const existingTyping = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();
    if (existingTyping) {
      await ctx.db.delete(existingTyping._id);
    }

    await ctx.db.insert("rideMessages", {
      ridePostId: args.ridePostId,
      userId,
      senderName,
      text,
      replyToId: args.replyToId,
      replyToText,
      replyToSenderName,
      createdAt: Date.now(),
    });

    const allJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();
    const acceptedJoineeIds = allJoins
      .filter((j) => (j.status ?? "pending") === "accepted" && j.userId !== userId)
      .map((j) => j.userId);
    const recipientIds = ridePost.userId !== userId
      ? [...acceptedJoineeIds, ridePost.userId]
      : acceptedJoineeIds;

    if (recipientIds.length > 0) {
      const preview = text.length > 80 ? text.slice(0, 77) + "..." : text;
      await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
        userIds: recipientIds,
        notification: {
          title: senderName,
          body: preview,
          data: { ridePostId: args.ridePostId, screen: "chat" },
          channelId: "chat",
        },
      });
    }
  },
});

export const toggleReaction = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    messageId: v.id("rideMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertChatAccess(ctx, args.ridePostId);

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_user_and_message", (q) => q.eq("userId", userId).eq("messageId", args.messageId))
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("messageReactions", {
        messageId: args.messageId,
        ridePostId: args.ridePostId,
        userId,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    }
  },
});

export const setTypingIndicator = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await assertChatAccess(ctx, args.ridePostId);

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: Date.now(), userName: args.userName });
    } else {
      await ctx.db.insert("typingIndicators", {
        ridePostId: args.ridePostId,
        userId,
        userName: args.userName,
        updatedAt: Date.now(),
      });
    }
  },
});

export const clearTypingIndicator = mutation({
  args: { ridePostId: v.id("ridePosts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getTypingIndicators = query({
  args: { ridePostId: v.id("ridePosts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();

    const now = Date.now();
    return indicators
      .filter((ind) => ind.userId !== userId && now - ind.updatedAt < 6000)
      .map((ind) => ind.userName);
  },
});
