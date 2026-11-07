import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { isPlaceholderEmail } from "@/lib/utils/email";
import { accountEmail } from "./templates";

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
  text: string;
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

async function send(
  to: string,
  message: ReturnType<typeof accountEmail>,
): Promise<void> {
  if (isPlaceholderEmail(to)) {
    console.warn("[mail] Refusing to send to placeholder address:", to);
    return;
  }

  // Test mode: capture synchronously
  if (testMailbox !== null) {
    testMailbox.push({ to, ...message });
    return;
  }

  await getTransporter().sendMail({
    from: mailFrom,
    to,
    ...message,
  });
}

export async function sendVerificationEmail(opts: {
  to: string;
  url: string;
}): Promise<void> {
  await send(opts.to, accountEmail("verification", opts.url));
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  url: string;
}): Promise<void> {
  await send(opts.to, accountEmail("password-reset", opts.url));
}
