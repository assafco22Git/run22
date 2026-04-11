"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createWorkout } from "@/app/actions/workouts";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Segment {
  id: string;
  distance: string;
  pace: string;
  remarks: string;
}

interface Trainee {
  id: string;
  name: string;
  email: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newSegment(): Segment {
  return { id: uid(), distance: "", pace: "", remarks: "" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
    >
      {children}
    </label>
  );
}

function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "placeholder-gray-400 dark:placeholder-gray-500 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
        "transition disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
        "transition disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent",
        "transition disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Segment Row ──────────────────────────────────────────────────────────────

function SegmentRow({
  segment,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  segment: Segment;
  index: number;
  total: number;
  onChange: (id: string, field: keyof Omit<Segment, "id">, value: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
          Segment {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(segment.id)}
            disabled={index === 0}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(segment.id)}
            disabled={index === total - 1}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(segment.id)}
            disabled={total === 1}
            className="p-1 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Remove segment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <FieldLabel>Distance (km)</FieldLabel>
          <Input
            type="number"
            min="0.1"
            step="0.1"
            placeholder="e.g. 5"
            value={segment.distance}
            onChange={(e) => onChange(segment.id, "distance", e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Pace (mm:ss/km)</FieldLabel>
          <Input
            type="text"
            placeholder="e.g. 5:30"
            pattern="\d+:\d{2}"
            value={segment.pace}
            onChange={(e) => onChange(segment.id, "pace", e.target.value)}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Remarks (optional)</FieldLabel>
        <Input
          type="text"
          placeholder="e.g. Easy pace, flat course"
          value={segment.remarks}
          onChange={(e) => onChange(segment.id, "remarks", e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTraineeId = searchParams.get("traineeId") ?? "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [traineeId, setTraineeId] = useState(preselectedTraineeId);
  const [scheduledAt, setScheduledAt] = useState("");
  const [segments, setSegments] = useState<Segment[]>([newSegment()]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loadingTrainees, setLoadingTrainees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch trainees
  useEffect(() => {
    fetch("/api/trainer/trainees")
      .then((r) => r.json())
      .then((data) => {
        setTrainees(data.trainees ?? []);
        // Auto-select if only one trainee and none preselected
        if (!preselectedTraineeId && data.trainees?.length === 1) {
          setTraineeId(data.trainees[0].id);
        }
      })
      .catch(() => toast.error("Failed to load trainees"))
      .finally(() => setLoadingTrainees(false));
  }, [preselectedTraineeId]);

  const updateSegment = useCallback(
    (id: string, field: keyof Omit<Segment, "id">, value: string) => {
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const removeSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveSegment = useCallback((id: string, direction: "up" | "down") => {
    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (!traineeId) {
      toast.error("Please select a trainee");
      return;
    }

    for (const seg of segments) {
      if (!seg.distance || isNaN(parseFloat(seg.distance))) {
        toast.error("All segments need a valid distance");
        return;
      }
      if (!/^\d+:\d{2}$/.test(seg.pace)) {
        toast.error("Pace must be in mm:ss format (e.g. 5:30)");
        return;
      }
    }

    setSubmitting(true);

    const result = await createWorkout({
      title,
      description,
      traineeId,
      scheduledAt,
      segments: segments.map((s) => ({
        distance: parseFloat(s.distance),
        pace: s.pace,
        remarks: s.remarks || undefined,
      })),
    });

    setSubmitting(false);

    if (result.success) {
      toast.success("Workout created!");
      router.push(`/trainer/trainees/${traineeId}`);
    } else {
      toast.error(result.error ?? "Failed to create workout");
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full">
      {/* Back */}
      <Link
        href="/trainer/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          New Workout
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Plan a training session for one of your trainees
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
            Details
          </h2>

          <div>
            <FieldLabel htmlFor="title">Title *</FieldLabel>
            <Input
              id="title"
              type="text"
              required
              placeholder="e.g. Easy 10km run"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              rows={3}
              placeholder="Optional notes for the trainee..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="traineeId">Trainee *</FieldLabel>
              <Select
                id="traineeId"
                required
                value={traineeId}
                onChange={(e) => setTraineeId(e.target.value)}
                disabled={loadingTrainees}
              >
                <option value="">
                  {loadingTrainees ? "Loading…" : "Select a trainee"}
                </option>
                {trainees.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="scheduledAt">Scheduled Date *</FieldLabel>
              <Input
                id="scheduledAt"
                type="date"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Segments card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Segments
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {segments.reduce((s, seg) => s + (parseFloat(seg.distance) || 0), 0).toFixed(1)} km total
            </span>
          </div>

          <div className="space-y-3">
            {segments.map((seg, idx) => (
              <SegmentRow
                key={seg.id}
                segment={seg}
                index={idx}
                total={segments.length}
                onChange={updateSegment}
                onRemove={removeSegment}
                onMoveUp={(id) => moveSegment(id, "up")}
                onMoveDown={(id) => moveSegment(id, "down")}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSegments((prev) => [...prev, newSegment()])}
            className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add segment
          </button>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating…" : "Create Workout"}
        </button>
      </form>
    </div>
  );
}
