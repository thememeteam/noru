import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const getOnboardingState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        isAuthenticated: false,
        isCompleted: false,
        universityEmail: null,
        profilePhotoUrl: null,
      };
    }

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const profilePhotoUrl = profile
      ? await ctx.storage.getUrl(profile.profilePhotoStorageId)
      : null;

    return {
      isAuthenticated: true,
      isCompleted: profile !== null,
      universityEmail: user?.email ?? null,
      displayName: user?.name ?? null,
      profilePhotoUrl,
    };
  },
});

export const generateProfilePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const completeStudentOnboarding = mutation({
  args: {
    profilePhotoStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const user = await ctx.db.get(userId);
    if (!user?.email) {
      throw new Error("No email found for this account.");
    }

    const existing = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        profilePhotoStorageId: args.profilePhotoStorageId,
        completedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("studentProfiles", {
      userId,
      universityEmail: user.email.toLowerCase(),
      profilePhotoStorageId: args.profilePhotoStorageId,
      completedAt: Date.now(),
    });
  },
});
