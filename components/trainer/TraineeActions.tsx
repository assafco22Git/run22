"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, X, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { removeTrainee, updateTraineeDetails } from "@/app/actions/trainees";

interface TraineeActionsProps {
  traineeId: string;
  initialName: string;
  initialUsername?: string | null;
  initialDob?: string | null;
  initialGender?: string | null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
      {children}
    </span>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder-gray-400 dark:placeholder-gray-500"
    />
  );
}

export function TraineeActions({
  traineeId,
  initialName,
  initialUsername,
  initialDob,
  initialGender,
}: TraineeActionsProps) {
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [dob, setDob] = useState(initialDob ?? "");
  const [gender, setGender] = useState(initialGender ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setName(initialName);
    setUsername(initialUsername ?? "");
    setDob(initialDob ?? "");
    setGender(initialGender ?? "");
    setNewPassword("");
    setShowPw(false);
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    startTransition(async () => {
      const result = await updateTraineeDetails(traineeId, {
        name: name.trim(),
        username: username.trim() || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
        newPassword: newPassword || undefined,
      });
      if (result.success) {
        toast.success("Trainee updated");
        window.location.reload();
      } else {
        toast.error(result.error ?? "Failed to update");
      }
    });
  }

  function handleRemove() {
    if (!window.confirm("Remove this trainee from your roster? Their account and workouts are not deleted.")) return;
    startTransition(async () => {
      const result = await removeTrainee(traineeId);
      if (result.success) {
        toast.success("Trainee removed");
        window.location.href = "/trainer/trainees";
      } else {
        toast.error(result.error ?? "Failed to remove trainee");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={handleRemove}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-4 border border-gray-200 dark:border-gray-700 space-y-3">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Edit Trainee
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <FieldLabel>Full name *</FieldLabel>
          <TextInput type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" />
        </div>
        <div>
          <FieldLabel>Date of birth</FieldLabel>
          <TextInput type="date" value={dob} onChange={e => setDob(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Gender</FieldLabel>
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          >
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Login credentials
        </p>
        <div>
          <FieldLabel>Username</FieldLabel>
          <TextInput
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. alice_cohen"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            3–30 chars · letters, numbers, _ and . only
          </p>
        </div>
        <div>
          <FieldLabel>New password (leave blank to keep unchanged)</FieldLabel>
          <div className="relative">
            <TextInput
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
        <button
          onClick={() => { setEditing(false); resetForm(); }}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
