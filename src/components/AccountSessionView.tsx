import { useState, type FormEvent } from 'react';
import { Check, Loader2, LogOut } from 'lucide-react';
import type { UserProfile } from '../types/auth';
import { deriveHandle, getInitials } from '../utils/authValidation';

interface AccountSessionViewProps {
  user: UserProfile;
  token: string;
  onUserUpdated: (user: UserProfile) => void;
  onSignOut: () => void;
}

const ROLE_OPTIONS = ['Member', 'Product Designer', 'Design Lead', 'Staff Engineer', 'Founder'];

export function AccountSessionView({
  user,
  token,
  onUserUpdated,
  onSignOut,
}: AccountSessionViewProps) {
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const initials = getInitials(user.fullName);
  const handle = deriveHandle(user.fullName, user.email);
  const formattedTime = new Date(user.lastSignedInAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  async function handleSaveRole(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedFeedback(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        onUserUpdated(data.user);
        setSavedFeedback(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
          Authenticated session
        </p>
        <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 [text-wrap:balance]">
          Signed in as {user.fullName}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Your session is active and verified across reloads.
        </p>
      </div>

      {/* Single-level surface summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
        <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {user.fullName}
            </p>
            <p className="truncate font-[var(--font-mono)] text-xs text-slate-500 dark:text-slate-400">
              {handle} · {user.email}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Sign-in method</dt>
            <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">
              {user.authMethod}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Session verified</dt>
            <dd className="mt-1 font-[var(--font-mono)] tabular-nums font-medium text-slate-900 dark:text-slate-100">
              {formattedTime}
            </dd>
          </div>
        </dl>

        <form onSubmit={handleSaveRole} className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <label
            htmlFor="workspace-role"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Workspace role
          </label>
          <div className="flex items-center gap-2">
            <select
              id="workspace-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setSavedFeedback(false);
              }}
              className="h-10 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || role === user.role}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 px-3.5 text-xs font-medium text-slate-900 dark:text-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : savedFeedback ? (
                <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              ) : null}
              {savedFeedback ? 'Saved' : 'Update'}
            </button>
          </div>
        </form>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );
}
