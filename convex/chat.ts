import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

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

    return messages.map((msg: any) => ({
      ...msg,
      isOwnMessage: msg.userId === userId,
    }));
  },
});

export const sendMessage = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, ridePost } = await assertChatAccess(ctx, args.ridePostId);

    const text = args.text.trim();
    if (!text) throw new Error("Message cannot be empty.");
    if (text.length > 500) throw new Error("Message too long.");
    if (ridePost.isStopped) throw new Error("This ride has ended.");

    const user = await ctx.db.get(userId);
    const senderName = user?.name?.trim() || user?.email?.trim() || "Student";

    await ctx.db.insert("rideMessages", {
      ridePostId: args.ridePostId,
      userId,
      senderName,
      text,
      createdAt: Date.now(),
    });
  },
});
