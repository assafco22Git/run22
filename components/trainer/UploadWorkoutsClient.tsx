"use client";

import { useRef, useState } from "react";
import {
  Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle,
  Trash2, ChevronDown, ChevronUp, Plus, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ParsedWorkout, ParsedSegment } from "@/app/api/trainer/parse-workouts/route";

interface Trainee { id: string; name: string; }

type Step = "upload" | "review" | "done";

// ── Editable row state (workouts as strings for easy form binding) ────────────

interface EditableSegment {
  order: number;
  distance: string;
  pace: string;
  remarks: string;
}

interface EditableWorkout {
  _id: string; // local key
  title: string;
  scheduledAt: string;
  description: string;
  segments: EditableSegment[];
  expanded: boolean;
}

function toEditable(w: ParsedWorkout, idx: number): EditableWorkout {
  return {
    _id: `${idx}-${Math.random()}`,
    title: w.title ?? "",
    scheduledAt: w.scheduledAt ?? "",
    description: w.description ?? "",
    expanded: false,
    segments: (w.segments ?? []).map((s) => ({
      order: s.order,
      distance: s.distance != null ? String(s.distance) : "",
      pace: s.pace ?? "",
      remarks: s.remarks ?? "",
    })),
  };
}

function fromEditable(w: EditableWorkout): ParsedWorkout {
  return {
    title: w.title,
    scheduledAt: w.scheduledAt,
    description: w.description || undefined,
    segments: w.segments
      .filter((s) => s.distance || s.pace || s.remarks)
      .map((s) => ({
        order: s.order,
        distance: s.distance ? parseFloat(s.distance) : undefined,
        pace: s.pace || undefined,
        remarks: s.remarks || undefined,
      })),
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldInput({
  value, onChange, placeholder, type = "text", className,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
        className
      )}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UploadWorkoutsClient({ trainees }: { trainees: Trainee[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [traineeId, setTraineeId] = useState(trainees[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("upload");
  const [workouts, setWorkouts] = useState<EditableWorkout[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // ── Step 1: upload + parse ──────────────────────────────────────────────────

  async function handleParse() {
    if (!file || !traineeId) return;
    setParsing(true);
    setParseError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/trainer/parse-workouts", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "Parsing failed");
        return;
      }

      setWorkouts((data.workouts as ParsedWorkout[]).map(toEditable));
      setStep("review");
    } catch {
      setParseError("Network error — please try again.");
    } finally {
      setParsing(false);
    }
  }

  // ── Step 2: review helpers ──────────────────────────────────────────────────

  function updateWorkout(id: string, patch: Partial<EditableWorkout>) {
    setWorkouts((prev) => prev.map((w) => w._id === id ? { ...w, ...patch } : w));
  }

  function removeWorkout(id: string) {
    setWorkouts((prev) => prev.filter((w) => w._id !== id));
  }

  function updateSegment(wId: string, segIdx: number, patch: Partial<EditableSegment>) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w._id !== wId) return w;
        const segs = [...w.segments];
        segs[segIdx] = { ...segs[segIdx]!, ...patch };
        return { ...w, segments: segs };
      })
    );
  }

  function addSegment(wId: string) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w._id !== wId) return w;
        const next = w.segments.length + 1;
        return {
          ...w,
          segments: [...w.segments, { order: next, distance: "", pace: "", remarks: "" }],
        };
      })
    );
  }

  function removeSegment(wId: string, segIdx: number) {
    setWorkouts((prev) =>
      prev.map((w) => {
        if (w._id !== wId) return w;
        const segs = w.segments.filter((_, i) => i !== segIdx).map((s, i) => ({ ...s, order: i + 1 }));
        return { ...w, segments: segs };
      })
    );
  }

  // ── Step 2: save ───────────────────────────────────────────────────────────

  async function handleSave() {
    if (workouts.length === 0) return;
    setSaving(true);

    try {
      const res = await fetch("/api/trainer/bulk-create-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traineeId, workouts: workouts.map(fromEditable) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error ?? "Failed to save workouts");
        return;
      }

      setSavedCount(data.created);
      setStep("done");
    } catch {
      setParseError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const traineeName = trainees.find((t) => t.id === traineeId)?.name ?? "";

  if (step === "done") {
    return (
      <div className="p-6 max-w-2xl mx-auto w-full flex flex-col items-center text-center gap-4 mt-16">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {savedCount} workout{savedCount !== 1 ? "s" : ""} added!
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Successfully scheduled for {traineeName}.
        </p>
        <div className="flex gap-3 mt-2">
          <Link
            href="/trainer/trainees"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
          >
            Back to Trainees
          </Link>
          <button
            onClick={() => { setStep("upload"); setFile(null); setWorkouts([]); setParseError(null); }}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/trainer/trainees"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trainees
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bulk Upload Workouts
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Upload an Excel or CSV file — AI will parse any format automatically.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {["Upload", "Review & Edit", "Save"].map((label, i) => {
          const stepNum = i + 1;
          const currentStep = step === "upload" ? 1 : step === "review" ? 2 : 3;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                currentStep > stepNum
                  ? "bg-emerald-500 text-white"
                  : currentStep === stepNum
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              )}>
                {currentStep > stepNum ? "✓" : stepNum}
              </div>
              <span className={cn(
                "text-sm font-medium",
                currentStep === stepNum ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"
              )}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Upload ────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-5">
          {/* Trainee picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Trainee
            </label>
            {trainees.length === 0 ? (
              <p className="text-sm text-gray-400">No trainees yet. Add a trainee first.</p>
            ) : (
              <select
                value={traineeId}
                onChange={(e) => setTraineeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {trainees.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* File drop zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Spreadsheet file
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
                file
                  ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10"
                  : "border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">.xlsx, .xls, .csv accepted</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
          </div>

          {/* Format hint */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl p-3">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Any format works</p>
            <p className="text-xs text-blue-600 dark:text-blue-500">
              The AI will read your file regardless of column names or layout. For best results include: date, workout name, distance, and pace. Segments can be in separate rows or columns.
            </p>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={!file || !traineeId || parsing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {parsing ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Parsing your file…</>
            ) : (
              <><Upload className="w-4 h-4" />Parse with AI</>
            )}
          </button>
        </div>
      )}

      {/* ── STEP 2: Review ───────────────────────────────────────────────── */}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI found <span className="font-semibold text-gray-900 dark:text-gray-100">{workouts.length} workout{workouts.length !== 1 ? "s" : ""}</span> for <span className="font-semibold text-gray-900 dark:text-gray-100">{traineeName}</span>.
                Review and edit before saving.
              </p>
            </div>
            <button
              onClick={() => setStep("upload")}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Re-upload
            </button>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
            </div>
          )}

          {workouts.map((w, wi) => (
            <div key={w._id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {wi + 1}
                </span>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 min-w-0">
                  <FieldInput
                    value={w.title}
                    onChange={(v) => updateWorkout(w._id, { title: v })}
                    placeholder="Workout title"
                    className="font-medium"
                  />
                  <FieldInput
                    type="date"
                    value={w.scheduledAt}
                    onChange={(v) => updateWorkout(w._id, { scheduledAt: v })}
                  />
                  <FieldInput
                    value={w.description}
                    onChange={(v) => updateWorkout(w._id, { description: v })}
                    placeholder="Description (optional)"
                    className="sm:col-span-1 hidden sm:block"
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateWorkout(w._id, { expanded: !w.expanded })}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={w.expanded ? "Collapse segments" : "Edit segments"}
                  >
                    {w.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => removeWorkout(w._id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Remove workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Segments panel */}
              {w.expanded && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Segments
                  </p>
                  {w.segments.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">No segments — click + to add</p>
                  )}
                  {w.segments.map((seg, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-4 shrink-0">{si + 1}</span>
                      <FieldInput
                        type="number"
                        value={seg.distance}
                        onChange={(v) => updateSegment(w._id, si, { distance: v })}
                        placeholder="km"
                        className="w-20 shrink-0"
                      />
                      <FieldInput
                        value={seg.pace}
                        onChange={(v) => updateSegment(w._id, si, { pace: v })}
                        placeholder="pace MM:SS"
                        className="w-28 shrink-0 font-mono"
                      />
                      <FieldInput
                        value={seg.remarks}
                        onChange={(v) => updateSegment(w._id, si, { remarks: v })}
                        placeholder="Remarks"
                      />
                      <button
                        onClick={() => removeSegment(w._id, si)}
                        className="p-1 rounded text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSegment(w._id)}
                    className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add segment
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Save bar */}
          <div className="sticky bottom-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{workouts.length}</span> workout{workouts.length !== 1 ? "s" : ""} ready to save
            </p>
            <button
              onClick={handleSave}
              disabled={saving || workouts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Save {workouts.length} Workout{workouts.length !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
