import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Profile, UpdateProfileInput } from "@/lib/validation/profile";

const environment = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  environment.values.map(({ key, value }) => [key, value]),
);

async function setup(page: Page) {
  const cookie = values.owner_cookie;
  const separator = cookie.indexOf("=");
  await page.context().addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: values.base_url,
    },
  ]);
  const state: {
    failProfile: boolean;
    failDevices: boolean;
    emptyDevices: boolean;
    patches: UpdateProfileInput[];
    profile: Profile;
  } = {
    failProfile: false,
    failDevices: false,
    emptyDevices: false,
    patches: [] as UpdateProfileInput[],
    profile: {
      id: "settings-preview",
      name: "Aditi Sharma",
      email: "aditi@example.test",
      image: null,
      phone: null,
      upiId: "aditi@bank",
      defaultCurrency: "INR",
      onboardedAt: "2026-11-09T00:00:00Z",
      discoverableByEmail: false,
      notificationPrefs: {
        expenseCreated: true,
        expenseUpdated: true,
        expenseDeleted: true,
        expenseRestored: true,
        settlementCreated: true,
        settlementDeleted: true,
        inviteClaimed: true,
        pushPrompted: true,
      },
    } satisfies Profile,
  };
  await page.route("**/api/me", async (route) => {
    if (route.request().method() === "PATCH") {
      const patch = route.request().postDataJSON() as UpdateProfileInput;
      state.patches.push(patch);
      if (state.failProfile) {
        await route.fulfill({
          status: 503,
          json: { error: { code: "UNAVAILABLE", message: "Please try again" } },
        });
        return;
      }
      state.profile = { ...state.profile, ...patch };
    }
    await route.fulfill({ json: { data: state.profile } });
  });
  await page.route("**/api/auth/list-sessions", async (route) => {
    await route.fulfill(
      state.failDevices
        ? {
            status: 503,
            json: { code: "UNAVAILABLE", message: "Couldn't load devices" },
          }
        : {
            json: state.emptyDevices
              ? []
              : [
                  {
                    id: "sample-device",
                    token: "sample-token",
                    userAgent:
                      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
                    createdAt: "2026-11-09T00:00:00Z",
                  },
                ],
          },
    );
  });
  return state;
}

test("settings follows the app layout and aligns insights on mobile", async ({
  page,
}) => {
  await setup(page);
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue("Aditi Sharma");
    for (const theme of ["Light", "Dark"]) {
      await page.getByRole("radio", { name: theme, exact: true }).click();
      await expect(
        page.getByRole("radio", { name: theme, exact: true }),
      ).toBeChecked();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const text of [
        "Your profile, repayment details and preferences",
        "Notification and privacy switches save automatically",
        "System follows your device’s appearance",
        "You’ll confirm before anything is removed",
        "How friends recognize you and send repayments",
        "Choose how people can find you",
      ]) {
        await expect(page.getByText(text, { exact: true })).toHaveCount(0);
      }
      const link = page.getByRole("link", { name: "View spending insights" });
      await link.scrollIntoViewIfNeeded();
      if (width < 640) {
        const textStart = await link.evaluate((element) => {
          const text = Array.from(element.childNodes).find(
            (node) =>
              node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
          );
          if (!text) throw new Error("Insights label missing");
          const range = document.createRange();
          range.selectNodeContents(text);
          return range.getBoundingClientRect().left;
        });
        const headingStart = await page
          .getByRole("heading", { name: "Profile", exact: true })
          .evaluate((element) => element.getBoundingClientRect().left);
        expect(Math.abs(textStart - headingStart)).toBeLessThanOrEqual(2);
      }
    }
  }
});

test("profile keeps edits on failure and resets after a successful retry", async ({
  page,
}) => {
  const state = await setup(page);
  state.failProfile = true;
  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Save profile", exact: true });
  await expect(save).toBeDisabled();
  await page.getByLabel("Display name").fill("Aditi S");
  await save.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Couldn't save" }),
  ).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveValue("Aditi S");
  state.failProfile = false;
  await save.click();
  await expect(save).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Profile saved" }),
  ).toBeVisible();
  expect(state.patches.at(-1)).toEqual({
    name: "Aditi S",
    phone: null,
    upiId: "aditi@bank",
  });
});

test("privacy and notification saves preserve an unsaved profile", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/settings");
  await expect(page.getByLabel("Display name")).toHaveValue("Aditi Sharma");
  await page.getByLabel("Display name").fill("Unsaved name");
  const privacy = page.getByRole("switch", {
    name: "Find me by email",
    exact: true,
  });
  await privacy.click();
  await expect(privacy).toBeChecked();
  await expect(page.getByLabel("Display name")).toHaveValue("Unsaved name");
  const notification = page.getByRole("switch", {
    name: "Expenses added",
    exact: true,
  });
  await notification.click();
  await expect(notification).not.toBeChecked();
  expect(state.patches.at(-1)?.notificationPrefs?.expenseCreated).toBe(false);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save profile", exact: true }),
  ).toBeDisabled();
});

test("theme choice supports the keyboard and survives reload", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/settings");
  const light = page.getByRole("radio", { name: "Light", exact: true });
  await light.click();
  await page.keyboard.down("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await page.keyboard.up("ArrowRight");
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
});

test("blocked notifications show browser guidance without an enable action", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
  });
  await page.goto("/settings");
  const notifications = page.getByRole("region", {
    name: "Notifications",
    exact: true,
  });
  await expect(
    notifications.getByText("Notifications are blocked.", { exact: false }),
  ).toBeVisible();
  await expect(
    notifications.getByRole("button", { name: "Enable notifications" }),
  ).toHaveCount(0);
});

test("device failures can be retried and the empty state is explicit", async ({
  page,
}) => {
  const state = await setup(page);
  state.failDevices = true;
  await page.goto("/settings");
  const devices = page.getByRole("region", {
    name: "Signed-in devices",
    exact: true,
  });
  await expect(
    devices.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  state.failDevices = false;
  state.emptyDevices = true;
  await devices.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(devices.getByText("No signed-in devices to show")).toBeVisible();
});

test("deletion remains open during a request and after failure", async ({
  page,
}) => {
  await setup(page);
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/me/anonymize", async (route) => {
    await pending;
    await route.fulfill({
      status: 403,
      json: {
        error: {
          code: "NOT_ALLOWED",
          message: "Check your password and try again",
        },
      },
    });
  });
  await page.goto("/settings");
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("button", { name: /Google/ })).toHaveCount(0);
  await dialog
    .getByLabel("Current password", { exact: false })
    .fill("fictional-test-password");
  await dialog
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Deleting…", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Check your password and try again",
  );
  await expect(
    dialog.getByLabel("Current password", { exact: false }),
  ).toHaveValue("");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
});
