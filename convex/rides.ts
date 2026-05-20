import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const VEHICLE_OPTIONS = {
  auto: { capacity: 2 },
  cab: { capacity: 3 },
  ownBike: { capacity: 1 },
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

  const withRating = ratings.filter((r: any) => typeof r.rating === "number");

  if (withRating.length === 0) {
    return {
      ratingAverage: null,
      ratingCount: 0,
    };
  }

  const sum = withRating.reduce((acc: number, r: any) => acc + r.rating, 0);
  const avg = Math.round((sum / withRating.length) * 10) / 10;

  return {
    ratingAverage: avg,
    ratingCount: withRating.length,
  };
}

async function updatePricePerPersonForRide(ctx: any, ridePostId: any) {
  const ridePost = await ctx.db.get(ridePostId);
  if (!ridePost?.totalPrice || !Number.isFinite(ridePost.totalPrice)) {
    return;
  }

  const joins = await ctx.db
    .query("rideJoins")
    .withIndex("by_ride_post_id", (q: any) => q.eq("ridePostId", ridePostId))
    .collect();

  const acceptedCount = joins.filter((join: any) => (join.status ?? "pending") === "accepted").length;
  const splitCount = Math.max(1, acceptedCount + 1);
  const nextPrice = Math.round((ridePost.totalPrice / splitCount) * 100) / 100;

  await ctx.db.patch(ridePostId, { pricePerPerson: nextPrice });
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
        const riderRating = await getUserRatingSummaryForUser(ctx, post.userId);

        return {
          ...post,
          isMine: post.userId === userId,
          riderPhotoUrl,
          riderRatingAverage: riderRating.ratingAverage,
          riderRatingCount: riderRating.ratingCount,
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

export const getMyActiveHostedRide = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const posts = await ctx.db
      .query("ridePosts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    for (const post of posts) {
      if (!post.isStopped) {
        return {
          ridePostId: post._id,
          startPoint: post.startPoint,
          endPoint: post.endPoint,
          vehicleType: post.vehicleType,
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
          stopReason: ridePost.stopReason ?? null,
          rideStartAt: ridePost.rideStartAt ?? null,
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
      stopReason: post.stopReason ?? null,
      rideStartAt: post.rideStartAt ?? null,
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
    totalPrice: v.number(),
    rideStartAt: v.number(),
    womenOnly: v.optional(v.boolean()),
    quietRide: v.optional(v.boolean()),
    capacity: v.optional(v.number()),
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

    if (!Number.isFinite(args.totalPrice) || args.totalPrice <= 0) {
      throw new Error("Total price must be greater than 0.");
    }

    if (!Number.isFinite(args.rideStartAt) || args.rideStartAt <= 0) {
      throw new Error("Ride start time is required.");
    }

    const existingActivePosts = await ctx.db
      .query("ridePosts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    for (const post of existingActivePosts) {
      if (!post.isStopped) {
        throw new Error("You already have an active ride. Stop it first.");
      }
    }

    const userJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    for (const join of userJoins) {
      const joinedPost = await ctx.db.get(join.ridePostId);
      if (joinedPost && !joinedPost.isStopped) {
        throw new Error("You cannot host a ride while you're in another ride. Leave it first.");
      }
    }

    if (args.womenOnly) {
      const profile = await ctx.db
        .query("studentProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .first();
      if (profile?.gender !== "female" && profile?.gender !== "nonBinary") {
        throw new Error("Women-only rides can only be created by female or non-binary riders.");
      }
    }

    const user = await ctx.db.get(userId);
    const riderName = user?.name?.trim() || user?.email?.trim() || "Student";
    const maxCapacity = VEHICLE_OPTIONS[args.vehicleType].capacity;
    const capacity = args.capacity ?? maxCapacity;
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > maxCapacity) {
      throw new Error(`Capacity must be between 1 and ${maxCapacity} for this vehicle type.`);
    }
    const joinedCount = 0;
    const isFull = joinedCount >= capacity;

    return await ctx.db.insert("ridePosts", {
      userId,
      riderName,
      startPoint,
      endPoint,
      vehicleType: args.vehicleType,
      totalPrice: args.totalPrice,
      pricePerPerson: args.totalPrice,
      rideStartAt: args.rideStartAt,
      isStarted: false,
      startedAt: undefined,
      capacity,
      joinedCount,
      isFull,
      isStopped: false,
      womenOnly: args.womenOnly ?? false,
      quietRide: args.quietRide ?? false,
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
        status: join.status ?? "pending",
        joineeEmail: (await ctx.db.get(join.userId))?.email ?? null,
        joineePhotoUrl: await getProfilePhotoUrl(ctx, join.userId),
        ...(await getUserRatingSummaryForUser(ctx, join.userId)),
      })),
    );

    const pendingJoinees = joinees.filter((join) => join.status !== "accepted");
    const acceptedJoinees = joinees.filter((join) => join.status === "accepted");

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
      pendingJoinees,
      acceptedJoinees,
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
        status: item.status ?? "pending",
        joineeEmail: (await ctx.db.get(item.userId))?.email ?? null,
        joineePhotoUrl: await getProfilePhotoUrl(ctx, item.userId),
        ...(await getUserRatingSummaryForUser(ctx, item.userId)),
      })),
    );

    const pendingJoinees = joinees.filter((item) => item.status !== "accepted");
    const acceptedJoinees = joinees.filter((item) => item.status === "accepted");

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
      pendingJoinees,
      acceptedJoinees,
      joinStatus: join.status ?? "pending",
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
    if (ridePost.isStarted === true) {
      throw new Error("This ride has already started.");
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

    const activeHostedPosts = await ctx.db
      .query("ridePosts")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    for (const post of activeHostedPosts) {
      if (!post.isStopped) {
        throw new Error("You cannot join a ride while hosting one. Stop your ride first.");
      }
    }

    const userJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

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
      status: "pending",
      createdAt: Date.now(),
    });

    const nextJoinedCount = ridePost.joinedCount + 1;
    const nextIsFull = nextJoinedCount >= ridePost.capacity;
    await ctx.db.patch(args.ridePostId, {
      joinedCount: nextJoinedCount,
      isFull: nextIsFull,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
      userIds: [ridePost.userId],
      notification: {
        title: "New join request",
        body: `${joineeName} wants to join your ride from ${ridePost.startPoint} to ${ridePost.endPoint}`,
        data: { ridePostId: args.ridePostId, screen: "waiting" },
        channelId: "rides",
      },
    });
  },
});

