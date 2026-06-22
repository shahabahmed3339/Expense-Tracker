import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  ...(process.env.NODE_ENV !== "production"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true },
        },
      }
    : {}),
});

export function logAudit(
  action: string,
  meta: Record<string, unknown> & { userId?: string; ip?: string },
) {
  logger.info({ audit: true, action, ...meta }, action);
}
