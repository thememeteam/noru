import { api } from "../src/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

import { asUser, createConvexTest } from "../src/convexTestEnv";
import { seedBaseData } from "../src/seed";

describe("Ratings and reports", () => {
  it("returns feedback targets only after a ride ends", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const participant = asUser(t, seed.users.joineeAcceptedId);
    const targets = await participant.query(api.rides.getRideFeedbackTargets, {
      ridePostId: seed.rides.stoppedRideId,
    });

    expect(targets.ridePostId).toBe(seed.rides.stoppedRideId);
    expect(targets.targets.length).toBe(1);
    expect(targets.targets[0].userId).toBe(seed.users.hostId);
  });

  it("submits feedback for a completed ride and exposes reviews", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.submitRideUserFeedback, {
      ridePostId: seed.rides.stoppedRideId,
      ratings: [
        {
          rateeUserId: seed.users.joineeAcceptedId,
          whatWasGood: "Smooth ride",
        },
      ],
    });

    const ratee = asUser(t, seed.users.joineeAcceptedId);
    const summary = await ratee.query(api.rides.getMyRatingSummary, {});
    expect(summary.totalRatings).toBe(1);

    const reviews = await ratee.query(api.rides.getMyRatingReviews, {});
    expect(reviews.length).toBe(1);
    expect(reviews[0].note).toBe("Smooth ride");
  });

  it("updates existing feedback from the same rater", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await host.mutation(api.rides.submitRideUserFeedback, {
      ridePostId: seed.rides.stoppedRideId,
      ratings: [
        {
          rateeUserId: seed.users.joineeAcceptedId,
          whatWasGood: "Prompt pickup",
        },
      ],
    });

    await host.mutation(api.rides.submitRideUserFeedback, {
      ridePostId: seed.rides.stoppedRideId,
      ratings: [
        {
          rateeUserId: seed.users.joineeAcceptedId,
          whatWasGood: "Updated note",
        },
      ],
    });

    const ratee = asUser(t, seed.users.joineeAcceptedId);
    const reviews = await ratee.query(api.rides.getMyRatingReviews, {});
    expect(reviews.length).toBe(1);
    expect(reviews[0].note).toBe("Updated note");
  });

  it("prevents feedback before the ride ends", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await expect(
      host.mutation(api.rides.submitRideUserFeedback, {
        ridePostId: seed.rides.openRideId,
        ratings: [
          {
            rateeUserId: seed.users.joineePendingId,
            whatWasGood: "Too early",
          },
        ],
      }),
    ).rejects.toThrow("You can submit feedback only after ride ends.");
  });

  it("prevents rating yourself or non-participants", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const host = asUser(t, seed.users.hostId);
    await expect(
      host.mutation(api.rides.submitRideUserFeedback, {
        ridePostId: seed.rides.stoppedRideId,
        ratings: [
          {
            rateeUserId: seed.users.hostId,
            whatWasGood: "Self rating",
          },
        ],
      }),
    ).rejects.toThrow("You cannot rate yourself.");

    await expect(
      host.mutation(api.rides.submitRideUserFeedback, {
        ridePostId: seed.rides.stoppedRideId,
        ratings: [
          {
            rateeUserId: seed.users.duplicateNameAId,
            whatWasGood: "Not in ride",
          },
        ],
      }),
    ).rejects.toThrow("You can only rate users from this ride.");
  });

  it("creates reports only for shared rides", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const reporter = asUser(t, seed.users.reporterId);
    const reportId = await reporter.mutation(api.moderation.createUserReport, {
      reportedUserId: seed.users.reporteeId,
      reportedName: "Reportee",
      reason: "Unsafe driving on campus",
      ridePostId: seed.rides.sharedRideId,
    });

    const reports = await reporter.run(async (ctx): Promise<Doc<"userReports"> | null> => {
      return ctx.db.get(reportId as Id<"userReports">);
    });

    expect(reports?.reportedUserId).toBe(seed.users.reporteeId);
    expect(reports?.status).toBe("unresolved");
    expect(reports?.category).toBe("unsafeBehaviour");
  });

  it("rejects reports with short descriptions or self reporting", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const reporter = asUser(t, seed.users.reporterId);
    await expect(
      reporter.mutation(api.moderation.createUserReport, {
        reportedUserId: seed.users.reporteeId,
        reportedName: "Reportee",
        reason: "Short",
        ridePostId: seed.rides.sharedRideId,
      }),
    ).rejects.toThrow("Please share a bit more detail before submitting.");

    await expect(
      reporter.mutation(api.moderation.createUserReport, {
        reportedUserId: seed.users.reporterId,
        reportedName: "Reporter",
        reason: "This should not be allowed",
        ridePostId: seed.rides.sharedRideId,
      }),
    ).rejects.toThrow("You cannot report yourself.");
  });

  it("rejects reports when no shared ride exists", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const reporter = asUser(t, seed.users.reporterId);
    await expect(
      reporter.mutation(api.moderation.createUserReport, {
        reportedUserId: seed.users.duplicateNameAId,
        reportedName: "Sam",
        reason: "Not in the same ride",
        ridePostId: seed.rides.sharedRideId,
      }),
    ).rejects.toThrow("You can only report someone from a shared ride.");
  });

  it("resolves reported user by name when unique", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const reporter = asUser(t, seed.users.reporterId);
    const reportId = await reporter.mutation(api.moderation.createUserReport, {
      reportedName: "Reportee",
      reason: "Followed unsafe route",
      ridePostId: seed.rides.sharedRideId,
    });

    const report = await reporter.run(async (ctx): Promise<Doc<"userReports"> | null> => {
      return ctx.db.get(reportId as Id<"userReports">);
    });
    expect(report?.reportedUserId).toBe(seed.users.reporteeId);
  });

  it("rejects ambiguous name matches when reporting", async () => {
    const t = await createConvexTest();
    const seed = await seedBaseData(t);

    const reporter = asUser(t, seed.users.reporterId);
    await expect(
      reporter.mutation(api.moderation.createUserReport, {
        reportedName: "Sam",
        reason: "Ambiguous report",
        ridePostId: seed.rides.sharedRideId,
      }),
    ).rejects.toThrow("Multiple users found with that name.");
  });
});
