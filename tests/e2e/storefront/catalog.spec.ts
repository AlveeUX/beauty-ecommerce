import { expect, test, type Page } from "@playwright/test";

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Product filters" });
const summary = (page: Page) => page.getByTestId("results-summary").first();
const cards = (page: Page) =>
  page.getByTestId("product-grid").locator("[data-testid='product-card']");
const cardPrices = async (page: Page) =>
  (await cards(page).getByTestId("card-price").allInnerTexts()).map((t) =>
    Number(t.match(/\$(\d+(?:\.\d+)?)/)?.[1]),
  );

// E2E-CAT-01..06 (PRD CAT-001..005, CAT-008)
test.describe("Shop listing", () => {
  test("E2E-CAT-01 shows page 1 of 12 products with an accurate count", async ({ page }) => {
    await page.goto("/shop");
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
    await expect(cards(page)).toHaveCount(12);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shop");
    // facet counts are real: Skincare 16, Makeup 12
    await expect(sidebar(page).getByRole("checkbox", { name: /Skincare/ })).toBeVisible();
  });

  test("E2E-CAT-02 category filter updates results, chips and URL, and Clear all resets", async ({
    page,
  }) => {
    await page.goto("/shop");
    await sidebar(page).getByText("Skincare", { exact: true }).click();
    await expect(page).toHaveURL(/category=skincare/);
    await expect(summary(page)).toHaveText("Showing 1-12 of 16 Products");
    await expect(page.getByRole("link", { name: "Remove filter: Skincare" })).toBeVisible();

    await sidebar(page).getByText("Cleansers", { exact: true }).click(); // adds a second category
    await expect(page).toHaveURL(/category=skincare&category=cleansers/);

    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
  });

  test("E2E-CAT-03 price preset, availability and color filters combine (AND)", async ({
    page,
  }) => {
    await page.goto("/shop");
    await sidebar(page).getByRole("button", { name: "Under $50" }).click();
    await expect(page).toHaveURL(/price=0-50/);
    for (const p of await cardPrices(page)) expect(p).toBeLessThanOrEqual(50);

    await sidebar(page).getByText("In Stock", { exact: true }).click();
    await sidebar(page).getByText("Peach", { exact: true }).click();
    await expect(page).toHaveURL(/availability=in-stock/);
    await expect(page).toHaveURL(/color=peach/);
    await expect(page.getByRole("link", { name: "Remove filter: Peach" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: In Stock" })).toBeVisible();

    // removing one chip keeps the others
    await page.getByRole("link", { name: "Remove filter: Peach" }).click();
    await expect(page).not.toHaveURL(/color=peach/);
    await expect(page).toHaveURL(/availability=in-stock/);
  });

  test("E2E-CAT-04 sort and pagination keep state in the URL and survive reload", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.getByLabel("Sort products").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
    const prices = await cardPrices(page);
    expect(prices[0]).toBe(10);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    await page.getByRole("link", { name: "Page 02" }).first().click();
    await expect(page).toHaveURL(/sort=price-asc&page=2/);
    await expect(summary(page)).toHaveText("Showing 13-24 of 36 Products");

    await page.reload();
    await expect(summary(page)).toHaveText("Showing 13-24 of 36 Products");
    await expect(page.getByLabel("Sort products")).toHaveValue("price-asc");

    await page.goBack();
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
  });

  test("E2E-CAT-05 out-of-range pages clamp and invalid parameters degrade gracefully", async ({
    page,
  }) => {
    await page.goto("/shop?page=99");
    await expect(summary(page)).toHaveText("Showing 25-36 of 36 Products");

    const res = await page.goto("/shop?sort=bogus&page=-3&price=abc&size=huge");
    expect(res?.status()).toBe(200);
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
  });

  test("E2E-CAT-06 no results shows an empty state with a way out", async ({ page }) => {
    await page.goto("/shop?category=fragrance&color=crimson");
    await expect(page.getByTestId("empty-results")).toContainText("No products match your filters");
    await expect(summary(page)).toHaveText("Showing 0-0 of 0 Products");
    await page.getByRole("link", { name: "Clear all filters" }).click();
    await expect(summary(page)).toHaveText("Showing 1-12 of 36 Products");
  });

  test("E2E-CAT-07 /category/[slug] shows the filtered shop; unknown slugs are 404", async ({
    page,
  }) => {
    await page.goto("/category/lips");
    await expect(page).toHaveURL(/\/shop\?category=lips$/);
    await expect(summary(page)).toContainText("of 2 Products");

    const res = await page.goto("/category/does-not-exist");
    expect(res?.status()).toBe(404);
  });

  test("E2E-CAT-08 categories page lists the 12 image cards and links into the shop", async ({
    page,
  }) => {
    await page.goto("/categories");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Categories");
    await expect(page.getByTestId("category-grid").locator("li")).toHaveCount(12);
    await page.getByRole("link", { name: /04 • Moisturizers/ }).click();
    await expect(page).toHaveURL(/category=moisturizers/);
    await expect(summary(page)).toContainText("of 2 Products");
  });
});
