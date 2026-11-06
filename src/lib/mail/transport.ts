import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isPlaceholderEmail } from "@/lib/utils/email";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const mailFrom = process.env.MAIL_FROM ?? "noreply@spendingdiary.app";

// ─── Test mailbox (in-memory mode) ──────────────────────────────────

interface TestMessage {
  to: string;
  subject: string;
  html: string;
}

let testMailbox: TestMessage[] | null = null;

/**
 * Enable in-memory mail capture for tests. Pass null to disable.
 * Throws in production.
 */
export function setTestMailbox(box: TestMessage[] | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Test mailbox cannot be used in production");
  }
  testMailbox = box;
}

export function getTestMailbox(): TestMessage[] | null {
  return testMailbox;
}

// ─── Send helpers ───────────────────────────────────────────────────

async function send(to: string, subject: string, html: string): Promise<void> {
  if (isPlaceholderEmail(to)) {
    console.warn("[mail] Refusing to send to placeholder address:", to);
    return;
  }

  // Test mode: capture synchronously
  if (testMailbox !== null) {
    testMailbox.push({ to, subject, html });
    return;
  }

  await getTransporter().sendMail({
    from: mailFrom,
    to,
    subject,
    html,
  });
}

export async function sendVerificationEmail(opts: {
  to: string;
  url: string;
}): Promise<void> {
  await send(
    opts.to,
    "Verify your email — Spending Diary",
    `<p>Someone created a Spending Diary account with this address.
     If that was you, <a href="${opts.url}">verify your email</a>.
     If not, ignore this email.</p>
     <p>This link expires in 24 hours.</p>`,
  );
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  url: string;
}): Promise<void> {
  await send(
    opts.to,
    "Reset your password — Spending Diary",
    `<p><a href="${opts.url}">Reset your password</a>.
     This link expires in 1 hour and can only be used once.</p>`,
  );
}
