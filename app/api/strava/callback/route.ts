import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", base));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=strava_denied", base));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?error=strava_not_configured", base));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/settings?error=strava_token_failed", base));
  }

  const token = await tokenRes.json();

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      stravaId: String(token.athlete?.id ?? ""),
      stravaAccessToken: token.access_token,
      stravaRefreshToken: token.refresh_token,
      stravaTokenExpiry: new Date(token.expires_at * 1000),
    },
  });

  return NextResponse.redirect(new URL("/settings?success=strava_connected", base));
}
