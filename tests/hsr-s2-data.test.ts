import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const data = JSON.parse(readFileSync('data.json', 'utf8'));
const roles = data.namelist;
const traits = data.S2_CATALOG.traits;

test('S2 imports 60 unique characters while retaining all 61 source forms', () => {
  expect(roles).toHaveLength(60);
  expect(new Set(roles.map((role: any) => role.name)).size).toBe(60);
  expect(new Set(roles.map((role: any) => role.s2.id)).size).toBe(60);
  expect(new Set(roles.flatMap((role: any) => role.s2.sourceIds)).size).toBe(61);
  const danheng = roles.filter((role: any) => role.name.includes('丹恒'));
  expect(danheng).toHaveLength(1);
  expect(danheng[0].s2.position).toBe('前后台');
  expect(danheng[0].s2.forms.map((form: any) => [form.id, form.position])).toEqual([
    ['1213', '前台'], ['1414', '后台'],
  ]);
  expect(danheng[0].midPhase?.enabled).not.toBe(true);
  expect(traits.find((trait: any) => trait.name === '双龙吟').memberIds).toEqual(['danheng']);
});

test('all 34 S2 bonds have consistent, deduplicated membership and display tags', () => {
  expect(traits).toHaveLength(34);
  const traitNames = new Set(traits.map((trait: any) => trait.name));
  for (const role of roles) {
    expect(role.desc.split(' ')).toEqual(role.s2.traits);
    for (const name of role.s2.traits) expect(traitNames.has(name)).toBe(true);
  }
  for (const trait of traits) {
    expect(trait.memberIds).toEqual(roles.filter((role: any) => role.s2.traits.includes(trait.name)).map((role: any) => role.s2.id));
    expect(new Set(trait.memberIds).size).toBe(trait.memberIds.length);
  }
  const comboIds = traits.find((trait: any) => trait.name === '连击').memberIds;
  expect(roles.filter((role: any) => comboIds.includes(role.s2.id)).map((role: any) => role.name).sort())
    .toEqual(['那刻夏', '刻律德菈', '白露', '星期日', '镜流', '寒鸦', '阿格莱雅'].sort());
});

// Artwork is local-only and is not included in the GitHub upload.
test.skipIf(!existsSync('public/assets/images'))('imported art resolves locally, including both Dan Heng forms', () => {
  const urls = roles.flatMap((role: any) => [role.s2.portrait, ...role.s2.forms.map((form: any) => form.portrait)]);
  urls.push(...traits.map((trait: any) => trait.icon).filter(Boolean));
  for (const url of urls) {
    expect(url.startsWith('/assets/images/')).toBe(true);
    expect(existsSync(path.join('public', url))).toBe(true);
  }
  // The source has no icon for this bond; do not invent one.
  expect(traits.find((trait: any) => trait.name === '星狩誓言').icon).toBeNull();
});

test('missing source scores retain their provenance after editing and saving', () => {
  const pending = roles.filter((role: any) => role.s2.scoreSource === 'pending');
  expect(pending).toHaveLength(11);
  for (const role of pending) {
    // points is editable: the editor initializes it to the scale minimums on save.
    // Only the imported source scores must remain null.
    expect(role.s2.points).toBeNull();
    expect(role.s2.referencePoints).toBeNull();
  }
});
