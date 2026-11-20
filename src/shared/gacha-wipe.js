export const DEFAULT_GACHA_WIPE_COLORS = ['#58f4ff', '#ffee00', '#141519'];

export function normalizeGachaWipeColors(value) {
  const colors = Array.isArray(value) ? value : [];
  return DEFAULT_GACHA_WIPE_COLORS.map((fallback, index) => {
    const color = String(colors[index] ?? '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  });
}
