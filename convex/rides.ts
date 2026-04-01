import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const VEHICLE_OPTIONS = {
  auto: { capacity: 2 },
  cab: { capacity: 3 },
  ownBike: { capacity: 0 },
  ownCar: { capacity: 3 },
} as const;

async function getProfilePhotoUrl(ctx: any, userId: any) {
  const profile = await ctx.db
    .query("studentProfiles")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) {
    return null;
  }

  return await ctx.storage.getUrl(profile.profilePhotoStorageId);
}

async function getUserRatingSummaryForUser(ctx: any, userId: any) {
  const ratings = await ctx.db
    .query("userRatings")
    .withIndex("by_ratee_user_id", (q: any) => q.eq("rateeUserId", userId))
    .collect();

  if (ratings.length === 0) {
    return {
      ratingAverage: null,
      ratingCount: 0,
    };
  }

  const total = ratings.reduce((sum: number, item: any) => sum + item.rating, 0);
  return {
    ratingAverage: Math.round((total / ratings.length) * 10) / 10,
    ratingCount: ratings.length,
  };
}

export const listJoinableRidePosts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const posts = await ctx.db
      .query("ridePosts")
      .withIndex("by_created_at")
      .order("desc")
      .take(50);

    const postsWithMeta = await Promise.all(
      posts.map(async (post) => {
        const riderPhotoUrl = await getProfilePhotoUrl(ctx, post.userId);

        return {
          ...post,
          isMine: post.userId === userId,
          riderPhotoUrl,
        };
      }),
    );

    return postsWithMeta
      .filter((post) => !post.isStopped)
      .filter((post) => !post.isMine)
      .filter((post) => !post.isFull);
  },
});

export const getMyActiveJoinedRide = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    for (const join of joins) {
      const ridePost = await ctx.db.get(join.ridePostId);
      if (ridePost && !ridePost.isStopped) {
        const riderPhotoUrl = await getProfilePhotoUrl(ctx, ridePost.userId);
        return {
          ridePostId: ridePost._id,
          riderName: ridePost.riderName,
          riderPhotoUrl,
          startPoint: ridePost.startPoint,
          endPoint: ridePost.endPoint,
          vehicleType: ridePost.vehicleType,
        };
      }
    }

    return null;
  },
});

export const getMyRideHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const hostedPosts = await ctx.db
      .query("ridePosts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    const joinedRides = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    const joinedRideItems = await Promise.all(
      joinedRides.map(async (join) => {
        const ridePost = await ctx.db.get(join.ridePostId);
        if (!ridePost) {
          return null;
        }

        return {
          id: `joined:${join._id}`,
          type: "joined" as const,
          startPoint: ridePost.startPoint,
          endPoint: ridePost.endPoint,
          vehicleType: ridePost.vehicleType,
          status: ridePost.isStopped ? "Stopped" : "Joined",
          createdAt: join.createdAt,
        };
      }),
    );

    const hostedRideItems = hostedPosts.map((post) => ({
      id: `hosted:${post._id}`,
      type: "hosted" as const,
      startPoint: post.startPoint,
      endPoint: post.endPoint,
      vehicleType: post.vehicleType,
      status: post.isStopped ? "Stopped" : "Active",
      createdAt: post.createdAt,
    }));

    return [...hostedRideItems, ...joinedRideItems.filter((item) => item !== null)].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  },
});

export const createRidePost = mutation({
  args: {
    startPoint: v.string(),
    endPoint: v.string(),
    vehicleType: v.union(
      v.literal("auto"),
      v.literal("cab"),
      v.literal("ownBike"),
      v.literal("ownCar"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const startPoint = args.startPoint.trim();
    const endPoint = args.endPoint.trim();
    if (!startPoint || !endPoint) {
      throw new Error("Start and end point are required.");
    }

    const user = await ctx.db.get(userId);
    const riderName = user?.name?.trim() || user?.email?.trim() || "Student";
    const capacity = VEHICLE_OPTIONS[args.vehicleType].capacity;
    const joinedCount = 0;
    const isFull = joinedCount >= capacity;

    return await ctx.db.insert("ridePosts", {
      userId,
      riderName,
      startPoint,
      endPoint,
      vehicleType: args.vehicleType,
      capacity,
      joinedCount,
      isFull,
      isStopped: false,
      createdAt: Date.now(),
    });
  },
});

export const getHostedRidePost = query({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      return null;
    }

    if (ridePost.userId !== userId) {
      return null;
    }

    const host = await ctx.db.get(ridePost.userId);
    const hostPhotoUrl = await getProfilePhotoUrl(ctx, ridePost.userId);
    const hostRating = await getUserRatingSummaryForUser(ctx, ridePost.userId);

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .order("desc")
      .collect();

    const joinees = await Promise.all(
      joins.map(async (join) => ({
        ...join,
        joineeEmail: (await ctx.db.get(join.userId))?.email ?? null,
        joineePhotoUrl: await getProfilePhotoUrl(ctx, join.userId),
        ...(await getUserRatingSummaryForUser(ctx, join.userId)),
      })),
    );

    return {
      ridePost,
      host: {
        userId: ridePost.userId,
        name: ridePost.riderName,
        email: host?.email ?? null,
        photoUrl: hostPhotoUrl,
        ratingAverage: hostRating.ratingAverage,
        ratingCount: hostRating.ratingCount,
      },
      joinees,
    };
  },
});

