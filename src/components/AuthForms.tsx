import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';
import type {
  AuthResponse,
  AuthView,
  LegalTopic,
  SignInMethod,
  SocialProvider,
} from '../types/auth';
import type { FocusedAuthField } from '../utils/avatarPose';
import {
  evaluatePasswordStrength,
  validateEmail,
  validateLoginForm,
  validateResetConfirmForm,
  validateSignupForm,
} from '../utils/authValidation';

interface AuthFormsProps {
  view: AuthView;
  onViewChange: (view: AuthView) => void;
  draftName: string;
  onDraftNameChange: (val: string) => void;
  draftEmail: string;
  onDraftEmailChange: (val: string) => void;
  draftPassword: string;
  onDraftPasswordChange: (val: string) => void;
  showPassword: boolean;
  onShowPasswordChange: (val: boolean) => void;
  onFocusedFieldChange: (field: FocusedAuthField) => void;
  onAuthenticated: (data: AuthResponse) => void;
  onOpenLegal: (topic: LegalTopic) => void;
}

export function AuthForms({
  view,
  onViewChange,
  draftName,
  onDraftNameChange,
  draftEmail,
  onDraftEmailChange,
  draftPassword,
  onDraftPasswordChange,
  showPassword,
  onShowPasswordChange,
  onFocusedFieldChange,
  onAuthenticated,
  onOpenLegal,
}: AuthFormsProps) {
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('password');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetPreview, setResetPreview] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSocial, setActiveSocial] = useState<SocialProvider | null>(null);

  const strength = evaluatePasswordStrength(draftPassword);

  function clearFeedback() {
    setFieldErrors({});
    setServerError(null);
    setInfoMessage(null);
  }

  function switchView(nextView: AuthView) {
    clearFeedback();
    onFocusedFieldChange(null);
    if (nextView === 'reset') {
      setResetStep('request');
      setResetCode('');
      setResetPreview(null);
      setResetNewPassword('');
    }
    onViewChange(nextView);
  }

  function handleFillDemo() {
    clearFeedback();
    setSignInMethod('password');
    onDraftEmailChange('demo@kanso.design');
    onDraftPasswordChange('Kanso2026!');
  }

  async function handleRequestOtp() {
    clearFeedback();
    const emailError = validateEmail(draftEmail);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draftEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Could not generate a one-time code.');
        return;
      }
      setOtpSent(true);
      setOtpPreview(data.previewCode ?? null);
      setInfoMessage(`One-time code sent to ${draftEmail.trim()}.`);
    } catch {
      setServerError('Network error while requesting a verification code.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();

    const errors = validateLoginForm({
      email: draftEmail,
      password: draftPassword,
      method: signInMethod,
      otpCode,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: draftEmail,
          password: draftPassword,
          method: signInMethod,
          otpCode,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Unable to sign in.');
        return;
      }
      onAuthenticated(data as AuthResponse);
    } catch {
      setServerError('Network error while signing in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignupSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();

    const errors = validateSignupForm({
      fullName: draftName,
      email: draftEmail,
      password: draftPassword,
      acceptedTerms,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: draftName,
          email: draftEmail,
          password: draftPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Unable to create account.');
        return;
      }
      onAuthenticated(data as AuthResponse);
    } catch {
      setServerError('Network error while creating your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetRequestSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();

    const emailError = validateEmail(draftEmail);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: draftEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Unable to start password reset.');
        return;
      }
      setResetPreview(data.previewCode ?? null);
      setResetStep('confirm');
      setInfoMessage(`Reset code sent to ${draftEmail.trim()}.`);
    } catch {
      setServerError('Network error while requesting reset.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetConfirmSubmit(e: FormEvent) {
    e.preventDefault();
    clearFeedback();

    const errors = validateResetConfirmForm({
      code: resetCode,
      newPassword: resetNewPassword,
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: draftEmail,
          code: resetCode,
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Unable to reset password.');
        return;
      }
      onAuthenticated(data as AuthResponse);
    } catch {
      setServerError('Network error while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialAuth(provider: SocialProvider) {
    clearFeedback();
    setActiveSocial(provider);
    try {
      const res = await fetch('/api/auth/oauth-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || 'Single sign-on failed.');
        return;
      }
      onAuthenticated(data as AuthResponse);
    } catch {
      setServerError('Network error during single sign-on.');
    } finally {
      setActiveSocial(null);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Header + Segmented Switcher */}
      {view !== 'reset' ? (
        <div className="mb-7 space-y-5">
          <div className="space-y-1.5">
            <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 [text-wrap:balance]">
              {view === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {view === 'signin'
                ? 'Enter your credentials to access your workspace.'
                : 'Set up your Kanso identity in under a minute.'}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200/75 dark:bg-slate-800/80 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'signin'}
              onClick={() => switchView('signin')}
              className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                view === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'signup'}
              onClick={() => switchView('signup')}
              className={`min-h-[40px] rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                view === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-7 space-y-3">
          <button
            type="button"
            onClick={() => switchView('signin')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Sign In
          </button>
          <div className="space-y-1.5">
            <h1 className="font-[var(--font-display)] text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 [text-wrap:balance]">
              Reset access
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {resetStep === 'request'
                ? 'We will generate a 6-digit recovery code for your email.'
                : 'Enter the 6-digit code and choose a new password.'}
            </p>
          </div>
        </div>
      )}

      {/* Server Error / Info Banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      {infoMessage && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 px-3.5 py-3 text-sm text-blue-800 dark:text-blue-200"
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Animated Form Body */}
      {view === 'signin' && (
          <form
            key="signin-form"
            onSubmit={handleLoginSubmit}
            noValidate
            className="auth-panel-enter space-y-4"
          >
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="signin-email"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Email address
                </label>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                >
                  Fill demo credentials
                </button>
              </div>
              <input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="demo@kanso.design"
                value={draftEmail}
                onFocus={() => onFocusedFieldChange('email')}
                onBlur={() => onFocusedFieldChange(null)}
                onChange={(e) => {
                  onDraftEmailChange(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'signin-email-error' : undefined}
                className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
              />
              {fieldErrors.email && (
                <p id="signin-email-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {signInMethod === 'password' ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="signin-password"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('reset')}
                    className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    Forgot password?
                  </button>
                </div>
                <div
                  className="relative"
                  onFocus={() => onFocusedFieldChange('password')}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      onFocusedFieldChange(null);
                    }
                  }}
                >
                  <input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={draftPassword}
                    onChange={(e) => {
                      onDraftPasswordChange(e.target.value);
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'signin-password-error' : undefined}
                    className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-11 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => onShowPasswordChange(!showPassword)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-r-lg"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="signin-password-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="signin-otp"
                    className="text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    6-digit verification code
                  </label>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleRequestOtp}
                    className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    {otpSent ? 'Resend code' : 'Send code'}
                  </button>
                </div>
                <input
                  id="signin-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (fieldErrors.otpCode) setFieldErrors((prev) => ({ ...prev, otpCode: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.otpCode)}
                  aria-describedby={fieldErrors.otpCode ? 'signin-otp-error' : undefined}
                  className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 font-[var(--font-mono)] text-sm tracking-[0.25em] tabular-nums text-slate-900 dark:text-slate-100 placeholder:tracking-normal placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                />
                {otpPreview && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                    <span>
                      Test code:{' '}
                      <strong className="font-[var(--font-mono)] tabular-nums text-slate-900 dark:text-white">
                        {otpPreview}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(otpPreview)}
                      className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {fieldErrors.otpCode && (
                  <p id="signin-otp-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.otpCode}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-1">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-600"
                />
                <span>Keep me signed in</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  clearFeedback();
                  setSignInMethod((prev) => (prev === 'password' ? 'otp' : 'password'));
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white min-h-[40px] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                {signInMethod === 'password' ? 'Use one-time code' : 'Use password'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {signInMethod === 'password' ? 'Sign in' : 'Verify & sign in'}
            </button>
          </form>
        )}

        {view === 'signup' && (
          <form
            key="signup-form"
            onSubmit={handleSignupSubmit}
            noValidate
            className="auth-panel-enter space-y-4"
          >
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="Aria Rahman"
                value={draftName}
                onFocus={() => onFocusedFieldChange('name')}
                onBlur={() => onFocusedFieldChange(null)}
                onChange={(e) => {
                  onDraftNameChange(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'signup-name-error' : undefined}
                className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
              />
              {fieldErrors.fullName && (
                <p id="signup-name-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200"
              >
                Work or personal email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="aria@kanso.studio"
                value={draftEmail}
                onFocus={() => onFocusedFieldChange('email')}
                onBlur={() => onFocusedFieldChange(null)}
                onChange={(e) => {
                  onDraftEmailChange(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
              />
              {fieldErrors.email && (
                <p id="signup-email-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="signup-password"
                  className="text-sm font-medium text-slate-800 dark:text-slate-200"
                >
                  Password
                </label>
                {draftPassword && (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {strength.label}
                  </span>
                )}
              </div>
              <div
                className="relative"
                onFocus={() => onFocusedFieldChange('password')}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    onFocusedFieldChange(null);
                  }
                }}
              >
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  value={draftPassword}
                  onChange={(e) => {
                    onDraftPasswordChange(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
                  className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-3.5 pr-11 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => onShowPasswordChange(!showPassword)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-r-lg"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {/* Precision 4-segment password strength indicator */}
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-1 rounded-full transition-colors duration-150 ${
                        idx < strength.score
                          ? strength.score >= 3
                            ? 'bg-blue-600 dark:bg-blue-500'
                            : 'bg-amber-500'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {strength.checks.map((check) => (
                    <div
                      key={check.id}
                      className={`inline-flex items-center gap-1.5 ${
                        check.met
                          ? 'text-slate-800 dark:text-slate-200'
                          : 'text-slate-500 dark:text-slate-500'
                      }`}
                    >
                      <Check
                        className={`h-3 w-3 shrink-0 ${
                          check.met ? 'text-blue-600 dark:text-blue-400' : 'opacity-35'
                        }`}
                        aria-hidden="true"
                      />
                      <span>{check.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {fieldErrors.password && (
                <p id="signup-password-error" role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (fieldErrors.acceptedTerms) {
                      setFieldErrors((prev) => ({ ...prev, acceptedTerms: '' }));
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-700 focus:ring-blue-600"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('terms')}
                    className="font-medium text-slate-900 dark:text-slate-200 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    onClick={() => onOpenLegal('privacy')}
                    className="font-medium text-slate-900 dark:text-slate-200 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    Privacy Policy
                  </button>
                  .
                </span>
              </label>
              {fieldErrors.acceptedTerms && (
                <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.acceptedTerms}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Create account
            </button>
          </form>
        )}

        {view === 'reset' && (
          <div
            key="reset-form"
            className="auth-panel-enter"
          >
            {resetStep === 'request' ? (
              <form onSubmit={handleResetRequestSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    Account email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="demo@kanso.design"
                    value={draftEmail}
                    onChange={(e) => {
                      onDraftEmailChange(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    aria-invalid={Boolean(fieldErrors.email)}
                    className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  />
                  {fieldErrors.email && (
                    <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Send reset code
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetConfirmSubmit} noValidate className="space-y-4">
                {resetPreview && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70 px-3 py-2 text-xs text-slate-700 dark:text-slate-300">
                    <span>
                      Recovery code:{' '}
                      <strong className="font-[var(--font-mono)] tabular-nums text-slate-900 dark:text-white">
                        {resetPreview}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setResetCode(resetPreview)}
                      className="font-medium text-blue-700 dark:text-blue-400 hover:underline"
                    >
                      Apply
                    </button>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reset-code"
                    className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    6-digit recovery code
                  </label>
                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 font-[var(--font-mono)] text-sm tracking-[0.25em] tabular-nums text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  />
                  {fieldErrors.code && (
                    <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.code}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200"
                  >
                    New password
                  </label>
                  <input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={resetNewPassword}
                    onFocus={() => onFocusedFieldChange('newPassword')}
                    onBlur={() => onFocusedFieldChange(null)}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  />
                  {fieldErrors.newPassword && (
                    <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-60 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Update password & sign in
                </button>
              </form>
            )}
          </div>
        )}

      {/* Social Single Sign-On */}
      {view !== 'reset' && (
        <div className="mt-6">
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
            <span className="mx-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">
              or continue with
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isSubmitting || activeSocial !== null}
              onClick={() => handleSocialAuth('google')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {activeSocial === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>Google</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting || activeSocial !== null}
              onClick={() => handleSocialAuth('github')}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {activeSocial === 'github' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              <span>GitHub</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
