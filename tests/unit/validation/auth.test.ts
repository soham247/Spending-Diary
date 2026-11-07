import { describe, expect, it } from "vitest";
import { loginFormSchema, registerFormSchema } from "@/lib/validation/auth";
import { authFormError } from "@/lib/auth/form-error";

describe("auth form validation", () => {
  it("preserves passwords exactly, including spaces", () => {
    const password = "  a long password  ";
    expect(
      registerFormSchema.parse({
        name: " Priya ",
        email: "priya@example.com",
        password,
      }),
    ).toEqual({ name: "Priya", email: "priya@example.com", password });
  });

  it("applies the signup password policy without composition rules", () => {
    const input = { name: "Priya", email: "priya@example.com" };
    expect(
      registerFormSchema.safeParse({ ...input, password: "a".repeat(9) })
        .success,
    ).toBe(false);
    expect(
      registerFormSchema.safeParse({ ...input, password: "a".repeat(10) })
        .success,
    ).toBe(true);
    expect(
      registerFormSchema.safeParse({ ...input, password: "a".repeat(128) })
        .success,
    ).toBe(true);
    expect(
      registerFormSchema.safeParse({ ...input, password: "a".repeat(129) })
        .success,
    ).toBe(false);
  });

  it("leaves password verification to Better Auth when signing in", () => {
    expect(
      loginFormSchema.parse({ email: "priya@example.com", password: "short" })
        .password,
    ).toBe("short");
  });

  it("rejects missing fields and malformed emails", () => {
    expect(
      loginFormSchema.safeParse({ email: "not-an-email", password: "" })
        .success,
    ).toBe(false);
    expect(
      registerFormSchema.safeParse({
        name: " ",
        email: "priya@example.com",
        password: "long enough",
      }).success,
    ).toBe(false);
  });

  it("uses the auth response message instead of the HTTP status label", () => {
    const cause = Object.assign(new Error("Unauthorized"), {
      error: { code: "EMAIL_NOT_VERIFIED", message: "Email is not verified" },
    });
    expect(authFormError(cause, "Try again")).toBe("Email is not verified");
    expect(authFormError(null, "Try again")).toBe("Try again");
  });
});
