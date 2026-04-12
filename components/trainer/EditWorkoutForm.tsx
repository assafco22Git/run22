"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { updateWorkout } from "@/app/actions/workouts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SegmentForm {
  id: string;
  distance: string;
  pace: string;
  remarks: string;
}

interface EditWorkoutFormProps {
  workoutId: string;
  traineeId: string;
  initialTitle: string;
  initialDescription: string;
  initialScheduledAt: string; // "YYYY-MM-DD"
  initialSegments: { distance: number; pace: string; remarks?: string | null }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "placeholder-gray-400 dark:placeholder-gray-500 text-sm",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition",
        className
      )}
      {...props}
    />
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none",
        "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition",
        className
      )}
      {...props}
    />
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {children}
    </label>
  );
}

function SegmentRow({
  segment, index, total, onChange, onRemove, onMoveUp, onMoveDown,
}: {
  segment: SegmentForm; index: number; total: number;
  onChange: (id: string, field: keyof Omit<SegmentForm, "id">, value: string) => void;
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
          <button type="button" onClick={() => onMoveUp(segment.id)} disabled={index === 0}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onMoveDown(segment.id)} disabled={index === total - 1}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onRemove(segment.id)} disabled={total === 1}
            className="p-1 rounded-md text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <FieldLabel>Distance (km)</FieldLabel>
          <Input type="number" min="0.1" step="0.1" placeholder="e.g. 5"
            value={segment.distance} onChange={e => onChange(segment.id, "distance", e.target.value)} />
        </div>
        <div>
          <FieldLabel>Pace (mm:ss/km)</FieldLabel>
          <Input type="text" placeholder="e.g. 5:30" pattern="\d+:\d{2}"
            value={segment.pace} onChange={e => onChange(segment.id, "pace", e.target.value)} />
        </div>
      </div>
      <div>
        <FieldLabel>Remarks (optional)</FieldLabel>
        <Input type="text" placeholder="e.g. Easy pace, flat course"
          value={segment.remarks} onChange={e => onChange(segment.id, "remarks", e.target.value)} />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function EditWorkoutForm({
  workoutId, traineeId, initialTitle, initialDescription, initialScheduledAt, initialSegments,
}: EditWorkoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [scheduledAt, setScheduledAt] = useState(initialScheduledAt);
  const [segments, setSegments] = useState<SegmentForm[]>(
    initialSegments.map(s => ({
      id: uid(),
      distance: String(s.distance),
      pace: s.pace,
      remarks: s.remarks ?? "",
    }))
  );

  const updateSeg = useCallback((id: string, field: keyof Omit<SegmentForm, "id">, value: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }, []);

  const removeSeg = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const moveSeg = useCallback((id: string, dir: "up" | "down") => {
    setSegments(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap]!, next[idx]!];
      return next;
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    for (const seg of segments) {
      if (!seg.distance || isNaN(parseFloat(seg.distance))) {
        toast.error("All segments need a valid distance"); return;
      }
      if (!/^\d+:\d{2}$/.test(seg.pace)) {
        toast.error("Pace must be in mm:ss format (e.g. 5:30)"); return;
      }
    }

    startTransition(async () => {
      const result = await updateWorkout(workoutId, {
        title,
        description,
        scheduledAt,
        segments: segments.map(s => ({
          distance: parseFloat(s.distance),
          pace: s.pace,
          remarks: s.remarks || undefined,
        })),
      });

      if (result.success) {
        toast.success("Workout updated");
        window.location.href = `/trainer/workouts/${workoutId}`;
      } else {
        toast.error(result.error ?? "Failed to update workout");
      }
    });
  }

  const totalKm = segments.reduce((s, seg) => s + (parseFloat(seg.distance) || 0), 0).toFixed(1);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Details card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Details</h2>

        <div>
          <FieldLabel>Title *</FieldLabel>
          <Input type="text" required placeholder="e.g. Easy 10km run"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div>
          <FieldLabel>Description</FieldLabel>
          <Textarea rows={3} placeholder="Optional notes for the trainee…"
            value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div>
          <FieldLabel>Scheduled Date *</FieldLabel>
          <Input type="date" required value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)} />
        </div>
      </div>

      {/* Segments card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Segments</h2>
          <span className="text-xs text-gray-400 dark:text-gray-500">{totalKm} km total</span>
        </div>

        <div className="space-y-3">
          {segments.map((seg, idx) => (
            <SegmentRow key={seg.id} segment={seg} index={idx} total={segments.length}
              onChange={updateSeg} onRemove={removeSeg}
              onMoveUp={id => moveSeg(id, "up")} onMoveDown={id => moveSeg(id, "down")} />
          ))}
        </div>

        <button type="button" onClick={() => setSegments(prev => [...prev, { id: uid(), distance: "", pace: "", remarks: "" }])}
          className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
          <Plus className="w-4 h-4" />
          Add segment
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending}
          className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
          {isPending ? "Saving…" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
          Cancel
        </button>
      </div>
    </form>
  );
}
