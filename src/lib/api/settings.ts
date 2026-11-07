import { authClient } from "@/lib/auth/auth-client";
import { responseData } from "./client";
export async function apiListSessions() {
  const result = await authClient.listSessions();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export async function apiRevokeSession(token: string) {
  const result = await authClient.revokeSession({ token });
  if (result.error) throw new Error(result.error.message);
}
export const apiAnonymizeAccount = (password?: string) =>
  fetch("/api/me/anonymize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  }).then(responseData<{ anonymized: boolean }>);
