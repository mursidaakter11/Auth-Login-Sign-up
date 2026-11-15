export type AuthView = 'signin' | 'signup' | 'reset';

export type SignInMethod = 'password' | 'otp';

export type SocialProvider = 'google' | 'github';

export type LegalTopic = 'terms' | 'privacy' | 'security' | null;

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  authMethod: string;
  createdAt: string;
  lastSignedInAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}
