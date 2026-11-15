import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveHandle,
  evaluatePasswordStrength,
  getInitials,
  validateEmail,
  validateFullName,
  validateLoginForm,
  validateResetConfirmForm,
  validateSignupForm,
} from './authValidation';

test('validateEmail handles empty, malformed, and valid addresses', () => {
  assert.equal(validateEmail(''), 'Email address is required.');
  assert.equal(validateEmail('   '), 'Email address is required.');
  assert.equal(validateEmail('invalid-email'), 'Enter a valid email address.');
  assert.equal(validateEmail('user@domain'), 'Enter a valid email address.');
  assert.equal(validateEmail('alex@kanso.design'), null);
});

test('validateFullName enforces minimum and maximum lengths', () => {
  assert.equal(validateFullName(''), 'Full name is required.');
  assert.equal(validateFullName('A'), 'Name must be at least 2 characters.');
  assert.equal(validateFullName('Aria Rahman'), null);
});

test('evaluatePasswordStrength scores all four criteria accurately', () => {
  const weak = evaluatePasswordStrength('abc');
  assert.equal(weak.score, 0);
  assert.equal(weak.label, 'Weak');

  const fair = evaluatePasswordStrength('Abcdefgh');
  assert.equal(fair.score, 2);
  assert.equal(fair.label, 'Fair');

  const good = evaluatePasswordStrength('Abcdef12');
  assert.equal(good.score, 3);
  assert.equal(good.label, 'Good');

  const strong = evaluatePasswordStrength('Kanso2026!');
  assert.equal(strong.score, 4);
  assert.equal(strong.label, 'Strong');
});

test('validateLoginForm validates password and otp login modes', () => {
  const passwordErrors = validateLoginForm({
    email: 'bad',
    password: '',
    method: 'password',
  });
  assert.ok(passwordErrors.email);
  assert.ok(passwordErrors.password);

  const otpErrors = validateLoginForm({
    email: 'demo@kanso.design',
    password: '',
    method: 'otp',
    otpCode: '123',
  });
  assert.equal(otpErrors.email, undefined);
  assert.equal(otpErrors.otpCode, 'Enter the 6-digit verification code.');

  const validOtp = validateLoginForm({
    email: 'demo@kanso.design',
    password: '',
    method: 'otp',
    otpCode: '482910',
  });
  assert.deepEqual(validOtp, {});
});

test('validateSignupForm enforces name, email, strong password, and terms', () => {
  const missing = validateSignupForm({
    fullName: '',
    email: '',
    password: '',
    acceptedTerms: false,
  });
  assert.ok(missing.fullName);
  assert.ok(missing.email);
  assert.ok(missing.password);
  assert.ok(missing.acceptedTerms);

  const weakPass = validateSignupForm({
    fullName: 'Aria Rahman',
    email: 'aria@kanso.studio',
    password: 'onlylowercase',
    acceptedTerms: true,
  });
  assert.ok(weakPass.password);

  const valid = validateSignupForm({
    fullName: 'Aria Rahman',
    email: 'aria@kanso.studio',
    password: 'AriaStudio9!',
    acceptedTerms: true,
  });
  assert.deepEqual(valid, {});
});

test('validateResetConfirmForm validates 6-digit code and new password', () => {
  const invalid = validateResetConfirmForm({ code: '12ab', newPassword: 'short' });
  assert.ok(invalid.code);
  assert.ok(invalid.newPassword);

  const valid = validateResetConfirmForm({ code: '654321', newPassword: 'NewPassword9!' });
  assert.deepEqual(valid, {});
});

test('getInitials and deriveHandle format identity badges cleanly', () => {
  assert.equal(getInitials('Aria Rahman'), 'AR');
  assert.equal(getInitials('Kanso'), 'KA');
  assert.equal(getInitials(''), 'KM');
  assert.equal(deriveHandle('Aria Rahman', 'aria@kanso.studio'), '@aria.rahman');
  assert.equal(deriveHandle('', 'alex@kanso.design'), '@alex');
});
