import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { LegalTopic } from '../types/auth';

interface LegalDialogProps {
  topic: LegalTopic;
  onClose: () => void;
}

const LEGAL_COPY: Record<Exclude<LegalTopic, null>, { title: string; body: string[] }> = {
  terms: {
    title: 'Terms of Service',
    body: [
      'Kanso provides streamlined workspace authentication for authorized members and teams.',
      'You are responsible for keeping your credentials confidential and ensuring accurate account information.',
      'Demo accounts and test sessions may be cleared periodically without notice.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect only your name, email address, and role preference to operate your workspace session.',
      'Passwords are never stored in plain text; all credentials are hashed using scrypt with unique per-user salts.',
      'You may sign out or clear your session token at any time.',
    ],
  },
  security: {
    title: 'Security Architecture',
    body: [
      'All passwords are derived with 64-byte scrypt keys and verified via timing-safe comparison.',
      'One-time sign-in codes expire automatically after 10 minutes and can only be used once.',
      'Session bearer tokens are verified server-side on every reload.',
    ],
  },
};

export function LegalDialog({ topic, onClose }: LegalDialogProps) {
  useEffect(() => {
    if (!topic) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [topic, onClose]);

  if (!topic) return null;
  const content = LEGAL_COPY[topic];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <h2
            id="legal-dialog-title"
            className="font-[var(--font-display)] text-lg font-semibold text-slate-900 dark:text-white"
          >
            {content.title}
          </h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {content.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] px-4 text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
