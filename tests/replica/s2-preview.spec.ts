import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("default radar opens S2 from the admin page and retains animation controls and original comparison", async ({
  page,
}) => {
  const data = JSON.parse(readFileSync("data.json", "utf8"));
  data.CONFIG.ADAPTIVE_PERF = false;
  const errors: string[] = [];
  let writes = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/data", (route) => {
    if (route.request().method() !== "GET") writes++;
    return route.fulfill({ json: data });
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = async () => {};
  });
  await page.goto("/");
  const displayLink = page.locator('a[href="/radar"]');
  await expect(displayLink).toBeVisible();
  // Follow the same URL as the admin's open-display link, without an opt-in query.
  await page.goto((await displayLink.getAttribute("href")) as string);
  await expect(page.locator("#introGuideLabels")).not.toBeEmpty();
  const canvas = page.locator("#particles-canvas");
  const image = async () =>
    createHash("sha256")
      .update(
        await canvas.evaluate((element) =>
          (element as HTMLCanvasElement).toDataURL(),
        ),
      )
      .digest("hex");
  await expect(canvas).toHaveAttribute("data-effect-mode", "s2-reveal");
  const before = await image();
  await expect.poll(image).not.toBe(before);
  await page.getByRole("button", { name: "暂停背景", exact: true }).click();
  await page.waitForTimeout(150);
  const stopped = await image();
  await page.waitForTimeout(200);
  expect(await image()).toBe(stopped);
  await page.getByRole("combobox", { name: "背景场景" }).selectOption("normal");
  await expect(canvas).toHaveAttribute("data-effect-mode", "s2-normal");
  expect(await image()).not.toBe(stopped);
  await page.getByRole("button", { name: "动态：增强", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "动态：轻微", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "继续背景", exact: true }).click();
  await page.mouse.click(5, 100);
  await page.keyboard.press("p");
  await expect(canvas).toHaveAttribute("data-effect-enabled", "false");
  await page.keyboard.press("p");
  await expect(canvas).toHaveAttribute("data-effect-enabled", "true");
  await page.keyboard.press("Space");
  await expect(page.locator("#introOverlay")).toHaveCSS("display", "none", {
    timeout: 15000,
  });
  await expect(page.locator("#bandName")).not.toBeEmpty();
  await expect(page.locator("#radarBgCleaner")).toHaveCSS(
    "background-color",
    "rgba(12, 9, 36, 0.78)",
  );
  const comparison = page.getByRole("link", { name: "对比原版", exact: true });
  await expect(comparison).toHaveAttribute("href", "/radar?theme=original");
  await page.goto((await comparison.getAttribute("href")) as string);
  await expect(page.locator("#introGuideLabels")).not.toBeEmpty();
  await expect(page.locator("body")).not.toHaveClass(/s2-preview/);
  await expect(
    page.getByRole("complementary", { name: "S2 背景预览" }),
  ).toHaveCount(0);
  // Keep previously shared explicit S2 links working.
  await page.goto("/radar?theme=s2");
  await expect(canvas).toHaveAttribute("data-effect-mode", "s2-reveal");
  expect(writes).toBe(0);
  expect(errors).toEqual([]);
});
