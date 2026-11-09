import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);
async function login(context: BrowserContext, role: string) {
  const cookie = values[role + "_cookie"]!;
  const separator = cookie.indexOf("=");
  await context.addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: values.base_url!,
    },
  ]);
  const response = await context.request.patch("/api/me", {
    data: {
      completeOnboarding: true,
      notificationPrefs: { pushPrompted: true },
    },
  });
  expect(response.ok()).toBe(true);
}

test("email privacy persists, stale results cannot connect, and private links require acceptance", async ({
  page,
  context,
  browser,
}) => {
  await login(context, "discovery");
  const recipientContext = await browser.newContext({
    baseURL: values.base_url!,
  });
  try {
    await login(recipientContext, "outsider");
    const recipient = await recipientContext.newPage();
    const target = (
      await (await recipientContext.request.get("/api/me")).json()
    ).data as { name: string; email: string; id: string };
    await recipient.goto("/settings");
    const preference = recipient.getByRole("switch", {
      name: "Find me by email",
    });
    await expect(preference).not.toBeChecked();
    await page.goto("/friends");
    await page.getByRole("button", { name: "Add friend", exact: true }).click();
    const search = page.getByRole("searchbox", {
      name: "Search by name or full email",
    });
    await search.fill(target.email);
    await expect(
      page.getByText("No matching person found.", { exact: true }),
    ).toBeVisible();
    await preference.click();
    await expect(preference).toBeChecked();
    await recipient.reload();
    await expect(preference).toBeChecked();
    await search.fill("no-match-browser@example.test");
    await expect(
      page.getByText("No matching person found.", { exact: true }),
    ).toBeVisible();
    await search.fill(target.email);
    await expect(
      page.getByRole("button", { name: "Send friend request", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(target.email, { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Send friend request", exact: true })
      .click();
    await expect(
      page.getByText("Request pending", { exact: true }).first(),
    ).toBeVisible();
    await preference.click();
    await expect(preference).not.toBeChecked();
    await recipient.reload();
    await expect(preference).not.toBeChecked();
    const stale = await context.request.post("/api/friends/requests", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: { userId: target.id, email: target.email },
    });
    expect(stale.status()).toBe(404);
    await recipient.goto("/friends");
    await expect(
      recipient.getByRole("button", { name: "Accept", exact: true }),
    ).toHaveCount(0);
    const invitation = await recipientContext.request.post("/api/invites", {
      headers: { "Idempotency-Key": crypto.randomUUID() },
      data: { type: "PERSONAL" },
    });
    expect(invitation.status()).toBe(201);
    const link = (await invitation.json()).data as { token: string };
    await page.goto("/j/" + link.token);
    await expect(
      page.getByRole("heading", { name: "Connect with " + target.name }),
    ).toBeVisible();
    await expect(page.getByText(target.email, { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Send friend request", exact: true })
      .click();
    await expect(page).toHaveURL(/\/friends$/);
    const before = (await (await context.request.get("/api/friends")).json())
      .data as { id: string }[];
    expect(before.some((friend) => friend.id === target.id)).toBe(false);
    await recipient.reload();
    await recipient
      .getByRole("button", { name: "Accept", exact: true })
      .click();
    await expect(
      recipient.getByText("Friend request accepted", { exact: true }),
    ).toBeVisible();
    const after = (await (await context.request.get("/api/friends")).json())
      .data as { id: string }[];
    expect(after.some((friend) => friend.id === target.id)).toBe(true);
  } finally {
    await recipientContext.close();
  }
});

test("searching and generating an invitation preserves an unfinished expense", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  await page.goto("/expenses/new");
  await page.getByLabel("Amount (INR)").fill("91.23");
  await page.getByLabel("What was it for?").fill("Keep this expense draft");
  await page.getByRole("button", { name: "Change people or group" }).click();
  await page
    .getByLabel("Find people or groups")
    .fill("missing-browser@example.test");
  await expect(
    page.getByText("No matching person found.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Invite to Spending Diary", exact: true })
    .click();
  await expect(page.getByLabel("Invite link", { exact: true })).toHaveValue(
    /\/j\/[a-f0-9]{64}$/,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.sharedInvite = data.url;
      },
    }),
  );
  await page
    .getByRole("button", { name: "Share invite link", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared-invite",
    await page.getByLabel("Invite link", { exact: true }).inputValue(),
  );
  await page.screenshot({
    path: ".postman/local/friend-search-in-expense.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Back to expense", exact: true })
    .click();
  await expect(page.getByLabel("Amount (INR)")).toHaveValue("91.23");
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Keep this expense draft",
  );
});
