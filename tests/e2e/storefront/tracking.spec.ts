import { expect, test, type Page } from "@playwright/test";
import { ordersFor, run, uniqueEmail } from "../fixtures/db";
import { addToCart } from "../fixtures/flows";

// E2E-TRK-01..04 (PRD TRK-001/002, BR-12, SEC-004, ORD-001).
async function orderFor(page: Page, email: string): Promise<string> {
  await addToCart(page, "lip-repair-balm", 1);
  const response = await page.request.post("/api/checkout", {
    data: {
      firstName: "Ana",
      lastName: "Lopez",
      country: "United Kingdom (UK)",
      address1: "1 High Street",
      city: "London",
      postcode: "N1 1AA",
      phone: "+44 20 7946 0000",
      email,
      paymentMethod: "bank_transfer",
      acceptTerms: true,
      idempotencyKey: `trk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { order: { number: string } }).order.number;
}

test.describe("Order tracking", () => {
  // lookups are throttled per client address, and every test here shares one; start each with a clean slate
  test.beforeEach(() => run("delete from rate_limits where key like 'track:%'"));

  test("E2E-TRK-01 order ID and billing email show the status timeline and the order", async ({
    page,
  }) => {
    const email = uniqueEmail("track");
    const number = await orderFor(page, email);

    await page.goto("/track-order");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order tracking");
    await page.getByTestId("auth-submit").click(); // empty form
    await expect(page.getByTestId("error-orderId")).toBeVisible();
    await expect(page.getByTestId("error-email")).toBeVisible();

    await page.getByTestId("field-orderId").fill(number.toLowerCase());
    await page.getByTestId("field-email").fill(email.toUpperCase());
    await page.getByTestId("auth-submit").click();
    const result = page.getByTestId("track-result");
    await expect(result).toContainText(number);
    await expect(result.getByTestId("step-pending")).toHaveAttribute("data-done", "");
    await expect(result.getByTestId("step-shipped")).not.toHaveAttribute("data-done", "");
    await expect(result.getByTestId("order-items")).toContainText("Lip Repair Balm");
    await expect(result.getByTestId("payment-status")).toHaveText("Awaiting payment");
  });

  test("E2E-TRK-02 a wrong email or a wrong ID gives the same generic answer", async ({ page }) => {
    const email = uniqueEmail("generic");
    const number = await orderFor(page, email);
    await page.goto("/track-order");

    const submit = async (id: string, mail: string) => {
      await page.getByTestId("field-orderId").fill(id);
      await page.getByTestId("field-email").fill(mail);
      await page.getByTestId("auth-submit").click();
      return page.getByTestId("form-error");
    };
    const wrongEmail = await submit(number, "someone.else@example.com");
    await expect(wrongEmail).toContainText("could not find an order");
    const message = await wrongEmail.innerText();
    await submit("CSM-ZZZZZZZZ", email);
    await expect(page.getByTestId("form-error")).toHaveText(message);
    await submit("nonsense", email);
    await expect(page.getByTestId("form-error")).toHaveText(message);
    await expect(page.getByTestId("track-result")).toHaveCount(0);
  });

  test("E2E-TRK-03 repeated guesses are throttled (SEC-004)", async ({ page }) => {
    await page.goto("/track-order");
    const number = "CSM-QQQQQQQQ";
    let blocked = 0;
    for (let i = 0; i < 12; i++) {
      const response = await page.request.post("/api/orders/track", {
        data: { orderId: number, email: `guess${i}@example.com` },
      });
      if (response.status() === 429) {
        blocked++;
        expect(response.headers()["retry-after"]).toBeTruthy();
      } else {
        expect(response.status()).toBe(404);
      }
    }
    expect(blocked).toBeGreaterThanOrEqual(2);
    // and the form tells the shopper to wait
    await page.getByTestId("field-orderId").fill(number);
    await page.getByTestId("field-email").fill("again@example.com");
    await page.getByTestId("auth-submit").click();
    await expect(page.getByTestId("form-error")).toContainText("Too many lookups");
    // the throttle keys on the real order ID and this address; clear them so later tests are unaffected
    run("delete from rate_limits where key like 'track:%'");
  });

  test("E2E-TRK-04 the timeline follows the order through its states, including cancellation", async ({
    page,
  }) => {
    const email = uniqueEmail("states");
    const number = await orderFor(page, email);
    expect(ordersFor(email)).toHaveLength(1);

    const track = async () => {
      await page.goto("/track-order");
      await page.getByTestId("field-orderId").fill(number);
      await page.getByTestId("field-email").fill(email);
      await page.getByTestId("auth-submit").click();
      return page.getByTestId("track-result");
    };

    // staff actions arrive in P8; until then the state change is applied directly to the test database
    run(
      "update orders set status = 'shipped', carrier = 'DHL', tracking_number = 'JD0146000' where number = ?",
      number,
    );
    run(
      "insert into order_events (order_id, from_status, to_status, actor, note) select id, 'processing', 'shipped', 'staff:1', 'Handed to carrier' from orders where number = ?",
      number,
    );
    let result = await track();
    await expect(result.getByTestId("step-shipped")).toHaveAttribute("aria-current", "step");
    await expect(result).toContainText("JD0146000");
    await expect(result).toContainText("Handed to carrier");

    run("update orders set status = 'cancelled' where number = ?", number);
    run(
      "insert into order_events (order_id, from_status, to_status, actor) select id, 'shipped', 'cancelled', 'staff:1' from orders where number = ?",
      number,
    );
    result = await track();
    await expect(result.getByTestId("step-cancelled")).toHaveAttribute("aria-current", "step");
    await expect(result.getByTestId("step-delivered")).not.toHaveAttribute("data-done", "");
  });
});
