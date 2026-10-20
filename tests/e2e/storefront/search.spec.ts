import { expect, test } from "@playwright/test";

// E2E-SRC-01..03 (PRD SRC-001, SRC-002)
test.describe("Search", () => {
  test("E2E-SRC-01 overlay opens with trending products and closes with Escape", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.getByTestId("search-trigger").click();
    const dialog = page.getByTestId("search-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Search our collection" })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Trending Product" })).toBeVisible();
    await expect(dialog.getByTestId("search-results").locator("article")).toHaveCount(4);
    await expect(dialog.getByRole("searchbox")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("E2E-SRC-02 typing shows live suggestions, a result opens the product", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("search-trigger").click();
    const dialog = page.getByTestId("search-dialog");
    await dialog.getByRole("searchbox").fill("serum");
    await expect(dialog.getByRole("heading", { name: "Results for “serum”" })).toBeVisible();
    await expect(dialog.getByTestId("search-results").locator("article")).toHaveCount(1);
    await expect(dialog.getByTestId("search-results")).toContainText("The renewal serum");

    await dialog.getByRole("link", { name: "The renewal serum" }).click();
    await expect(page).toHaveURL(/\/product\/the-renewal-serum$/);
    await expect(dialog).toBeHidden();
  });

  test("E2E-SRC-03 no match shows an empty message, Enter opens the results page", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page.getByTestId("search-trigger").click();
    const dialog = page.getByTestId("search-dialog");
    await dialog.getByRole("searchbox").fill("xyzzy");
    await expect(dialog.getByTestId("search-empty")).toContainText("No products match");

    await dialog.getByRole("searchbox").press("Enter");
    await expect(page).toHaveURL(/\/search\?q=xyzzy$/);
    await expect(page.getByTestId("empty-results")).toBeVisible();
    await expect(page.getByRole("link", { name: "Remove filter: Search: xyzzy" })).toBeVisible();
  });

  test("E2E-SRC-04 /search?q= lists matching products with filters still available", async ({
    page,
  }) => {
    await page.goto("/search?q=lip");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Search: lip");
    await expect(page.getByTestId("results-summary").first()).not.toContainText("of 0");
    await expect(page.getByRole("heading", { name: "Luxe matte lipstick" })).toBeVisible();
  });

  test("E2E-SRC-05 special characters are searched literally and never break the page", async ({
    request,
    page,
  }) => {
    const res = await request.get("/api/search?q=%27%3B%20drop%20table%20products%3B%20--");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ products: [], categories: [] });
    await page.goto("/search?q=%25");
    await expect(page.getByTestId("results-summary").first()).toContainText("of 1 Products"); // only "(5%)" in the serum's ingredients
  });
});
