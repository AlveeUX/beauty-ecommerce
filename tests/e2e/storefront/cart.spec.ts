import { expect, test, type Page } from "@playwright/test";

// E2E-CRT-01..05 (PRD CRT-001..005). Each test gets a fresh browser context, so the cart starts empty.
const drawer = (page: Page) => page.getByTestId("cart-drawer");
const addSerum = async (page: Page) => {
  await page.goto("/product/the-renewal-serum");
  await page.getByTestId("add-to-cart").click();
  await expect(drawer(page)).toBeVisible();
};

test.describe("Cart", () => {
  test("E2E-CRT-01 add to cart opens the drawer with the line, subtotal and header count", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("cart-count")).toHaveCount(0);

    await addSerum(page);
    await expect(drawer(page).getByRole("heading", { name: "Your cart (1)" })).toBeVisible();
    await expect(drawer(page).getByTestId("cart-lines").getByRole("listitem")).toHaveCount(1);
    await expect(drawer(page).getByText("The renewal serum")).toBeVisible();
    await expect(drawer(page).getByTestId("drawer-subtotal")).toHaveText("$48");
    await expect(page.getByTestId("cart-count")).toHaveText("1");

    // quantity inside the drawer recalculates the subtotal on the server
    await drawer(page)
      .getByRole("button", { name: /Increase quantity/ })
      .click();
    await expect(drawer(page).getByTestId("drawer-subtotal")).toHaveText("$96");
    await expect(page.getByTestId("cart-count")).toHaveText("2");

    // Escape closes, focus returns to the page
    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeHidden();
  });

  test("E2E-CRT-02 the free-shipping bar follows the subtotal and unlocks at the threshold", async ({
    page,
  }) => {
    await addSerum(page);
    await expect(drawer(page).getByTestId("shipping-bar")).toContainText("$52.00");
    await drawer(page)
      .getByRole("button", { name: /Increase quantity/ })
      .click();
    await drawer(page)
      .getByRole("button", { name: /Increase quantity/ })
      .click();
    await expect(drawer(page).getByTestId("shipping-bar")).toContainText("unlocked free shipping");
  });

  test("E2E-CRT-03 cart page: totals, quantity, remove with undo, remove all and the empty state", async ({
    page,
  }) => {
    await addSerum(page);
    await drawer(page).getByRole("link", { name: "View Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cart");

    const rows = page.getByTestId("cart-row");
    await expect(rows).toHaveCount(1);
    await expect(page.getByTestId("cart-total")).toHaveText("$48.00");
    await rows.getByRole("button", { name: /Increase quantity/ }).click();
    await expect(rows.getByTestId("line-subtotal")).toHaveText("$96");
    await expect(page.getByTestId("cart-total")).toHaveText("$96.00");

    await rows.getByRole("button", { name: /Remove The renewal serum/ }).click();
    await expect(page.getByTestId("cart-empty-page")).toBeVisible();
    await expect(page.getByTestId("undo-bar")).toContainText("removed from cart");
    await page.getByTestId("undo-bar").getByRole("button", { name: "Undo?" }).click();
    await expect(rows).toHaveCount(1);
    await expect(rows.getByTestId("qty").locator("output")).toHaveText("02");

    await page.getByRole("button", { name: "Remove all" }).click();
    await expect(page.getByTestId("cart-empty-page")).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue shopping" })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  test("E2E-CRT-04 the cart survives a reload and is the same on every page (CRT-004)", async ({
    page,
  }) => {
    await addSerum(page);
    await page.keyboard.press("Escape");
    await page.reload();
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await page.goto("/shop");
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await page.goto("/cart");
    await expect(page.getByTestId("cart-row")).toHaveCount(1);
  });

  test("E2E-CRT-05 stock is enforced on the server (CRT-005)", async ({ page }) => {
    await page.goto("/");
    // sold out
    const oos = await page.request.post("/api/cart/items", {
      data: { slug: "glass-glow-primer", quantity: 1 },
    });
    expect(oos.status()).toBe(409);
    expect((await oos.json()).code).toBe("out_of_stock");
    // bad quantities and unknown products
    const tooMany = await page.request.post("/api/cart/items", {
      data: { slug: "the-renewal-serum", quantity: 500 },
    });
    expect(tooMany.status()).toBe(422);
    const missing = await page.request.post("/api/cart/items", {
      data: { slug: "no-such-product", quantity: 1 },
    });
    expect(missing.status()).toBe(404);
    // nothing was added
    const cart = await (await page.request.get("/api/cart")).json();
    expect(cart.cart.count).toBe(0);

    // the product page does not offer a sold-out variant for purchase
    await page.goto("/product/glass-glow-primer");
    await expect(page.getByTestId("add-to-cart")).toBeDisabled();
  });

  test("E2E-CRT-06 quick add on a product card and the Home Add to cart button", async ({
    page,
  }) => {
    await page.goto("/shop");
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: /^Add .* to cart$/ })
      .click({ force: true });
    await expect(drawer(page)).toBeVisible();
    await expect(page.getByTestId("cart-count")).toHaveText("1");
    await page.keyboard.press("Escape");

    await page.goto("/");
    await page
      .locator("section[aria-labelledby='loved-title']")
      .getByRole("button", { name: "Add to cart" })
      .first()
      .click();
    await expect(page.getByTestId("cart-count")).toHaveText("2");
  });

  test("E2E-CRT-07 an empty cart drawer shows the empty state and Continue shopping", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("cart-link").click();
    await expect(drawer(page).getByTestId("cart-empty")).toBeVisible();
    await expect(drawer(page).getByText("Your beauty bag Is empty")).toBeVisible();
    await drawer(page).getByRole("link", { name: "Continue shopping" }).click();
    await expect(page).toHaveURL(/\/shop$/);
  });
});
