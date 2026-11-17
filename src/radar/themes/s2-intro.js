// Native SVG keeps the production music timeline independent of the opening.
const ns = 'http://www.w3.org/2000/svg';
const guideCleanups = new WeakMap();

// A single eased sweep makes the whole unfolding accelerate, then settle.
export function getS2UnfoldProgress(elapsed, count) {
  const time = Math.max(0, Math.min(1, elapsed));
  const sweep = (time < .5 ? 4 * time ** 3 : 1 - (-2 * time + 2) ** 3 / 2) * (count + .35);
  return Array.from({ length: count }, (_, index) => {
    const amount = Math.max(0, Math.min(1, (sweep - index) / 1.35));
    return amount * amount * (3 - 2 * amount);
  });
}
function shape(tag, attributes) {
  const element = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function buildS2IntroGuide({ config, averages, ratios, count, scope }) {
  const svg = document.getElementById('introRadarSvg');
  const labels = document.getElementById('introGuideLabels');
  if (!svg || !labels) return;
  guideCleanups.get(svg)?.();
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
  const polygon = shape('polygon', { points: points(ratios), class: 's2-radar-average', 'data-ratios': ratios.join(',') });
  profile.append(polygon);
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

  const overlay = document.getElementById('introOverlay');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const leadIn = Math.max(5200, Number(config.INTRO_WAIT_TIME) || 0);
  const guideWindow = Math.round(leadIn * .82) - Math.max(900, Math.round(leadIn * .32));
  const duration = Math.min(2200, guideWindow - 800);
  let frame = 0;
  let running = false;
  let startedAt = null;
  const render = progress => {
    polygon.setAttribute('points', points(ratios.map((ratio, index) => ratio * progress[index])));
    [...labels.children].forEach((label, index) => {
      label.style.opacity = String(.3 + .7 * progress[index]);
      const value = label.querySelector('.s2-metric-value');
      value.style.opacity = String(progress[index]);
      value.style.transform = `translateY(${(1 - progress[index]) * 8}px)`;
    });
  };
  const stop = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    startedAt = null;
    running = false;
  };
  const tick = now => {
    startedAt ??= now;
    const elapsed = (now - startedAt) / duration;
    render(getS2UnfoldProgress(elapsed, count));
    if (elapsed < 1) frame = window.requestAnimationFrame(tick);
    else frame = 0;
  };
  const sync = () => {
    const visible = overlay?.classList.contains('intro-stage-guide');
    const exiting = overlay?.classList.contains('intro-stage-exit');
    if (!visible || exiting || motion.matches) {
      stop();
      render(Array(count).fill(motion.matches || exiting ? 1 : 0));
    } else if (!running) {
      running = true;
      render(Array(count).fill(0));
      frame = window.requestAnimationFrame(tick);
    }
  };
  const observer = new MutationObserver(sync);
  if (overlay) observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  motion.addEventListener('change', sync);
  const cleanup = () => {
    stop();
    observer.disconnect();
    motion.removeEventListener('change', sync);
    guideCleanups.delete(svg);
  };
  guideCleanups.set(svg, cleanup);
  scope?.onDispose(cleanup);
  sync();
}

