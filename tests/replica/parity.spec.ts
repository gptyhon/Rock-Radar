import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const original = JSON.parse(readFileSync("data.json", "utf8"));

async function prepare(page: Page, fixture = original) {
  let data = structuredClone(fixture);
  // Every mutation stays in memory; these checks never write the user's project.
  await page.route("**/api/data", async (route) => {
    if (route.request().method() === "PUT") {
      data = route.request().postDataJSON();
      await route.fulfill({ json: { success: true } });
    } else await route.fulfill({ json: data });
  });
  await page.route("**/api/images", (route) => route.fulfill({ json: [] }));
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route(/\/(?:pic|assets\/images)\//, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="#37485f"/><circle cx="300" cy="300" r="160" fill="#c3aa76"/></svg>',
    }),
  );
  await page.addInitScript(() => {
    // A fixed clock makes the original and React Canvas draw the same frames.
    // No production animation code is modified for testing.
    const nativeRaf = window.requestAnimationFrame.bind(window);
    (window as any).__nativeRaf = nativeRaf;
    const NativeImage = window.Image;
    const imageSrc = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      "src",
    )!;
    const pendingImages = new Set<Promise<void>>();
    window.Image = function (width?: number, height?: number) {
      const image = new NativeImage(width, height);
      Object.defineProperty(image, "src", {
        get() {
          return imageSrc.get!.call(image);
        },
        set(value) {
          const ready = new Promise<void>((resolve) => {
            const finish = () => {
              image.removeEventListener("load", finish);
              image.removeEventListener("error", finish);
              resolve();
            };
            image.addEventListener("load", finish);
            image.addEventListener("error", finish);
          });
          pendingImages.add(ready);
          void ready.then(() => pendingImages.delete(ready));
          imageSrc.set!.call(image, value);
        },
      });
      return image;
    } as unknown as typeof Image;
    let now = 0,
      id = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const timers = new Map<number, { at: number; callback: () => void }>();
    Math.random = () => 0.37;
    Date.now = () => 1_800_000_000_000 + now;
    performance.now = () => now;
    window.requestAnimationFrame = (callback) => {
      frames.set(++id, callback);
      return id;
    };
    window.cancelAnimationFrame = (key) => {
      frames.delete(key);
    };
    window.setTimeout = ((callback: () => void, delay = 0) => {
      timers.set(++id, { at: now + delay, callback });
      return id;
    }) as typeof window.setTimeout;
    window.clearTimeout = (key) => {
      timers.delete(Number(key));
    };
    (window as any).__controlledRaf = window.requestAnimationFrame;
    HTMLMediaElement.prototype.play = async function () {};
    // CSS layout transitions must share the Canvas clock: the radar cleaner
    // measures the animated canvas rectangle on each frame.
    const cssStarted = new WeakMap<Animation, number>();
    const syncCss = () => {
      for (const animation of document.getAnimations()) {
        if (!cssStarted.has(animation)) cssStarted.set(animation, now);
        animation.pause();
        animation.currentTime = now - cssStarted.get(animation)!;
      }
    };
    (window as any).__advance = async (ms: number) => {
      syncCss();
      const end = now + ms;
      while (now < end) {
        now = Math.min(end, now + 16);
        for (const [key, timer] of [...timers])
          if (timer.at <= now) {
            timers.delete(key);
            timer.callback();
          }
        syncCss();
        const batch = [...frames.values()];
        frames.clear();
        batch.forEach((callback) => callback(now));
        await Promise.all([...pendingImages]);
        syncCss();
      }
    };
  });
}

async function advance(page: Page, ms: number) {
  await page.evaluate((ms) => (window as any).__advance(ms), ms);
}

