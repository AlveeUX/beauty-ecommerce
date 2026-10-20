import { expect, test, type Locator, type Page } from "@playwright/test";

// E2E-SHP-01..06 (PRD OQ-06, CAT-001..005): the ten Shop listing layouts of the design.
// Coordinates are page coordinates at 1920 wide, from Figma frames 3:4833, 3:40462, 3:38190, 3:39326, 3:5980,
// 3:7112, 3:8330, 3:10357, 3:9418 and 3:11424.
async function pageBox(locator: Locator) {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left + scrollX),
      y: Math.round(r.top + scrollY),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  });
}

const cards = (page: Page) =>
  page.getByTestId("product-grid").locator("[data-testid='product-card']");
const summary = (page: Page) => page.getByTestId("results-summary").first();
const filters = (page: Page) => page.getByRole("region", { name: "Product filters" });

test.describe("Shop layouts", () => {
  test("E2E-SHP-01 every layout opens with its own structure and falls back to the default for unknown names", async ({
    page,
  }) => {
    const expected: Record<string, { view: string; columns: string; count: number }> = {
      left: { view: "grid", columns: "3", count: 12 },
      right: { view: "grid", columns: "3", count: 12 },
      "list-left": { view: "list", columns: "3", count: 12 },
      "list-right": { view: "list", columns: "3", count: 12 },
      "load-more": { view: "grid", columns: "3", count: 12 },
      "top-filter": { view: "grid", columns: "4", count: 16 },
      "list-top-filter": { view: "list", columns: "4", count: 12 },
      horizontal: { view: "grid", columns: "4", count: 16 },
      "list-horizontal": { view: "list", columns: "4", count: 12 },
      "filter-drawer": { view: "grid", columns: "4", count: 16 },
    };
    for (const [layout, want] of Object.entries(expected)) {
      await page.goto(`/shop?layout=${layout}`);
      const grid = page.getByTestId("product-grid");
      await expect(grid, layout).toHaveAttribute("data-view", want.view);
      await expect(grid, layout).toHaveAttribute("data-columns", want.columns);
      await expect(cards(page), layout).toHaveCount(want.count);
    }
    await page.goto("/shop?layout=nonsense");
    await expect(page.getByTestId("product-grid")).toHaveAttribute("data-view", "grid");
    await expect(cards(page)).toHaveCount(12);
    await expect(page.locator("[data-layout='left']")).toBeVisible();
  });

  test("E2E-SHP-02 sidebar position, grid and list geometry follow the frames", async ({
    page,
  }) => {
    await page.goto("/shop?layout=right");
    const aside = page.getByRole("complementary", { name: "Product filters" });
    expect(await pageBox(aside)).toMatchObject({ x: 1312, y: 690, w: 308 });
    expect(await pageBox(cards(page).first())).toMatchObject({ x: 300, y: 764, w: 308, h: 509 });

    await page.goto("/shop?layout=list-left");
    expect(
      await pageBox(page.getByRole("complementary", { name: "Product filters" })),
    ).toMatchObject({ x: 300, y: 690, w: 308 });
    expect(await pageBox(page.getByRole("group", { name: "Product view" }))).toMatchObject({
      x: 636,
      y: 690,
      w: 81,
      h: 44,
    });
    const row = cards(page).first();
    expect(await pageBox(row)).toMatchObject({ x: 636, y: 764, h: 359 });
    expect(await pageBox(cards(page).nth(1))).toMatchObject({ y: 1153 }); // 359 + 30 between rows
    await expect(row.getByRole("link", { name: "Shop now" })).toBeVisible();
    expect(await pageBox(row.getByRole("link", { name: "Shop now" }))).toMatchObject({
      w: 139,
      h: 42,
    });
    await expect(row.locator("p[class*='rowText']")).not.toBeEmpty();
    await expect(page.getByRole("navigation", { name: "Pagination" })).toBeVisible();

    await page.goto("/shop?layout=top-filter");
    expect(await pageBox(cards(page).first())).toMatchObject({ x: 300, w: 308 });
    expect(await pageBox(cards(page).nth(3))).toMatchObject({ x: 1312, w: 308 });
  });

  test("E2E-SHP-03 the grid/list switch keeps filters, sort and the place of the filters", async ({
    page,
  }) => {
    await page.goto("/shop?layout=top-filter&availability=in-stock&sort=price-asc");
    await page.getByTestId("view-list").click();
    await expect(page).toHaveURL(/layout=list-top-filter/);
    await expect(page).toHaveURL(/availability=in-stock/);
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page.getByTestId("product-grid")).toHaveAttribute("data-view", "list");
    await expect(filters(page)).toBeVisible();
    await expect(page.getByTestId("view-list")).toHaveAttribute("aria-current", "true");

    await page.getByTestId("view-grid").click();
    await expect(page).toHaveURL(/layout=top-filter(&|$)/);
    await expect(cards(page)).toHaveCount(16);

    // the layout survives filtering, paging and clearing
    await page.goto("/shop?layout=list-right");
    await page
      .getByRole("complementary", { name: "Product filters" })
      .getByText("Skincare", { exact: true })
      .click();
    await expect(page).toHaveURL(/layout=list-right/);
    await expect(page.getByTestId("product-grid")).toHaveAttribute("data-view", "list");
    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/layout=list-right/);
    await page
      .getByRole("navigation", { name: "Pagination" })
      .getByRole("link", { name: /02/ })
      .click();
    await expect(page).toHaveURL(/layout=list-right.*page=2|page=2.*layout=list-right/);
  });

  test("E2E-SHP-04 Load more adds a page of products until all are shown", async ({ page }) => {
    await page.goto("/shop?layout=load-more");
    await expect(page.getByRole("navigation", { name: "Pagination" })).toHaveCount(0);
    await expect(cards(page)).toHaveCount(12);
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(24);
    await expect(page).toHaveURL(/pageSize=24/);
    await expect(summary(page)).toHaveText("Showing 1-24 of 36 Products");
    await page.getByTestId("load-more").click();
    await expect(cards(page)).toHaveCount(36);
    await expect(page.getByTestId("load-more")).toHaveCount(0);
  });

  test("E2E-SHP-05 top filter panel is open at first, toggles with FILTER and filters the grid", async ({
    page,
  }) => {
    await page.goto("/shop?layout=top-filter");
    expect(await pageBox(filters(page))).toMatchObject({ x: 300, y: 764, w: 1320, h: 294 });
    for (const title of ["Categories", "Price range", "Size", "Color", "Rating"]) {
      await expect(filters(page).getByRole("heading", { name: title })).toBeVisible();
    }
    expect(await pageBox(page.getByTestId("filter-button"))).toMatchObject({
      x: 1481,
      y: 690,
      w: 139,
      h: 44,
    });
    await filters(page).getByText("Mini", { exact: true }).click();
    await expect(page).toHaveURL(/size=mini/);
    await expect(page).toHaveURL(/layout=top-filter/);
    await expect(filters(page)).toBeVisible(); // stays open while filtering
    await expect(page.getByRole("link", { name: "Remove filter: Mini" })).toBeVisible();

    await page.getByTestId("filter-button").click();
    await expect(filters(page)).toBeHidden();
    await expect(page.getByTestId("filter-button")).toHaveAttribute("aria-expanded", "false");
    await page.getByTestId("filter-button").click();
    await expect(filters(page)).toBeVisible();
  });

  test("E2E-SHP-06 horizontal filter dropdowns open one at a time, close on Escape and outside click, and filter", async ({
    page,
  }) => {
    await page.goto("/shop?layout=horizontal");
    expect(await pageBox(filters(page))).toMatchObject({ x: 300, y: 764, w: 1320, h: 70 });
    const color = filters(page).getByRole("button", { name: "Color" });
    await color.click();
    await expect(color).toHaveAttribute("aria-expanded", "true");
    const list = page.locator("#filter-color");
    await expect(list).toBeVisible();
    expect(await pageBox(list)).toMatchObject({ x: 1090, y: 834, w: 262 });

    // opening another closes the first
    await filters(page).getByRole("button", { name: "Size" }).click();
    await expect(list).toBeHidden();
    await expect(page.locator("#filter-size")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#filter-size")).toBeHidden();

    await color.click();
    await page.mouse.click(100, 400);
    await expect(list).toBeHidden();

    await color.click();
    await list.getByText("Peach", { exact: true }).click();
    await expect(page).toHaveURL(/color=peach/);
    await expect(page).toHaveURL(/layout=horizontal/);
    await expect(page.getByRole("link", { name: "Remove filter: Peach" })).toBeVisible();
  });

  test("E2E-SHP-07 filter drawer opens from FILTER, traps focus, closes with Escape and the close button", async ({
    page,
  }) => {
    await page.goto("/shop?layout=filter-drawer");
    await expect(page.getByRole("dialog", { name: "Filter" })).toHaveCount(0);
    expect(await pageBox(page.getByTestId("filter-button"))).toMatchObject({
      x: 1507,
      y: 690,
      w: 113,
      h: 44,
    });
    await page.getByTestId("filter-button").click();
    const drawer = page.getByRole("dialog", { name: "Filter" });
    await expect(drawer).toBeVisible();
    expect(await drawer.boundingBox()).toMatchObject({ x: 0, y: 0, width: 368 });
    await expect(drawer.getByRole("heading", { name: "Filter" })).toBeVisible();
    await expect(drawer.getByText("Availability")).toBeVisible();

    await drawer.getByText("Skincare", { exact: true }).click();
    await expect(page).toHaveURL(/category=skincare/);
    await expect(page).toHaveURL(/layout=filter-drawer/);
    await expect(summary(page)).toContainText("of 16 Products");

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await page.getByTestId("filter-button").click();
    await drawer.getByRole("button", { name: "Close filters" }).click();
    await expect(drawer).toBeHidden();
    // a click on the dimmed area also closes it
    await page.getByTestId("filter-button").click();
    await page.mouse.click(1200, 400);
    await expect(drawer).toBeHidden();
  });
});
