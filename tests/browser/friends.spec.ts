import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { FriendList } from "@/lib/api/friends";

const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);

function friendFixture(id: string, name: string, net = 0): FriendList[number] {
  return {
    id,
    name,
    status: "ACTIVE",
    upiId: null,
    blocked: false,
    balances: net
      ? [
          {
            scopeId: "direct",
            currency: "INR",
            amount: -net,
            net,
            userLowId: "viewer",
            userHighId: id,
            updatedAt: "2026-11-12T00:00:00Z",
          },
        ]
      : [],
  };
}

for (const currency of ["INR", "USD"]) {
  test(`balance shortcut preserves ${currency} payment currency`, async ({
    page,
    context,
  }) => {
    await login(context, "owner");
    const friend = friendFixture("aman", "Aman", 1000);
    friend.balances[0]!.currency = currency;
    await page.route(/\/api\/friends\/aman$/, (route) =>
      route.fulfill({
        json: {
          data: {
            ...friend,
            pair: { low: "aman", high: "viewer" },
            expenses: [],
            settlements: [],
          },
        },
      }),
    );
    await page.route(/\/api\/settlements\/context$/, (route) =>
      route.fulfill({
        json: {
          data: [
            {
              id: "direct",
              name: "Direct",
              currency: "INR",
              people: [
                {
                  id: "aman",
                  name: "Aman",
                  upiId: null,
                  net: 1000,
                  restricted: false,
                },
              ],
            },
          ],
        },
      }),
    );
    const payments: unknown[] = [];
    await page.route(/\/api\/settlements$/, (route) => {
      payments.push(route.request().postDataJSON());
      return route.fulfill({ json: { data: { id: "payment" } } });
    });
    await page.goto("/friends/aman");
    await page
      .getByRole("region", { name: "Balances by expense scope" })
      .getByRole("button", { name: "Settle up", exact: true })
      .click();
    const drawer = page.getByRole("dialog", {
      name: "Settle up with Aman",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    if (currency === "USD") {
      await expect(drawer).toContainText(
        "Payments in USD are unavailable for this balance.",
      );
      await expect(drawer.getByLabel("Payment amount (INR)")).toHaveCount(0);
      await expect(
        drawer.getByRole("button", { name: "Record payment", exact: true }),
      ).toHaveCount(0);
      expect(payments).toEqual([]);
    } else {
      await expect(drawer.getByLabel("Payment amount (INR)")).toHaveValue(
        "10.00",
      );
      await drawer
        .getByRole("button", { name: "Record payment", exact: true })
        .click();
      await expect.poll(() => payments.length).toBe(1);
      expect(payments[0]).toMatchObject({
        currency: "INR",
        amount: 1000,
        groupId: null,
      });
    }
  });
}

for (const scenario of ["list", "friend"] as const) {
  test(`${scenario} shows retry after a cached background refresh fails`, async ({
    page,
    context,
  }) => {
    await login(context, "owner");
    const friend = friendFixture("aman", "Aman");
    let failing = false;
    await page.route(/\/api\/friends$/, (route) =>
      route.fulfill({ json: { data: [friend] } }),
    );
    await page.route(/\/api\/friends\/aman$/, (route) =>
      route.fulfill({
        json: {
          data: {
            ...friend,
            pair: { low: "aman", high: "viewer" },
            expenses: [],
            settlements: [],
          },
        },
      }),
    );
    await page.route(
      scenario === "list" ? /\/api\/friends$/ : /\/api\/friends\/aman$/,
      (route) =>
        failing
          ? route.fulfill({
              status: 503,
              json: { error: { code: "UNAVAILABLE", message: "Try again" } },
            })
          : route.fallback(),
    );
    await page.goto(scenario === "list" ? "/friends" : "/friends/aman");
    const content =
      scenario === "list"
        ? page.getByRole("link", { name: /Aman/ })
        : page.getByRole("region", { name: "Friend summary" });
    await expect(content).toBeVisible();
    failing = true;
    await page.clock.setFixedTime(new Date(Date.now() + 60_000));
    await page.evaluate(() =>
      window.dispatchEvent(new Event("visibilitychange")),
    );
    const retry = page.getByRole("button", { name: "Try again", exact: true });
    await expect(retry).toBeVisible();
    await expect(content).toHaveCount(0);
    failing = false;
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(content).toBeVisible();
  });
}

test("friend tabs show expense shares, payment metadata and offsetting scope balances", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  const friend = friendFixture("aman", "Aman", 1200);
  const offset = {
    ...friend.balances[0],
    scopeId: "trip",
    net: -1200,
    amount: 1200,
  };
  await page.route(/\/api\/groups$/, (route) =>
    route.fulfill({ json: { data: [{ id: "trip", name: "Goa trip" }] } }),
  );
  await page.route(/\/api\/friends\/aman$/, (route) =>
    route.fulfill({
      json: {
        data: {
          ...friend,
          balances: [...friend.balances, offset],
          pair: { low: "aman", high: "viewer" },
          expenses: [
            {
              id: "dinner",
              groupId: "trip",
              kind: "SHARED",
              description: "Dinner by the beach",
              category: "Food",
              amount: 60000,
              currency: "INR",
              date: "2026-11-12",
              yourShare: 20000,
            },
          ],
          settlements: [
            {
              id: "cash",
              fromUserId: "aman",
              toUserId: values.owner_id,
              groupId: "trip",
              amount: 12500,
              currency: "INR",
              date: "2026-11-12",
              method: "OTHER",
              note: "Bank transfer",
              canEdit: true,
            },
          ],
        },
      },
    }),
  );
  await page.goto("/friends/aman");
  await expect(
    page
      .getByRole("region", { name: "Friend summary" })
      .getByText("Settled up", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Settle up", exact: true }),
  ).toHaveCount(2);
  const expense = page.getByRole("link", { name: /Dinner by the beach/ });
  const returnUrl = new URL(
    (await expense.getAttribute("href")) ?? "",
    values.base_url,
  );
  expect(returnUrl.searchParams.get("returnTo")).toContain("/friends/aman");
  await expect(expense).toContainText("Bill");
  await expect(expense).toContainText("200.00");
  await page.getByRole("tab", { name: "Payments", exact: true }).click();
  await expect(page.getByText("Bank transfer", { exact: true })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText("Other");
  await page.getByRole("tab", { name: "Shared expenses", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Payments", exact: true }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Shared expenses", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".postman/local/friend-refined-mobile.png",
    fullPage: true,
  });
});

test("Pay a friend is available directly from Friends on mobile and desktop", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  await page.route(/\/api\/settlements\/context$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "direct",
            name: "Direct",
            currency: "INR",
            people: [
              {
                id: "aman",
                name: "Aman",
                net: -12550,
                restricted: false,
                upiId: null,
              },
            ],
          },
        ],
      },
    }),
  );
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/friends");
    const pay = page.getByRole("button", { name: "Pay a friend", exact: true });
    await expect(pay).toBeVisible();
    await pay.click();
    const drawer = page.getByRole("dialog", {
      name: "Pay a friend",
      exact: true,
    });
    await expect(drawer).toBeVisible();
    await expect(
      drawer.getByLabel("Payment scope", { exact: true }),
    ).toContainText("Direct");
    await expect(drawer.getByLabel("Person", { exact: true })).toContainText(
      "Choose a person",
    );
    await drawer.getByLabel("Person", { exact: true }).click();
    await page.getByRole("option", { name: "Aman", exact: true }).click();
    await expect(drawer).toContainText("You owe Aman");
    await expect(drawer.getByLabel("Payment amount (INR)")).toHaveValue("");
    await expect(drawer.getByLabel("Payment amount (INR)")).toHaveCSS(
      "font-size",
      "36px",
    );
    await expect(drawer.getByLabel("Paid by", { exact: true })).toContainText(
      "You paid Aman",
    );
    const personControl = await drawer
      .getByLabel("Person", { exact: true })
      .boundingBox();
    expect(personControl?.width).toBeGreaterThan(200);
    if (width === 320)
      await page.screenshot({
        path: ".postman/local/pay-friend-unslop-mobile.png",
        fullPage: true,
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Close form", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(drawer).not.toBeVisible();
  }
});

