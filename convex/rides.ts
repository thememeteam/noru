import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const VEHICLE_OPTIONS = {
  auto: { capacity: 2 },
  cab: { capacity: 3 },
  ownBike: { capacity: 0 },
  ownCar: { capacity: 3 },
} as const;

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

    return posts.map((post) => ({
      ...post,
      isMine: post.userId === userId,
    }))
      .filter((post) => !post.isStopped)
      .filter((post) => !post.isMine)
      .filter((post) => !post.isFull);
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
      throw new Error("You can only view rides you host.");
    }

    const joins = await ctx.db
      .query("rideJoins")
      .withIndex("by_ride_post_id", (q) => q.eq("ridePostId", args.ridePostId))
      .order("desc")
      .collect();

    return {
      ridePost,
      joinees: joins,
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