async function picture(page: Page, name: string, selector?: string, style?: string) {
  await page.evaluate(() => {
    window.requestAnimationFrame = (window as any).__nativeRaf;
  });
  await page.mouse.move(0, 0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const name = document.getElementById("bandName")?.textContent;
        const photo = document.getElementById(
          "bandPhoto",
        ) as HTMLImageElement | null;
        return (
          !name ||
          (!!photo?.dataset.imageMetaName?.startsWith(name) && photo.complete)
        );
      }),
    )
    .toBe(true);
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images]
        .filter((image) => image.getAttribute("src"))
        .map((image) => image.decode().catch(() => {})),
    );
    const animations = document.getAnimations().map(animation => ({
      animation, time: animation.currentTime,
    }));
    animations.forEach(({ animation }) => animation.pause());
    await Promise.all(animations.map(({ animation }) => animation.ready));
    animations.forEach(({ animation, time }) => { animation.currentTime = time; });
    // Let Chromium commit paused pseudo-element/filter layers before capture.
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  const options = {
    path: `test-results/${name}.png`,
    animations: page.url().includes("radar") ? "allow" : "disabled",
    timeout: 10_000,
    style,
  } as const;
  const buffer = selector
    ? await page.locator(selector).screenshot({
        ...options,
        // Fixed page controls can overlap a panel when it scrolls into view.
        style: `${style ?? ""}\n.topbar, #toast { visibility: hidden; }`,
      })
    : await page.screenshot({ ...options, fullPage: !page.url().includes("radar") });
  await page.evaluate(() => {
    window.requestAnimationFrame = (window as any).__controlledRaf;
  });
  return buffer;
}

async function comparePictures(
  replica: Page,
  baseline: Page,
  actualName: string,
  expectedName: string,
  selector?: string,
  style?: string,
) {
  const actual = await picture(replica, actualName, selector, style);
  const expected = await picture(baseline, expectedName, selector, style);
  const result = await replica.evaluate(
    async ([left, right]) => {
      const decode = async (data: string) =>
        createImageBitmap(
          new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))]),
        );
      const [a, b] = await Promise.all([decode(left), decode(right)]);
      if (a.width !== b.width || a.height !== b.height)
        return { dimensionsEqual: false, differentPixels: -1 };
      const canvas = new OffscreenCanvas(a.width, a.height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(a, 0, 0);
      const pixelsA = ctx.getImageData(0, 0, a.width, a.height).data;
      ctx.clearRect(0, 0, a.width, a.height);
      ctx.drawImage(b, 0, 0);
      const pixelsB = ctx.getImageData(0, 0, b.width, b.height).data;
      let differentPixels = 0;
      for (let i = 0; i < pixelsA.length; i += 4) {
        // Allow only 3/255 channel rounding in Chromium's filter compositing.
        // No differing pixel beyond that tolerance is accepted.
        if (
          [0, 1, 2, 3].some(
            (k) => Math.abs(pixelsA[i + k] - pixelsB[i + k]) > 3,
          )
        )
          differentPixels++;
      }
      a.close();
      b.close();
      return { dimensionsEqual: true, differentPixels };
    },
    [actual.toString("base64"), expected.toString("base64")],
  );
  expect(result, actualName).toEqual({
    dimensionsEqual: true,
    differentPixels: 0,
  });
}

test("original and React radar match through intro, playback, seeking, gacha and MVP", async ({
  context,
}) => {
  const baseline = await context.newPage();
  const replica = await context.newPage();
  const errors: string[] = [];
  replica.on("pageerror", (error) => {
    errors.push(error.message);
  });
  for (const page of [baseline, replica]) await prepare(page);
  await baseline.goto("/legacy/radar");
  await replica.goto("/radar?theme=original");
  for (const page of [baseline, replica]) {
    await expect(page.locator("#introGuideLabels")).not.toBeEmpty();
    await advance(page, 160);
  }
  // Layout and CSS, including SVG brand decorations, remain identical.
  await comparePictures(replica, baseline, "react-idle", "original-idle");
  for (const page of [baseline, replica]) {
    await page.keyboard.press("Space");
    await advance(page, 2400);
  }
  await comparePictures(replica, baseline, "react-intro", "original-intro");
  for (const page of [baseline, replica]) await advance(page, 8000);
  await comparePictures(replica, baseline, "react-playing", "original-playing");
  for (const page of [baseline, replica]) {
    await page.keyboard.press("Space");
    const time = await page.locator("#sessionTimer").textContent();
    await advance(page, 1600);
    expect(await page.locator("#sessionTimer").textContent()).toBe(time);
    await page.keyboard.press("ArrowRight");
    await advance(page, 2400);
  }
  await comparePictures(replica, baseline, "react-next", "original-next");
  for (const page of [baseline, replica]) {
    const timeline = await page.locator("#globalTimeline").boundingBox();
    await page.mouse.click(
      timeline!.x + timeline!.width * 0.7,
      timeline!.y + 5,
    );
    await advance(page, 4000);
  }
  await comparePictures(replica, baseline, "react-seek", "original-seek");
  expect(errors).toEqual([]);
});

