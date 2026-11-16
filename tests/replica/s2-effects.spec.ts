import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

test('portrait entrance advances on frames between cached background paints', async ({ page }) => {
  await page.goto('/radar');
  const result = await page.evaluate(async (modulePath) => {
    const { createS2Background } = await import(/* @vite-ignore */ modulePath);
    const effect = createS2Background();
    effect.setPaused(false);
    const background = document.createElement('canvas');
    background.width = 320; background.height = 180;
    const portrait = document.createElement('canvas');
    portrait.width = 200; portrait.height = 220;
    const bgFrames: string[] = [], portraitFrames: string[] = [];
    for (let i = 0; i < 6; i++) {
      effect.render({ canvas: background, context: background.getContext('2d'), deltaTime: 16 });
      effect.renderPortrait({ canvas: portrait, context: portrait.getContext('2d'), roleKey: 'entry' });
      bgFrames.push(background.toDataURL());
      portraitFrames.push(portrait.toDataURL());
    }
    effect.setPaused(true);
    effect.render({ canvas: background, context: background.getContext('2d'), deltaTime: 16 });
    effect.renderPortrait({ canvas: portrait, context: portrait.getContext('2d'), roleKey: 'entry' });
    const paused = portrait.toDataURL() === portraitFrames.at(-1);
    effect.dispose();
    return { backgrounds: new Set(bgFrames).size, portraits: new Set(portraitFrames).size, paused };
  }, `/@fs/${process.cwd().replace(/\\/g, '/')}/src/radar/themes/s2-background.js`);
  expect(result.portraits).toBe(6);
  expect(result.backgrounds).toBeLessThan(result.portraits);
  expect(result.paused).toBe(true);
});

test('S2 portrait effects stay behind the image, follow layout, and share pause controls', async ({ page }) => {
  const data = JSON.parse(readFileSync('data.json', 'utf8'));
  data.CONFIG.PHOTO_FX_ENABLED = true;
  data.CONFIG.ADAPTIVE_PERF = false;
  data.namelist = data.namelist.slice(0, 2).map((role: object, index: number) => ({
    ...role, name: `测试角色${index}`, duration: 60000, gacha: false,
    desc: '巡海游侠 追击 星核猎手 公司 仙舟 击破 治疗 护盾',
  }));
  data.mvplist = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/data', route => route.fulfill({ json: data }));
  await page.route('**/api/images', route => route.fulfill({ json: [] }));
  await page.route(/\/assets\/images\//, route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect x="180" y="60" width="240" height="840" fill="#87cabb"/></svg>',
  }));
  await page.route(/https:\/\//, route => route.abort());
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = async () => {}; });
  await page.goto('/radar');
  await expect(page.locator('#introGuideLabels')).not.toBeEmpty();
  await page.keyboard.press('Space');
  await expect(page.locator('#introOverlay')).toHaveCSS('display', 'none', { timeout: 15000 });
  await expect(page.locator('#bandPhoto')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Space');
  const fx = page.locator('#photoFxCanvas');
  await expect(fx).toHaveAttribute('data-effect-mode', 's2-comic-stage');
  const hash = async () => createHash('sha256').update(await fx.evaluate(
    c => (c as HTMLCanvasElement).toDataURL(),
  )).digest('hex');
  const first = await hash();
  await expect.poll(hash).not.toBe(first);
  await page.getByRole('button', { name: '暂停背景', exact: true }).click();
  const frozen = await hash();
  await page.waitForTimeout(150);
  expect(await hash()).toBe(frozen);

  for (const [width, height] of [[1500, 1000], [1920, 1080], [1920, 800]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => {
      const frame = document.getElementById('photoContainer')!;
      const effects = document.getElementById('photoFxCanvas')!;
      const portrait = document.getElementById('bandPhoto')!;
      const bonds = document.getElementById('bondIcons')!;
      const a = frame.getBoundingClientRect(), b = effects.getBoundingClientRect();
      const image = portrait.getBoundingClientRect();
      return {
        fits: b.left >= a.left && b.top >= a.top && b.right <= a.right + 1 && b.bottom <= a.bottom + 1,
        fills: Math.abs(a.width - b.width) < 5 && Math.abs(a.height - b.height) < 5,
        centered: Math.abs(a.x + a.width / 2 - image.x - image.width / 2) < 1,
        bondsClear: a.top - bonds.getBoundingClientRect().bottom > 10,
        behind: Number(getComputedStyle(effects).zIndex) < Number(getComputedStyle(portrait).zIndex),
        clipped: getComputedStyle(frame).overflow === 'hidden',
        noInput: getComputedStyle(effects).pointerEvents === 'none',
      };
    })).toEqual({ fits: true, fills: true, centered: true, bondsClear: true, behind: true, clipped: true, noInput: true });
  }
  const strong = await hash();
  await page.getByRole('button', { name: '动态：增强', exact: true }).click();
  // A paused mode change intentionally paints one new still frame.
  await expect.poll(hash).not.toBe(strong);
  const mild = await hash();
  await page.waitForTimeout(150);
  expect(await hash()).toBe(mild);
  await page.getByRole('button', { name: '继续背景', exact: true }).click();
  await expect.poll(hash).not.toBe(mild);
  await page.mouse.click(5, 100);
  await page.keyboard.press('p');
  await page.waitForTimeout(100);
  const disabled = await hash();
  await page.waitForTimeout(150);
  expect(await hash()).toBe(disabled);
  await page.keyboard.press('p');
  await expect.poll(hash).not.toBe(disabled);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#bandName')).toHaveText('测试角色1');
  await page.getByRole('combobox', { name: '背景场景' }).selectOption('normal');
  await expect(page.locator('#particles-canvas')).toHaveAttribute('data-effect-mode', 's2-normal');
  expect(errors).toEqual([]);
});
