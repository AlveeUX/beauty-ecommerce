import { expect, test } from "@playwright/test";
import { ordersFor, setStock, stockOf, uniqueEmail } from "../fixtures/db";
import { addToCart, fillBilling, PASSWORD, register } from "../fixtures/flows";

// E2E-CHK-01..08 (PRD CHK-001..009, ORD-001/002, BR-03/05/07). Each test uses its own email so orders never mix.
const place = (page: import("@playwright/test").Page) => page.getByTestId("place-order").click();

test.describe("Checkout", () => {
  test("E2E-CHK-01 guest checkout: validation, totals, order placed, stock reserved, cart emptied", async ({
    page,
  }) => {
    const email = uniqueEmail("guest");
    const before = stockOf("the-renewal-serum");
    await addToCart(page, "the-renewal-serum", 3);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout");

    // totals come from the server's cart: 3 x $48 = $144 -> free shipping, no shipping row
    await expect(page.getByTestId("checkout-lines").getByRole("listitem")).toHaveCount(1);
    await expect(page.getByTestId("checkout-total")).toHaveText("$144.00");
    await expect(page.getByTestId("checkout-shipping")).toHaveCount(0);
    await expect(page.getByTestId("shipping-bar")).toContainText("unlocked free shipping");

    // empty submit: every required field and the terms box are flagged and nothing is sent
    await place(page);
    for (const field of [
      "firstName",
      "lastName",
      "address1",
      "city",
      "postcode",
      "phone",
      "email",
    ]) {
      await expect(page.getByTestId(`error-${field}`), field).toBeVisible();
    }
    await expect(page.getByTestId("error-acceptTerms")).toBeVisible();
    expect(ordersFor(email)).toHaveLength(0);

    await fillBilling(page, "not-an-email");
    await place(page);
    await expect(page.getByTestId("error-email")).toContainText("valid email");
    await page.getByTestId("field-email").fill(email);
    await page.getByTestId("check-acceptTerms").check();
    await place(page);

    await expect(page).toHaveURL(/\/checkout\/confirmation\/CSM-[A-Z0-9]{8}$/);
    const number = (await page.getByTestId("order-number").innerText()).trim();
    await expect(page.getByTestId("order-total")).toHaveText("$144.00");
    await expect(page.getByTestId("next-steps")).toContainText(number); // bank transfer reference
    await expect(page.getByTestId("step-pending")).toHaveAttribute("data-done", "");
    await expect(page.getByTestId("cart-count")).toHaveCount(0);

    // the database agrees: one pending order, stock reserved (BR-05)
    const orders = ordersFor(email);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      number,
      status: "pending",
      payment_status: "pending",
      payment_method: "bank_transfer",
      total_cents: 14400,
      user_id: null,
    });
    const after = stockOf("the-renewal-serum");
    expect(after.reserved).toBe(before.reserved + 3);
    expect(after.onHand).toBe(before.onHand);

    // reloading the confirmation works for this browser; a different browser is sent to tracking
    await page.reload();
    await expect(page.getByTestId("order-number")).toHaveText(number);
  });

  test("E2E-CHK-02 shipping applies below the threshold; cash on delivery and check also work", async ({
    page,
  }) => {
    const email = uniqueEmail("cod");
    await addToCart(page, "lip-repair-balm", 1); // $14
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-subtotal")).toHaveText("$14");
    await expect(page.getByTestId("checkout-shipping")).toHaveText("$8.00");
    await expect(page.getByTestId("checkout-total")).toHaveText("$22.00");
    await expect(page.getByTestId("shipping-bar")).toContainText("away from free shipping");

    await fillBilling(page, email);
    await page.getByTestId("pay-cod").check();
    await expect(page.getByText("Pay in cash when your order is delivered.")).toBeVisible();
    await page.getByTestId("check-acceptTerms").check();
    await place(page);
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    await expect(page.getByTestId("order-total")).toHaveText("$22.00");
    expect(ordersFor(email)[0]).toMatchObject({ payment_method: "cod", total_cents: 2200 });
  });

  test("E2E-CHK-03 a double click creates one order (CHK-006)", async ({ page }) => {
    const email = uniqueEmail("double");
    await addToCart(page, "gentle-cleansing-milk", 1);
    await page.goto("/checkout");
    await fillBilling(page, email);
    await page.getByTestId("check-acceptTerms").check();
    const button = page.getByTestId("place-order");
    await Promise.all([button.dblclick(), page.waitForURL(/\/checkout\/confirmation\//)]);
    expect(ordersFor(email)).toHaveLength(1);

    // replaying the same request from the API (same idempotency key) returns the same order
    const key = "replay_key_0123456789abcdef";
    await addToCart(page, "gentle-cleansing-milk", 1);
    const body = {
      firstName: "Ana",
      lastName: "Lopez",
      country: "United Kingdom (UK)",
      address1: "1 High Street",
      city: "London",
      postcode: "N1 1AA",
      phone: "+44 20 7946 0000",
      email,
      paymentMethod: "cod",
      acceptTerms: true,
      idempotencyKey: key,
    };
    const first = await page.request.post("/api/checkout", { data: body });
    const second = await page.request.post("/api/checkout", { data: body });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(200);
    expect((await second.json()).order.number).toBe((await first.json()).order.number);
    expect(ordersFor(email)).toHaveLength(2);
  });

  test("E2E-CHK-04 a declined card leaves a consistent state: failed order, stock released, cart kept, retry works", async ({
    page,
  }) => {
    const email = uniqueEmail("declined");
    const before = stockOf("lip-repair-balm");
    await addToCart(page, "lip-repair-balm", 2);
    const body = {
      firstName: "Ana",
      lastName: "Lopez",
      country: "United Kingdom (UK)",
      address1: "1 High Street",
      city: "London",
      postcode: "N1 1AA",
      phone: "+44 20 7946 0000",
      email,
      paymentMethod: "card_test",
      acceptTerms: true,
    };
    const declined = await page.request.post("/api/checkout", {
      data: { ...body, idempotencyKey: "declined_key_0123456789abc", simulate: "decline" },
    });
    expect(declined.status()).toBe(402);
    expect((await declined.json()).code).toBe("payment_failed");
    expect(ordersFor(email)).toMatchObject([{ status: "failed", payment_status: "failed" }]);
    expect(stockOf("lip-repair-balm")).toEqual({
      onHand: before.onHand,
      reserved: before.reserved,
    });
    const cart = (await (await page.request.get("/api/cart")).json()) as {
      cart: { count: number };
    };
    expect(cart.cart.count).toBe(2);

    // the shopper tries again (new key): the test card approves and the order starts processing
    await page.goto("/checkout");
    await fillBilling(page, email);
    await page.getByTestId("pay-card_test").check();
    await page.getByTestId("check-acceptTerms").check();
    await place(page);
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    await expect(page.getByTestId("payment-status")).toHaveText("Paid");
    await expect(page.getByTestId("step-processing")).toHaveAttribute("data-done", "");
    const rows = ordersFor(email);
    expect(rows.map((r) => r.status)).toEqual(["failed", "processing"]);
    expect(stockOf("lip-repair-balm").reserved).toBe(before.reserved + 2);
  });

  test("E2E-CHK-05 stock that disappears after adding to the cart blocks the order and says which item", async ({
    page,
  }) => {
    const email = uniqueEmail("stock");
    await addToCart(page, "firming-neck-cream", 3);
    await page.goto("/checkout");
    const original = stockOf("firming-neck-cream").onHand;
    setStock("firming-neck-cream", 1);
    try {
      await fillBilling(page, email);
      await page.getByTestId("check-acceptTerms").check();
      await place(page);
      await expect(page.getByTestId("checkout-problem")).toContainText("no longer available");
      await expect(page.getByTestId("checkout-problem")).toContainText("Firming neck cream");
      expect(ordersFor(email)).toHaveLength(0);
      await expect(page).toHaveURL(/\/checkout$/);
    } finally {
      setStock("firming-neck-cream", original);
    }
  });

  test("E2E-CHK-06 an empty cart shows the empty state and the API refuses to create an order", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await expect(page.getByTestId("checkout-empty")).toBeVisible();
    const response = await page.request.post("/api/checkout", {
      data: {
        firstName: "A",
        lastName: "B",
        country: "United Kingdom (UK)",
        address1: "1 Street",
        city: "London",
        postcode: "N1",
        phone: "123456",
        email: uniqueEmail("empty"),
        paymentMethod: "cod",
        acceptTerms: true,
        idempotencyKey: "empty_key_0123456789abcdef",
      },
    });
    expect(response.status()).toBe(409);
    expect((await response.json()).code).toBe("empty_cart");
  });

  test("E2E-CHK-07 the coupon box opens and rejects unknown codes (coupons arrive in P9)", async ({
    page,
  }) => {
    await addToCart(page, "lip-repair-balm", 1);
    await page.goto("/checkout");
    await expect(page.getByTestId("coupon-input")).toHaveCount(0);
    await page.getByRole("button", { name: "Click here" }).click();
    await page.getByTestId("coupon-input").fill("SAVE10");
    await page.getByRole("button", { name: "Apply coupon" }).click();
    await expect(page.getByText("This coupon code is not valid.")).toBeVisible();
  });

  test("E2E-CHK-08 signed-in checkout pre-fills the saved address and the order appears in the account", async ({
    page,
  }) => {
    const email = uniqueEmail("member");
    await register(page, "member" + Math.random().toString(36).slice(2, 8), email, PASSWORD);

    await page.goto("/account/addresses");
    await expect(page.getByTestId("addresses-empty")).toBeVisible();
    await page.getByTestId("add-address").click();
    await page.getByTestId("save-address").click();
    await expect(page.getByTestId("error-firstName")).toBeVisible();
    await page.getByTestId("field-firstName").fill("Maya");
    await page.getByTestId("field-lastName").fill("Stone");
    await page.getByTestId("field-address1").fill("22 Baker Street");
    await page.getByTestId("field-city").fill("London");
    await page.getByTestId("field-postcode").fill("NW1 6XE");
    await page.getByTestId("field-phone").fill("+44 20 7946 0001");
    await page.getByTestId("save-address").click();
    await expect(page.getByTestId("address-card")).toHaveCount(1);
    await expect(page.getByTestId("address-card")).toContainText("Default");

    await addToCart(page, "lip-repair-balm", 1);
    await page.goto("/checkout");
    await expect(page.getByTestId("field-firstName")).toHaveValue("Maya");
    await expect(page.getByTestId("field-address1")).toHaveValue("22 Baker Street");
    await expect(page.getByTestId("field-email")).toHaveValue(email);
    await page.getByTestId("check-acceptTerms").check();
    await place(page);
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    const number = (await page.getByTestId("order-number").innerText()).trim();
    expect(ordersFor(email)[0]!.user_id).not.toBeNull();

    await page.goto("/account/orders");
    await expect(page.getByTestId("orders-list")).toContainText(number);
    await page.getByRole("link", { name: number }).click();
    await expect(page.getByTestId("order-heading")).toContainText(number);
    await expect(page.getByTestId("order-items")).toContainText("Lip Repair Balm");
  });

  test("E2E-CHK-09 another account cannot open someone else's order, and Buy now goes to checkout", async ({
    page,
    browser,
  }) => {
    const email = uniqueEmail("owner");
    await register(page, "owner" + Math.random().toString(36).slice(2, 8), email, PASSWORD);
    await addToCart(page, "lip-repair-balm", 1);
    await page.goto("/checkout");
    await page.getByTestId("check-acceptTerms").check();
    await fillBilling(page, email);
    await place(page);
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    const number = (await page.getByTestId("order-number").innerText()).trim();

    const other = await browser.newContext();
    const op = await other.newPage();
    await register(
      op,
      "intruder" + Math.random().toString(36).slice(2, 8),
      uniqueEmail("intruder"),
      PASSWORD,
    );
    expect((await op.goto(`/account/orders/${number}`))?.status()).toBe(404);
    await op.goto(`/checkout/confirmation/${number}`);
    await expect(op).toHaveURL(/\/track-order$/);
    await other.close();

    await page.goto("/product/the-renewal-serum");
    await page.getByTestId("buy-now").click();
    await expect(page).toHaveURL(/\/checkout$/);
  });
});
