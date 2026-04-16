import { AUTH_CONFIG, APP_CONFIG } from "@/lib/config/runtime";

export const AUTH_API_MESSAGES = {
  invalidInput: "Invalid input",
  invalidRequest: "Invalid request",
  invalidCredentials: "Invalid email or password",
  verificationRequired: "Please verify your email before signing in",
  emailRequired: "Email is required",
  missingToken: "Missing token",
  verificationLinkInvalid: "Verification link is invalid or expired",
  otpChallengeInvalid: "OTP challenge is invalid",
  registrationFailed: "Registration failed",
  loginStartFailed: "Unable to start login",
  loginResendFailed: "Unable to resend OTP",
  verificationResendFailed: "Unable to resend verification email",
  verificationFailed: "Verification failed",
  emailAlreadyRegistered: "Email already registered",
} as const;

export const AUTH_EMAIL_COPY = {
  verificationSubject: `Verify your ${APP_CONFIG.name} email`,
  otpSubject: `Your ${APP_CONFIG.name} login code`,
  verificationFooter: "If you didn't create an account, you can safely ignore this email.",
  otpFooter: "If you didn't request this code, you can safely ignore this email.",
} as const;

export const AUTH_TIMING = {
  otpExpiryMinutes: AUTH_CONFIG.otpExpiryMinutes,
  verificationExpiryHours: AUTH_CONFIG.verificationExpiryHours,
} as const;
