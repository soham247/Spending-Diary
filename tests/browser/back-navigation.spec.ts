import { test, expect, type Locator } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);

async function expectIconControl(control: Locator) {
  await expect(control).toBeVisible();
  await expect(control.locator("svg[aria-hidden='true']")).toHaveCount(1);
  expect((await control.innerText()).trim()).toBe("");
  const size = await control.boundingBox();
  expect(size!.width).toBeGreaterThanOrEqual(44);
  expect(size!.height).toBeGreaterThanOrEqual(44);
}

test("auth back arrows are icon-only and preserve the sign-in destination", async ({
  page,
}) => {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, target] of [
      [
        "/register?callbackUrl=%2Fgroups%2Fexample",
        "/login?callbackUrl=%2Fgroups%2Fexample",
      ],
      ["/forgot-password", "/login"],
      ["/reset-password", "/login"],
      [
        "/verify-email?next=%2Fgroups%2Fexample",
        "/login?callbackUrl=%2Fgroups%2Fexample",
      ],
      ["/verify-email?error=token-invalid", "/login?callbackUrl=%2Fhome"],
    ]) {
      await page.goto(path);
      const back = page.getByRole("link", {
        name: "Back to sign in",
        exact: true,
      });
      await expectIconControl(back);
      await expect(back).toHaveAttribute("href", target);
      await back.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new URL(target, values.base_url).href);
      await expectIconControl(
        page.getByRole("link", { name: "Back to home", exact: true }),
      );
    }
  }
});

test("detail back arrows work for deep links and unavailable expenses", async ({
  page,
  context,
}) => {
  const cookie = values.owner_cookie;
  const separator = cookie.indexOf("=");
  await context.addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: values.base_url,
    },
  ]);
  const response = await context.request.patch("/api/me", {
    data: {
      completeOnboarding: true,
      notificationPrefs: { pushPrompted: true },
    },
  });
  expect(response.ok()).toBe(true);

  for (const [path, label, target] of [
    ["/groups/" + values.group_id, "Back to groups", "/groups"],
    ["/friends/" + values.friend_id, "Back to friends", "/friends"],
    ["/expenses/missing", "Back to expenses", "/expenses"],
    [
      "/expenses/missing?returnTo=https%3A%2F%2Fexample.com",
      "Back to expenses",
      "/expenses",
    ],
    [
      "/expenses/missing?returnTo=%2Fexpenses%3Fmonth%3D2025-02%26kind%3DPERSONAL",
      "Back to expenses",
      "/expenses?month=2025-02&kind=PERSONAL",
    ],
  ]) {
    await page.goto(path);
    const back = page.getByRole("link", { name: label, exact: true });
    await expectIconControl(back);
    await expect(back).toHaveAttribute("href", target);
    await expect(
      page
        .locator("#main header")
        .getByRole("button", { name: "Toggle navigation" }),
    ).toHaveCount(0);
    await back.click();
    await expect(page).toHaveURL(new URL(target, values.base_url).href);
  }
});

test("expense step back arrow keeps the draft and returns focus", async ({
  page,
  context,
}) => {
  const cookie = values.owner_cookie;
  const separator = cookie.indexOf("=");
  await context.addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: values.base_url,
    },
  ]);
  await page.goto("/expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Amount (INR)").fill("123.45");
  await page.getByLabel("What was it for?").fill("Back navigation draft");
  const people = page.getByRole("button", { name: "Change people or group" });
  await people.click();
  const back = page.getByRole("button", {
    name: "Back to expense",
    exact: true,
  });
  await expectIconControl(back);
  await back.click();
  await expect(people).toBeFocused();
  await expect(page.getByLabel("Amount (INR)")).toHaveValue("123.45");
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Back navigation draft",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
});
