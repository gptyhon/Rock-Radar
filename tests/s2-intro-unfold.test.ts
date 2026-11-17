import { expect, test } from 'vitest';
import { getS2UnfoldProgress } from '../src/radar/themes/s2-intro';

test.each([3, 6, 8, 12])('unfolds %i vertices in clockwise order and reaches the exact final polygon', count => {
  expect(getS2UnfoldProgress(-1, count)).toEqual(Array(count).fill(0));
  expect(getS2UnfoldProgress(1, count)).toEqual(Array(count).fill(1));
  let previous = Array(count).fill(0);
  for (let time = 0; time <= 1; time += .01) {
    const progress = getS2UnfoldProgress(time, count);
    progress.forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(previous[index]);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      if (index) expect(value).toBeLessThanOrEqual(progress[index - 1]);
    });
    previous = progress;
  }
});

test('the unfolding starts slowly, accelerates through the middle, and slows before closing', () => {
  const travel = (time: number) => getS2UnfoldProgress(time, 6).reduce((sum: number, value: number) => sum + value, 0);
  const start = travel(.15) - travel(0);
  const middle = travel(.575) - travel(.425);
  const finish = travel(1) - travel(.85);
  expect(middle).toBeGreaterThan(start * 5);
  expect(middle).toBeGreaterThan(finish * 5);
});
