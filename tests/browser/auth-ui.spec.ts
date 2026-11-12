import { test, expect } from "@playwright/test";

test("email sign-in validates, protects pending requests and preserves failed drafts", async ({
  page,
}) => {
  await page.goto("/login?callbackUrl=%2Fgroups%2Fexample");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Enter a valid email address", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await page.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let submissions = 0;
  await page.route("**/api/auth/sign-in/email", async (route) => {
    submissions++;
    await pending;
    await route.fulfill({
      status: 401,
      json: {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      },
    });
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: /Signing in/ })).toBeDisabled();
  await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
  release();
  await expect(page.locator('[data-slot="alert"]')).toContainText(
    "Incorrect email or password",
  );
  expect(submissions).toBe(1);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "not-a-real-password",
  );
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await expect(page).toHaveURL(/register\?callbackUrl=%2Fgroups%2Fexample/);
});

test("Google is disabled on both screens and unverified email errors offer recovery", async ({
  page,
}) => {
  let socialRequests = 0;
  await page.route("**/api/auth/sign-in/social", (route) => {
    socialRequests++;
    return route.abort();
  });
  for (const path of ["/register", "/login?callbackUrl=%2Fgroups%2Fexample"]) {
    await page.goto(path);
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeDisabled();
    await expect(google.locator("svg")).toBeVisible();
    await expect(
      page.getByText("Google sign-in is currently unavailable", {
        exact: true,
      }),
    ).toBeVisible();
    await google.dispatchEvent("click");
    expect(socialRequests).toBe(0);
  }
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 403,
      json: { code: "EMAIL_NOT_VERIFIED", message: "Email is not verified" },
    }),
  );
  await page.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Request a verification link" }),
  ).toHaveAttribute("href", "/verify-email?next=%2Fgroups%2Fexample");
});

test("signup confirms verification and preserves the callback without creating an account", async ({
  page,
}) => {
  await page.goto("/register?callbackUrl=%2Fgroups%2Fexample");
  await expect(
    page.getByText("8 to 128 characters", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Preview person");
  await page.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText("Use at least 8 characters", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Password", { exact: true })
    .fill("not-a-real-password");
  let verificationPath: string | undefined;
  await page.route("**/api/auth/sign-up/email", (route) => {
    verificationPath = route.request().postDataJSON().callbackURL;
    return route.fulfill({
      json: {
        token: null,
        user: {
          id: "preview",
          name: "Preview person",
          email: "preview@example.com",
          emailVerified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });
  });
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Check your inbox" }),
  ).toBeVisible();
  expect(verificationPath).toBe("/verify-email?next=%2Fgroups%2Fexample");
  await expect(
    page.getByRole("link", { name: "Request another link" }),
  ).toHaveAttribute("href", verificationPath!);
  await expect(
    page.getByRole("link", { name: "Back to sign in" }),
  ).toHaveAttribute("href", "/login?callbackUrl=%2Fgroups%2Fexample");
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
});

test("signup fits mobile widths and dark mode", async ({ page }) => {
  await page.goto("/register");
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.evaluate(() => localStorage.setItem("theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});
