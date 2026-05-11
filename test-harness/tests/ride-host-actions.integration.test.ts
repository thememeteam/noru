import { api } from "../src/api";

import { asUser, createConvexTest } from "../src/convexTestEnv";
import { seedBaseData } from "../src/seed";

describe("Ride host actions", () => {
  it("accepts a pending joinee and updates split price", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.acceptJoineeForRide, {
      ridePostId: seed.rides.acceptRideId,
      joineeUserId: seed.users.joineeAcceptedId,
    });

    const hosted = await host.query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.acceptRideId,
    });

    const accepted = hosted?.acceptedJoinees ?? [];
    expect(accepted.length).toBe(1);
    expect(accepted[0].status).toBe("accepted");
    expect(accepted[0].acceptedAt).toBeDefined();
    expect(hosted?.ridePost.pricePerPerson).toBe(100);
  });

  it("blocks accept when called by non-host", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const nonHost = asUser(t, seed.users.joineeAcceptedId);
    await expect(
      nonHost.mutation(api.rides.acceptJoineeForRide, {
        ridePostId: seed.rides.acceptRideId,
        joineeUserId: seed.users.joineeAcceptedId,
      }),
    ).rejects.toThrow("Only the host can accept a participant.");
  });

  it("removes a pending joinee and sends a notification", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.removeJoineeFromRide, {
      ridePostId: seed.rides.openRideId,
      joineeUserId: seed.users.joineePendingId,
    });

    const hosted = await host.query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.openRideId,
    });

    expect(hosted?.joinees.length).toBe(0);
    expect(hosted?.ridePost.joinedCount).toBe(0);
    expect(hosted?.ridePost.isFull).toBe(false);

    const joinee = asUser(t, seed.users.joineePendingId);
    const notifications = await joinee.query(api.rides.getMyUnreadNotifications, {});
    expect(notifications.length).toBe(1);
    expect(notifications[0].type).toBe("rideRemoved");
    expect(notifications[0].ridePostId).toBe(seed.rides.openRideId);
  });

  it("removes an accepted joinee and recalculates price", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.removeJoineeFromRide, {
      ridePostId: seed.rides.removeRideId,
      joineeUserId: seed.users.joineeAcceptedId,
    });

    const hosted = await host.query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.removeRideId,
    });

    expect(hosted?.joinees.length).toBe(0);
    expect(hosted?.ridePost.joinedCount).toBe(0);
    expect(hosted?.ridePost.pricePerPerson).toBe(240);
  });

  it("blocks removals by non-host", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const nonHost = asUser(t, seed.users.joineePendingId);
    await expect(
      nonHost.mutation(api.rides.removeJoineeFromRide, {
        ridePostId: seed.rides.openRideId,
        joineeUserId: seed.users.joineePendingId,
      }),
    ).rejects.toThrow("Only the host can remove a participant.");
  });

  it("marks notifications as read for the recipient only", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.removeJoineeFromRide, {
      ridePostId: seed.rides.openRideId,
      joineeUserId: seed.users.joineePendingId,
    });

    const joinee = asUser(t, seed.users.joineePendingId);
    const notifications = await joinee.query(api.rides.getMyUnreadNotifications, {});
    const notificationId = notifications[0]._id;

    await expect(
      host.mutation(api.rides.markNotificationRead, {
        notificationId,
      }),
    ).rejects.toThrow("You cannot modify this notification.");

    await joinee.mutation(api.rides.markNotificationRead, { notificationId });
    const after = await joinee.query(api.rides.getMyUnreadNotifications, {});
    expect(after.length).toBe(0);
  });

  it("stops rides when canceled by the host", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.stopRidePost, { ridePostId: seed.rides.openRideId });

    const hosted = await host.query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.openRideId,
    });

    expect(hosted?.ridePost.isStopped).toBe(true);
    expect(hosted?.ridePost.isFull).toBe(true);
  });

  it("stops rides when ended by the host", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.stopRidePost, { ridePostId: seed.rides.acceptRideId });

    const hosted = await host.query(api.rides.getHostedRidePost, {
      ridePostId: seed.rides.acceptRideId,
    });

    expect(hosted?.ridePost.isStopped).toBe(true);
    expect(hosted?.ridePost.isFull).toBe(true);
  });

  it("blocks stop requests for non-hosts", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const nonHost = asUser(t, seed.users.joineePendingId);
    await expect(
      nonHost.mutation(api.rides.stopRidePost, { ridePostId: seed.rides.openRideId }),
    ).rejects.toThrow("You can only stop your own ride.");
  });
});