export const acceptJoineeForRide = mutation({
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
      throw new Error("Only the host can accept a participant.");
    }

    const existingJoin = await ctx.db
      .query("rideJoins")
      .withIndex("by_user_and_ride", (q) => q.eq("userId", args.joineeUserId).eq("ridePostId", args.ridePostId))
      .first();

    if (!existingJoin) {
      throw new Error("User is not part of this ride.");
    }

    await ctx.db.patch(existingJoin._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    await updatePricePerPersonForRide(ctx, args.ridePostId);

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
      userIds: [args.joineeUserId],
      notification: {
        title: "You're in!",
        body: `Your request to join the ride from ${ridePost.startPoint} to ${ridePost.endPoint} was accepted`,
        data: { ridePostId: args.ridePostId, screen: "waiting" },
        channelId: "rides",
      },
    });
  },
});

export const startRidePost = mutation({
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
      throw new Error("Only the host can start the ride.");
    }
    if (ridePost.isStopped) {
      throw new Error("This ride has already ended.");
    }
    if (ridePost.isStarted === true) {
      return;
    }

    await ctx.db.patch(args.ridePostId, {
      isStarted: true,
      startedAt: Date.now(),
      isFull: true,
    });

    const acceptedJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();
    const acceptedJoineeIds = acceptedJoins
      .filter((j) => (j.status ?? "pending") === "accepted")
      .map((j) => j.userId);

    if (acceptedJoineeIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
        userIds: acceptedJoineeIds,
        notification: {
          title: "Ride is starting!",
          body: `Your ride from ${ridePost.startPoint} to ${ridePost.endPoint} is starting now`,
          data: { ridePostId: args.ridePostId, screen: "waiting" },
          channelId: "rides",
        },
      });
    }
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

    if ((existingJoin.status ?? "pending") === "accepted") {
      await updatePricePerPersonForRide(ctx, args.ridePostId);
    }

    const leavingUser = await ctx.db.get(userId);
    const leavingName = leavingUser?.name?.trim() || leavingUser?.email?.trim() || "Someone";
    await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
      userIds: [ridePost.userId],
      notification: {
        title: "Rider left",
        body: `${leavingName} has left your ride from ${ridePost.startPoint} to ${ridePost.endPoint}`,
        data: { ridePostId: args.ridePostId, screen: "waiting" },
        channelId: "rides",
      },
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

    if ((existingJoin.status ?? "pending") === "accepted") {
      await updatePricePerPersonForRide(ctx, args.ridePostId);
    }

    await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
      userIds: [args.joineeUserId],
      notification: {
        title: "Removed from ride",
        body: `You've been removed from the ride from ${ridePost.startPoint} to ${ridePost.endPoint}`,
        data: { screen: "home" },
        channelId: "rides",
      },
    });
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

          return {
            userId: targetUserId,
            displayName: user?.name?.trim() || user?.email?.trim() || "Student",
            email: user?.email ?? null,
            photoUrl,
            ratingAverage: rating.ratingAverage,
            ratingCount: rating.ratingCount,
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

      const clampedRating = Math.max(1, Math.min(5, Math.round(item.rating)));

      if (existing) {
        await ctx.db.patch(existing._id, {
          rating: clampedRating,
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
          rating: clampedRating,
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

    const withRating = ratings.filter((r: any) => typeof r.rating === "number");

    if (withRating.length === 0) {
      return {
        averageRating: null,
        totalRatings: 0,
      };
    }

    const sum = withRating.reduce((acc: number, r: any) => acc + r.rating, 0);
    const avg = Math.round((sum / withRating.length) * 10) / 10;

    return {
      averageRating: avg,
      totalRatings: withRating.length,
    };
  },
});

export const getMyRatingReviews = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ratings = await ctx.db
      .query("userRatings")
      .withIndex("by_ratee_user_id", (q: any) => q.eq("rateeUserId", userId))
      .order("desc")
      .take(20);

    const reviews = await Promise.all(
      ratings.map(async (rating) => {
        const reviewer = await ctx.db.get(rating.raterUserId);
        const note =
          rating.whatWasGood?.trim()
          || rating.whatWasBad?.trim()
          || rating.anythingElse?.trim()
          || null;

        return {
          id: rating._id,
          reviewerName: reviewer?.name?.trim() || reviewer?.email?.trim() || "Student",
          note,
          rating: typeof rating.rating === "number" ? rating.rating : null,
          createdAt: rating.updatedAt ?? rating.createdAt,
        };
      }),
    );

    return reviews.filter((review) => review.note !== null || review.rating !== null);
  },
});

export const stopRidePost = mutation({
  args: {
    ridePostId: v.id("ridePosts"),
    reason: v.union(v.literal("cancelled"), v.literal("ended")),
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
      stopReason: args.reason,
    });

    const allJoins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .collect();
    const joineeIds = allJoins
      .filter((j) => (j.status ?? "pending") === "accepted")
      .map((j) => j.userId);

    if (joineeIds.length > 0) {
      const isCancelled = args.reason === "cancelled";
      await ctx.scheduler.runAfter(0, internal.notifications.dispatchNotifications, {
        userIds: joineeIds,
        notification: {
          title: isCancelled ? "Ride cancelled" : "Ride ended",
          body: isCancelled
            ? `The ride from ${ridePost.startPoint} to ${ridePost.endPoint} was cancelled`
            : `The ride from ${ridePost.startPoint} to ${ridePost.endPoint} has ended`,
          data: { screen: "home" },
          channelId: "rides",
        },
      });
    }
  },
});

export const removeLegacyRatingField = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const ratings = await ctx.db.query("userRatings").collect();
    await Promise.all(
      ratings
        .filter((rating: any) => typeof rating.rating === "number")
        .map((rating: any) => ctx.db.patch(rating._id, { rating: undefined })),
    );
  },
});
