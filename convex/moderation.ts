import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const CATEGORY_LABELS = {
  unsafeBehaviour: "Unsafe behaviour",
  harassmentConcern: "Harassment concern",
  noShowComplaint: "No-show complaint",
} as const;

type ReportCategory = keyof typeof CATEGORY_LABELS;

async function getCurrentUserOrThrow(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("You must be signed in.");
  }
  return userId;
}

export const createUserReport = mutation({
  args: {
    reportedUserId: v.id("users"),
    reportedName: v.string(),
    category: v.union(
      v.literal("unsafeBehaviour"),
      v.literal("harassmentConcern"),
      v.literal("noShowComplaint"),
    ),
    details: v.string(),
    ridePostId: v.optional(v.id("ridePosts")),
  },
  handler: async (ctx, args) => {
    const reporterUserId = await getCurrentUserOrThrow(ctx);

    if (reporterUserId === args.reportedUserId) {
      throw new Error("You cannot report yourself.");
    }

    const details = args.details.trim();
    if (details.length < 8) {
      throw new Error("Please share a bit more detail before submitting.");
    }

    const reporter = await ctx.db.get(reporterUserId);
    const reporterName = reporter?.name?.trim() || reporter?.email?.trim() || "Anonymous";

    return await ctx.db.insert("userReports", {
      reporterUserId,
      reportedUserId: args.reportedUserId,
      reportedName: args.reportedName.trim() || "Unknown",
      reporterName,
      category: args.category,
      details,
      ridePostId: args.ridePostId,
      status: "unresolved",
      createdAt: Date.now(),
    });
  },
});

export const getModerationDashboard = query({
  args: {},
  handler: async (ctx) => {
    await getCurrentUserOrThrow(ctx);

    const unresolvedReports = await ctx.db
      .query("userReports")
      .withIndex("by_status_and_created_at", (q) => q.eq("status", "unresolved"))
      .order("desc")
      .take(50);

    const removedUsers = await ctx.db.query("removedUsers").collect();
    const removedUserSet = new Set(removedUsers.map((item) => item.userId));

    const users = await ctx.db.query("users").collect();
    const activeUsersCount = users.filter((user) => !removedUserSet.has(user._id)).length;

    return {
      openReportsCount: unresolvedReports.length,
      activeUsersCount,
      unresolvedReports: unresolvedReports.map((report) => ({
        ...report,
        categoryLabel: CATEGORY_LABELS[report.category as ReportCategory],
      })),
    };
  },
});

export const markReportResolved = mutation({
  args: {
    reportId: v.id("userReports"),
  },
  handler: async (ctx, args) => {
    const resolvedByUserId = await getCurrentUserOrThrow(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found.");
    }

    if (report.status === "resolved") {
      return;
    }

    await ctx.db.patch(args.reportId, {
      status: "resolved",
      resolvedAt: Date.now(),
      resolvedByUserId,
    });
  },
});

export const removeUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const removedByUserId = await getCurrentUserOrThrow(ctx);

    const existing = await ctx.db
      .query("removedUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("removedUsers", {
      userId: args.userId,
      removedAt: Date.now(),
      removedByUserId,
      reason: args.reason?.trim() || undefined,
    });
  },
});
