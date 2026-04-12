"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { updateTrainerCredentials } from "@/app/actions/profile";
import { toast } from "sonner";

interface TrainerCredentialsFormProps {
  initialName: string;
  initialUsername?: string | null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
      {children}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
    />
  );
}

export function TrainerCredentialsForm({
  initialName,
  initialUsername,
}: TrainerCredentialsFormProps) {
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }

    startTransition(async () => {
      const result = await updateTrainerCredentials({
        name: name.trim(),
        username: username.trim() || undefined,
        newPassword: newPassword || undefined,
      });

      if (result.success) {
        toast.success("Settings saved");
        window.location.reload();
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <div>
        <FieldLabel>Name</FieldLabel>
        <TextInput
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-1">
          Login credentials
        </p>

        <div>
          <FieldLabel>Username</FieldLabel>
          <TextInput
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. coach_assaf"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            3–30 chars · letters, numbers, _ and . only
          </p>
        </div>

        <div>
          <FieldLabel>New password</FieldLabel>
          <div className="relative">
            <TextInput
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Minimum 6 characters</p>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
