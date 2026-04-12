"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addTrainee, createTrainee } from "@/app/actions/trainees";
import {
  ArrowLeft, UserPlus, CheckCircle, AlertCircle, Loader2,
  Link2, UserCog,
} from "lucide-react";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition"
    />
  );
}

function StatusBanner({ success, message }: { success: boolean; message: string }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border ${
      success
        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
        : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
    }`}>
      {success
        ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
        : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

// ─── Tab: Link existing account ───────────────────────────────────────────────

function LinkExistingTab() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await addTrainee(email);
      setResult(res);
      if (res.success) {
        setTimeout(() => { window.location.href = "/trainer/trainees"; }, 1500);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Enter the email of an existing account with the <strong>Trainee</strong> role to link them to your roster.
      </p>
      <div>
        <FieldLabel htmlFor="link-email">Trainee email</FieldLabel>
        <Input
          id="link-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="trainee@example.com"
          required
          disabled={isPending || result?.success === true}
        />
      </div>

      {result && (
        <StatusBanner
          success={result.success}
          message={result.success ? "Trainee linked! Redirecting…" : (result.error ?? "Error")}
        />
      )}

      <button
        type="submit"
        disabled={isPending || !email.trim() || result?.success === true}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Linking…</> : <><Link2 className="w-4 h-4" />Link Trainee</>}
      </button>
    </form>
  );
}

// ─── Tab: Create new account ──────────────────────────────────────────────────

function CreateNewTab() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await createTrainee({ name, email, password, username });
      setResult(res);
      if (res.success) {
        setTimeout(() => { window.location.href = "/trainer/trainees"; }, 1500);
      }
    });
  }

  const done = result?.success === true;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Create a brand-new trainee account and add them to your roster in one step.
      </p>

      <div>
        <FieldLabel htmlFor="new-name">Full name</FieldLabel>
        <Input
          id="new-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Jane Smith"
          required
          disabled={isPending || done}
        />
      </div>

      <div>
        <FieldLabel htmlFor="new-username">Username</FieldLabel>
        <Input
          id="new-username"
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="e.g. alice_cohen"
          required
          pattern="[a-z0-9_.]{3,30}"
          disabled={isPending || done}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Used to log in · letters, numbers, _ and . only</p>
      </div>

      <div>
        <FieldLabel htmlFor="new-email">Email address</FieldLabel>
        <Input
          id="new-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jane@example.com"
          required
          disabled={isPending || done}
        />
      </div>

      <div>
        <FieldLabel htmlFor="new-password">Password</FieldLabel>
        <Input
          id="new-password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          required
          minLength={6}
          disabled={isPending || done}
        />
      </div>

      {result && (
        <StatusBanner
          success={result.success}
          message={result.success ? "Account created! Redirecting…" : (result.error ?? "Error")}
        />
      )}

      <button
        type="submit"
        disabled={isPending || !name.trim() || !username.trim() || !email.trim() || !password || done}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
      >
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" />Creating…</>
          : <><UserPlus className="w-4 h-4" />Create & Add Trainee</>}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "link" | "create";

export default function AddTraineePage() {
  const [tab, setTab] = useState<Tab>("create");

  return (
    <div className="p-6 max-w-lg mx-auto w-full">
      {/* Back */}
      <Link
        href="/trainer/trainees"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All trainees
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Add a Trainee</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create a new account or link an existing one.</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
          <button
            onClick={() => setTab("create")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "create"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <UserCog className="w-4 h-4" />
            Create new
          </button>
          <button
            onClick={() => setTab("link")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "link"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Link2 className="w-4 h-4" />
            Link existing
          </button>
        </div>

        {tab === "create" ? <CreateNewTab /> : <LinkExistingTab />}
      </div>
    </div>
  );
}
