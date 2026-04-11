import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?strava=denied", baseUrl));
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/settings?strava=error", baseUrl));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://www.strava.com/api/v3/oauth/token", {
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
      console.error("[strava/callback] Token exchange failed:", tokenRes.status, await tokenRes.text());
      return NextResponse.redirect(new URL("/settings?strava=error", baseUrl));
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number; // unix seconds
      athlete: { id: number };
    };

    // Persist Strava credentials to the user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stravaId: String(data.athlete.id),
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiry: new Date(data.expires_at * 1000),
      },
    });

    return NextResponse.redirect(new URL("/settings?strava=connected", baseUrl));
  } catch (err) {
    console.error("[strava/callback] Error:", err);
    return NextResponse.redirect(new URL("/settings?strava=error", baseUrl));
  }
}
