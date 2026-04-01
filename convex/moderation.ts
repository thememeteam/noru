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

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

async function getAdminAccess(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  const email = user?.email?.trim().toLowerCase() ?? "";
  const adminEmails = parseAdminEmails();
  return {
    isAdmin: adminEmails.includes(email),
    currentUserName: user?.name?.trim() || user?.email?.trim() || "Unknown",
  };
}

async function requireAdmin(ctx: any, userId: any) {
  const access = await getAdminAccess(ctx, userId);
  if (!access.isAdmin) {
    throw new Error("Admin access required.");
  }
  return access;
}

export const createUserReport = mutation({
  args: {
    reportedUserId: v.optional(v.id("users")),
    reportedName: v.string(),
    reason: v.string(),
    ridePostId: v.optional(v.id("ridePosts")),
  },
  handler: async (ctx, args) => {
    const reporterUserId = await getCurrentUserOrThrow(ctx);

    let resolvedReportedUserId = args.reportedUserId;
    if (!resolvedReportedUserId) {
      const targetName = args.reportedName.trim().toLowerCase();
      if (!targetName) {
        throw new Error("Reported user name is required.");
      }

      const users = await ctx.db.query("users").collect();
      const matches = users.filter((user) => (user.name?.trim().toLowerCase() ?? "") === targetName);

      if (matches.length === 0) {
        throw new Error("Could not find a user with that name.");
      }

      if (matches.length > 1) {
        throw new Error("Multiple users found with that name. Please report from a ride card instead.");
      }

      resolvedReportedUserId = matches[0]._id;
    }

    if (!resolvedReportedUserId) {
      throw new Error("Reported user is required.");
    }

    if (reporterUserId === resolvedReportedUserId) {
      throw new Error("You cannot report yourself.");
    }

    const reason = args.reason.trim();
    if (reason.length < 8) {
      throw new Error("Please share a bit more detail before submitting.");
    }

    const reporter = await ctx.db.get(reporterUserId);
    const reporterName = reporter?.name?.trim() || reporter?.email?.trim() || "Anonymous";

    return await ctx.db.insert("userReports", {
      reporterUserId,
      reportedUserId: resolvedReportedUserId,
      reportedName: args.reportedName.trim() || "Unknown",
      reporterName,
      category: "unsafeBehaviour",
      details: reason,
      ridePostId: args.ridePostId,
      status: "unresolved",
      createdAt: Date.now(),
    });
  },
});

export const getModerationAccess = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserOrThrow(ctx);
    const access = await getAdminAccess(ctx, userId);

    return {
      isAdmin: access.isAdmin,
      currentUserName: access.currentUserName,
    };
  },
});

export const getReportTargetSuggestions = query({
  args: {
    keyword: v.string(),
  },
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    const keyword = args.keyword.trim().toLowerCase();
    if (keyword.length < 2) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    return users
      .filter((user) => {
        const name = user.name?.trim().toLowerCase() ?? "";
        const email = user.email?.trim().toLowerCase() ?? "";
        return name.includes(keyword) || email.includes(keyword);
      })
      .slice(0, 8)
      .map((user) => {
        const name = user.name?.trim() || "Unknown";
        const emailPrefix = user.email?.split("@")[0] ?? "UNKNOWN";

        return {
          userId: user._id,
          displayName: `${name.toUpperCase()}-[${emailPrefix.toUpperCase()}]`,
          plainName: name,
        };
      });
  },
});

export const getModerationDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserOrThrow(ctx);
    await requireAdmin(ctx, userId);

    const unresolvedReports = await ctx.db
      .query("userReports")
      .withIndex("by_status_and_created_at", (q) => q.eq("status", "unresolved"))
      .order("desc")
      .take(50);

    const resolvedReports = await ctx.db
      .query("userReports")
      .withIndex("by_status_and_created_at", (q) => q.eq("status", "resolved"))
      .order("desc")
      .take(50);

    const incidents = [...unresolvedReports, ...resolvedReports].sort((a, b) => b.createdAt - a.createdAt);

    const incidentsWithRideContext = await Promise.all(
      incidents.map(async (report) => {
        const ridePost = report.ridePostId ? await ctx.db.get(report.ridePostId) : null;

        return {
          ...report,
          categoryLabel: CATEGORY_LABELS[report.category as ReportCategory],
          rideContext: ridePost
            ? {
                startPoint: ridePost.startPoint,
                endPoint: ridePost.endPoint,
                vehicleType: ridePost.vehicleType,
                riderName: ridePost.riderName,
              }
            : null,
        };
      }),
    );

    const removedUsers = await ctx.db.query("removedUsers").collect();
    const removedUserSet = new Set(removedUsers.map((item) => item.userId));

    const users = await ctx.db.query("users").collect();
    const activeUsersCount = users.filter((user) => !removedUserSet.has(user._id)).length;

    return {
      openReportsCount: unresolvedReports.length,
      activeUsersCount,
      incidents: incidentsWithRideContext,
    };
  },
});

export const setIncidentStatus = mutation({
  args: {
    reportId: v.id("userReports"),
    status: v.union(v.literal("unresolved"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getCurrentUserOrThrow(ctx);
    await requireAdmin(ctx, currentUserId);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new Error("Report not found.");
    }

    if (report.status === args.status) {
      return;
    }

    await ctx.db.patch(args.reportId, {
      status: args.status,
      resolvedAt: args.status === "resolved" ? Date.now() : undefined,
      resolvedByUserId: args.status === "resolved" ? currentUserId : undefined,
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
    await requireAdmin(ctx, removedByUserId);

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
