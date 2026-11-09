import { test, expect, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(
  readFileSync(".postman/local/local.environment.yaml", "utf8"),
) as { values: { key: string; value: string }[] };
const values = Object.fromEntries(
  fixture.values.map((item) => [item.key, item.value]),
);

async function login(context: BrowserContext) {
  const cookie = values.owner_cookie!;
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

test("desktop toggle stays in the sidebar and only content scrolls", async ({
  page,
  context,
}) => {
  await login(context);
  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Where you stand" }),
  ).toBeVisible();
  const sidebar = page.locator('[data-slot="sidebar-container"]');
  const toggle = sidebar.getByRole("button", { name: "Toggle navigation" });
  await expect(toggle).toBeVisible();
  await expect(
    page.locator("header").getByRole("button", { name: "Toggle navigation" }),
  ).toBeHidden();
  await expect(page.locator("main > header")).toHaveCount(0);
  await expect(page.locator("#main h1")).toHaveCount(1);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeVisible();
  await page.keyboard.press("ControlOrMeta+b");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(sidebar).toHaveCSS("width", "256px");

  const content = page.locator("[data-page-scroll]");
  const workspace = await content.locator(":scope > div").boundingBox();
  expect(workspace!.width).toBeGreaterThan(1000);
  const people = await page
    .getByRole("region", { name: "People" })
    .boundingBox();
  const groups = await page
    .getByRole("region", { name: "Groups" })
    .boundingBox();
  expect(people!.y).toBe(groups!.y);
  expect(groups!.x).toBeGreaterThan(people!.x);

  await page.setViewportSize({ width: 1536, height: 400 });
  const headerBefore = await page.locator("header").boundingBox();
  const sidebarBefore = await sidebar.boundingBox();
  await content.hover();
  await page.mouse.wheel(0, 1000);
  await expect
    .poll(() => content.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0);
  expect(await page.locator("header").boundingBox()).toEqual(headerBefore);
  expect(await sidebar.boundingBox()).toEqual(sidebarBefore);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await sidebar.getByRole("link", { name: "Groups", exact: true }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBe(0);
});

test("pages share one responsive title row with mobile menu access", async ({
  page,
  context,
}) => {
  await login(context);
  for (const width of [1536, 360]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of [
      "/home",
      "/expenses",
      "/groups",
      "/friends",
      "/activity",
      "/insights",
      "/settings",
      "/settlements",
    ]) {
      await page.goto(path);
      const header = page.locator("#main header");
      await expect(header).toHaveCount(1);
      await expect(header.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("#main h1")).toHaveCount(1);
      const menu = header.getByRole("button", { name: "Toggle navigation" });
      if (path === "/expenses") {
        const add = header.getByRole("button", { name: "Add expense" });
        await expect(add).toBeVisible();
        if (width < 768) {
          await expect(add).toHaveCSS("width", "44px");
          await expect(add).toHaveCSS("height", "44px");
          await expect(add.locator("span")).toBeHidden();
          const menuBox = await menu.boundingBox();
          const actionBox = await add.boundingBox();
          expect(actionBox!.y).toBe(menuBox!.y);
        } else {
          await expect(add.locator("span")).toBeVisible();
        }
        const before = await header.boundingBox();
        const toolbar = page.locator("[data-page-toolbar]");
        await expect(
          toolbar.getByRole("combobox", { name: "Month" }),
        ).toBeVisible();
        const filters = toolbar.getByRole("button", {
          name: "Filters",
          exact: true,
        });
        await filters.click();
        const filterDialog = page.getByRole("dialog");
        await expect(filterDialog).toHaveAttribute(
          "data-side",
          width < 768 ? "bottom" : "right",
        );
        const fromDate = filterDialog.getByLabel("From", { exact: true });
        await fromDate.click();
        await expect(page.getByRole("dialog").getByRole("grid")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(fromDate).toBeFocused();
        await page.keyboard.press("Escape");
        await expect(header.getByRole("tablist")).toHaveCount(0);
        if (width === 1536) {
          await expect(
            page.locator("[data-page-scroll] h2").first(),
          ).toBeVisible();
          await page.screenshot({
            path: ".postman/local/expenses-history-desktop.png",
          });
        }
        const toolbarBefore = await toolbar.boundingBox();
        expect(toolbarBefore!.y).toBeGreaterThanOrEqual(
          before!.y + before!.height,
        );
        await page.locator("[data-page-scroll]").evaluate((node) => {
          node.scrollTop = node.scrollHeight;
        });
        expect(await header.boundingBox()).toEqual(before);
        expect(await toolbar.boundingBox()).toEqual(toolbarBefore);
        await expect(
          toolbar.getByRole("group", { name: "Expense type" }),
        ).toBeVisible();
        await add.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(add).toBeFocused();
      }
      if (width < 768) {
        await expect(menu).toBeVisible();
        await menu.click();
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
      } else {
        await expect(menu).toBeHidden();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("mobile pill navigates and leaves the last row clear", async ({
  page,
  context,
}) => {
  await login(context);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Where you stand" }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Quick navigation" });
  await expect(navigation.getByRole("link")).toHaveCount(4);
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const content = page.locator("[data-page-scroll]");
  await content.evaluate((node) => {
    node.scrollTop = node.scrollHeight;
  });
  const lastSection = await page
    .getByRole("region", { name: "Groups" })
    .boundingBox();
  const pill = await navigation.boundingBox();
  expect(lastSection!.y + lastSection!.height).toBeLessThanOrEqual(pill!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    360,
  );
  await navigation.getByRole("link", { name: "Groups", exact: true }).click();
  await expect(page).toHaveURL(/\/groups$/);
  await expect(
    navigation.getByRole("link", { name: "Groups" }),
  ).toHaveAttribute("aria-current", "page");
  const trigger = page.getByRole("button", { name: "Toggle navigation" });
  await trigger.click();
  await expect(navigation).toBeHidden();
  await expect(
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Insights" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(navigation).toBeVisible();
});
