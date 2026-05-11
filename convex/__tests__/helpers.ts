"use node"

import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import schema from "../schema";

// Modules map: keys drive path resolution; values are lazy imports.
// The key containing "_generated" tells convex-test where the root is.
export const modules = {
  "../_generated/server.js": () => import("../_generated/server"),
  "../rides.ts": () => import("../rides"),
  "../onboarding.ts": () => import("../onboarding"),
};

export function makeT() {
  return convexTest(schema, modules);
}

// Insert a bare user row and return a { userId, asUser } pair.
// `getAuthUserId` splits identity.subject on "|" to get the userId,
// so we encode the real doc ID as the first segment.
export async function createTestUser(
  t: TestConvex<typeof schema>,
  opts?: { email?: string; name?: string },
) {
  const email = opts?.email ?? "student@amrita.edu";
  const name = opts?.name ?? "Test Student";
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email, name });
  });
  const asUser = t.withIdentity({ subject: `${userId}|session` });
  return { userId, asUser };
}

// Create a ride post using the provided authenticated accessor and return its ID.
export async function createRidePost(
  asUser: ReturnType<TestConvex<typeof schema>["withIdentity"]>,
  opts?: {
    startPoint?: string;
    endPoint?: string;
    vehicleType?: "auto" | "cab" | "ownBike" | "ownCar";
    totalPrice?: number;
  },
) {
  const { api } = await import("../_generated/api");
  return await asUser.mutation(api.rides.createRidePost, {
    startPoint: opts?.startPoint ?? "Campus",
    endPoint: opts?.endPoint ?? "City",
    vehicleType: opts?.vehicleType ?? "auto",
    totalPrice: opts?.totalPrice ?? 100,
    rideStartAt: Date.now() + 3_600_000,
  });
}
