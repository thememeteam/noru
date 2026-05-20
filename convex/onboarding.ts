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
        isBanned: false,
        homeAddress: null,
        homePlaceId: null,
      };
    }

    const user = await ctx.db.get(userId);
    const normalizedEmail = user?.email?.trim().toLowerCase() ?? "";
    const banByUser = await ctx.db
      .query("bannedUsers")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    const banByEmail = normalizedEmail
      ? await ctx.db.query("bannedUsers").withIndex("by_email", (q) => q.eq("email", normalizedEmail)).first()
      : null;
    const isBanned = Boolean(banByUser || banByEmail);
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const profilePhotoUrl = profile
      ? await ctx.storage.getUrl(profile.profilePhotoStorageId)
      : null;

    return {
      isAuthenticated: !isBanned,
      isCompleted: profile !== null && !isBanned,
      universityEmail: user?.email ?? null,
      displayName: user?.name ?? null,
      profilePhotoUrl,
      gender: profile?.gender ?? null,
      isBanned,
      homeAddress: profile?.homeAddress ?? null,
      homePlaceId: profile?.homePlaceId ?? null,
      workAddress: profile?.workAddress ?? null,
      workPlaceId: profile?.workPlaceId ?? null,
    };
  },
});

export const updateHomeAddress = mutation({
  args: {
    homeAddress: v.string(),
    homePlaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in.");
    }

    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Complete onboarding before setting a home address.");
    }

    const nextHome = args.homeAddress.trim();
    if (nextHome.length < 3) {
      throw new Error("Enter a valid home address.");
    }

    await ctx.db.patch(profile._id, {
      homeAddress: nextHome,
      homePlaceId: args.homePlaceId?.trim() || undefined,
    });
  },
});

export const updateWorkAddress = mutation({
  args: {
    workAddress: v.string(),
    workPlaceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Complete onboarding before setting a work address.");
    const next = args.workAddress.trim();
    if (next.length < 3) throw new Error("Enter a valid work address.");
    await ctx.db.patch(profile._id, {
      workAddress: next,
      workPlaceId: args.workPlaceId?.trim() || undefined,
    });
  },
});

export const clearHomeAddress = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");
    await ctx.db.patch(profile._id, { homeAddress: undefined, homePlaceId: undefined });
  },
});

export const clearWorkAddress = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in.");
    const profile = await ctx.db
      .query("studentProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found.");
    await ctx.db.patch(profile._id, { workAddress: undefined, workPlaceId: undefined });
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
    gender: v.union(
      v.literal("female"),
      v.literal("male"),
      v.literal("nonBinary"),
      v.literal("preferNotToSay"),
    ),
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
        gender: args.gender,
        completedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("studentProfiles", {
      userId,
      universityEmail: user.email.toLowerCase(),
      profilePhotoStorageId: args.profilePhotoStorageId,
      gender: args.gender,
      completedAt: Date.now(),
    });
  },
});
