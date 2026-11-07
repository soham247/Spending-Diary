export function authFormError(cause: unknown, fallback: string): string {
  if (typeof cause === "object" && cause !== null && "error" in cause) {
    const detail = cause.error;
    if (
      typeof detail === "object" &&
      detail !== null &&
      "message" in detail &&
      typeof detail.message === "string"
    )
      return detail.message;
  }
  return cause instanceof Error ? cause.message : fallback;
}