test("admin keeps the original layout, filtering, editing, ordering, config and save behavior", async ({
  context,
}) => {
  const baseline = await context.newPage();
  const replica = await context.newPage();
  const errors: string[] = [];
  replica.on("pageerror", (error) => {
    errors.push(error.message);
  });
  for (const page of [baseline, replica]) await prepare(page);
  await baseline.goto("/legacy/admin");
  await replica.goto("/");
  for (const page of [baseline, replica])
    await expect(page.locator("#bandList .band-card").first()).toBeVisible();
  await comparePictures(replica, baseline, "react-admin", "original-admin");
  for (const page of [baseline, replica]) {
    await page.locator("#bandSearch").fill("镜流");
    await expect(page.locator("#bandList .band-card")).toHaveCount(1);
    const score = page
      .locator('#bandList input[onchange*="updatePoint("]')
      .first();
    await score.fill("72.5");
    await score.blur();
    await page
      .getByRole("button", { name: "拖拽排序", exact: true })
      .click({ force: true });
    await expect(page.locator("#bandSortModal")).toHaveClass(/show/);
    await page
      .locator("#bandSortModal")
      .getByRole("button", { name: "关闭" })
      .click({ force: true });
    await page.locator(".tab[data-tab=config]").click({ force: true });
    await page.locator("#cfg-MUSIC_VOLUME").fill("0.4");
    await page
      .locator("#dimSettings input[type=text]")
      .first()
      .fill("测试维度");
    await page.locator("#dimSettings input[type=text]").first().blur();
    await page
      .getByRole("button", { name: "💾 保存全部" })
      .click({ force: true });
    await expect(page.locator("#toast")).toContainText("保存成功");
  }
  // The S2 gacha card intentionally has different settings from the legacy UI.
  await comparePictures(replica, baseline, "react-config", "original-config", undefined,
    ".card:has(#cfg-GACHA_ANIM_DURATION) { display: none; }");
  for (const page of [baseline, replica]) {
    await page.reload();
    await expect(page.locator("#bandList .band-card").first()).toBeVisible();
    await page.locator(".tab[data-tab=config]").click({ force: true });
    await expect(page.locator("#cfg-MUSIC_VOLUME")).toHaveValue("0.4");
    await expect(
      page.locator("#dimSettings input[type=text]").first(),
    ).toHaveValue("测试维度");
  }
  expect(errors).toEqual([]);
});

