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
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      // Cascade: workouts, results, notifications, etc. handled by DB onDelete
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Deleted demo user: ${username}`);
    }
  }

  console.log("\nSeed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
