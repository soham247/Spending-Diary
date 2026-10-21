/**
 * Returns true when the email belongs to a placeholder (invited-but-
 * unregistered) user. These addresses use the reserved `.invalid` TLD
 * and must never receive mail, sign up, sign in, or reset a password.
 */
export function isPlaceholderEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at === -1) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "");
  return domain === "invalid" || domain.endsWith(".invalid");
}
