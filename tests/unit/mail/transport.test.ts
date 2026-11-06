import { afterEach, describe, expect, it, vi } from "vitest";
import { accountEmail } from "@/lib/mail/templates";
import { sendPasswordResetEmail, sendVerificationEmail, setTestMailbox } from "@/lib/mail/transport";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn().mockResolvedValue({}) }));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail }) } }));

afterEach(() => {
  setTestMailbox(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("account emails", () => {
  it.each([
    ["verification", "Verify your email", "1 hour"],
    ["password-reset", "Reset your password", "1 hour"],
  ] as const)("renders a minimal %s email with matching plain text", (kind, action, expiry) => {
    const url = "https://example.test/action?token=fixture&callbackURL=%2Fhome";
    const message = accountEmail(kind, url);
    expect(message.subject).toBe(`${action} - Spending Diary`);
    expect(message.subject + message.html + message.text).not.toContain("\u2014");
    expect(message.html).toContain('lang="en"');
    expect(message.html).toContain(`${action}</h1>`);
    expect(message.html.match(/<a /g)).toHaveLength(1);
    expect(message.html).toContain("token=fixture&amp;callbackURL=%2Fhome");
    expect(message.text).toContain(url);
    for (const content of [action, expiry, "ignore this email"]) {
      expect(message.html).toContain(content);
      expect(message.text).toContain(content);
    }
    expect(message.html).not.toMatch(/<img|<script|<form|<style/i);
  });

  it("escapes HTML in action URLs without changing the plain-text link", () => {
    const url = 'https://example.test/action?value="<tag>&other=\'test\'';
    const message = accountEmail("verification", url);
    expect(message.html).toContain("&quot;&lt;tag&gt;&amp;other=&#39;test&#39;");
    expect(message.html).not.toContain("<tag>");
    expect(message.text).toContain(url);
  });

  it("rejects executable link protocols", () => {
    expect(() => accountEmail("verification", "javascript:alert(1)")).toThrow();
  });

  it("sends both text and HTML through SMTP for each email", async () => {
    const opts = { to: "person@example.test", url: "https://example.test/action?token=fixture" };
    await sendVerificationEmail(opts);
    await sendPasswordResetEmail(opts);
    expect(sendMail).toHaveBeenCalledTimes(2);
    for (const [message] of sendMail.mock.calls) {
      expect(message).toMatchObject({ to: opts.to, text: expect.stringContaining(opts.url), html: expect.stringContaining('<html lang="en">') });
    }
  });

  it("refuses placeholder recipients for both email types", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const opts = { to: " Person@SUB.INVALID ", url: "https://example.test/action" };
    await sendVerificationEmail(opts);
    await sendPasswordResetEmail(opts);
    expect(sendMail).not.toHaveBeenCalled();
  });
});
