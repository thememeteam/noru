import { api } from "../src/api";

import { asUser, createConvexTest } from "../src/convexTestEnv";
import { seedBaseData } from "../src/seed";

describe("Ride join rules", () => {
  it("blocks joining full rides", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const viewer = asUser(t, seed.users.reporterId);
    await expect(
      viewer.mutation(api.rides.joinRidePost, { ridePostId: seed.rides.fullRideId }),
    ).rejects.toThrow("This ride is already full.");
  });

  it("blocks joining stopped rides", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const viewer = asUser(t, seed.users.reporterId);
    await expect(
      viewer.mutation(api.rides.joinRidePost, { ridePostId: seed.rides.stoppedRideId }),
    ).rejects.toThrow("This ride has been stopped.");
  });

  it("blocks joining when already in another active ride", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const { multiRideUserId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Multi Ride",
        email: "multi@noru.test",
      });

      const ride = await ctx.db.get(seed.rides.otherActiveRideId);
      if (!ride) {
        throw new Error("Seed ride missing");
      }

      await ctx.db.insert("rideJoins", {
        ridePostId: seed.rides.otherActiveRideId,
        userId,
        joineeName: "Multi Ride",
        status: "accepted",
        acceptedAt: Date.now(),
        createdAt: Date.now(),
      });

      await ctx.db.patch(seed.rides.otherActiveRideId, {
        joinedCount: ride.joinedCount + 1,
        isFull: ride.joinedCount + 1 >= ride.capacity,
      });

      return { multiRideUserId: userId };
    });

    const viewer = asUser(t, multiRideUserId);
    await expect(
      viewer.mutation(api.rides.joinRidePost, { ridePostId: seed.rides.openRideId }),
    ).rejects.toThrow("You are already in another ride. Leave it first.");
  });

  it("blocks duplicate join requests for the same ride", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const { duplicateJoinUserId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Duplicate Join",
        email: "dupe@noru.test",
      });

      await ctx.db.insert("rideJoins", {
        ridePostId: seed.rides.openRideId,
        userId,
        joineeName: "Duplicate Join",
        status: "pending",
        createdAt: Date.now(),
      });

      const ride = await ctx.db.get(seed.rides.openRideId);
      if (!ride) {
        throw new Error("Seed ride missing");
      }

      await ctx.db.patch(seed.rides.openRideId, {
        joinedCount: ride.joinedCount + 1,
        isFull: ride.joinedCount + 1 >= ride.capacity,
      });

      return { duplicateJoinUserId: userId };
    });

    const viewer = asUser(t, duplicateJoinUserId);
    await expect(
      viewer.mutation(api.rides.joinRidePost, { ridePostId: seed.rides.openRideId }),
    ).rejects.toThrow("You already joined this ride.");
  });

  it("allows joining after leaving another ride", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const { transientUserId } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Transient User",
        email: "transient@noru.test",
      });

      const ride = await ctx.db.get(seed.rides.otherActiveRideId);
      if (!ride) {
        throw new Error("Seed ride missing");
      }

      await ctx.db.insert("rideJoins", {
        ridePostId: seed.rides.otherActiveRideId,
        userId,
        joineeName: "Transient User",
        status: "accepted",
        acceptedAt: Date.now(),
        createdAt: Date.now(),
      });

      await ctx.db.patch(seed.rides.otherActiveRideId, {
        joinedCount: ride.joinedCount + 1,
        isFull: ride.joinedCount + 1 >= ride.capacity,
      });

      return { transientUserId: userId };
    });

    const transientUser = asUser(t, transientUserId);
    await transientUser.mutation(api.rides.leaveRidePost, {
      ridePostId: seed.rides.otherActiveRideId,
    });

    await transientUser.mutation(api.rides.joinRidePost, {
      ridePostId: seed.rides.openRideId,
    });

    const hosted = await asUser(t, seed.users.hostId).query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.openRideId,
    });

    const joiners = (hosted?.joinees ?? []).map((joinee: { userId: string }) => joinee.userId);
    expect(joiners).toContain(transientUserId);
  });

  it("reflects real-time availability when a ride becomes full", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    const rideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "Gym",
      endPoint: "Lab",
      vehicleType: "ownBike",
      totalPrice: 90,
      rideStartAt: Date.now() + 5 * 60 * 1000,
    });

    const joinerA = asUser(t, seed.users.reporterId);
    const joinerB = asUser(t, seed.users.reporteeId);

    await joinerA.mutation(api.rides.joinRidePost, { ridePostId: rideId });

    await expect(
      joinerB.mutation(api.rides.joinRidePost, { ridePostId: rideId }),
    ).rejects.toThrow("This ride is already full.");

    const list = await joinerB.query(api.rides.listJoinableRidePosts, {});
    const ids = new Set(list.map((post: { _id: string }) => post._id));
    expect(ids.has(rideId)).toBe(false);
  });

  it("hides stopped and full rides from joinable list", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const viewer = asUser(t, seed.users.reporterId);
    const list = await viewer.query(api.rides.listJoinableRidePosts, {});

    const ids = new Set(list.map((post: { _id: string }) => post._id));
    expect(ids.has(seed.rides.fullRideId)).toBe(false);
    expect(ids.has(seed.rides.stoppedRideId)).toBe(false);
  });
});