test("friend row menus open preselected payments, restore focus and support nickname and block actions", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  await page.setViewportSize({ width: 320, height: 900 });
  let friend = friendFixture("aman", "Aman", 12550);
  await page.route(/\/api\/friends$/, (route) =>
    route.fulfill({ json: { data: [friend] } }),
  );
  await page.route(/\/api\/friends\/aman$/, (route) => {
    const input = route.request().postDataJSON() as {
      nickname?: string | null;
      blocked?: boolean;
    };
    friend = {
      ...friend,
      name: input.nickname ?? friend.name,
      blocked: input.blocked ?? friend.blocked,
    };
    return route.fulfill({ json: { data: { id: "aman" } } });
  });
  await page.route(/\/api\/settlements\/context$/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "direct",
            name: "Direct",
            currency: "INR",
            people: [
              {
                id: "aman",
                name: "Aman",
                net: 12550,
                restricted: false,
                upiId: null,
              },
            ],
          },
        ],
      },
    }),
  );
  await page.goto("/friends");
  const trigger = page.getByRole("button", {
    name: "Actions for Aman",
    exact: true,
  });
  for (let opening = 0; opening < 2; opening++) {
    await trigger.click();
    await expect(page.getByRole("menu").locator("svg")).toHaveCount(0);
    await page.getByRole("menuitem", { name: "Pay Aman", exact: true }).click();
    const drawer = page.getByRole("dialog", { name: "Pay Aman", exact: true });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByLabel("Person", { exact: true })).toHaveCount(0);
    await expect(
      drawer.getByLabel("Payment scope", { exact: true }),
    ).toContainText("Direct");
    await expect(drawer).toContainText("Aman owes you");
    await expect(drawer.getByLabel("Payment amount (INR)")).toHaveValue("");
    await page.getByRole("button", { name: "Close form", exact: true }).click();
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await trigger.click();
  await page
    .getByRole("menuitem", { name: "Edit nickname", exact: true })
    .click();
  await page.getByLabel("Nickname (only you see this)").fill("Amir");
  await page
    .getByRole("button", { name: "Save nickname", exact: true })
    .click();
  const renamed = page.getByRole("button", {
    name: "Actions for Amir",
    exact: true,
  });
  await expect(renamed).toBeFocused();
  await renamed.click();
  await page
    .getByRole("menuitem", { name: "Block friend", exact: true })
    .click();
  await expect(
    page
      .getByRole("link", { name: /Amir/ })
      .getByText("Blocked", { exact: true }),
  ).toBeVisible();
  await renamed.click();
  await page
    .getByRole("menuitem", { name: "Unblock friend", exact: true })
    .click();
  await expect(
    page
      .getByRole("link", { name: /Amir/ })
      .getByText("Blocked", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pay a friend", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("friends search, balance filters and detail return preserve the list context", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  const friends = [
    friendFixture("aman", "Aman", 12550),
    friendFixture("bea", "Bea"),
    { ...friendFixture("cara", "Cara", -5000), blocked: true },
  ];
  await page.route(/\/api\/friends$/, (route) =>
    route.fulfill({ json: { data: friends } }),
  );
  await page.route(/\/api\/friends\/requests(?:\?|$)/, (route) =>
    route.fulfill({ json: { data: { items: [], nextCursor: null } } }),
  );
  await page.route(/\/api\/friends\/aman$/, (route) =>
    route.fulfill({
      json: {
        data: {
          ...friends[0],
          expenses: [],
          settlements: [],
          pair: { low: "aman", high: "viewer" },
        },
      },
    }),
  );
  await page.goto("/friends");
  const list = page.getByRole("region", { name: "Your friends", exact: true });
  await expect(list.getByRole("link")).toHaveCount(3);
  await page.getByRole("button", { name: "Outstanding", exact: true }).click();
  await expect(list.getByRole("link")).toHaveCount(2);
  await page
    .getByRole("searchbox", { name: "Search your friends" })
    .fill("aman");
  await expect(list.getByRole("link")).toHaveCount(1);
  await list.getByRole("link").click();
  await expect(
    page.getByRole("heading", { name: "Aman", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to friends", exact: true })
    .click();
  await expect(
    page.getByRole("searchbox", { name: "Search your friends" }),
  ).toHaveValue("aman");
  await expect(
    page.getByRole("button", { name: "Outstanding", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("searchbox", { name: "Search your friends" })
    .fill("no match");
  await expect(
    page.getByText("No friends match your search and filters.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(list.getByRole("link")).toHaveCount(3);
  await page.screenshot({
    path: ".postman/local/friends-refined-mobile.png",
    fullPage: true,
  });
});

test("friend history tabs, scope balances and blocked empty states work on desktop", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  await page.setViewportSize({ width: 1440, height: 1000 });
  const friend = { ...friendFixture("aman", "Aman", 12550), blocked: true };
  await page.route(/\/api\/friends\/aman$/, (route) =>
    route.fulfill({
      json: {
        data: {
          ...friend,
          expenses: [],
          settlements: [],
          pair: { low: "aman", high: "viewer" },
        },
      },
    }),
  );
  await page.goto("/friends/aman");
  await expect(
    page.getByRole("button", { name: "Add expense", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("New shared expenses are blocked.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Record payment", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Shared expenses" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByText("Once you share an expense with Aman", { exact: false }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Payments", exact: true }).click();
  await expect(
    page.getByText("No recorded payments with Aman.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View all payments" }),
  ).toHaveAttribute("href", "/settlements?friendId=aman");
  await page.screenshot({
    path: ".postman/local/friend-refined-desktop.png",
    fullPage: true,
  });
});
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

test("Add friend keeps search, connection links and recovery clear at mobile and desktop widths", async ({
  page,
  context,
}) => {
  await login(context, "owner");
  let releaseSearch: (() => void) | undefined;
  const pendingSearch = new Promise<void>((resolve) => {
    releaseSearch = resolve;
  });
  let failSearch = true;
  const people = [
    {
      id: "aman",
      name: "Aman",
      relationship: "NONE",
      requestId: null,
      source: "CONTEXT",
    },
    {
      id: "bea",
      name: "Bea",
      relationship: "FRIEND",
      requestId: null,
      source: "CONTEXT",
    },
    {
      id: "cara",
      name: "Cara",
      relationship: "OUTGOING",
      requestId: "request-cara",
      source: "CONTEXT",
    },
    {
      id: "deepa",
      name: "Deepa",
      relationship: "INCOMING",
      requestId: "request-deepa",
      source: "CONTEXT",
    },
  ];
  await page.route(/\/api\/people\/search$/, async (route) => {
    const { query } = route.request().postDataJSON() as { query: string };
    if (query === "Aman") await pendingSearch;
    if (query === "unavailable" && failSearch)
      return route.fulfill({
        status: 503,
        json: {
          error: {
            code: "UNAVAILABLE",
            message: "Search is temporarily unavailable. Try again.",
          },
        },
      });
    return route.fulfill({ json: { data: query === "missing" ? [] : people } });
  });
  await page.route(/\/api\/invites$/, (route) =>
    route.fulfill({
      status: 201,
      json: { data: { id: "browser-connection", token: "a".repeat(64) } },
    }),
  );
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/friends");
  await page.getByRole("button", { name: "Add friend", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Add friend", exact: true });
  const search = drawer.getByRole("searchbox", {
    name: "Search by name or full email",
    exact: true,
  });
  await expect(
    drawer.getByRole("heading", { name: "Connect with a link" }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "Create connection link", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".postman/local/add-friend-unslop-mobile.png",
    fullPage: true,
  });
  await search.fill("Aman");
  await expect(
    drawer.getByRole("status", { name: "Searching for people" }),
  ).toBeVisible();
  releaseSearch?.();
  await expect(
    drawer.getByRole("heading", { name: "Search results", exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "Send friend request", exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: "Open friend", exact: true }),
  ).toHaveAttribute("href", "/friends/bea");
  await expect(
    drawer.getByText("Request pending", { exact: true }),
  ).toBeVisible();
  await expect(
    drawer.getByText("Incoming request", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".postman/local/add-friend-unslop-desktop.png",
    fullPage: true,
  });
  await drawer
    .getByRole("button", { name: "Clear friend search", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await search.fill("unavailable");
  await expect(drawer.getByRole("alert")).toContainText(
    "Couldn't search for people",
  );
  await expect(
    drawer.getByRole("link", { name: "Go home", exact: true }),
  ).toHaveCount(0);
  failSearch = false;
  await drawer.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    drawer.getByRole("heading", { name: "Search results", exact: true }),
  ).toBeVisible();
  await search.fill("missing");
  await expect(
    drawer.getByText("No matching person found", { exact: true }),
  ).toBeVisible();
  await drawer
    .getByRole("button", { name: "Invite to Spending Diary", exact: true })
    .click();
  await expect(drawer.getByLabel("Invite link", { exact: true })).toHaveValue(
    /\/j\/a{64}$/,
  );
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({
    path: ".postman/local/add-friend-unslop-link-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

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
      page.getByText("No matching person found", { exact: true }),
    ).toBeVisible();
    await preference.click();
    await expect(preference).toBeChecked();
    await recipient.reload();
    await expect(preference).toBeChecked();
    await search.fill("no-match-browser@example.test");
    await expect(
      page.getByText("No matching person found", { exact: true }),
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
    page.getByText("No matching person found", { exact: true }),
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
