import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  studentProfiles: defineTable({
    userId: v.id("users"),
    universityEmail: v.string(),
    profilePhotoStorageId: v.id("_storage"),
    completedAt: v.number(),
  }).index("by_user_id", ["userId"]),
  ridePosts: defineTable({
    userId: v.id("users"),
    riderName: v.string(),
    startPoint: v.string(),
    endPoint: v.string(),
    vehicleType: v.union(
      v.literal("auto"),
      v.literal("cab"),
      v.literal("ownBike"),
      v.literal("ownCar"),
    ),
    capacity: v.number(),
    joinedCount: v.number(),
    isFull: v.boolean(),
    isStopped: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_user_id", ["userId"]),
  rideJoins: defineTable({
    ridePostId: v.id("ridePosts"),
    userId: v.id("users"),
    joineeName: v.string(),
    createdAt: v.number(),
  })
    .index("by_ride_post_id", ["ridePostId"])
    .index("by_user_and_ride", ["userId", "ridePostId"]),
  userReports: defineTable({
    reporterUserId: v.id("users"),
    reportedUserId: v.id("users"),
    reportedName: v.string(),
    reporterName: v.string(),
    category: v.union(
      v.literal("unsafeBehaviour"),
      v.literal("harassmentConcern"),
      v.literal("noShowComplaint"),
    ),
    details: v.string(),
    ridePostId: v.optional(v.id("ridePosts")),
    status: v.union(v.literal("unresolved"), v.literal("resolved")),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedByUserId: v.optional(v.id("users")),
  })
    .index("by_status_and_created_at", ["status", "createdAt"])
    .index("by_reported_user_id", ["reportedUserId"])
    .index("by_reporter_user_id", ["reporterUserId"]),
  removedUsers: defineTable({
    userId: v.id("users"),
    removedAt: v.number(),
    removedByUserId: v.id("users"),
    reason: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),
});
