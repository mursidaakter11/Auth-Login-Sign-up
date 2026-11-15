import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AuthView, UserProfile } from '../types/auth';
import { deriveHandle, evaluatePasswordStrength, getInitials } from '../utils/authValidation';

interface PortalVisualPanelProps {
  view: AuthView;
  draftName: string;
  draftEmail: string;
  draftPassword: string;
  authenticatedUser: UserProfile | null;
}

const PORTAL_IMAGE_PATH = '/src/assets/images/kanso_arch_portal_1794767752029.jpg';

export function PortalVisualPanel({
  view,
  draftName,
  draftEmail,
  draftPassword,
  authenticatedUser,
}: PortalVisualPanelProps) {
  const [imageError, setImageError] = useState(false);

  const displayName = authenticatedUser
    ? authenticatedUser.fullName
    : draftName.trim() || 'New Member';
  const displayEmail = authenticatedUser
    ? authenticatedUser.email
    : draftEmail.trim() || 'name@company.com';
  const initials = getInitials(authenticatedUser ? authenticatedUser.fullName : draftName);
  const handle = deriveHandle(
    authenticatedUser ? authenticatedUser.fullName : draftName,
    authenticatedUser ? authenticatedUser.email : draftEmail
  );
  const strength = evaluatePasswordStrength(draftPassword);

  const showLivePass = authenticatedUser !== null || view === 'signup';

  return (
    <aside
      aria-label="Workspace visual overview"
      className="relative w-full h-44 sm:h-52 lg:h-auto lg:min-h-screen lg:col-span-6 overflow-hidden bg-slate-900 select-none"
    >
      {/* Fallback architectural surface if image fails */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-blue-950"
      />

      {!imageError && (
        <img
          src={PORTAL_IMAGE_PATH}
          alt="Minimalist concrete and limestone architectural gallery with cobalt glass"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}

      {/* Measured contrast scrim for 4.5:1+ white text legibility */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/35 to-slate-950/30"
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-12 text-white">
        {/* Brand Wordmark (single clean text element) */}
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="font-[var(--font-display)] text-xl sm:text-2xl font-semibold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded"
          >
            Kanso
          </a>
        </div>

        {/* Desktop editorial anchor / live identity preview */}
        <div className="hidden lg:block max-w-md space-y-6">
          {showLivePass ? (
            <div
              data-testid="live-member-pass"
              className="rounded-xl border border-white/20 bg-slate-950/55 backdrop-blur-md p-6 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/15 pb-5">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold tracking-wide text-white">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-white">
                      {displayName}
                    </p>
                    <p className="truncate font-[var(--font-mono)] text-xs text-slate-300">
                      {handle}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-blue-300 whitespace-nowrap shrink-0">
                  {authenticatedUser ? authenticatedUser.role : 'Member Pass'}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-300">
                <span className="truncate">{displayEmail}</span>
                {authenticatedUser ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 whitespace-nowrap shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Active session
                  </span>
                ) : (
                  <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                    <span className="font-[var(--font-mono)] tabular-nums text-slate-300">
                      {draftPassword ? strength.label : 'Pending'}
                    </span>
                    <div className="flex items-center gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((idx) => (
                        <span
                          key={idx}
                          className={`h-1 w-3 rounded-full transition-colors duration-150 ${
                            idx < strength.score
                              ? strength.score >= 3
                                ? 'bg-blue-400'
                                : 'bg-amber-400'
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-[var(--font-display)] text-3xl xl:text-4xl font-medium leading-[1.15] tracking-tight text-white [text-wrap:balance]">
                Quiet workspace access, stripped of friction.
              </h2>
              <p className="text-sm leading-relaxed text-slate-200/90 max-w-sm">
                Sign in with your password, request an instant one-time code, or continue with your studio identity.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300/90">
            <span>Single Sign-On</span>
            <span aria-hidden="true">·</span>
            <span>One-Time Code</span>
            <span aria-hidden="true">·</span>
            <span>Scrypt Key Derivation</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
