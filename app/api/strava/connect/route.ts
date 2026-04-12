import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    );
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/settings?error=strava_not_configured", process.env.NEXTAUTH_URL ?? "http://localhost:3000")
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/strava/callback`;

  const url =
    `https://www.strava.com/oauth/authorize` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&approval_prompt=auto` +
    `&scope=activity:read_all`;

  return NextResponse.redirect(url);
}
