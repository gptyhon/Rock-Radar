// Native SVG keeps the production music timeline independent of the opening.
const ns = 'http://www.w3.org/2000/svg';
function shape(tag, attributes) {
  const element = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function buildS2IntroGuide({ config, averages, ratios, count }) {
  const svg = document.getElementById('introRadarSvg');
  const labels = document.getElementById('introGuideLabels');
  if (!svg || !labels) return;
  svg.replaceChildren(); labels.replaceChildren();
  // Keep above-cap averages visible without falsely clamping them to the cap.
  const extent = Math.max(1, ...ratios);
  const radius = 220 / extent;
  const point = (ratio, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return [380 + Math.cos(angle) * radius * ratio, 320 + Math.sin(angle) * radius * ratio];
  };
  const points = (values) => values.map((value, index) => point(value, index).join(',')).join(' ');
  const layers = Math.max(4, Math.min(6, Number(config.RADAR_GRID_LEVELS) || 5));
  for (let layer = 1; layer <= layers; layer++) svg.append(shape('polygon', { points: points(Array(count).fill(layer / layers)), class: 's2-radar-grid' }));
  for (let i = 0; i < count; i++) {
    const [x, y] = point(1, i);
    svg.append(shape('line', { x1: 380, y1: 320, x2: x, y2: y, class: 's2-radar-axis' }));
  }
  const profile = shape('g', { class: 's2-radar-profile' });
  profile.append(shape('polygon', { points: points(ratios), fill: 'none', class: 's2-radar-average', 'data-ratios': ratios.join(',') }));
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
    const label = document.createElement('span');
    label.className = 's2-radar-label';
    label.style.left = `${(380 + Math.cos(angle) * 292) / 760 * 100}%`;
    label.style.top = `${(320 + Math.sin(angle) * 274) / 640 * 100}%`;
    const name = document.createElement('span');
    name.className = 's2-radar-dimension';
    name.textContent = config.DIM_NAMES[i] || `维度 ${i + 1}`;
    const realPercent = Boolean(config.REAL_PERCENTAGE?.[i]);
    const normalizedPercent = !realPercent && Boolean(config.USE_PERCENTAGE?.[i]);
    const value = normalizedPercent ? ratios[i] * 100 : averages[i];
    const output = document.createElement('strong');
    output.className = 's2-metric-value';
    output.textContent = `${Number(value.toFixed(2))}${realPercent || normalizedPercent ? '%' : ''}`;
    label.append(name, output);
    labels.append(label);
  }
  svg.append(profile);
}

