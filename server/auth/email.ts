import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { createReadStream } from "fs";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    path: string;
    cid: string;
    contentType: string;
  }>;
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
      await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      });
    } catch (error) {
      throw error;
    }

    return;
  }
}

// Alternative email sending method using Gmail API with service account
export async function sendEmailViaGmailAPI(payload: EmailPayload) {
  const clientEmail = process.env.GMAIL_CLIENT_EMAIL;
  const privateKey = process.env.GMAIL_PRIVATE_KEY;
  const projectId = process.env.GMAIL_PROJECT_ID;
  const from = process.env.EMAIL_FROM;

  if (!clientEmail || !privateKey || !projectId || !from) {
    throw new Error(
      "Gmail API configuration missing: GMAIL_CLIENT_EMAIL, GMAIL_PRIVATE_KEY, GMAIL_PROJECT_ID, EMAIL_FROM"
    );
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/gmail.send"],
    });

    const gmail = google.gmail({ version: "v1", auth });

    // Build the email message
    let emailContent = [
      `From: ${from}`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary123"',
      '',
      '--boundary123',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      payload.text,
      '',
      '--boundary123',
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      payload.html,
      '',
      '--boundary123--',
    ].join("\r\n");

    // Handle attachments if provided
    if (payload.attachments && payload.attachments.length > 0) {
      const boundary = "boundary456";
      const lines = [
        `From: ${from}`,
        `To: ${payload.to}`,
        `Subject: ${payload.subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        'Content-Transfer-Encoding: 7bit',
        '',
        payload.html,
        '',
      ];

      for (const attachment of payload.attachments) {
        const fileContent = fs.readFileSync(attachment.path);
        const base64Content = fileContent.toString("base64");
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.contentType}`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        lines.push(`Content-ID: <${attachment.cid}>`);
        lines.push('');
        lines.push(base64Content);
        lines.push('');
      }

      lines.push(`--${boundary}--`);
      emailContent = lines.join("\r\n");
    }

    const encodedMessage = Buffer.from(emailContent)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return;
  } catch (error) {
    throw error;
  }
}

const logoCid = "expense-tracker-logo";

