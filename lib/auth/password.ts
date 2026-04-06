export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
};

export function validatePassword(password: string) {
  const checks = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  return {
    checks,
    isValid: Object.values(checks).every(Boolean),
  };
}

export function getPasswordValidationMessage(password: string) {
  const { checks } = validatePassword(password);
  if (Object.values(checks).every(Boolean)) return null;

  return "Password must be at least 8 characters and include upper, lower, number, and special character.";
}
