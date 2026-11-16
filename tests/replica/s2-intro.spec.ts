import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`S2 opening shows true phase averages and hands off to playback (${reducedMotion})`, async ({ page }) => {
    const data = JSON.parse(readFileSync('data.json', 'utf8'));
    Object.assign(data.CONFIG, {
      INTRO_WAIT_TIME: 12000, VERTEX_COUNT: 8,
      DIM_NAMES: ['攻坚终结', '过渡平滑度', '资源转化', '体系羁绊', '局内影响', '综合评级', '扩展维度七', '扩展维度八'],
      MIN_SCORES: Array(8).fill(0), BASE_MAX_SCORES: [100, 100, 100, 100, 100, 100, 100, 25],
      USE_PERCENTAGE: [false, true, false, false, false, false, false, false],
      REAL_PERCENTAGE: [false, false, true, false, false, false, false, false],
    });
    data.namelist = data.namelist.slice(0, 2).map((role: object, index: number) => ({
      ...role, duration: 60000, gacha: false, points: Array(8).fill(index ? 40 : 20),
      midPhase: { enabled: index === 0, triggerRatio: .5, points: Array(8).fill(60) },
    }));
    data.mvplist = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/data', route => route.fulfill({ json: data }));
    await page.route(/https:\/\//, route => route.abort());
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = async () => {}; });
    await page.emulateMedia({ reducedMotion });
    await page.goto('/radar');
    await expect(page.locator('#introGuideLabels > span')).toHaveCount(8);
    await expect(page.locator('.s2-radar-dimension')).toHaveText(data.CONFIG.DIM_NAMES);
    await expect(page.locator('.s2-metric-value')).toHaveText(['40', '40%', '40%', '40', '40', '40', '40', '40']);
    const ratios = (await page.locator('.s2-radar-average').getAttribute('data-ratios'))!.split(',').map(Number);
    expect(ratios).toEqual([.4, .4, .4, .4, .4, .4, .4, 1.6]);
    if (reducedMotion === 'reduce') await page.keyboard.press('Space');
    else await page.getByRole('button', { name: '按空格开始' }).click();
    await expect(page.locator('#introOverlay')).toHaveClass(/intro-stage-guide/, { timeout: 8000 });
    await expect(page.locator('.s2-radar-average')).toHaveCSS('stroke', 'rgb(255, 68, 68)');
    await expect(page.locator('.s2-radar-average')).toHaveCSS('fill', 'none');
    await expect(page.locator('.s2-average-title')).toHaveText('平均值');
    await expect(page.locator('#introOverlay')).toHaveCSS('background-color', 'rgb(40, 20, 62)');
    await expect(page.locator('.s2-chart-legend, #s2AverageSummary, #introRadarSvg circle')).toHaveCount(0);
    for (const viewport of [{ width: 1500, height: 1000 }, { width: 1920, height: 1080 }, { width: 1920, height: 800 }]) {
      await page.setViewportSize(viewport);
      const geometry = await page.evaluate(() => {
        const chart = document.querySelector('.s2-chart-wrap')!.getBoundingClientRect();
        return {
          labelsFit: [...document.querySelectorAll('.s2-radar-label')].every(label => {
            const rect = label.getBoundingClientRect();
            return rect.left >= chart.left && rect.right <= chart.right && rect.top >= chart.top && rect.bottom <= chart.bottom;
          }),
          chartFits: chart.right <= innerWidth && chart.bottom <= innerHeight && chart.left >= 0 && chart.top >= 0,
        };
      });
      expect(geometry).toEqual({ labelsFit: true, chartFits: true });
    }
    if (reducedMotion === 'reduce') {
      expect(await page.locator('.s2-radar-profile').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    }
    await expect(page.locator('#introOverlay')).toHaveCSS('display', 'none', { timeout: 15000 });
    await expect(page.locator('#bandName')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });
}
