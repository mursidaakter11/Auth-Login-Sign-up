import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AccountSessionView } from './components/AccountSessionView';
import { AuthForms } from './components/AuthForms';
import { Avatar3D } from './components/Avatar3D';
import { LegalDialog } from './components/LegalDialog';
import { PortalVisualPanel } from './components/PortalVisualPanel';
import type { AuthResponse, AuthView, LegalTopic, UserProfile } from './types/auth';
import { deriveAvatarPose, type FocusedAuthField } from './utils/avatarPose';
import PORTAL_IMAGE from "./assets/images/kanso_arch_portal_1794767752029.jpg";

function App() {
  return (
    <div>
      <img
        src={PORTAL_IMAGE}
        alt="Kanso Architecture Portal"
        className="w-full h-auto"
      />
    </div>
  );
}

export default App;
const TOKEN_STORAGE_KEY = 'kanso_auth_token';
const THEME_STORAGE_KEY = 'kanso_theme';

export default function App() {
  const [view, setView] = useState<AuthView>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'signup' ? 'signup' : 'signin';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark';
  });

  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<FocusedAuthField>(null);

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);
  const [checkingSession, setCheckingSession] = useState<boolean>(() =>
    Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
  );
  const [legalTopic, setLegalTopic] = useState<LegalTopic>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      setCheckingSession(false);
      return;
    }

    let cancelled = false;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid session');
        return (await res.json()) as { user: UserProfile };
      })
      .then((data) => {
        if (!cancelled) {
          setAuthenticatedUser(data.user);
          setToken(storedToken);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setAuthenticatedUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthenticated(data: AuthResponse) {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    setToken(data.token);
    setAuthenticatedUser(data.user);
    setDraftPassword('');
    setShowPassword(false);
    setFocusedField(null);
  }

  async function handleSignOut() {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Proceed with local sign out even if network call fails.
      }
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setAuthenticatedUser(null);
    setShowPassword(false);
    setFocusedField(null);
    setView('signin');
  }

  const avatarPose = deriveAvatarPose({
    view,
    focusedField,
    hasPasswordValue: Boolean(draftPassword),
    showPassword,
    isAuthenticated: Boolean(authenticatedUser),
  });

  const activeFieldText =
    focusedField === 'name'
      ? draftName
      : focusedField === 'email'
        ? draftEmail
        : '';
  const lookProgress = Math.min(1, activeFieldText.length / 24);

  return (
    <div
      data-state={authenticatedUser ? 'authenticated' : view}
      className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F6F7F9] dark:bg-[#0B0E14] text-[#0E131A] dark:text-[#F3F5F8] transition-colors duration-200"
    >
      {/* Left Architectural Visual Canvas */}
      <PortalVisualPanel
        view={view}
        draftName={draftName}
        draftEmail={draftEmail}
        draftPassword={draftPassword}
        authenticatedUser={authenticatedUser}
      />

      {/* Right Minimal Auth & Session Surface */}
      <main className="lg:col-span-6 flex min-h-[calc(100vh-11rem)] sm:min-h-[calc(100vh-13rem)] lg:min-h-screen flex-col justify-between px-5 py-4 sm:px-12 sm:py-6 lg:px-16 lg:py-8">
        {/* Minimal Top Utility Row */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Member Access
          </span>

          <button
            type="button"
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => setIsDark((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            {isDark ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Centered Form / Session Workspace with 3D Guardian Avatar */}
        <div className="my-auto py-4 sm:py-6">
          <div className="w-full max-w-[420px] mx-auto">
            <Avatar3D pose={avatarPose} lookProgress={lookProgress} isDark={isDark} />
          </div>

          {checkingSession ? (
            <div
              aria-label="Restoring session"
              className="w-full max-w-[420px] mx-auto space-y-4 animate-pulse"
            >
              <div className="h-8 w-44 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800 mt-6" />
              <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : authenticatedUser && token ? (
            <AccountSessionView
              user={authenticatedUser}
              token={token}
              onUserUpdated={setAuthenticatedUser}
              onSignOut={handleSignOut}
            />
          ) : (
            <AuthForms
              view={view}
              onViewChange={setView}
              draftName={draftName}
              onDraftNameChange={setDraftName}
              draftEmail={draftEmail}
              onDraftEmailChange={setDraftEmail}
              draftPassword={draftPassword}
              onDraftPasswordChange={setDraftPassword}
              showPassword={showPassword}
              onShowPasswordChange={setShowPassword}
              onFocusedFieldChange={setFocusedField}
              onAuthenticated={handleAuthenticated}
              onOpenLegal={setLegalTopic}
            />
          )}
        </div>

        {/* Quiet Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 dark:border-slate-800/80 pt-5 text-xs text-slate-500 dark:text-slate-400">
          <span>© 2026 Kanso</span>
          <nav aria-label="Legal and security" className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLegalTopic('terms')}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setLegalTopic('privacy')}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setLegalTopic('security')}
              className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
            >
              Security
            </button>
          </nav>
        </footer>
      </main>

      <LegalDialog topic={legalTopic} onClose={() => setLegalTopic(null)} />
    </div>
  );
}
