const ONE_MINUTE_MS = 60 * 1000;

export const RATE_LIMIT_MESSAGES = {
  tooManyRequests: "Too many requests. Please try again shortly.",
  registerIp: "Too many sign-up attempts. Please wait before trying again.",
  registerEmail: "Too many sign-up attempts for this email. Please wait a bit.",
  loginStartIp: "Too many login attempts. Please wait before trying again.",
  loginStartEmail: "Too many login attempts for this email. Please wait a bit.",
  loginResendIp: "Too many OTP resend requests. Please wait before trying again.",
  loginResendChallenge: "You can resend the OTP again after the current code expires.",
  resendVerificationIp: "Too many verification resend attempts. Please wait before trying again.",
  verifyEmailIp: "Too many verification attempts. Please try again shortly.",
} as const;

export const AUTH_RATE_LIMITS = {
  registerIp: {
    scope: "auth:register:ip",
    limit: Number(process.env.RATE_LIMIT_REGISTER_IP_LIMIT ?? 8),
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_IP_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.registerIp,
  },
  registerEmail: {
    scope: "auth:register:email",
    limit: Number(process.env.RATE_LIMIT_REGISTER_EMAIL_LIMIT ?? 4),
    windowMs: Number(process.env.RATE_LIMIT_REGISTER_EMAIL_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.registerEmail,
  },
  loginStartIp: {
    scope: "auth:login:start:ip",
    limit: Number(process.env.RATE_LIMIT_LOGIN_START_IP_LIMIT ?? 12),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_START_IP_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.loginStartIp,
  },
  loginStartEmail: {
    scope: "auth:login:start:email",
    limit: Number(process.env.RATE_LIMIT_LOGIN_START_EMAIL_LIMIT ?? 6),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_START_EMAIL_WINDOW_MS ?? 10 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.loginStartEmail,
  },
  loginResendIp: {
    scope: "auth:login:resend:ip",
    limit: Number(process.env.RATE_LIMIT_LOGIN_RESEND_IP_LIMIT ?? 10),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_RESEND_IP_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.loginResendIp,
  },
  loginResendChallenge: {
    scope: "auth:login:resend:challenge",
    limit: Number(process.env.RATE_LIMIT_LOGIN_RESEND_CHALLENGE_LIMIT ?? 3),
    windowMs: Number(process.env.RATE_LIMIT_LOGIN_RESEND_CHALLENGE_WINDOW_MS ?? 2 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.loginResendChallenge,
  },
  resendVerificationIp: {
    scope: "auth:verify:resend:ip",
    limit: Number(process.env.RATE_LIMIT_VERIFY_RESEND_IP_LIMIT ?? 8),
    windowMs: Number(process.env.RATE_LIMIT_VERIFY_RESEND_IP_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.resendVerificationIp,
  },
  resendVerificationEmail: {
    scope: "auth:verify:resend:email",
    limit: Number(process.env.RATE_LIMIT_VERIFY_RESEND_EMAIL_LIMIT ?? 3),
    windowMs: Number(process.env.RATE_LIMIT_VERIFY_RESEND_EMAIL_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.resendVerificationIp,
  },
  verifyEmailIp: {
    scope: "auth:verify-email:ip",
    limit: Number(process.env.RATE_LIMIT_VERIFY_EMAIL_IP_LIMIT ?? 20),
    windowMs: Number(process.env.RATE_LIMIT_VERIFY_EMAIL_IP_WINDOW_MS ?? 15 * ONE_MINUTE_MS),
    message: RATE_LIMIT_MESSAGES.verifyEmailIp,
  },
} as const;
