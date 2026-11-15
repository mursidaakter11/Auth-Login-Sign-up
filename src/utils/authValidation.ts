export interface PasswordCheck {
  id: 'length' | 'case' | 'number' | 'symbol';
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  checks: PasswordCheck[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(rawEmail: string): string | null {
  const trimmed = rawEmail.trim();
  if (!trimmed) {
    return 'Email address is required.';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  return null;
}

export function validateFullName(rawName: string): string | null {
  const trimmed = rawName.trim();
  if (!trimmed) {
    return 'Full name is required.';
  }
  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters.';
  }
  if (trimmed.length > 80) {
    return 'Name must be 80 characters or fewer.';
  }
  return null;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    {
      id: 'length',
      label: '8+ characters',
      met: password.length >= 8,
    },
    {
      id: 'case',
      label: 'Upper & lower case',
      met: /[A-Z]/.test(password) && /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Number',
      met: /\d/.test(password),
    },
    {
      id: 'symbol',
      label: 'Symbol',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const metCount = checks.filter((check) => check.met).length;

  let label: PasswordStrength['label'] = 'Weak';
  if (metCount === 2) label = 'Fair';
  if (metCount === 3) label = 'Good';
  if (metCount === 4) label = 'Strong';

  return {
    score: metCount,
    label,
    checks,
  };
}

export function validateLoginForm(fields: {
  email: string;
  password: string;
  method: 'password' | 'otp';
  otpCode?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailError = validateEmail(fields.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (fields.method === 'password') {
    if (!fields.password) {
      errors.password = 'Password is required.';
    }
  } else {
    const code = (fields.otpCode ?? '').trim();
    if (!/^\d{6}$/.test(code)) {
      errors.otpCode = 'Enter the 6-digit verification code.';
    }
  }

  return errors;
}

export function validateSignupForm(fields: {
  fullName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const nameError = validateFullName(fields.fullName);
  if (nameError) {
    errors.fullName = nameError;
  }

  const emailError = validateEmail(fields.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!fields.password) {
    errors.password = 'Create a password to continue.';
  } else {
    const strength = evaluatePasswordStrength(fields.password);
    if (fields.password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    } else if (strength.score < 3) {
      errors.password = 'Include uppercase, lowercase, and a number or symbol.';
    }
  }

  if (!fields.acceptedTerms) {
    errors.acceptedTerms = 'Please accept the Terms of Service to create an account.';
  }

  return errors;
}

export function validateResetConfirmForm(fields: {
  code: string;
  newPassword: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!/^\d{6}$/.test(fields.code.trim())) {
    errors.code = 'Enter the 6-digit reset code.';
  }

  if (!fields.newPassword) {
    errors.newPassword = 'Enter a new password.';
  } else {
    const strength = evaluatePasswordStrength(fields.newPassword);
    if (fields.newPassword.length < 8 || strength.score < 3) {
      errors.newPassword = 'Use at least 8 characters with mixed case and a number or symbol.';
    }
  }

  return errors;
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'KM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function deriveHandle(fullName: string, email: string): string {
  const cleanName = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .join('.');

  if (cleanName) return `@${cleanName.slice(0, 22)}`;

  const emailLocal = email.trim().split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (emailLocal) return `@${emailLocal.slice(0, 22)}`;

  return '@member';
}
