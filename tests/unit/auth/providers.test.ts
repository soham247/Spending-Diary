import { expect, it, vi } from "vitest";

it("keeps Google disabled even when provider credentials exist", async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "disabled-provider-test-client");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "disabled-provider-test-secret");
  try {
    const { createAuth } = await import("@/lib/auth/auth");
    const auth = createAuth({
      secret: "test-only-secret-at-least-32-characters",
      logger: { disabled: true },
    });
    expect(auth.options.socialProviders?.google).toBeUndefined();
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true);
  } finally {
    vi.unstubAllEnvs();
  }
});
