const DUMMY_ORIGIN = "https://app.spendingdiary.invalid";

/**
 * Returns a same-origin path from an untrusted redirect target, or the
 * fallback when the target is suspicious. Prevents open-redirect attacks.
 */
export function safeRedirect(to: unknown, fallback = "/home"): string {
  if (typeof to !== "string" || to.length === 0) return fallback;

  // Control characters anywhere (tabs, newlines, etc.)
  if (/[\t\n\r\0]/.test(to)) return fallback;

  // Leading backslash or double slash → protocol-relative or UNC
  if (/^[/\\]{2}|^\\/.test(to)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(to, DUMMY_ORIGIN);
  } catch {
    return fallback;
  }

  if (parsed.origin !== DUMMY_ORIGIN) return fallback;

  // Re-encode and compare: catches /%2f and similar tricks
  const result = parsed.pathname + parsed.search + parsed.hash;
  if (!result.startsWith("/")) return fallback;
  // After normalization, /.//evil.com becomes //evil.com — block it too
  if (result.startsWith("//")) return fallback;

  return result;
}