test("S2 gacha uses saved colors, traces titles together and reveals the prepared grid before the data", async ({ page }) => {
  const fixture = structuredClone(original);
  fixture.CONFIG.GACHA_ANIM_DURATION = 3000;
  delete fixture.CONFIG.GACHA_WIPE_COLORS;
  fixture.namelist = original.namelist.slice(0, 3).map((band: any, index: number) => ({
    ...band,
    name: ["首位角色", "高光角色", "普通角色"][index],
    duration: 20000,
    gacha: index !== 2,
    gachaText: index === 1 ? "高光入场" : "",
    midPhase: undefined,
    specialProfileId: undefined,
  }));
  fixture.mvplist = ["高光角色"];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await prepare(page, fixture);
  await page.route(/\/assets\/images\/best_%E6%99%AE%E9%80%9A/, route => route.abort());

  await page.goto("/");
  await expect(page.locator("#bandList .band-card").first()).toBeVisible();
  await page.locator("#bandSearch").fill("普通角色");
  await page.locator("#bandList").getByText("抽卡出金", { exact: true }).click();
  await expect(page.locator("#bandList").getByRole("checkbox", { name: "抽卡出金" })).toBeChecked();
  await page.locator(".tab[data-tab=config]").click({ force: true });
  const colors = ["#d93c64", "#52df8f", "#25296b"];
  const defaults = ["#58f4ff", "#ffee00", "#141519"];
  for (const [index, color] of colors.entries()) {
    const input = page.getByLabel(`S2 色带 ${index + 1}`);
    await expect(input).toHaveValue(defaults[index]);
    await input.fill(color);
  }
  await page.getByRole("button", { name: "💾 保存全部" }).click({ force: true });
  await expect(page.locator("#toast")).toContainText("保存成功");

  await page.goto("/radar");
  await expect(page.locator("#introGuideLabels")).not.toBeEmpty();
  await page.keyboard.press("Space");
  await advance(page, 6500);
  const overlay = page.locator("#gachaOverlay");
  const badge = page.locator("#gachaMvp");
  const name = page.locator("#gachaName");
  const nameInk = name.locator(".gacha-outline-ink");
  const bands = overlay.locator(".gacha-wipe-band");
  const radar = page.locator("#radarCanvas");
  const portrait = page.locator("#bandPhoto");
  const radarCenter = () => radar.evaluate((canvas: HTMLCanvasElement) => {
    const { width, height } = canvas;
    const pixels = canvas.getContext("2d")!.getImageData(width / 2 - 20, height / 2 - 20, 40, 40).data;
    return Array.from(pixels);
  });
  await expect(overlay).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await advance(page, 80);
  await expect(bands.nth(0)).toHaveCSS("background-color", "rgb(217, 60, 100)");
  await expect(bands.nth(1)).toHaveCSS("background-color", "rgb(82, 223, 143)");
  await expect(bands.nth(2)).toHaveCSS("background-color", "rgb(37, 41, 107)");
  const bandScale = (index: number) => bands.nth(index).evaluate(el => {
    const matrix = new DOMMatrix(getComputedStyle(el).transform);
    return Math.hypot(matrix.c, matrix.d);
  });
  expect(await bandScale(0)).toBeGreaterThan(0);
  expect(await bandScale(1)).toBe(0);
  await advance(page, 170);
  expect(await bandScale(1)).toBeGreaterThan(await bandScale(2));
  expect(await bandScale(2)).toBeGreaterThan(0);
  await expect(nameInk).toHaveCSS("opacity", "0");

  await advance(page, 400);
  await expect(badge).toHaveText("MVP");
  await expect(badge).toBeVisible();
  await expect(name).toHaveText("高光入场");
  expect((await badge.boundingBox())!.y).toBeLessThan((await name.boundingBox())!.y);
  await expect(page.locator("#gachaBgImg")).toHaveAttribute("src", /best_/);
  await expect(badge).toHaveCSS("font-size", await name.evaluate(el => getComputedStyle(el).fontSize));
  await expect(badge.locator(".gacha-outline-ink")).toHaveCount(0);
  await expect(badge.locator(".gacha-outline-contour").first()).toHaveCSS("stroke", "rgb(255, 214, 107)");
  await expect(nameInk).toHaveCSS("fill", "rgb(255, 243, 214)");

  const titleTiming = await overlay.locator(".gacha-wipe-title").evaluate(el => {
    const tracing = el.getAnimations().find(animation =>
      animation instanceof CSSAnimation && animation.animationName === "gacha-outline-draw");
    return tracing?.effect?.getTiming().duration;
  });
  expect(titleTiming).toBe(1500);
  const readOutline = () => overlay.locator(".gacha-outline-contour").evaluateAll(paths => paths.map(path => {
    const style = getComputedStyle(path);
    return {
      segment: Number(style.getPropertyValue("--gacha-outline-segment")),
      progress: Number(style.getPropertyValue("--gacha-outline-progress")),
      dash: style.strokeDasharray,
      fill: style.fill,
    };
  }));
  const tracing = await readOutline();
  expect(tracing.length).toBeGreaterThan(3);
  expect(tracing.some(path => path.segment < 1)).toBe(true);
  const inkProgress = await nameInk.evaluate(el => Number(getComputedStyle(el).opacity));
  expect(inkProgress).toBeCloseTo(tracing[0].progress, 4);
  for (const path of tracing) {
    expect(path.fill).toBe("none");
    expect(path.dash).not.toBe("none");
    expect(path.progress).toBeGreaterThan(0);
    expect(path.progress).toBeLessThan(1);
    expect(path.progress).toBeCloseTo(tracing[0].progress, 4);
  }
  await advance(page, 1500);
  const completed = await readOutline();
  expect(completed.map(path => path.progress)).toEqual(tracing.map(() => 1));
  await expect(nameInk).toHaveCSS("opacity", "1");

  await page.keyboard.press("ArrowRight");
  await advance(page, 650);
  await expect(overlay).toBeVisible();
  await expect(badge).toBeHidden();
  await expect(name).toHaveText("普通角色");
  await expect(page.locator("#gachaBgImg")).toHaveAttribute("src", /\/普通角色_best\.webp$/);
  await expect(page.locator("#gachaBgImg")).toHaveCSS("object-fit", "contain");
  const art = overlay.locator(".gacha-wipe-art");
  const artScale = () => art.evaluate(el => parseFloat(getComputedStyle(el).scale));
  const earlyScale = await artScale();

  await advance(page, 2250);
  expect(await artScale()).toBeGreaterThan(earlyScale + 0.08);
  await expect(radar).toHaveCSS("opacity", "1");
  await expect(portrait).toHaveAttribute("src", /\/普通角色\.webp$/);
  await expect(portrait).toHaveCSS("opacity", "1");
  const backdrop = await radarCenter();
  expect(backdrop.some((value, index) => index % 4 === 3 && value > 0)).toBe(true);

  await advance(page, 375);
  await expect(overlay).toHaveClass(/gacha-return/);
  await expect(overlay.locator(".gacha-wipe-return-band")).toHaveCSS("background-color", "rgb(82, 223, 143)");
  await expect(overlay.locator(".gacha-wipe-exit-clip")).not.toHaveCSS("clip-path", "none");
  await expect(page.locator("#bandName")).toBeHidden();
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveCSS("opacity", "1");
  const portraitPosition = await portrait.boundingBox();
  expect(await radarCenter()).toEqual(backdrop);

  await advance(page, 325);
  await expect(overlay).toBeHidden();
  await expect(radar).toHaveCSS("opacity", "1");
  await expect(radar).not.toHaveClass(/radar-reveal/);
  expect(await radarCenter()).not.toEqual(backdrop);
  await expect(page.locator("#bandName")).toHaveText("普通角色");
  await expect(portrait).toHaveCSS("opacity", "1");
  expect(await portrait.boundingBox()).toEqual(portraitPosition);

  // Clicking the current role's segment replays the S2 gacha from the first wipe.
  const timeline = (await page.locator("#globalTimeline").boundingBox())!;
  await page.mouse.click(timeline.x + timeline.width * 0.8, timeline.y + 5);
  await advance(page, 80);
  await expect(overlay).toBeVisible();
  await expect(overlay).not.toHaveClass(/gacha-return/);
  expect(errors).toEqual([]);
});

