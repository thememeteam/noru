import type { TestConvex } from "convex-test";

import type { Id } from "../../convex/_generated/dataModel";
import type { NoruSchema } from "./schema";

type UserSeed = {
  hostId: Id<"users">;
  joineePendingId: Id<"users">;
  joineeAcceptedId: Id<"users">;
  otherHostId: Id<"users">;
  reporterId: Id<"users">;
  reporteeId: Id<"users">;
  duplicateNameAId: Id<"users">;
  duplicateNameBId: Id<"users">;
};

type RideSeed = {
  openRideId: Id<"ridePosts">;
  acceptRideId: Id<"ridePosts">;
  removeRideId: Id<"ridePosts">;
  fullRideId: Id<"ridePosts">;
  stoppedRideId: Id<"ridePosts">;
  otherActiveRideId: Id<"ridePosts">;
  sharedRideId: Id<"ridePosts">;
};

type JoinSeed = {
  openPendingJoinId: Id<"rideJoins">;
  acceptPendingJoinId: Id<"rideJoins">;
  removeAcceptedJoinId: Id<"rideJoins">;
  fullAcceptedJoinId: Id<"rideJoins">;
  otherActiveJoinId: Id<"rideJoins">;
  stoppedAcceptedJoinId: Id<"rideJoins">;
  sharedAcceptedJoinId: Id<"rideJoins">;
};

export type SeedData = {
  users: UserSeed;
  rides: RideSeed;
  joins: JoinSeed;
  now: number;
};

