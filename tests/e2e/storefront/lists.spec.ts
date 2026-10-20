import { expect, test } from "@playwright/test";

// E2E-WSH-01..02, E2E-CMP-01..02 (PRD WSH-001..003, CMP-001)
test.describe("Wishlist", () => {
  test("E2E-WSH-01 heart adds with the popup, shows in the header count and on the page", async ({
    page,
  }) => {
    await page.goto("/product/the-renewal-serum");
    await page.getByTestId("wishlist").click();
    const popup = page.getByTestId("wishlist-modal");
    await expect(popup.getByRole("heading", { name: "Your wishlist (1)" })).toBeVisible();
    await expect(popup.getByText("The renewal serum")).toBeVisible();
    await expect(page.getByTestId("wishlist-count")).toHaveText("1");

    await popup.getByRole("link", { name: "View wishlist page" }).click();
    await expect(page).toHaveURL(/\/wishlist$/);
    const rows = page.getByTestId("wishlist-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.getByText("In stock")).toBeVisible();

    // survives a reload (guest list in localStorage, WSH-003)
    await page.reload();
    await expect(rows).toHaveCount(1);
    await expect(page.getByTestId("wishlist-count")).toHaveText("1");
  });

  test("E2E-WSH-02 add to cart from the wishlist, remove, and the empty state", async ({
    page,
  }) => {
    await page.goto("/shop");
    const card = page.getByTestId("product-card").first();
    await card.getByRole("button", { name: /^Add .* to wishlist$/ }).click({ force: true });
    await page.getByTestId("wishlist-modal").getByRole("button", { name: "Close" }).first().click();

    await page.goto("/wishlist");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByTestId("cart-drawer")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: /Remove .* from wishlist/ }).click();
    await expect(page.getByTestId("wishlist-empty")).toBeVisible();
    await expect(page.getByTestId("wishlist-count")).toHaveCount(0);
  });
});

test.describe("Compare", () => {
  test("E2E-CMP-01 add products, see the table, remove one", async ({ page }) => {
    await page.goto("/product/the-renewal-serum");
    await page.getByTestId("compare").click();
    await page.goto("/product/barrier-repair-cream");
    await page.getByTestId("compare").click();

    await page.goto("/compare");
    await expect(page.getByTestId("compare-col")).toHaveCount(2);
    const table = page.getByTestId("compare-table");
    for (const label of ["Rating", "SKU", "Size", "Price", "Stock"]) {
      await expect(table.getByRole("rowheader", { name: label })).toBeVisible();
    }
    await expect(table.getByText("#CSM-0001-30ML")).toBeVisible();

    await page.getByRole("button", { name: "Remove The renewal serum from compare" }).click();
    await expect(page.getByTestId("compare-col")).toHaveCount(1);
  });

  test("E2E-CMP-02 adding the same product twice shows the popup and the limit is enforced (OQ-10)", async ({
    page,
  }) => {
    await page.goto("/product/the-renewal-serum");
    await page.getByTestId("compare").click();
    await page.getByTestId("compare").click();
    const popup = page.getByTestId("compare-exists");
    await expect(popup.getByRole("heading", { name: "Already added" })).toBeVisible();
    await popup.getByRole("link", { name: "Compare now" }).click();
    await expect(page).toHaveURL(/\/compare$/);
    await expect(page.getByTestId("compare-col")).toHaveCount(1);

    // limit of 4
    for (const slug of ["barrier-repair-cream", "gentle-cleansing-milk", "lip-repair-balm"]) {
      await page.goto(`/product/${slug}`);
      await page.getByTestId("compare").click();
    }
    await page.goto("/product/firming-neck-cream");
    await page.getByTestId("compare").click();
    await expect(page.getByTestId("toast")).toContainText("up to 4");
    await page.goto("/compare");
    await expect(page.getByTestId("compare-col")).toHaveCount(4);
  });

  test("E2E-CMP-03 empty compare page", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByTestId("compare-empty")).toBeVisible();
  });
});
