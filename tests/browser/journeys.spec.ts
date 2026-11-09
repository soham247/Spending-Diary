import {
  test,
  expect,
  type BrowserContext,
  type APIRequestContext,
} from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);
const base = values.base_url!;
async function login(context: BrowserContext, role = "owner") {
  const cookie = values[role + "_cookie"]!;
  const separator = cookie.indexOf("=");
  await context.addCookies([
    {
      name: cookie.slice(0, separator),
      value: cookie.slice(separator + 1),
      url: base,
    },
  ]);
}
async function completeProfile(request: APIRequestContext) {
  const response = await request.patch("/api/me", {
    data: {
      completeOnboarding: true,
      notificationPrefs: { pushPrompted: true },
    },
  });
  expect(response.ok()).toBe(true);
}
function expense(description: string, owner = values.owner_id!) {
  return {
    description,
    amount: 12345,
    category: "Food",
    currency: "INR",
    date: "2026-10-29",
    splitType: "EQUAL",
    participants: [{ userId: owner, paid: 12345 }],
  };
}
test("unauthenticated app pages redirect to sign-in", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login\?/);
  await expect(
    page.getByRole("button", { name: /Continue with Google/ }),
  ).toBeVisible();
});

test("retired pages and the expense creation URL are no longer served", async ({
  request,
}) => {
  for (const path of ["/expense", "/analytics", "/profile", "/pricing"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  }
  const response = await request.post("/api/expenses/create", { data: {} });
  expect(response.status()).toBe(405);
});

test("my spending defaults to month-to-date and supports date filters on mobile", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const description = "Spending date filter " + Date.now();
  const response = await context.request.post("/api/expenses", {
    data: { ...expense(description), date: "2025-02-14" },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/expenses");
  await expect(
    page.getByRole("tab", { name: "My spending", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "You spent this month" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: description })).toHaveCount(0);
  await page.getByLabel("From", { exact: true }).fill("2025-02-14");
  await page.getByLabel("To", { exact: true }).fill("2025-02-14");
  await expect(
    page.getByRole("region", { name: "Your spending total" }),
  ).toContainText("123.45");
  await expect(page.getByRole("link", { name: description })).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/personal-spending-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("From", { exact: true }).fill("2025-02-15");
  await expect(
    page.getByRole("alert").filter({ hasText: "Choose valid dates" }),
  ).toBeVisible();
  await page.getByLabel("To", { exact: true }).fill("2025-02-15");
  await expect(
    page.getByText("No spending in this date range.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "This month", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You spent this month" }),
  ).toBeVisible();
});
test("insights renders the upgraded spending chart on mobile", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const response = await context.request.post("/api/expenses", {
    data: { ...expense("Browser chart compatibility"), date: "2025-03-12" },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/insights");
  await page.getByLabel("Month", { exact: true }).fill("2025-03");
  await expect(page.getByText(/You spent/)).toContainText("123.45");
  await expect(page.locator(".recharts-pie-sector").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/dependencies-insights-mobile.png",
    fullPage: true,
  });
});

test("onboarding saves name and optional UPI ID", async ({ page, context }) => {
  await login(context, "friend");
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Welcome to Spending Diary" }),
  ).toBeVisible();
  await page.getByLabel("Display name").fill("Browser friend");
  await page.getByLabel("UPI ID (optional)").fill("browser@upi");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Where you stand" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now" }).click();
});
test("personal expense create, edit, delete and undo work on mobile", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const description = "Browser personal " + Date.now();
  await page.goto("/expenses/new");
  await page.getByLabel("Amount (INR)").fill("1,200.50");
  await page.getByLabel("What was it for?").fill(description);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/[^/]+$/);
  await expect(page.getByRole("heading", { name: description })).toBeVisible();
  await expect(page.getByText(/1,200\.50/).first()).toBeVisible();
  await page.screenshot({
    path: ".postman/local/v2-expense-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("What was it for?").fill(description + " edited");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: description + " edited" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("link", { name: description + " edited" }),
  ).toBeVisible();
});
test("an edit conflict preserves the draft until latest is loaded", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const response = await context.request.post("/api/expenses", {
    data: expense("Browser conflict"),
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const { data } = (await response.json()) as { data: { id: string } };
  await page.goto("/expenses/" + data.id + "/edit");
  await page.getByLabel("What was it for?").fill("Unsaved browser draft");
  expect(
    (
      await context.request.patch("/api/expenses/" + data.id, {
        data: { version: 1, description: "Changed elsewhere" },
      })
    ).ok(),
  ).toBe(true);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByText("This expense changed while you were editing."),
  ).toBeVisible();
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Unsaved browser draft",
  );
  await page.getByRole("button", { name: "Load latest" }).click();
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Changed elsewhere",
  );
});
test("a signed-in invite claim brings placeholder history into the browser", async ({
  context,
  browser,
}) => {
  await login(context);
  const response = await context.request.post("/api/friends", {
    data: { name: "Browser placeholder" },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const placeholder = (await response.json()).data.id as string;
  expect(
    (
      await context.request.post("/api/expenses", {
        data: {
          ...expense("Browser placeholder history"),
          participants: [
            { userId: values.owner_id, paid: 12345 },
            { userId: placeholder, paid: 0 },
          ],
        },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).ok(),
  ).toBe(true);
  const invitation = await context.request.post("/api/invites", {
    data: { type: "DIRECT", placeholderId: placeholder },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  const token = (await invitation.json()).data.token as string;
  const other = await browser.newContext({ baseURL: base });
  await login(other, "friend");
  await completeProfile(other.request);
  const claimPage = await other.newPage();
  await claimPage.goto("/j/" + token);
  await expect(
    claimPage.getByRole("heading", {
      name: /added you as Browser placeholder/,
    }),
  ).toBeVisible();
  await claimPage.getByRole("button", { name: "Claim your history" }).click();
  await expect(claimPage).toHaveURL(new RegExp("/friends/" + values.owner_id));
  await expect(
    claimPage.getByRole("link", { name: /Browser placeholder history/ }),
  ).toBeVisible();
  await other.close();
});
test("group creation and shared split preview work without horizontal overflow in dark mode", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const name = "Browser group " + Date.now();
  await page.goto("/groups");
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  await page.getByLabel("Group name").fill(name);
  await page.getByRole("button", { name: "Create group", exact: true }).click();
  await page.getByRole("link", { name }).click();
  await page.getByRole("button", { name: "Add person", exact: true }).click();
  await page.getByLabel("Add someone by name").fill("Browser member");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add person", exact: true })
    .click();
  await page.getByRole("button", { name: "Close form", exact: true }).click();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByLabel("Amount (INR)").fill("100.01");
  await page.getByLabel("What was it for?").fill("Browser group dinner");
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Browser group dinner" }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/v2-settings-dark-mobile.png",
    fullPage: true,
  });
});
test("exact, percentage and share editors preserve totals with multiple payers", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  for (const [label, field, first, second] of [
    ["Exact amounts", / owes$/, "60", "40.01"],
    ["Percentages", / percentage$/, "60", "40"],
    ["Shares", / shares$/, "2", "1"],
  ] as const) {
    const description = "Browser split " + label + " " + Date.now();
    await page.goto("/expenses/new?groupId=" + values.group_id);
    await page.getByLabel("Amount (INR)").fill("100.01");
    await page.getByLabel("What was it for?").fill(description);
    await page.getByRole("button", { name: "Split", exact: true }).click();
    await page.getByRole("combobox", { name: "Split type" }).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    const shares = page.getByRole("textbox", { name: field });
    await shares.nth(0).fill(first);
    await shares.nth(1).fill(second);
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("button", { name: "Paid by", exact: true }).click();
    await page.getByRole("checkbox", { name: "Multiple people paid" }).check();
    const payments = page.getByRole("textbox", { name: / paid$/ });
    await payments.nth(0).fill("50");
    await payments.nth(1).fill("50.01");
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Save", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: description }),
    ).toBeVisible();
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    const detail = (
      await (await context.request.get("/api/expenses/" + id)).json()
    ).data as { participants: { paid: number; owed: number }[] };
    expect(detail.participants.reduce((sum, p) => sum + p.paid, 0)).toBe(10001);
    expect(detail.participants.reduce((sum, p) => sum + p.owed, 0)).toBe(10001);
  }
});
test("splits with three other people without creating a group", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const names = [
    "Direct dinner Alex",
    "Direct dinner Blake",
    "Direct dinner Casey",
  ];
  const ids: string[] = [];
  for (const name of names) {
    const response = await context.request.post("/api/friends", {
      data: { name },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    expect(response.ok()).toBe(true);
    ids.push((await response.json()).data.id);
  }
  await page.goto("/expenses/new");
  await page.getByRole("button", { name: "Change people or group" }).click();
  await expect(
    page.getByRole("checkbox", { name: "You", exact: true }),
  ).toBeChecked();
  for (const name of names) {
    await expect(
      page.getByRole("checkbox", { name, exact: true }),
    ).not.toBeChecked();
    await page.getByRole("checkbox", { name, exact: true }).check();
  }
  await page
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await page.getByLabel("Amount (INR)").fill("100.01");
  const description = "Dinner without a group " + Date.now();
  await page.getByLabel("What was it for?").fill(description);
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/direct-split-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: description })).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  const detail = (
    await (await context.request.get("/api/expenses/" + id)).json()
  ).data;
  expect(detail.groupId).toBeNull();
  expect(detail.kind).toBe("SHARED");
  expect(
    detail.participants
      .map((person: { userId: string }) => person.userId)
      .sort(),
  ).toEqual([values.owner_id, ...ids].sort());
  expect(
    detail.participants.reduce(
      (total: number, person: { owed: number }) => total + person.owed,
      0,
    ),
  ).toBe(10001);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Split", exact: true }).click();
  for (const name of names)
    await expect(
      page.getByRole("checkbox", { name, exact: true }),
    ).toBeChecked();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByLabel("Amount (INR)").fill("120.03");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: description })).toBeVisible();
  const edited = (
    await (await context.request.get("/api/expenses/" + id)).json()
  ).data;
  expect(edited.amount).toBe(12003);
  expect(edited.participants).toHaveLength(4);
});

