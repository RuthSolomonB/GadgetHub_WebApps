import { expect, test } from "@playwright/test";

test("storefront root responds", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText("GadgetHub");
});
