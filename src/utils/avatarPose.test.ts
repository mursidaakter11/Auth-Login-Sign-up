import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAvatarPose, getJointTargetsForPose } from './avatarPose';

test('deriveAvatarPose covers eyes when password field is focused and hidden', () => {
  assert.equal(
    deriveAvatarPose({
      view: 'signin',
      focusedField: 'password',
      hasPasswordValue: false,
      showPassword: false,
      isAuthenticated: false,
    }),
    'covering'
  );
});

test('deriveAvatarPose peeks when password is visible via showPassword', () => {
  assert.equal(
    deriveAvatarPose({
      view: 'signin',
      focusedField: 'password',
      hasPasswordValue: true,
      showPassword: true,
      isAuthenticated: false,
    }),
    'peeking'
  );
});

test('deriveAvatarPose watches input when typing email or name', () => {
  assert.equal(
    deriveAvatarPose({
      view: 'signin',
      focusedField: 'email',
      hasPasswordValue: true,
      showPassword: false,
      isAuthenticated: false,
    }),
    'watching'
  );
  assert.equal(
    deriveAvatarPose({
      view: 'signup',
      focusedField: 'name',
      hasPasswordValue: false,
      showPassword: false,
      isAuthenticated: false,
    }),
    'watching'
  );
});

test('deriveAvatarPose returns happy when authenticated and idle when unfocused with empty password', () => {
  assert.equal(
    deriveAvatarPose({
      view: 'signin',
      focusedField: null,
      hasPasswordValue: false,
      showPassword: false,
      isAuthenticated: true,
    }),
    'happy'
  );
  assert.equal(
    deriveAvatarPose({
      view: 'signin',
      focusedField: null,
      hasPasswordValue: false,
      showPassword: false,
      isAuthenticated: false,
    }),
    'idle'
  );
});

test('getJointTargetsForPose raises both arms in covering pose and lowers right arm in peeking pose', () => {
  const idle = getJointTargetsForPose('idle');
  const covering = getJointTargetsForPose('covering');
  const peeking = getJointTargetsForPose('peeking');

  assert.ok(covering.leftShoulderPitch < -1.5);
  assert.ok(covering.rightShoulderPitch < -1.5);
  assert.ok(peeking.leftShoulderPitch < -1.5);
  assert.ok(peeking.rightShoulderPitch > covering.rightShoulderPitch);
  assert.ok(idle.leftShoulderPitch > 0);
});
