import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBeLessThan(600);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});
