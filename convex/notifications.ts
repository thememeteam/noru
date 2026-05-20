import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internalAction, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        token: args.token,
        platform: args.platform,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("pushTokens", {
        userId,
        token: args.token,
        platform: args.platform,
        updatedAt: Date.now(),
      });
    }
  },
});

export const removePushToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getTokensForUsers = internalQuery({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const results = await Promise.all(
      args.userIds.map((userId) =>
        ctx.db
          .query("pushTokens")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .first(),
      ),
    );
    return results
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => t.token);
  },
});

export const dispatchNotifications = internalAction({
  args: {
    userIds: v.array(v.id("users")),
    notification: v.object({
      title: v.string(),
      body: v.string(),
      data: v.optional(v.record(v.string(), v.string())),
      channelId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const tokens: string[] = await ctx.runQuery(internal.notifications.getTokensForUsers, {
      userIds: args.userIds,
    });

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token,
      title: args.notification.title,
      body: args.notification.body,
      data: args.notification.data ?? {},
      channelId: args.notification.channelId ?? "default",
      sound: true,
    }));

    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      try {
        await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Accept-Encoding": "gzip, deflate",
          },
          body: JSON.stringify(batch),
        });
      } catch {
        // Notification delivery is best-effort; silently skip on error
      }
    }
  },
});
