import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { syncStravaActivities } from "@/lib/strava";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncStravaActivities(session.user.id, 50);
  return NextResponse.json(result);
}
