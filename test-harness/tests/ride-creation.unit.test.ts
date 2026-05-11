import { api } from "../src/api";

import { asUser, createConvexTest } from "../src/convexTestEnv";
import { seedBaseData } from "../src/seed";

describe("Ride creation", () => {
  it("creates rides with valid pickup, destination, and vehicle type", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    const rideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "North Gate",
      endPoint: "Library",
      vehicleType: "auto",
      totalPrice: 120,
      rideStartAt: Date.now() + 10 * 60 * 1000,
    });

    const ride = await host.query(api.rides.getHostedRidePost, { ridePostId: rideId });
    expect(ride?.ridePost.startPoint).toBe("North Gate");
    expect(ride?.ridePost.endPoint).toBe("Library");
    expect(ride?.ridePost.vehicleType).toBe("auto");
  });

  it("rejects missing pickup or destination", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await expect(
      host.mutation(api.rides.createRidePost, {
        startPoint: " ",
        endPoint: "Library",
        vehicleType: "auto",
        totalPrice: 120,
        rideStartAt: Date.now() + 10 * 60 * 1000,
      }),
    ).rejects.toThrow("Start and end point are required.");

    await expect(
      host.mutation(api.rides.createRidePost, {
        startPoint: "North Gate",
        endPoint: " ",
        vehicleType: "auto",
        totalPrice: 120,
        rideStartAt: Date.now() + 10 * 60 * 1000,
      }),
    ).rejects.toThrow("Start and end point are required.");
  });

  it("stores capacity based on vehicle type", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);
    const host = asUser(t, seed.users.hostId);

    const cabRideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "Plaza",
      endPoint: "Hostel",
      vehicleType: "cab",
      totalPrice: 210,
      rideStartAt: Date.now() + 20 * 60 * 1000,
    });

    const bikeRideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "Arena",
      endPoint: "Cafe",
      vehicleType: "ownBike",
      totalPrice: 80,
      rideStartAt: Date.now() + 25 * 60 * 1000,
    });

    const cabRide = await host.query(api.rides.getHostedRidePost, { ridePostId: cabRideId });
    const bikeRide = await host.query(api.rides.getHostedRidePost, { ridePostId: bikeRideId });

    expect(cabRide?.ridePost.capacity).toBe(3);
    expect(bikeRide?.ridePost.capacity).toBe(1);
  });

  it("rejects invalid vehicle type inputs", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);
    const host = asUser(t, seed.users.hostId);

    await expect(
      host.mutation(api.rides.createRidePost, {
        startPoint: "Lot",
        endPoint: "Gate",
        vehicleType: "invalid" as never,
        totalPrice: 100,
        rideStartAt: Date.now() + 30 * 60 * 1000,
      }),
    ).rejects.toThrow();
  });

  it("shows newly created rides in joinable list for other users", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    const rideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "Admin Block",
      endPoint: "Station",
      vehicleType: "cab",
      totalPrice: 150,
      rideStartAt: Date.now() + 30 * 60 * 1000,
    });

    const viewer = asUser(t, seed.users.reporterId);
    const list = await viewer.query(api.rides.listJoinableRidePosts, {});
    const ids = new Set(list.map((post) => post._id));
    expect(ids.has(rideId)).toBe(true);
  });

  it("shows pending join requests in hosted ride details", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    const rideId = await host.mutation(api.rides.createRidePost, {
      startPoint: "Hall",
      endPoint: "Library",
      vehicleType: "auto",
      totalPrice: 120,
      rideStartAt: Date.now() + 45 * 60 * 1000,
    });

    const joiner = asUser(t, seed.users.reporterId);
    await joiner.mutation(api.rides.joinRidePost, { ridePostId: rideId });

    const hosted = await host.query(api.rides.getHostedRidePost, { ridePostId: rideId });
    const pending = hosted?.pendingJoinees ?? [];
    expect(pending.length).toBe(1);
    expect(pending[0].joineeEmail).toBe("reporter@noru.test");
  });
});
