import type { AuthView } from '../types/auth';

export type AvatarPose = 'idle' | 'watching' | 'covering' | 'peeking' | 'happy';

export type FocusedAuthField =
  | 'name'
  | 'email'
  | 'password'
  | 'otp'
  | 'code'
  | 'newPassword'
  | null;

export interface AvatarPoseInput {
  view: AuthView;
  focusedField: FocusedAuthField;
  hasPasswordValue: boolean;
  showPassword: boolean;
  isAuthenticated: boolean;
}

export interface AvatarJointTargets {
  headPitch: number;
  headYaw: number;
  leftShoulderPitch: number;
  leftShoulderRoll: number;
  leftElbowPitch: number;
  rightShoulderPitch: number;
  rightShoulderRoll: number;
  rightElbowPitch: number;
  eyeScaleY: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
}

export function deriveAvatarPose(input: AvatarPoseInput): AvatarPose {
  if (input.isAuthenticated) {
    return 'happy';
  }

  if (input.focusedField === 'password' || input.focusedField === 'newPassword') {
    return input.showPassword ? 'peeking' : 'covering';
  }

  if (
    input.focusedField === 'name' ||
    input.focusedField === 'email' ||
    input.focusedField === 'otp' ||
    input.focusedField === 'code'
  ) {
    return 'watching';
  }

  if (input.hasPasswordValue && (input.view === 'signin' || input.view === 'signup')) {
    return input.showPassword ? 'peeking' : 'covering';
  }

  return 'idle';
}

export function getJointTargetsForPose(
  pose: AvatarPose,
  lookProgress = 0.5
): AvatarJointTargets {
  const clampedLook = Math.max(0, Math.min(1, lookProgress));
  const yawFromText = (clampedLook - 0.5) * 0.38;

  switch (pose) {
    case 'covering':
      return {
        headPitch: -0.04,
        headYaw: 0,
        // Arms swing forward & up so palms rest squarely over both visor eyes
        leftShoulderPitch: -2.20,
        leftShoulderRoll: -0.50,
        leftElbowPitch: -0.52,
        rightShoulderPitch: -2.20,
        rightShoulderRoll: 0.50,
        rightElbowPitch: -0.52,
        eyeScaleY: 0.2,
        pupilOffsetX: 0,
        pupilOffsetY: 0,
      };

    case 'peeking':
      return {
        headPitch: 0.04,
        headYaw: 0.14,
        // Left hand stays covering left eye; right hand drops lower to peek
        leftShoulderPitch: -2.20,
        leftShoulderRoll: -0.50,
        leftElbowPitch: -0.52,
        rightShoulderPitch: -1.32,
        rightShoulderRoll: 0.24,
        rightElbowPitch: -0.44,
        eyeScaleY: 1,
        pupilOffsetX: 0.025,
        pupilOffsetY: -0.015,
      };

    case 'watching':
      return {
        headPitch: 0.16,
        headYaw: yawFromText,
        leftShoulderPitch: 0.12,
        leftShoulderRoll: 0.14,
        leftElbowPitch: -0.22,
        rightShoulderPitch: 0.12,
        rightShoulderRoll: -0.14,
        rightElbowPitch: -0.22,
        eyeScaleY: 1,
        pupilOffsetX: (clampedLook - 0.5) * 0.06,
        pupilOffsetY: -0.025,
      };

    case 'happy':
      return {
        headPitch: -0.08,
        headYaw: 0,
        leftShoulderPitch: -0.35,
        leftShoulderRoll: 0.42,
        leftElbowPitch: -0.55,
        rightShoulderPitch: -0.35,
        rightShoulderRoll: -0.42,
        rightElbowPitch: -0.55,
        eyeScaleY: 0.72,
        pupilOffsetX: 0,
        pupilOffsetY: 0.015,
      };

    case 'idle':
    default:
      return {
        headPitch: 0,
        headYaw: 0,
        leftShoulderPitch: 0.08,
        leftShoulderRoll: 0.12,
        leftElbowPitch: -0.16,
        rightShoulderPitch: 0.08,
        rightShoulderRoll: -0.12,
        rightElbowPitch: -0.16,
        eyeScaleY: 1,
        pupilOffsetX: 0,
        pupilOffsetY: 0,
      };
  }
}
