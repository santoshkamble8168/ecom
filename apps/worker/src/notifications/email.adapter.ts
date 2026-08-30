import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string | null;
  html: string;
}

export function createMailTransport(): Transporter {
  const host = process.env.SMTP_HOST ?? "localhost";
  const port = Number(process.env.SMTP_PORT ?? 1025);
  const user = process.env.SMTP_USER;
  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD } : undefined,
  });
}

export async function sendEmail(transport: Transporter, message: EmailMessage): Promise<string | undefined> {
  const from = process.env.SMTP_FROM ?? "ECOM <noreply@ecom.local>";
  const info = await transport.sendMail({
    from,
    to: message.to,
    subject: message.subject ?? "(no subject)",
    html: message.html,
  });
  return typeof info.messageId === "string" ? info.messageId : undefined;
}
