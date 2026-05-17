import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  studentProfiles: defineTable({
    userId: v.id("users"),
    universityEmail: v.string(),
    profilePhotoStorageId: v.id("_storage"),
    gender: v.optional(
      v.union(
        v.literal("female"),
        v.literal("male"),
        v.literal("nonBinary"),
        v.literal("preferNotToSay"),
      ),
    ),
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
    totalPrice: v.optional(v.number()),
    pricePerPerson: v.optional(v.number()),
    rideStartAt: v.optional(v.number()),
    stopReason: v.optional(v.union(v.literal("cancelled"), v.literal("ended"))),
    isStarted: v.optional(v.boolean()),
    startedAt: v.optional(v.number()),
    capacity: v.number(),
    joinedCount: v.number(),
    isFull: v.boolean(),
    isStopped: v.boolean(),
    womenOnly: v.optional(v.boolean()),
    quietRide: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_user_id", ["userId"]),
  rideJoins: defineTable({
    ridePostId: v.id("ridePosts"),
    userId: v.id("users"),
    joineeName: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"))),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_ride_post_id", ["ridePostId"])
    .index("by_user_id", ["userId"])
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
  userNotifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("rideRemoved"),
      v.literal("rideAccepted"),
      v.literal("rideStarted"),
      v.literal("joinRequest"),
      v.literal("info"),
    ),
    isRead: v.boolean(),
    ridePostId: v.optional(v.id("ridePosts")),
    createdAt: v.number(),
  })
    .index("by_user_id_and_created_at", ["userId", "createdAt"])
    .index("by_user_id_and_is_read", ["userId", "isRead"]),
  userRatings: defineTable({
    ridePostId: v.id("ridePosts"),
    raterUserId: v.id("users"),
    rateeUserId: v.id("users"),
    rating: v.optional(v.number()),
    whatWasGood: v.optional(v.string()),
    whatWasBad: v.optional(v.string()),
    anythingElse: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_ride_and_rater_and_ratee", ["ridePostId", "raterUserId", "rateeUserId"])
    .index("by_ratee_user_id", ["rateeUserId"]),
  rideMessages: defineTable({
    ridePostId: v.id("ridePosts"),
    userId: v.id("users"),
    senderName: v.string(),
    text: v.string(),
    replyToId: v.optional(v.id("rideMessages")),
    replyToText: v.optional(v.string()),
    replyToSenderName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_ride_post_id_and_created_at", ["ridePostId", "createdAt"]),
  messageReactions: defineTable({
    messageId: v.id("rideMessages"),
    ridePostId: v.id("ridePosts"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_message_id", ["messageId"])
    .index("by_user_and_message", ["userId", "messageId"]),
  typingIndicators: defineTable({
    ridePostId: v.id("ridePosts"),
    userId: v.id("users"),
    userName: v.string(),
    updatedAt: v.number(),
  })
    .index("by_ride_post_id", ["ridePostId"])
    .index("by_user_and_ride", ["userId", "ridePostId"]),
});
