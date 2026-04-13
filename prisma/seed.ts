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

async function findOrCreate<T>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>
): Promise<T> {
  const existing = await findFn();
  if (existing) return existing;
  return createFn();
}

async function main() {
  console.log("Seeding database...");

  const trainerPassword = await bcrypt.hash("Coach123", 10);
  const traineePassword = await bcrypt.hash("trainee123", 10);

  // ── Trainer — always ensure credentials are up to date ────────────────────

  const existingTrainer = await prisma.user.findFirst({ where: { role: "TRAINER" } });
  const trainer = existingTrainer
    ? await prisma.user.update({
        where: { id: existingTrainer.id },
        data: { username: "coach", passwordHash: trainerPassword },
      })
    : await prisma.user.create({
        data: { name: "Coach", passwordHash: trainerPassword, role: "TRAINER", username: "coach" },
      });
  console.log("Trainer username set to: coach");

  const alice = await findOrCreate(
    () => prisma.user.findUnique({ where: { username: "alice_cohen" } }),
    () => prisma.user.create({
      data: { passwordHash: traineePassword, name: "Alice Cohen", role: "TRAINEE", username: "alice_cohen" },
    })
  );
  console.log("Trainee:", alice.username);

  const bob = await findOrCreate(
    () => prisma.user.findUnique({ where: { username: "bob_levi" } }),
    () => prisma.user.create({
      data: { passwordHash: traineePassword, name: "Bob Levi", role: "TRAINEE", username: "bob_levi" },
    })
  );
  console.log("Trainee:", bob.username);

  // ── Profiles ───────────────────────────────────────────────────────────────

  const trainerProfile = await findOrCreate(
    () => prisma.trainerProfile.findUnique({ where: { userId: trainer.id } }),
    () => prisma.trainerProfile.create({
      data: { userId: trainer.id, bio: "Experienced running coach with 10+ years of competitive racing." },
    })
  );

  const aliceProfile = await findOrCreate(
    () => prisma.traineeProfile.findUnique({ where: { userId: alice.id } }),
    () => prisma.traineeProfile.create({ data: { userId: alice.id, gender: "female" } })
  );

  const bobProfile = await findOrCreate(
    () => prisma.traineeProfile.findUnique({ where: { userId: bob.id } }),
    () => prisma.traineeProfile.create({ data: { userId: bob.id, gender: "male" } })
  );

  console.log("Profiles created");

  // ── Links ──────────────────────────────────────────────────────────────────

  await findOrCreate(
    () => prisma.trainerTrainee.findFirst({ where: { trainerId: trainerProfile.id, traineeId: aliceProfile.id } }),
    () => prisma.trainerTrainee.create({ data: { trainerId: trainerProfile.id, traineeId: aliceProfile.id } })
  );

  await findOrCreate(
    () => prisma.trainerTrainee.findFirst({ where: { trainerId: trainerProfile.id, traineeId: bobProfile.id } }),
    () => prisma.trainerTrainee.create({ data: { trainerId: trainerProfile.id, traineeId: bobProfile.id } })
  );

  console.log("Trainer-trainee links created");

  // ── Workouts (only if none exist for alice) ────────────────────────────────

  const existingWorkouts = await prisma.workout.count({ where: { traineeId: aliceProfile.id } });
  if (existingWorkouts === 0) {
    const now = new Date();

    const w1 = await prisma.workout.create({
      data: {
        title: "Easy Recovery Run",
        description: "Gentle aerobic run to aid recovery. Keep heart rate low.",
        scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
        trainerId: trainerProfile.id,
        traineeId: aliceProfile.id,
      },
    });
    for (const seg of [
      { order: 1, distance: 2.0, pace: "6:30", remarks: "Warm up" },
      { order: 2, distance: 5.0, pace: "6:00", remarks: "Easy pace" },
      { order: 3, distance: 1.0, pace: "6:30", remarks: "Cool down" },
    ]) { await prisma.workoutSegment.create({ data: { workoutId: w1.id, ...seg } }); }

    const w2 = await prisma.workout.create({
      data: {
        title: "Tempo Run",
        description: "Sustained effort at comfortably hard pace.",
        scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        status: "COMPLETED",
        trainerId: trainerProfile.id,
        traineeId: aliceProfile.id,
      },
    });
    for (const seg of [
      { order: 1, distance: 2.0, pace: "6:00", remarks: "Warm up" },
      { order: 2, distance: 1.0, pace: "4:45", remarks: "Tempo rep 1" },
      { order: 3, distance: 0.5, pace: "6:30", remarks: "Recovery" },
      { order: 4, distance: 1.0, pace: "4:45", remarks: "Tempo rep 2" },
      { order: 5, distance: 2.0, pace: "6:00", remarks: "Cool down" },
    ]) { await prisma.workoutSegment.create({ data: { workoutId: w2.id, ...seg } }); }

    const w3 = await prisma.workout.create({
      data: {
        title: "Long Run",
        description: "Weekend long run at easy conversational pace.",
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: "PENDING",
        trainerId: trainerProfile.id,
        traineeId: aliceProfile.id,
      },
    });
    for (const seg of [
      { order: 1, distance: 2.0, pace: "6:20", remarks: "Warm up" },
      { order: 2, distance: 14.0, pace: "5:55", remarks: "Long run main set" },
      { order: 3, distance: 2.0, pace: "6:20", remarks: "Cool down" },
    ]) { await prisma.workoutSegment.create({ data: { workoutId: w3.id, ...seg } }); }

    console.log("Workouts created");
  } else {
    console.log("Workouts already exist, skipping");
  }

  console.log("\nSeeding complete!");
  console.log("Trainer:  username=coach_assaf / trainer123");
  console.log("Trainee:  username=alice_cohen / trainee123");
  console.log("Trainee:  username=bob_levi    / trainee123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