export async function seedBaseData(t: TestConvex<NoruSchema>): Promise<SeedData> {
  return t.run(async (ctx) => {
    const now = Date.now();

    const hostId = await ctx.db.insert("users", {
      name: "Host User",
      email: "host@noru.test",
    });
    const joineePendingId = await ctx.db.insert("users", {
      name: "Pending Joinee",
      email: "pending@noru.test",
    });
    const joineeAcceptedId = await ctx.db.insert("users", {
      name: "Accepted Joinee",
      email: "accepted@noru.test",
    });
    const otherHostId = await ctx.db.insert("users", {
      name: "Other Host",
      email: "other@noru.test",
    });
    const reporterId = await ctx.db.insert("users", {
      name: "Reporter",
      email: "reporter@noru.test",
    });
    const reporteeId = await ctx.db.insert("users", {
      name: "Reportee",
      email: "reportee@noru.test",
    });
    const duplicateNameAId = await ctx.db.insert("users", {
      name: "Sam",
      email: "sam1@noru.test",
    });
    const duplicateNameBId = await ctx.db.insert("users", {
      name: "Sam",
      email: "sam2@noru.test",
    });

    const openRideId = await ctx.db.insert("ridePosts", {
      userId: hostId,
      riderName: "Host User",
      startPoint: "Campus",
      endPoint: "Station",
      vehicleType: "cab",
      totalPrice: 300,
      pricePerPerson: 300,
      rideStartAt: now + 60 * 60 * 1000,
      capacity: 3,
      joinedCount: 1,
      isFull: false,
      isStopped: false,
      createdAt: now,
    });

    const acceptRideId = await ctx.db.insert("ridePosts", {
      userId: hostId,
      riderName: "Host User",
      startPoint: "Library",
      endPoint: "Cafe",
      vehicleType: "cab",
      totalPrice: 200,
      pricePerPerson: 200,
      rideStartAt: now + 2 * 60 * 60 * 1000,
      capacity: 3,
      joinedCount: 1,
      isFull: false,
      isStopped: false,
      createdAt: now - 1000,
    });

    const removeRideId = await ctx.db.insert("ridePosts", {
      userId: hostId,
      riderName: "Host User",
      startPoint: "Mall",
      endPoint: "Dorm",
      vehicleType: "cab",
      totalPrice: 240,
      pricePerPerson: 120,
      rideStartAt: now + 3 * 60 * 60 * 1000,
      capacity: 3,
      joinedCount: 1,
      isFull: false,
      isStopped: false,
      createdAt: now - 2000,
    });

    const fullRideId = await ctx.db.insert("ridePosts", {
      userId: hostId,
      riderName: "Host User",
      startPoint: "Gate",
      endPoint: "Market",
      vehicleType: "ownBike",
      totalPrice: 120,
      pricePerPerson: 60,
      rideStartAt: now + 4 * 60 * 60 * 1000,
      capacity: 1,
      joinedCount: 1,
      isFull: true,
      isStopped: false,
      createdAt: now - 3000,
    });

    const stoppedRideId = await ctx.db.insert("ridePosts", {
      userId: hostId,
      riderName: "Host User",
      startPoint: "City Center",
      endPoint: "Campus",
      vehicleType: "auto",
      totalPrice: 150,
      pricePerPerson: 75,
      rideStartAt: now - 2 * 60 * 60 * 1000,
      capacity: 2,
      joinedCount: 1,
      isFull: true,
      isStopped: true,
      createdAt: now - 3 * 60 * 60 * 1000,
    });

    const otherActiveRideId = await ctx.db.insert("ridePosts", {
      userId: otherHostId,
      riderName: "Other Host",
      startPoint: "Arena",
      endPoint: "Terminal",
      vehicleType: "cab",
      totalPrice: 180,
      pricePerPerson: 90,
      rideStartAt: now + 90 * 60 * 1000,
      capacity: 2,
      joinedCount: 1,
      isFull: false,
      isStopped: false,
      createdAt: now - 5000,
    });

    const sharedRideId = await ctx.db.insert("ridePosts", {
      userId: reporterId,
      riderName: "Reporter",
      startPoint: "Studio",
      endPoint: "Library",
      vehicleType: "cab",
      totalPrice: 220,
      pricePerPerson: 110,
      rideStartAt: now - 30 * 60 * 1000,
      capacity: 3,
      joinedCount: 1,
      isFull: false,
      isStopped: false,
      createdAt: now - 15 * 60 * 1000,
    });

    const openPendingJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: openRideId,
      userId: joineePendingId,
      joineeName: "Pending Joinee",
      status: "pending",
      createdAt: now,
    });

    const acceptPendingJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: acceptRideId,
      userId: joineeAcceptedId,
      joineeName: "Accepted Joinee",
      status: "pending",
      createdAt: now,
    });

    const removeAcceptedJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: removeRideId,
      userId: joineeAcceptedId,
      joineeName: "Accepted Joinee",
      status: "accepted",
      acceptedAt: now - 1000,
      createdAt: now - 2000,
    });

    const fullAcceptedJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: fullRideId,
      userId: joineeAcceptedId,
      joineeName: "Accepted Joinee",
      status: "accepted",
      acceptedAt: now - 3000,
      createdAt: now - 4000,
    });

    const otherActiveJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: otherActiveRideId,
      userId: joineePendingId,
      joineeName: "Pending Joinee",
      status: "accepted",
      acceptedAt: now - 1500,
      createdAt: now - 2000,
    });

    const stoppedAcceptedJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: stoppedRideId,
      userId: joineeAcceptedId,
      joineeName: "Accepted Joinee",
      status: "accepted",
      acceptedAt: now - 5000,
      createdAt: now - 6000,
    });

    const sharedAcceptedJoinId = await ctx.db.insert("rideJoins", {
      ridePostId: sharedRideId,
      userId: reporteeId,
      joineeName: "Reportee",
      status: "accepted",
      acceptedAt: now - 5000,
      createdAt: now - 6000,
    });

    return {
      users: {
        hostId,
        joineePendingId,
        joineeAcceptedId,
        otherHostId,
        reporterId,
        reporteeId,
        duplicateNameAId,
        duplicateNameBId,
      },
      rides: {
        openRideId,
        acceptRideId,
        removeRideId,
        fullRideId,
        stoppedRideId,
        otherActiveRideId,
        sharedRideId,
      },
      joins: {
        openPendingJoinId,
        acceptPendingJoinId,
        removeAcceptedJoinId,
        fullAcceptedJoinId,
        otherActiveJoinId,
        stoppedAcceptedJoinId,
        sharedAcceptedJoinId,
      },
      now,
    };
  });
}