test("home shows net balances beside people and groups", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const groupName = "Home net group " + Date.now();
  const groupResponse = await context.request.post("/api/groups", {
    data: { name: groupName },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(groupResponse.ok()).toBe(true);
  const groupId = (await groupResponse.json()).data.id as string;
  const personName = "Home net friend " + Date.now();
  const friendResponse = await context.request.post("/api/friends", {
    data: { name: personName, groupId },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(friendResponse.ok()).toBe(true);
  const friendId = (await friendResponse.json()).data.id as string;
  for (const input of [
    {
      ...expense("Home direct debt"),
      amount: 9000,
      participants: [
        { userId: values.owner_id, paid: 9000 },
        { userId: friendId, paid: 0 },
      ],
    },
    {
      ...expense("Home group debt"),
      groupId,
      amount: 3000,
      participants: [
        { userId: values.owner_id, paid: 0 },
        { userId: friendId, paid: 3000 },
      ],
    },
  ])
    expect(
      (
        await context.request.post("/api/expenses", {
          data: input,
          headers: { "Idempotency-Key": crypto.randomUUID() },
        })
      ).ok(),
    ).toBe(true);
  await page.goto("/home");
  const personRow = page.getByRole("link").filter({ hasText: personName });
  await expect(
    personRow.getByText("Owed to you", { exact: true }),
  ).toBeVisible();
  await expect(personRow.getByText(/30\.00/)).toBeVisible();
  const groupRow = page.getByRole("link").filter({ hasText: groupName });
  await expect(groupRow.getByText("You owe", { exact: true })).toBeVisible();
  await expect(groupRow.getByText(/15\.00/)).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/home-net-balances-mobile.png",
    fullPage: true,
  });
});

test("a payer can stay outside the cost split in every split mode", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const names = ["Payer-only B", "Payer-only C"];
  for (const name of names)
    expect(
      (
        await context.request.post("/api/friends", {
          data: { name },
          headers: { "Idempotency-Key": crypto.randomUUID() },
        })
      ).ok(),
    ).toBe(true);
  for (const [label, field, value] of [
    ["Equally", null, null],
    ["Exact amounts", / owes$/, "45"],
    ["Percentages", / percentage$/, "50"],
    ["Shares", / shares$/, "1"],
  ] as const) {
    await page.goto("/expenses/new");
    await page.getByRole("button", { name: "Change people or group" }).click();
    await page.getByRole("checkbox", { name: "You", exact: true }).uncheck();
    for (const name of names)
      await page.getByRole("checkbox", { name, exact: true }).check();
    await page
      .getByRole("button", { name: "Use selection", exact: true })
      .click();
    await page.getByLabel("Amount (INR)").fill("90");
    const description = "Payer-only " + label + " " + Date.now();
    await page.getByLabel("What was it for?").fill(description);
    if (field && value) {
      await page.getByRole("button", { name: "Split", exact: true }).click();
      await page.getByRole("combobox", { name: "Split type" }).click();
      await page.getByRole("option", { name: label, exact: true }).click();
      for (const input of await page
        .getByRole("textbox", { name: field })
        .all())
        await input.fill(value);
      await page.getByRole("button", { name: "Done", exact: true }).click();
    }
    await expect(
      page.getByRole("button", { name: "Save", exact: true }),
    ).toBeEnabled();
    await expect(page.getByText(/left to assign to payers/)).toHaveCount(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: description }),
    ).toBeVisible();
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    const detail = (
      await (await context.request.get("/api/expenses/" + id)).json()
    ).data;
    expect(
      detail.participants.find(
        (p: { userId: string }) => p.userId === values.owner_id,
      ),
    ).toMatchObject({ paid: 9000, owed: 0, includedInSplit: false });
    expect(
      detail.participants
        .filter((p: { userId: string }) => p.userId !== values.owner_id)
        .map((p: { owed: number }) => p.owed),
    ).toEqual([4500, 4500]);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByRole("button", { name: "Split", exact: true }).click();
    await expect(
      page.getByRole("checkbox", { name: "You", exact: true }),
    ).not.toBeChecked();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByLabel("What was it for?").fill(description + " edited");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: description + " edited" }),
    ).toBeVisible();
  }
});

