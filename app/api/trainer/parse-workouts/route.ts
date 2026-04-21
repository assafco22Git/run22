import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";
import type { Role } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ParsedWorkout {
  title: string;
  scheduledAt: string;       // ISO date string "YYYY-MM-DD"
  description?: string;
  segments?: ParsedSegment[];
}

export interface ParsedSegment {
  order: number;
  distance?: number;         // km
  pace?: string;             // "MM:SS"
  remarks?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user.role as Role) !== "TRAINER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "AI parsing not configured (missing ANTHROPIC_API_KEY)" }, { status: 500 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  // Read file bytes → parse with xlsx
  const bytes = await file.arrayBuffer();
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return NextResponse.json({ error: "Empty spreadsheet" }, { status: 400 });

  // Convert sheet to CSV text for Claude — simple and reliable
  const csv = XLSX.utils.sheet_to_csv(sheet);

  if (!csv.trim()) return NextResponse.json({ error: "Spreadsheet is empty" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  // Ask Claude to parse and normalize the data
  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a running coach assistant. Parse the following spreadsheet data into a JSON array of workout objects.

Today's date is ${today}. If dates in the file are relative (e.g., "Week 1 Day 1") or ambiguous, start from today and space workouts ~2 days apart.

Each workout object must have:
- "title": string (workout name/type)
- "scheduledAt": string (ISO date "YYYY-MM-DD")
- "description": string (optional, overall notes or description)
- "segments": array (optional) of:
  - "order": number (1-based)
  - "distance": number in KM (optional)
  - "pace": string "MM:SS" format (optional, target pace per km)
  - "remarks": string (optional, segment notes)

Rules:
- Infer missing fields intelligently from context
- If there are no segment details, leave segments as an empty array
- Dates must be YYYY-MM-DD format
- Distances must be in KM (convert if in meters or miles)
- Pace must be MM:SS format (convert if needed)
- Return ONLY valid JSON — no markdown, no explanation, just the array

Spreadsheet data:
${csv}`,
      },
    ],
  });

  const rawText = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";

  // Strip markdown code fences if Claude wrapped the response
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  let workouts: ParsedWorkout[];
  try {
    workouts = JSON.parse(cleaned);
    if (!Array.isArray(workouts)) throw new Error("Not an array");
  } catch {
    return NextResponse.json(
      { error: "AI could not parse the file into workouts. Try a more structured format.", raw: cleaned },
      { status: 422 }
    );
  }

  return NextResponse.json({ workouts });
}
