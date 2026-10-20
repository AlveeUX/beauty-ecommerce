import { expect, type Page } from "@playwright/test";

/** Put products in the cart of this browser context through the same API the buttons use. */
export async function addToCart(page: Page, slug: string, quantity = 1) {
  const response = await page.request.post("/api/cart/items", { data: { slug, quantity } });
  expect(response.status(), `add ${slug}`).toBe(201);
}

export const BILLING = {
  firstName: "Ana",
  lastName: "Lopez",
  address1: "1 High Street",
  city: "London",
  postcode: "N1 1AA",
  phone: "+44 20 7946 0000",
};

/** Fill the checkout billing form (country stays at its default, United Kingdom). */
export async function fillBilling(page: Page, email: string, over: Partial<typeof BILLING> = {}) {
  const values = { ...BILLING, ...over };
  for (const [name, value] of Object.entries(values)) {
    await page.getByTestId(`field-${name}`).fill(value);
  }
  await page.getByTestId("field-email").fill(email);
}

export async function register(page: Page, username: string, email: string, password: string) {
  await page.goto("/register");
  await page.getByTestId("field-username").fill(username);
  await page.getByTestId("field-email").fill(email);
  await page.getByTestId("field-password").fill(password);
  await page.getByTestId("auth-submit").click();
  await expect(page).toHaveURL(/\/account$/);
}

export const PASSWORD = "a long unusual phrase 42";