function resolveLogoPath(): string | null {
  const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
  const possiblePaths = [
    path.join(process.cwd(), "public", "Logo.PNG"),
    path.join(process.cwd(), "public", "logo.png"),
    path.join(process.cwd(), "..", "public", "Logo.PNG"),
    path.join(process.cwd(), "..", "public", "logo.png"),
    path.join(currentFileDir, "..", "..", "public", "Logo.PNG"),
    path.join(currentFileDir, "..", "..", "public", "logo.png"),
  ];

  for (const logoPath of possiblePaths) {
    try {
      if (fs.existsSync(logoPath)) {
        return logoPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function getLogoSrc(): string {
  const logoPath = resolveLogoPath();
  if (logoPath) {
    return `cid:${logoCid}`;
  }

  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgZmlsbD0iIzNiODJmNiIgcng9IjE2Ii8+PHRleHQgeD0iNjQiIHk9IjY0IiBmb250LXNpemU9IjY0IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FPC90ZXh0Pjwvc3ZnPg==";
}

function getLogoAttachments() {
  const logoPath = resolveLogoPath();
  if (!logoPath) return undefined;

  return [
    {
      filename: "Logo.PNG",
      path: logoPath,
      cid: logoCid,
      contentType: "image/png",
    },
  ];
}

function buildEmailHtml(options: {
  title: string;
  subtitle: string;
  greeting: string;
  body: string;
  actionText?: string;
  actionUrl?: string;
  code?: string;
  note?: string;
  footerText: string;
}) {
  const logoSrc = getLogoSrc();
  const buttonStyle = [
    "display:inline-block",
    "width:100%",
    "max-width:100%",
    "box-sizing:border-box",
    "padding:0.95rem 1rem",
    "font-size:0.97rem",
    "font-weight:700",
    "color:#ffffff!important",
    "background:linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
    "background-color:#2563eb",
    "border-radius:0.8rem",
    "text-decoration:none!important",
    "text-align:center",
    "box-shadow:0 6px 18px rgba(37, 99, 235, 0.22)",
    "line-height:1.4"
  ].join(";");

  const actionBlock = options.actionUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${options.actionUrl}" target="_blank" rel="noopener noreferrer" style="${buttonStyle}">${options.actionText ?? "Continue"}</a></td></tr></table>`
    : "";
  const codeBlock = options.code
    ? `<div class="otp-code">${options.code}</div>`
    : "";
  const noteBlock = options.note ? `<p class="note">${options.note}</p>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse;
      mso-table-lspace: 0;
      mso-table-rspace: 0;
    }
    .email-wrapper {
      width: 100%;
      background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
      padding: 2rem 0;
    }
    .container {
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 35px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .brand {
      text-align: center;
      padding: 2rem 1.5rem 1rem;
    }
    .brand-mark {
      display: block;
      width: 4rem;
      height: 4rem;
      margin: 0 auto 0.75rem;
      border-radius: 1rem;
    }
    .brand-mark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 1rem;
    }
    .brand-name {
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #334155;
      margin: 0;
    }
    .content {
      padding: 1.5rem 1.5rem 2rem;
    }
    .title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #0f172a;
      margin: 0 0 0.5rem;
      text-align: center;
    }
    .subtitle {
      font-size: 0.95rem;
      line-height: 1.5;
      color: #475569;
      margin: 0 0 1.25rem;
      text-align: center;
    }
    .greeting {
      font-size: 1rem;
      color: #334155;
      margin: 0 0 1rem;
      text-align: left;
    }
    .body {
      color: #475569;
      line-height: 1.7;
      margin: 0 0 1rem;
      font-size: 0.98rem;
      text-align: left;
    }
    .button {
      display: inline-block;
      width: 100%;
      padding: 0.95rem 1rem;
      font-size: 0.97rem;
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 0.8rem;
      text-decoration: none;
      text-align: center;
      box-shadow: 0 6px 18px rgba(37, 99, 235, 0.22);
      margin: 1rem 0;
    }
    .otp-code {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 0.28rem;
      color: #0f172a;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 0.85rem;
      padding: 1.1rem 0.9rem;
      text-align: center;
      margin: 1.5rem 0;
      font-family: 'Courier New', Courier, monospace;
    }
    .note {
      font-size: 0.9rem;
      color: #64748b;
      margin: 1rem 0 0;
      line-height: 1.6;
      text-align: center;
    }
    .footer {
      padding: 1.5rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 0.9rem;
      color: #64748b;
    }
    .link {
      color: #2563eb;
      text-decoration: none;
    }
    .link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-wrapper">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="container">
          <tr>
            <td class="brand">
              <div class="brand-mark">
                <img src="${logoSrc}" alt="Expense Tracker Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 1rem; display: block;" />
              </div>
              <div class="brand-name">Expense Tracker</div>
            </td>
          </tr>
          <tr>
            <td class="content">
              <h1 class="title">${options.title}</h1>
              <p class="subtitle">${options.subtitle}</p>
              <p class="greeting">${options.greeting}</p>
              <div class="body">${options.body}</div>
              ${actionBlock}
              ${codeBlock}
              ${noteBlock}
            </td>
          </tr>
          <tr>
            <td class="footer">${options.footerText}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildVerificationEmail(name: string | null | undefined, verificationUrl: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  return {
    subject: "Verify your Expense Tracker email",
    text: `${greeting}\n\nVerify your email by visiting this link within 24 hours:\n${verificationUrl}\n\nIf you didn't create an account, you can safely ignore this email.`,
    html: buildEmailHtml({
      title: "Verify your email",
      subtitle: "Complete your account setup",
      greeting,
      body: "<p>Click the button below to verify your email address within 24 hours.</p>",
      actionText: "Verify email",
      actionUrl: verificationUrl,
      note: `Or copy and paste this link into your browser:<br><a href="${verificationUrl}" class="link">${verificationUrl}</a>`,
      footerText: "If you didn't create an account, you can safely ignore this email.",
    }),
    attachments: getLogoAttachments(),
  };
}

export function buildLoginOtpEmail(name: string | null | undefined, otpCode: string) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";
  return {
    subject: "Your Expense Tracker login code",
    text: `${greeting}\n\nYour login code is ${otpCode}. It expires in 2 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`,
    html: buildEmailHtml({
      title: "Your login code",
      subtitle: "Enter this code to sign in",
      greeting,
      body: "<p>Use the code below to complete your sign-in.</p>",
      code: otpCode,
      note: "This code expires in 2 minutes.",
      footerText: "If you didn't request this code, you can safely ignore this email.",
    }),
    attachments: getLogoAttachments(),
  };
}