test("gacha doors, MVP background and outro remain identical at 1080p", async ({
  context,
}) => {
  const fixture = structuredClone(original);
  fixture.namelist = original.namelist
    .slice(0, 3)
    .map((band: any, index: number) => ({
      ...band,
      duration: 20_000,
      gacha: index === 1,
    }));
  fixture.mvplist = [fixture.namelist[2].name];
  const baseline = await context.newPage();
  const replica = await context.newPage();
  const errors: string[] = [];
  replica.on("pageerror", (error) => errors.push(error.message));
  for (const page of [baseline, replica]) {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await prepare(page, fixture);
  }
  await baseline.goto("/legacy/radar");
  await replica.goto("/radar?theme=original");
  for (const page of [baseline, replica]) {
    await expect(page.locator("#introGuideLabels")).not.toBeEmpty();
    await page.keyboard.press("Space");
    await advance(page, 6500);
  }
  await comparePictures(replica, baseline, "react-1080p", "original-1080p");
  for (const page of [baseline, replica]) {
    await page.keyboard.press("ArrowRight");
    await advance(page, 1200);
    await expect(page.locator("#gachaOverlay")).toHaveClass(/active/);
    await expect(page.locator("#gachaPanelTop")).toHaveClass(/open/);
    await expect(page.locator("#gachaBgImg")).toHaveAttribute("src", /best_/);
  }
  await comparePictures(replica, baseline, "react-gacha", "original-gacha");
  for (const page of [baseline, replica]) {
    await page.keyboard.press("ArrowRight");
    await advance(page, 4000);
    await expect(page.locator("#bandName")).toHaveText(
      fixture.namelist[2].name,
    );
    await expect(page.locator("#mvpBgContainer .active")).toHaveCount(1);
  }
  await comparePictures(replica, baseline, "react-mvp", "original-mvp");
  for (const page of [baseline, replica]) {
    const box = await page.locator("#globalTimeline").boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 5);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width + 10, box!.y + 5);
    await page.mouse.up();
    await advance(page, 2000);
    await expect(page.locator("#outroOverlay")).toHaveClass(/active/);
  }
  await comparePictures(replica, baseline, "react-outro", "original-outro");
  expect(errors).toEqual([]);
});

