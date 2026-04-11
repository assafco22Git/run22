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

// Helper: find or create without upsert (no transactions needed)
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

  const trainerPassword = await bcrypt.hash("trainer123", 10);
  const traineePassword = await bcrypt.hash("trainee123", 10);

  // ── Users ──────────────────────────────────────────────────────────────────

  const trainer = await findOrCreate(
    () => prisma.user.findUnique({ where: { email: "trainer@app.com" } }),
    () => prisma.user.create({
      data: { email: "trainer@app.com", passwordHash: trainerPassword, name: "Coach Assaf", role: "TRAINER" },
    })
  );
  console.log("Trainer:", trainer.email);

  const alice = await findOrCreate(
    () => prisma.user.findUnique({ where: { email: "alice@app.com" } }),
    () => prisma.user.create({
      data: { email: "alice@app.com", passwordHash: traineePassword, name: "Alice Cohen", role: "TRAINEE" },
    })
  );
  console.log("Trainee:", alice.email);

  const bob = await findOrCreate(
    () => prisma.user.findUnique({ where: { email: "bob@app.com" } }),
    () => prisma.user.create({
      data: { email: "bob@app.com", passwordHash: traineePassword, name: "Bob Levi", role: "TRAINEE" },
    })
  );
  console.log("Trainee:", bob.email);

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

    // Workout 1 — past, completed
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
    console.log("Created workout 1:", w1.title);

    // Workout 2 — past, completed
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
    console.log("Created workout 2:", w2.title);

    // Workout 3 — upcoming
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
    console.log("Created workout 3:", w3.title);
  } else {
    console.log("Workouts already exist, skipping");
  }

  console.log("\nSeeding complete!");
  console.log("Trainer:  trainer@app.com / trainer123");
  console.log("Trainee:  alice@app.com   / trainee123");
  console.log("Trainee:  bob@app.com     / trainee123");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
