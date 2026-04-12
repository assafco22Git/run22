import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      stravaId: null,
      stravaAccessToken: null,
      stravaRefreshToken: null,
      stravaTokenExpiry: null,
    },
  });

  return NextResponse.redirect(new URL("/settings?success=strava_disconnected", base));
}
