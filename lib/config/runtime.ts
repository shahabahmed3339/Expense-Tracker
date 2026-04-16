function readString(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function readNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const APP_CONFIG = {
  name: readString(process.env.NEXT_PUBLIC_APP_NAME, "Expense Tracker"),
  localPort: readNumber(process.env.PORT, 3000),
  localHost: readString(process.env.NEXT_PUBLIC_APP_HOST, "localhost"),
} as const;

export const AUTH_CONFIG = {
  passwordHashRounds: readNumber(process.env.AUTH_PASSWORD_HASH_ROUNDS, 12),
  otpHashRounds: readNumber(process.env.AUTH_OTP_HASH_ROUNDS, 10),
  otpExpiryMinutes: readNumber(process.env.AUTH_OTP_EXPIRY_MINUTES, 2),
  verificationExpiryHours: readNumber(process.env.AUTH_VERIFICATION_EXPIRY_HOURS, 24),
} as const;

export const EMAIL_CONFIG = {
  logoCid: readString(process.env.EMAIL_LOGO_CID, "expense-tracker-logo"),
} as const;

export const VALIDATION_MESSAGES = {
  invalidMonthFormat: "Invalid month format (use YYYY-MM)",
} as const;
