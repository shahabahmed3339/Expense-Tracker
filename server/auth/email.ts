type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(payload: EmailPayload) {
  const from = process.env.EMAIL_FROM;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && from) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      console.info("[email:resend:start]", {
        from,
        to: payload.to,
        subject: payload.subject,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
        signal: controller.signal,
      });

      const responseText = await response.text();
      console.info("[email:resend:response]", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });

      if (!response.ok) {
        throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("[email:resend:error]", error);
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    return;
  }

  console.info("[email:dev-fallback]", payload);
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
