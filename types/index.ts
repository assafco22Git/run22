export type Role = "TRAINER" | "TRAINEE";
export type WorkoutStatus = "PENDING" | "COMPLETED" | "SKIPPED";

// Extend NextAuth types to include role and id on the session user
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: Role;
  }
}