export const getJoinedRidePost = query({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      return null;
    }

    if (ridePost.userId === userId) {
      return null;
    }

    const join = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();

    if (!join) {
      return null;
    }

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .order("desc")
      .collect();

    const host = await ctx.db.get(ridePost.userId);
    const hostPhotoUrl = await getProfilePhotoUrl(ctx, ridePost.userId);
    const hostRating = await getUserRatingSummaryForUser(ctx, ridePost.userId);
    const joinees = await Promise.all(
      joins.map(async (item) => ({
        ...item,
        joineeEmail: (await ctx.db.get(item.userId))?.email ?? null,
        joineePhotoUrl: await getProfilePhotoUrl(ctx, item.userId),
        ...(await getUserRatingSummaryForUser(ctx, item.userId)),
      })),
    );

    return {
      ridePost,
      host: {
        userId: ridePost.userId,
        name: ridePost.riderName,
        email: host?.email ?? null,
        photoUrl: hostPhotoUrl,
        ratingAverage: hostRating.ratingAverage,
        ratingCount: hostRating.ratingCount,
      },
      joinees,
    };
  },
});

export const joinRidePost = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      throw new Error("Ride post not found.");
    }
    if (ridePost.isStopped) {
      throw new Error("This ride has been stopped.");
    }
    if (ridePost.userId === userId) {
      throw new Error("You cannot join your own ride.");
    }
    if (ridePost.isFull) {
      throw new Error("This ride is already full.");
    }

    const existingJoin = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();

    if (existingJoin) {
      throw new Error("You already joined this ride.");
    }

    const userJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    for (const join of userJoins) {
      const joinedRidePost = await ctx.db.get(join.ridePostId);
      if (joinedRidePost && !joinedRidePost.isStopped && joinedRidePost._id !== args.ridePostId) {
        throw new Error("You are already in another ride. Leave it first.");
      }
    }

    const user = await ctx.db.get(userId);
    const joineeName = user?.name?.trim() || user?.email?.trim() || "Student";

    await ctx.db.insert("rideJoins", {
      ridePostId: args.ridePostId,
      userId,
      joineeName,
      createdAt: Date.now(),
    });

    const nextJoinedCount = ridePost.joinedCount + 1;
    const nextIsFull = nextJoinedCount >= ridePost.capacity;
    await ctx.db.patch(args.ridePostId, {
      joinedCount: nextJoinedCount,
      isFull: nextIsFull,
    });
  },
});

export const leaveRidePost = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const existingJoin = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", userId).eq("ridePostId", args.ridePostId))
      .first();

    if (!existingJoin) {
      throw new Error("You are not part of this ride.");
    }

    await ctx.db.delete(existingJoin._id);

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost || ridePost.isStopped) {
      return;
    }

    const nextJoinedCount = Math.max(0, ridePost.joinedCount - 1);
    await ctx.db.patch(args.ridePostId, {
      joinedCount: nextJoinedCount,
      isFull: false,
    });
  },
});

export const removeJoineeFromRide = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    joineeUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      throw new Error("Ride post not found.");
    }
    if (ridePost.userId !== userId) {
      throw new Error("Only the host can remove a participant.");
    }

    const existingJoin = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", args.joineeUserId).eq("ridePostId", args.ridePostId))
      .first();

    if (!existingJoin) {
      throw new Error("User is not part of this ride.");
    }

    await ctx.db.delete(existingJoin._id);

    const nextJoinedCount = Math.max(0, ridePost.joinedCount - 1);
    await ctx.db.patch(args.ridePostId, {
      joinedCount: nextJoinedCount,
      isFull: false,
    });

    await ctx.db.insert("userNotifications", {
      userId: args.joineeUserId,
      title: "Removed from ride",
      message: `${ridePost.riderName} removed you from the ride ${ridePost.startPoint} -> ${ridePost.endPoint}.`,
      type: "rideRemoved",
      isRead: false,
      ridePostId: args.ridePostId,
      createdAt: Date.now(),
    });
  },
});

