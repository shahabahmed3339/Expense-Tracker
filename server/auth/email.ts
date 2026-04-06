import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload) {
  const from = process.env.EMAIL_FROM;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    process.env.SMTP_SECURE === "true" ||
    (!process.env.SMTP_SECURE && Number.isFinite(port) && port === 465);

  if (from && host && Number.isFinite(port) && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    try {
      console.info("[email:smtp:start]", {
        from,
        to: payload.to,
        subject: payload.subject,
      });

      const response = await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      console.info("[email:smtp:response]", {
        messageId: response.messageId,
        accepted: response.accepted,
        rejected: response.rejected,
      });
    } catch (error) {
      console.error("[email:smtp:error]", error);
      throw error;
    }

    return;
  }

  console.info("[email:dev-fallback]", {
    reason: "Missing SMTP configuration. Set EMAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.",
    payload,
  });
}

export function buildVerificationEmail(name: string | null | undefined, verificationUrl: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  return {
    subject: "Verify your Expense Tracker email",
    text: `${greeting}\n\nVerify your email by visiting this link within 24 hours:\n${verificationUrl}`,
    html: `<p>${greeting}</p><p>Verify your email by clicking the link below within 24 hours.</p><p><a href="${verificationUrl}">Verify email</a></p>`,
  };
}

export function buildLoginOtpEmail(name: string | null | undefined, otpCode: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  return {
    subject: "Your Expense Tracker login code",
    text: `${greeting}\n\nYour login code is ${otpCode}. It expires in 2 minutes.`,
    html: `<p>${greeting}</p><p>Your login code is <strong>${otpCode}</strong>.</p><p>It expires in 2 minutes.</p>`,
  };
}