test("new-version role positioning, comparison and special profiles retain their behavior", async ({
  context,
}) => {
  const fixture = structuredClone(original);
  const [first, second, third] = fixture.namelist;
  // Align the initial highlights for the screenshot comparison with legacy.
  fixture.mvplist = [first.name, third.name];
  for (const [index, role] of fixture.namelist.entries()) {
    role.points = fixture.CONFIG.BASE_MAX_SCORES.map(
      (max: number) => max * (index === 2 ? 0.8 : 0.4),
    );
    role.points[0] = index === 0 ? 90 : 40;
  }
  const baseline = await context.newPage();
  const replica = await context.newPage();
  const errors: string[] = [];
  replica.on("pageerror", (error) => errors.push(error.message));
  for (const page of [baseline, replica]) await prepare(page, fixture);
  await baseline.goto("/legacy/admin");
  await replica.goto("/");
  for (const page of [baseline, replica]) {
    await expect(page.locator("#bandList .band-card").first()).toBeVisible();
    await page.locator("[data-tab=position]").click({ force: true });
    await expect(page.locator(".role-position-card")).toHaveCount(
      original.namelist.length,
    );
    const cards = page.locator(".role-position-card");
    const box = await cards.nth(1).boundingBox();
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await cards.first().dispatchEvent("dragstart", { dataTransfer: transfer });
    await cards.nth(1).dispatchEvent("drop", {
      dataTransfer: transfer,
      clientX: box!.x + box!.width - 2,
      clientY: box!.y + box!.height / 2,
    });
    await expect(cards.first()).toContainText(original.namelist[1].name);
    const savePosition = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/data") &&
        response.request().method() === "PUT",
    );
    await page.locator("#rolePositionSaveButton").click({ force: true });
    await savePosition;
    const saved = await page.evaluate(async () =>
      (await fetch("/api/data")).json(),
    );
    expect(saved.namelist[0].name).toBe(original.namelist[1].name);
  }
  await comparePictures(
    replica,
    baseline,
    "react-position",
    "original-position",
    "#panel-position",
  );
  for (const page of [baseline, replica]) {
    await page.locator("[data-tab=comparison]").click({ force: true });
    await page.locator("#comparisonRoleB").selectOption("2");
    await page.locator("#comparisonRoleA").selectOption("0");
    await advance(page, 160);
    await expect(page.locator("#comparisonRadarCanvas")).toHaveAttribute(
      "data-rendered",
      "true",
    );
    await page.locator("#comparisonFieldsA input").first().fill("73.25");
    await page.locator("#comparisonFieldsA input").first().blur();
    await advance(page, 160);
    const saveComparison = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/data") &&
        response.request().method() === "PUT",
    );
    await page.locator("#comparisonSaveButton").click({ force: true });
    await saveComparison;
    const saved = await page.evaluate(async () =>
      (await fetch("/api/data")).json(),
    );
    const selected = Number(
      await page.locator("#comparisonRoleA").inputValue(),
    );
    expect(saved.namelist[selected].points[0]).toBe(73.25);
  }
  await comparePictures(
    replica,
    baseline,
    "react-comparison",
    "original-comparison",
    "#panel-comparison",
  );
  const editedScore = replica.locator("#comparisonFieldsA input").first();
  const firstDimensionLeaders = replica.locator(
    '.comparison-leader-card[data-dimension-index="0"] .comparison-leader-roles',
  );
  const bestNames = replica.locator(
    ".role-position-card.is-best .role-position-name",
  );
  await editedScore.fill("90");
  await expect(firstDimensionLeaders).toHaveText(`${second.name}、${first.name}`);
  await replica.locator("[data-tab=position]").click({ force: true });
  await expect(bestNames).toHaveText([second.name, first.name, third.name]);
  await expect(replica.locator("#rolePositionBestCount")).toHaveText("3");
  await replica.locator("[data-tab=comparison]").click({ force: true });
  await editedScore.fill("91");
  await expect(firstDimensionLeaders).toHaveText(second.name);
  await replica.locator("[data-tab=position]").click({ force: true });
  await expect(bestNames).toHaveText([second.name, third.name]);
  await expect(replica.locator("#rolePositionBestCount")).toHaveText("2");

  for (const page of [baseline, replica]) {
    await page.locator("[data-tab=specials]").click({ force: true });
    const cards = page.locator(".special-profile-card");
    const initialCount = await cards.count();
    await page
      .getByRole("button", { name: "＋ 新建专场" })
      .click({ force: true });
    await expect(cards).toHaveCount(initialCount + 1);
    const card = page.locator(".special-profile-card[open]").last();
    await card.locator("input[type=text]").first().fill("迁移验证专场");
    await card.locator("input[type=text]").first().blur();
    await page.locator("#specialProfileSearch").fill("迁移验证专场");
    await expect(page.locator(".special-profile-card")).toHaveCount(1);
    await expect(page.locator(".special-profile-title")).toHaveText(
      "迁移验证专场",
    );
  }
  await comparePictures(
    replica,
    baseline,
    "react-specials",
    "original-specials",
    "#panel-specials",
  );
  expect(errors).toEqual([]);
});

