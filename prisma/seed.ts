import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaNeonHttp(connectionString, {
  arrayMode: false,
  fullResults: false,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const trainerPassword = await bcrypt.hash("Coach123", 10);

  // ── Trainer — keep credentials up to date ─────────────────────────────────

  const existingTrainer = await prisma.user.findFirst({ where: { role: "TRAINER" } });
  if (existingTrainer) {
    await prisma.user.update({
      where: { id: existingTrainer.id },
      data: { username: "coach", passwordHash: trainerPassword },
    });
  } else {
    await prisma.user.create({
      data: { name: "Coach", passwordHash: trainerPassword, role: "TRAINER", username: "coach" },
    });
  }
  console.log("Trainer credentials set: username=coach / Coach123");

  // ── Remove demo users created by old seed ─────────────────────────────────

  for (const username of ["alice_cohen", "bob_levi"]) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { traineeProfile: true },
    });
    if (!user) continue;

    const traineeProfile = user.traineeProfile;
    if (traineeProfile) {
      // Delete workouts and their children first
      const workouts = await prisma.workout.findMany({
        where: { traineeId: traineeProfile.id },
        select: { id: true },
      });
      for (const w of workouts) {
        await prisma.workoutSegmentResult.deleteMany({ where: { result: { workoutId: w.id } } });
        await prisma.workoutResult.deleteMany({ where: { workoutId: w.id } });
        await prisma.workoutSegment.deleteMany({ where: { workoutId: w.id } });
        await prisma.workout.delete({ where: { id: w.id } });
      }
      // Delete trainer links and preferences
      await prisma.trainerTrainee.deleteMany({ where: { traineeId: traineeProfile.id } });
      await prisma.traineePreference.deleteMany({ where: { traineeId: traineeProfile.id } });
      await prisma.traineeProfile.delete({ where: { id: traineeProfile.id } });
    }

    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted demo user: ${username}`);
  }

  // ── Migrate old meter-stored distances to km ──────────────────────────────
  // Before the unit-consolidation commit, totalDistance and segment distances
  // were stored in meters. Any value > 200 is almost certainly meters
  // (no real run logged here exceeds 200 km). Divide by 1000 once to fix.

  const meterResults = await prisma.workoutResult.findMany({
    where: { totalDistance: { gt: 200 } },
    select: { id: true, totalDistance: true },
  });
  for (const r of meterResults) {
    await prisma.workoutResult.update({
      where: { id: r.id },
      data: { totalDistance: r.totalDistance! / 1000 },
    });
  }
  if (meterResults.length > 0)
    console.log(`Migrated ${meterResults.length} workout result(s) from meters → km`);

  const meterSegResults = await prisma.workoutSegmentResult.findMany({
    where: { distance: { gt: 200 } },
    select: { id: true, distance: true },
  });
  for (const s of meterSegResults) {
    await prisma.workoutSegmentResult.update({
      where: { id: s.id },
      data: { distance: s.distance! / 1000 },
    });
  }
  if (meterSegResults.length > 0)
    console.log(`Migrated ${meterSegResults.length} segment result(s) from meters → km`);

  console.log("\nSeed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
