import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as XLSX from "xlsx";
import type { Role } from "@/types";

export interface ParsedWorkout {
  title: string;
  scheduledAt: string;       // "YYYY-MM-DD"
  description?: string;
  segments?: ParsedSegment[];
}

export interface ParsedSegment {
  order: number;
  distance?: number;         // km
  pace?: string;             // "MM:SS"
  remarks?: string;
}

// ─── Column indices in "Base Progression" sheet ──────────────────────────────

const COL_WEEK  = 1;
const COL_MON   = 4;
const COL_TUE   = 5;
const COL_WED   = 6;
const COL_THU   = 7;
const COL_FRI   = 8;
const COL_SAT   = 9;
const COL_SUN   = 10;
const COL_NOTES = 11;

// Offset from the week's Sunday
const DAY_OFFSET: Record<number, number> = {
  [COL_MON]: 1,
  [COL_TUE]: 2,
  [COL_WED]: 3,
  [COL_THU]: 4,
  [COL_FRI]: 5,
  [COL_SAT]: 6,
  [COL_SUN]: 0,
};

const RUNNING_COLS = [COL_MON, COL_TUE, COL_WED, COL_THU, COL_FRI, COL_SAT, COL_SUN];

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse "April 19th–25th" or "July 26th–August 1st" → Sunday start Date */
function parseDateRange(text: string, referenceYear: number): Date | null {
  const match = text.match(/([A-Za-z]+)\s+(\d+)/);
  if (!match) return null;
  const month = MONTHS[match[1].toLowerCase()];
  const day   = parseInt(match[2]);
  if (month === undefined || isNaN(day)) return null;

  // Try current year first, then next year if date is in the past
  let date = new Date(referenceYear, month, day);
  if (date < new Date()) date = new Date(referenceYear + 1, month, day);
  return date;
}

/** Format Date → "YYYY-MM-DD" */
function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse distance from text like "≈5 km", "≈15 km" → number */
function parseKm(text: string): number | null {
  const m = text.match(/≈?(\d+\.?\d*)\s*km/);
  return m ? parseFloat(m[1]) : null;
}

/** Parse duration from text → minutes */
function parseMinutes(text: string): number | null {
  const hrMin = text.match(/(\d+)h(\d+)/);
  if (hrMin) return parseInt(hrMin[1]) * 60 + parseInt(hrMin[2]);
  const hrOnly = text.match(/(\d+)h(?!\d)/);
  if (hrOnly) return parseInt(hrOnly[1]) * 60;
  const min = text.match(/(\d+)\s*min/);
  if (min) return parseInt(min[1]);
  return null;
}

/** Derive a clean title from the workout cell text */
function parseTitle(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("long run"))    return "Long Run";
  if (lower.includes("tempo"))       return "Tempo Run";
  if (lower.includes("longer easy")) return "Easy Run";
  if (lower.includes("easy"))        return "Easy Run";
  if (lower.includes("recovery"))    return "Recovery Run";
  if (lower.includes("interval"))    return "Intervals";
  if (lower.includes("race"))        return "Race";
  // Fallback: take text before " — "
  const dash = text.indexOf(" — ");
  return dash > -1 ? text.slice(0, dash).trim() : text.split(/[,.(]/)[0].trim();
}

/** True when the cell should be skipped (rest / strength / empty) */
function isSkipped(text: string): boolean {
  if (!text || typeof text !== "string") return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("strength") ||
    lower.includes("rest") ||
    lower === "" ||
    (!lower.includes("km") && !lower.includes("min") && !lower.includes("h"))
  );
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user.role as Role) !== "TRAINER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const wb     = XLSX.read(bytes, { type: "array", cellDates: true });

  // ── Locate the "Base Progression" sheet ────────────────────────────────────
  const sheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes("base") || n.toLowerCase().includes("progression") || n.toLowerCase().includes("plan")
  ) ?? wb.SheetNames[0];

  const sheet = wb.Sheets[sheetName!];
  if (!sheet) return NextResponse.json({ error: "Spreadsheet is empty" }, { status: 400 });

  const rows: (string | number | Date | null)[][] =
    XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as (string | number | Date | null)[][];

  // ── Find header row (contains "Week") ──────────────────────────────────────
  const headerRowIdx = rows.findIndex((r) =>
    r.some((c) => typeof c === "string" && c.toLowerCase().includes("week"))
  );
  if (headerRowIdx === -1)
    return NextResponse.json({
      error: "Could not find a header row. Make sure your spreadsheet uses the standard format (columns: Block, Week, Target %, km, Monday … Sunday, Notes).",
    }, { status: 422 });

  const dataRows = rows.slice(headerRowIdx + 1).filter((r) => {
    const weekCell = r[COL_WEEK];
    return typeof weekCell === "number" && weekCell > 0;
  });

  if (dataRows.length === 0)
    return NextResponse.json({ error: "No week data rows found below the header." }, { status: 422 });

  // ── Find anchor date from Notes column ─────────────────────────────────────
  const refYear = new Date().getFullYear();
  let anchorWeekNum: number | null = null;
  let anchorSunday: Date | null    = null;

  for (const row of dataRows) {
    const notes = String(row[COL_NOTES] ?? "");
    if (!notes) continue;
    const parsed = parseDateRange(notes, refYear);
    if (parsed) {
      anchorWeekNum = row[COL_WEEK] as number;
      anchorSunday  = parsed;
      break;
    }
  }

  // If no notes anchor found, use today as Sunday for the first week
  if (!anchorSunday || anchorWeekNum === null) {
    anchorWeekNum = dataRows[0]![COL_WEEK] as number;
    const now = new Date();
    // Rewind to last Sunday
    anchorSunday = new Date(now);
    anchorSunday.setDate(now.getDate() - now.getDay());
  }

  // ── Build workouts ──────────────────────────────────────────────────────────
  const workouts: ParsedWorkout[] = [];

  for (const row of dataRows) {
    const weekNum = row[COL_WEEK] as number;
    const weekOffset = weekNum - anchorWeekNum;
    const weekSunday = new Date(anchorSunday!.getTime() + weekOffset * 7 * 86_400_000);

    for (const col of RUNNING_COLS) {
      const cell = String(row[col] ?? "").trim();
      if (isSkipped(cell)) continue;

      const dayOffset = DAY_OFFSET[col]!;
      const date = new Date(weekSunday.getTime() + dayOffset * 86_400_000);

      const title    = parseTitle(cell);
      const km       = parseKm(cell);
      const minutes  = parseMinutes(cell);

      const segments: ParsedSegment[] = km
        ? [{ order: 1, distance: km, pace: undefined, remarks: undefined }]
        : [];

      const descParts: string[] = [];
      if (minutes) descParts.push(`Duration: ${minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 > 0 ? (minutes % 60) + "min" : ""}` : `${minutes} min`}`);
      if (km)      descParts.push(`Distance: ≈${km} km`);
      descParts.push(cell);

      workouts.push({
        title,
        scheduledAt: toISO(date),
        description: cell,
        segments,
      });
    }
  }

  if (workouts.length === 0)
    return NextResponse.json({
      error: "No runnable workouts found. Check that day columns contain workout descriptions with distances or durations.",
    }, { status: 422 });

  return NextResponse.json({ workouts });
}
