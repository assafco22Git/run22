import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = dbUrl.replace(/^file:/, "");
const absolutePath = path.isAbsolute(dbPath)
  ? dbPath
  : path.join(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: absolutePath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Hash passwords
  const trainerPassword = await bcrypt.hash("trainer123", 10);
  const traineePassword = await bcrypt.hash("trainee123", 10);

  // Create trainer
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@app.com" },
    update: {},
    create: {
      email: "trainer@app.com",
      passwordHash: trainerPassword,
      name: "Coach Assaf",
      role: "TRAINER",
    },
  });
  console.log("Created trainer:", trainer.email);

  // Create trainee alice
  const alice = await prisma.user.upsert({
    where: { email: "alice@app.com" },
    update: {},
    create: {
      email: "alice@app.com",
      passwordHash: traineePassword,
      name: "Alice Cohen",
      role: "TRAINEE",
    },
  });
  console.log("Created trainee:", alice.email);

  // Create trainee bob
  const bob = await prisma.user.upsert({
    where: { email: "bob@app.com" },
    update: {},
    create: {
      email: "bob@app.com",
      passwordHash: traineePassword,
      name: "Bob Levi",
      role: "TRAINEE",
    },
  });
  console.log("Created trainee:", bob.email);

  // Create TrainerProfile
  const trainerProfile = await prisma.trainerProfile.upsert({
    where: { userId: trainer.id },
    update: {},
    create: {
      userId: trainer.id,
      bio: "Experienced running coach with 10+ years of competitive racing.",
    },
  });
  console.log("Created trainer profile");

  // Create TraineeProfiles
  const aliceProfile = await prisma.traineeProfile.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id,
      gender: "female",
    },
  });
  console.log("Created Alice profile");

  const bobProfile = await prisma.traineeProfile.upsert({
    where: { userId: bob.id },
    update: {},
    create: {
      userId: bob.id,
      gender: "male",
    },
  });
  console.log("Created Bob profile");

  // Link alice and bob to the trainer
  await prisma.trainerTrainee.upsert({
    where: {
      trainerId_traineeId: {
        trainerId: trainerProfile.id,
        traineeId: aliceProfile.id,
      },
    },
    update: {},
    create: {
      trainerId: trainerProfile.id,
      traineeId: aliceProfile.id,
    },
  });
  console.log("Linked Alice to trainer");

  await prisma.trainerTrainee.upsert({
    where: {
      trainerId_traineeId: {
        trainerId: trainerProfile.id,
        traineeId: bobProfile.id,
      },
    },
    update: {},
    create: {
      trainerId: trainerProfile.id,
      traineeId: bobProfile.id,
    },
  });
  console.log("Linked Bob to trainer");

  // Create 3 sample workouts for Alice
  const now = new Date();

  const workout1 = await prisma.workout.create({
    data: {
      title: "Easy Recovery Run",
      description: "Gentle aerobic run to aid recovery. Keep heart rate low.",
      scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      status: "COMPLETED",
      trainerId: trainerProfile.id,
      traineeId: aliceProfile.id,
      segments: {
        create: [
          { order: 1, distance: 2.0, pace: "6:30", remarks: "Warm up" },
          { order: 2, distance: 5.0, pace: "6:00", remarks: "Easy pace" },
          { order: 3, distance: 1.0, pace: "6:30", remarks: "Cool down" },
        ],
      },
    },
  });
  console.log("Created workout 1:", workout1.title);

  const workout2 = await prisma.workout.create({
    data: {
      title: "Tempo Run",
      description:
        "Sustained effort at comfortably hard pace. 4 x 1km at threshold.",
      scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: "COMPLETED",
      trainerId: trainerProfile.id,
      traineeId: aliceProfile.id,
      segments: {
        create: [
          { order: 1, distance: 2.0, pace: "6:00", remarks: "Warm up" },
          { order: 2, distance: 1.0, pace: "4:45", remarks: "Tempo rep 1" },
          { order: 3, distance: 0.5, pace: "6:30", remarks: "Recovery" },
          { order: 4, distance: 1.0, pace: "4:45", remarks: "Tempo rep 2" },
          { order: 5, distance: 0.5, pace: "6:30", remarks: "Recovery" },
          { order: 6, distance: 1.0, pace: "4:45", remarks: "Tempo rep 3" },
          { order: 7, distance: 0.5, pace: "6:30", remarks: "Recovery" },
          { order: 8, distance: 1.0, pace: "4:45", remarks: "Tempo rep 4" },
          { order: 9, distance: 2.0, pace: "6:00", remarks: "Cool down" },
        ],
      },
    },
  });
  console.log("Created workout 2:", workout2.title);

  const workout3 = await prisma.workout.create({
    data: {
      title: "Long Run",
      description: "Weekend long run at easy conversational pace.",
      scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      status: "PENDING",
      trainerId: trainerProfile.id,
      traineeId: aliceProfile.id,
      segments: {
        create: [
          { order: 1, distance: 2.0, pace: "6:20", remarks: "Warm up" },
          {
            order: 2,
            distance: 14.0,
            pace: "5:55",
            remarks: "Long run main set",
          },
          { order: 3, distance: 2.0, pace: "6:20", remarks: "Cool down" },
        ],
      },
    },
  });
  console.log("Created workout 3:", workout3.title);

  console.log("\nSeeding complete!");
  console.log("Trainer:  trainer@app.com / trainer123");
  console.log("Trainee:  alice@app.com   / trainee123");
  console.log("Trainee:  bob@app.com     / trainee123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
