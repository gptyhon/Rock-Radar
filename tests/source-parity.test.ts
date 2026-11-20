import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const radar = readFileSync('index.html', 'utf8');
const engine = readFileSync('src/radar/engine.js', 'utf8');

test.each([['radar', 'index.html'], ['admin', 'admin.html']])(
  '%s keeps the original inline stylesheet verbatim', (page, file) => {
    const html = readFileSync(file, 'utf8');
    expect(readFileSync(`src/${page}/styles.css`, 'utf8')).toBe(html.match(/<style>([\s\S]*?)<\/style>/)![1]);
  },
);

test.each([
  'tick',
  'startIntroSystem', 'syncBandPhotoVariant', 'getBandTimelineDuration',
])('%s retains the hktv-new-version algorithm', name => {
  // These top-level functions use the baseline's eight-space indentation.
  const section = new RegExp(`function ${name}\\([\\s\\S]*?\\n        \\}`);
  const source = (text: string) => {
    const match = text.match(section);
    expect(match).not.toBeNull();
    return match![0].split('\n').map(line => line.trimEnd()).join('\n');
  };
  expect(source(engine)).toBe(source(radar));
});