export const getMyUnreadNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    return await ctx.db
      .query("userNotifications")
      .withIndex("by_user_id_and_is_read", (q) => q.eq("userId", userId).eq("isRead", false))
      .order("desc")
      .take(10);
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("userNotifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found.");
    }
    if (notification.userId !== userId) {
      throw new Error("You cannot modify this notification.");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const getRideFeedbackTargets = query({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      throw new Error("Ride post not found.");
    }
    if (!ridePost.isStopped) {
      throw new Error("Feedback opens after the ride ends.");
    }

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();

    const participantUserIds = [ridePost.userId, ...joins.map((join) => join.userId)];
    if (!participantUserIds.some((id) => id === userId)) {
      throw new Error("You were not part of this ride.");
    }

    const targets = await Promise.all(
      participantUserIds
        .filter((id) => id !== userId)
        .map(async (targetUserId) => {
          const user = await ctx.db.get(targetUserId);
          const photoUrl = await getProfilePhotoUrl(ctx, targetUserId);
          const rating = await getUserRatingSummaryForUser(ctx, targetUserId);
          const existing = await ctx.db
            .query("userRatings")
            .withIndex("by_ride_and_rater_and_ratee", (q: any) =>
              q.eq("ridePostId", args.ridePostId).eq("raterUserId", userId).eq("rateeUserId", targetUserId),
            )
            .first();

          return {
            userId: targetUserId,
            displayName: user?.name?.trim() || user?.email?.trim() || "Student",
            email: user?.email ?? null,
            photoUrl,
            ratingAverage: rating.ratingAverage,
            ratingCount: rating.ratingCount,
            existingRating: existing?.rating ?? 0,
          };
        }),
    );

    return {
      ridePostId: args.ridePostId,
      rideLabel: `${ridePost.startPoint} -> ${ridePost.endPoint}`,
      targets,
    };
  },
});

export const submitRideUserFeedback = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    ratings: v.array(
      v.object({
        rateeUserId: v.id("users"),
        rating: v.number(),
        whatWasGood: v.optional(v.string()),
        whatWasBad: v.optional(v.string()),
        anythingElse: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      throw new Error("Ride post not found.");
    }
    if (!ridePost.isStopped) {
      throw new Error("You can submit feedback only after ride ends.");
    }

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();

    const participantSet = new Set([ridePost.userId, ...joins.map((join) => join.userId)]);
    if (!participantSet.has(userId)) {
      throw new Error("You were not part of this ride.");
    }

    for (const item of args.ratings) {
      if (item.rating < 1 || item.rating > 5) {
        throw new Error("Ratings must be between 1 and 5.");
      }
      if (item.rateeUserId === userId) {
        throw new Error("You cannot rate yourself.");
      }
      if (!participantSet.has(item.rateeUserId)) {
        throw new Error("You can only rate users from this ride.");
      }

      const existing = await ctx.db
        .query("userRatings")
        .withIndex("by_ride_and_rater_and_ratee", (q: any) =>
          q.eq("ridePostId", args.ridePostId).eq("raterUserId", userId).eq("rateeUserId", item.rateeUserId),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          rating: item.rating,
          whatWasGood: item.whatWasGood?.trim() || undefined,
          whatWasBad: item.whatWasBad?.trim() || undefined,
          anythingElse: item.anythingElse?.trim() || undefined,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("userRatings", {
          ridePostId: args.ridePostId,
          raterUserId: userId,
          rateeUserId: item.rateeUserId,
          rating: item.rating,
          whatWasGood: item.whatWasGood?.trim() || undefined,
          whatWasBad: item.whatWasBad?.trim() || undefined,
          anythingElse: item.anythingElse?.trim() || undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  },
});

export const getMyRatingSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ratings = await ctx.db
      .query("userRatings")
      .withIndex("by_ratee_user_id", (q: any) => q.eq("rateeUserId", userId))
      .collect();

    if (ratings.length === 0) {
      return {
        averageRating: null,
        totalRatings: 0,
      };
    }

    const total = ratings.reduce((sum: number, item: any) => sum + item.rating, 0);
    return {
      averageRating: Math.round((total / ratings.length) * 10) / 10,
      totalRatings: ratings.length,
    };
  },
});

export const stopRidePost = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ridePost = await ctx.db.get(args.ridePostId);
    if (!ridePost) {
      throw new Error("Ride post not found.");
    }

    if (ridePost.userId !== userId) {
      throw new Error("You can only stop your own ride.");
    }

    await ctx.db.patch(args.ridePostId, {
      isStopped: true,
      isFull: true,
    });
  },
});