test("settlements need explicit UPI confirmation and cash records only the remaining debt", async ({
  browser,
}) => {
  const owner = await browser.newContext({ baseURL: base });
  await login(owner);
  const friend = await browser.newContext({ baseURL: base });
  await login(friend, "friend");
  await completeProfile(friend.request);
  const group = (
    await (
      await owner.request.post("/api/groups", {
        data: { name: "Browser settlement" },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.id as string;
  const token = (
    await (
      await owner.request.post("/api/invites", {
        data: { type: "GROUP_LINK", groupId: group },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.token as string;
  expect(
    (await friend.request.post("/api/invites/claim", { data: { token } })).ok(),
  ).toBe(true);
  expect(
    (
      await owner.request.post("/api/expenses", {
        data: {
          ...expense("Browser settlement debt"),
          groupId: group,
          amount: 10000,
          participants: [
            { userId: values.owner_id, paid: 10000 },
            { userId: values.friend_id, paid: 0 },
          ],
        },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).ok(),
  ).toBe(true);
  async function debt() {
    const rows = (await (await friend.request.get("/api/balances")).json())
      .data as { scopeId: string; amount: number }[];
    return Math.abs(rows.find((row) => row.scopeId === group)?.amount ?? 0);
  }
  const page = await friend.newPage();
  await page.goto("/groups/" + group);
  await page.getByRole("button", { name: "Settle up", exact: true }).click();
  await page.getByRole("button", { name: "Pay with UPI", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  expect(await debt()).toBe(5000);
  await page.getByLabel("Payment amount (INR)").fill("20");
  await page.getByRole("button", { name: "Pay with UPI", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, record it", exact: true })
    .click();
  await expect.poll(debt).toBe(3000);
  await page.getByRole("button", { name: "Settle up", exact: true }).click();
  await page
    .getByRole("button", { name: "Record a cash payment", exact: true })
    .click();
  await expect.poll(debt).toBe(0);
  await page.goto("/settlements?groupId=" + group);
  await page
    .getByRole("button", { name: "Delete payment", exact: true })
    .first()
    .click();
  await expect.poll(debt).not.toBe(0);
  await page
    .getByRole("button", { name: "Deleted payments", exact: true })
    .click();
  await page.getByRole("button", { name: "Restore", exact: true }).click();
  await expect.poll(debt).toBe(0);
  await owner.close();
  await friend.close();
});

test("custom group payments confirm advances and reversals, retain notes, and support Undo", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const groupName = "Custom payment " + Date.now();
  const group = (
    await (
      await context.request.post("/api/groups", {
        data: { name: groupName },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.id as string;
  const token = (
    await (
      await context.request.post("/api/invites", {
        data: { type: "GROUP_LINK", groupId: group },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.token as string;
  const friendCookie = values.friend_cookie!;
  expect(
    (
      await context.request.post("/api/invites/claim", {
        data: { token },
        headers: { Cookie: friendCookie },
      })
    ).ok(),
  ).toBe(true);
  async function net() {
    const scopes = (
      await (await context.request.get("/api/settlements/context")).json()
    ).data as { id: string; people: { id: string; net: number }[] }[];
    return (
      scopes
        .find((scope) => scope.id === group)
        ?.people.find((person) => person.id === values.friend_id)?.net ?? 0
    );
  }
  const friendName = (
    await (
      await context.request.get("/api/me", {
        headers: { Cookie: friendCookie },
      })
    ).json()
  ).data.name as string;
  await page.goto("/groups/" + group);
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Other person", { exact: true }).click();
  await page.getByRole("option", { name: friendName, exact: true }).click();
  await sheet.getByLabel("Payment amount (INR)").fill("200");
  await sheet.getByLabel("Note (optional)").fill("Advance for the trip");
  await page.screenshot({
    path: ".postman/local/custom-payment-form-mobile.png",
    fullPage: true,
  });
  await sheet
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText("will owe you");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await net()).toBe(0);
  await sheet
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(net).toBe(20000);
  await expect(
    page.getByText("Advance for the trip", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await sheet.getByLabel("Other person", { exact: true }).click();
  await page.getByRole("option", { name: friendName, exact: true }).click();
  await sheet.getByLabel("Payer → receiver").click();
  await page
    .getByRole("option", { name: friendName + " → you", exact: true })
    .click();
  await sheet.getByLabel("Payment amount (INR)").fill("250");
  await sheet
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText("You will owe");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(net).toBe(-5000);
  await page.goto("/settlements?groupId=" + group);
  await page
    .getByRole("button", { name: "Delete payment", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(net).toBe(-5000);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/custom-payments-mobile.png",
    fullPage: true,
  });
});

test("removed members can repay without overpaying and delete or undo after reaching zero", async ({
  browser,
}) => {
  const owner = await browser.newContext({ baseURL: base });
  await login(owner);
  await completeProfile(owner.request);
  const friend = await browser.newContext({ baseURL: base });
  await login(friend, "friend");
  await completeProfile(friend.request);
  const group = (
    await (
      await owner.request.post("/api/groups", {
        data: { name: "Former member payment" },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.id as string;
  const token = (
    await (
      await owner.request.post("/api/invites", {
        data: { type: "GROUP_LINK", groupId: group },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.token as string;
  expect(
    (await friend.request.post("/api/invites/claim", { data: { token } })).ok(),
  ).toBe(true);
  expect(
    (
      await owner.request.post("/api/expenses", {
        data: {
          ...expense("Former debt"),
          groupId: group,
          amount: 10000,
          participants: [
            { userId: values.owner_id, paid: 10000 },
            { userId: values.friend_id, paid: 0 },
          ],
        },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await owner.request.post("/api/groups/" + group + "/members", {
        data: {
          action: "REMOVE",
          userId: values.friend_id,
          confirmOutstandingBalance: true,
        },
      })
    ).ok(),
  ).toBe(true);
  const page = await friend.newPage();
  await page.goto("/groups/" + group);
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Settle up", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Payment amount (INR)").fill("51");
  await expect(
    sheet.getByRole("button", { name: "Record a cash payment", exact: true }),
  ).toBeDisabled();
  await sheet.getByLabel("Payment amount (INR)").fill("50");
  await sheet
    .getByLabel("Note (optional)")
    .fill("Final repayment after removal");
  await sheet
    .getByRole("button", { name: "Record a cash payment", exact: true })
    .click();
  await expect(
    page.getByText("Payment recorded", { exact: true }),
  ).toBeVisible();
  await page.goto("/settlements?groupId=" + group);
  await expect(
    page.getByText("Final repayment after removal", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete payment", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("Payment restored", { exact: true }),
  ).toBeVisible();
  await owner.close();
  await friend.close();
});

test("friend payment defaults to Direct and selecting one group leaves direct debt unchanged", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const groupName = "Friend payment scope " + Date.now();
  const group = (
    await (
      await context.request.post("/api/groups", {
        data: { name: groupName },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.id as string;
  await page.goto("/groups/" + group);
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "No eligible payment counterparties",
  );
  await page.getByRole("button", { name: "Close form", exact: true }).click();
  const token = (
    await (
      await context.request.post("/api/invites", {
        data: { type: "GROUP_LINK", groupId: group },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      })
    ).json()
  ).data.token as string;
  expect(
    (
      await context.request.post("/api/invites/claim", {
        data: { token },
        headers: { Cookie: values.friend_cookie! },
      })
    ).ok(),
  ).toBe(true);
  async function pairNet(scopeId: string) {
    const scopes = (
      await (await context.request.get("/api/settlements/context")).json()
    ).data as { id: string; people: { id: string; net: number }[] }[];
    return (
      scopes
        .find((scope) => scope.id === scopeId)
        ?.people.find((person) => person.id === values.friend_id)?.net ?? 0
    );
  }
  const directBefore = await pairNet("direct");
  await page.goto("/friends/" + values.friend_id);
  await page
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByLabel("Payment scope", { exact: true }),
  ).toContainText("Direct");
  await sheet.getByLabel("Payment scope", { exact: true }).click();
  await page.getByRole("option", { name: groupName, exact: true }).click();
  await sheet.getByLabel("Payment amount (INR)").fill("15");
  await sheet
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText(groupName);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect.poll(() => pairNet(group)).toBe(1500);
  expect(await pairNet("direct")).toBe(directBefore);
});

test("form Drawers protect drafts and adapt from mobile to desktop", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  await page.goto("/groups");
  const trigger = page.getByRole("button", {
    name: "Create group",
    exact: true,
  });
  await trigger.click();
  const drawer = page.getByRole("dialog", {
    name: "Create a group",
    exact: true,
  });
  await drawer.getByLabel("Group name").fill("Unsaved trip");
  await page.getByRole("button", { name: "Close form" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Discard your changes?",
  );
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(drawer.getByLabel("Group name")).toHaveValue("Unsaved trip");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await page.waitForTimeout(550);
  const handle = await drawer.locator("[data-vaul-handle]").boundingBox();
  expect(handle).not.toBeNull();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x + handle!.width / 2, 830, { steps: 20 });
  await page.mouse.up();
  await expect(drawer.getByLabel("Group name")).toBeInViewport();
  await expect(drawer.getByLabel("Group name")).toHaveValue("Unsaved trip");
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(drawer).toHaveAttribute("data-vaul-drawer-direction", "bottom");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(drawer).toHaveAttribute("data-vaul-drawer-direction", "right");
  await expect(drawer.locator("[data-vaul-handle]")).toHaveCount(0);
  await expect(drawer.getByLabel("Group name")).toHaveValue("Unsaved trip");
  await expect
    .poll(async () => {
      const position = await drawer.boundingBox();
      return position ? Math.abs(position.x + position.width - 1440) : Infinity;
    })
    .toBeLessThan(2);
  const bounds = await drawer.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.width).toBeLessThanOrEqual(672);
  expect(Math.abs(bounds!.x + bounds!.width - 1440)).toBeLessThan(2);
  expect(bounds!.y).toBe(0);
  expect(bounds!.height).toBe(900);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("expense draft survives changing people and group, with explicit split reset", async ({
  page,
  context,
}) => {
  await login(context);
  await completeProfile(context.request);
  const response = await context.request.post("/api/friends", {
    data: { name: "Composer draft friend" },
    headers: { "Idempotency-Key": crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  const friendId = (await response.json()).data.id;
  await page.goto("/expenses/new");
  await page.getByRole("button", { name: "Change people or group" }).click();
  await expect(
    page.getByText("Amount is required", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Find people or groups").fill("Composer draft friend");
  await expect(
    page.getByRole("checkbox", { name: "Composer draft friend", exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole("checkbox", { name: "Composer draft friend", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await page.getByLabel("Amount (INR)").fill("120.01");
  await page.getByLabel("What was it for?").fill("Preserved composer draft");
  await page.getByRole("button", { name: "Paid by", exact: true }).click();
  await page
    .getByRole("button", { name: "Composer draft friend", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Paid by", exact: true }),
  ).toContainText("Composer draft friend");
  await page.getByRole("button", { name: "Change people or group" }).click();
  await page.getByRole("button", { name: "Just for you", exact: true }).click();
  await expect(
    page.getByText(/Changing people resets the split/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to expense", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Paid by", exact: true }),
  ).toContainText("Composer draft friend");
  await page.getByRole("button", { name: "Change people or group" }).click();
  const groups = (await (await context.request.get("/api/groups")).json())
    .data as { id: string; name: string }[];
  const group = groups.find((item) => item.id === values.group_id)!;
  await page.getByRole("button", { name: group.name, exact: true }).click();
  await page
    .getByRole("button", { name: "Reset split and use selection", exact: true })
    .click();
  await expect(page.getByLabel("Amount (INR)")).toHaveValue("120.01");
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Preserved composer draft",
  );
  await expect(
    page.getByRole("button", { name: "Paid by", exact: true }),
  ).toContainText("You");
  await page.getByRole("button", { name: "Change people or group" }).click();
  await page.getByRole("button", { name: "Just for you", exact: true }).click();
  await page
    .getByRole("button", { name: "Use selection", exact: true })
    .click();
  await expect(page.getByLabel("Amount (INR)")).toHaveValue("120.01");
  await expect(page.getByLabel("What was it for?")).toHaveValue(
    "Preserved composer draft",
  );
  await expect(
    page.getByRole("button", { name: "Remove Composer draft friend" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Preserved composer draft" }),
  ).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  const detail = (
    await (await context.request.get("/api/expenses/" + id)).json()
  ).data;
  expect(detail.kind).toBe("PERSONAL");
  expect(detail.groupId).toBeNull();
  expect(
    detail.participants.some(
      (person: { userId: string }) => person.userId === friendId,
    ),
  ).toBe(false);
});
