import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);

async function prepare(context: BrowserContext) {
  const cookie = values.owner_cookie!;
  const separator = cookie.indexOf("=");
  await context.addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: values.base_url!,
    },
  ]);
  expect(
    (
      await context.request.patch("/api/me", {
        data: {
          completeOnboarding: true,
          notificationPrefs: { pushPrompted: true },
        },
      })
    ).ok(),
  ).toBe(true);
}

test("shared details distinguish paid and share, explain changes and keep Edit icon-only", async ({
  page,
  context,
}) => {
  await prepare(context);
  const input = {
    description: "Dinner at Martin's",
    category: "Food",
    date: "2026-11-09",
    currency: "INR",
    amount: 120000,
    splitType: "EXACT",
    participants: [
      { userId: values.owner_id, paid: 30000, owed: 60000 },
      { userId: values.friend_id, paid: 90000, owed: 60000 },
    ],
    notes: "Dinner after the beach",
  };
  const created = await context.request.post("/api/expenses", {
    data: input,
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()).data;
  const detail = (
    await (await context.request.get("/api/expenses/" + id)).json()
  ).data;
  const edited = await context.request.patch("/api/expenses/" + id, {
    data: {
      ...input,
      version: detail.version,
      amount: 150000,
      participants: [
        { userId: values.owner_id, paid: 60000, owed: 75000 },
        { userId: values.friend_id, paid: 90000, owed: 75000 },
      ],
    },
  });
  expect(edited.ok()).toBe(true);
  await page.goto(
    "/expenses/" + id + "?returnTo=%2Fexpenses%3Fmonth%3D2026-11",
  );
  await expect(
    page.getByRole("heading", { name: input.description }),
  ).toBeVisible();
  await expect(
    page.getByText("Your share", { exact: true }).locator(".."),
  ).toContainText("750");
  await expect(
    page.getByText("You paid", { exact: true }).locator(".."),
  ).toContainText("600");
  await expect(
    page.getByRole("heading", { name: "Split by custom amounts" }),
  ).toBeVisible();
  await expect(page.getByText("9 Nov 2026", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Added by you on", { exact: false }),
  ).toBeVisible();
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  await expect(edit.locator("svg[aria-hidden=true]")).toHaveCount(1);
  expect((await edit.innerText()).trim()).toBe("");
  expect((await edit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const changes = page.getByRole("button", { name: /Show changes/ }).first();
  await expect(changes).toContainText(/Bill total:.*1,200.*1,500/);
  await changes.click();
  await expect(changes).not.toContainText("Bill total:");
  await expect(page.getByText("You — share", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Dinner after the beach", { exact: true }),
  ).toBeVisible();
  await changes.click();
  await expect(changes).toContainText(/Bill total:.*1,200.*1,500/);
  for (const [width, theme] of [
    [360, "light"],
    [1440, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((mode) => {
      document.documentElement.classList.toggle("dark", mode === "dark");
    }, theme);
    await expect(edit).toBeVisible();
    await page
      .locator("[data-page-scroll]")
      .evaluate((element) => element.scrollTo({ top: 0 }));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.postman/local/expense-detail-${theme}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("link", { name: "Back to expenses", exact: true })
    .click();
  await expect(page).toHaveURL(/\/expenses\?month=2026-11$/);
});

test("payer-only and percentage allocations remain clear", async ({
  page,
  context,
}) => {
  await prepare(context);
  for (const splitType of ["EQUAL", "PERCENTAGE", "SHARES"] as const) {
    const input = {
      description: "Detail allocation " + splitType + Date.now(),
      category: "Food",
      date: "2026-11-09",
      currency: "INR",
      amount: 90000,
      splitType,
      groupId: values.group_id,
      participants: [
        {
          userId: values.owner_id,
          paid: 90000,
          includedInSplit: false,
          ...(splitType === "PERCENTAGE"
            ? { percentage: 0 }
            : splitType === "SHARES"
              ? { shares: 0 }
              : {}),
        },
        {
          userId: values.friend_id,
          paid: 0,
          ...(splitType === "PERCENTAGE"
            ? { percentage: 100 }
            : splitType === "SHARES"
              ? { shares: 1 }
              : {}),
        },
      ],
    };
    const created = await context.request.post("/api/expenses", {
      data: input,
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    expect(created.ok()).toBe(true);
    const { id } = (await created.json()).data;
    await page.goto("/expenses/" + id);
    await expect(
      page.getByText("Your share", { exact: true }).locator(".."),
    ).toContainText("No share");
    await expect(
      page.getByText("You paid", { exact: true }).locator(".."),
    ).toContainText("900");
    const label =
      splitType === "EQUAL"
        ? "Split equally between 1 person"
        : splitType === "PERCENTAGE"
          ? "Split by percentage"
          : "Split by shares";
    const section = page
      .getByRole("heading", { name: label, exact: true })
      .locator("..");
    await expect(section.getByText("You", { exact: true })).toHaveCount(0);
    if (splitType !== "EQUAL")
      await expect(
        section.getByText(splitType === "PERCENTAGE" ? "100%" : "1 share", {
          exact: true,
        }),
      ).toBeVisible();
    await expect(page.getByRole("link", { name: /^Postman / })).toBeVisible();
  }
});

test("personal details stay simple and history failure is isolated", async ({
  page,
  context,
}) => {
  await prepare(context);
  const created = await context.request.post("/api/expenses", {
    data: {
      description: "Personal details " + Date.now(),
      category: "Food",
      date: "2026-11-09",
      currency: "INR",
      amount: 12500,
      splitType: "EQUAL",
      participants: [{ userId: values.owner_id, paid: 12500 }],
    },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()).data;
  await page.route("**/api/activity?*", (route) =>
    route.fulfill({
      status: 500,
      json: { error: { code: "INTERNAL", message: "Unavailable" } },
    }),
  );
  await page.goto("/expenses/" + id);
  await expect(page.getByText("Just for you", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Amount", { exact: true }).locator(".."),
  ).toContainText("125");
  await expect(
    page.getByRole("heading", { name: "Paid by", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Your share", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Couldn't load expense history. Try again."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeEnabled();
  await page.unroute("**/api/activity?*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText(/added this expense/)).toBeVisible();
});