test("special preview uses the same profile, stage and role in both entries", async ({
  context,
}) => {
  const profile = original.SPECIAL_PROFILES[0];
  expect(profile).toBeTruthy();
  const payload = {
    createdAt: 1_800_000_000_000,
    profile,
    role: original.namelist[0],
  };
  const baseline = await context.newPage();
  const replica = await context.newPage();
  const errors: string[] = [];
  replica.on("pageerror", (error) => errors.push(error.message));
  for (const page of [baseline, replica]) {
    await prepare(page);
    await page.addInitScript(
      (payload) =>
        sessionStorage.setItem(
          "rock-radar-special-preview",
          JSON.stringify(payload),
        ),
      payload,
    );
  }
  await baseline.goto(
    `/legacy/radar?specialPreview=1&profileId=${encodeURIComponent(profile.id)}`,
  );
  await replica.goto(
    `/radar?theme=original&specialPreview=1&profileId=${encodeURIComponent(profile.id)}`,
  );
  for (const page of [baseline, replica]) {
    await expect(page.locator("body")).toHaveClass(/special-preview-mode/);
    await advance(page, 5000);
    await expect(page.locator("#bandName")).toHaveText(payload.role.name);
  }
  await comparePictures(
    replica,
    baseline,
    "react-special-preview",
    "original-special-preview",
  );
  expect(errors).toEqual([]);
});
