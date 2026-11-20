const SAMPLE_SIZE = 144;
const MAX_MASK_WIDTH = 4096;
const EDGE_THRESHOLD = 128;
const SVG_NS = 'http://www.w3.org/2000/svg';

function rasterizeText(element, text) {
  const style = getComputedStyle(element);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const font = `${style.fontStyle} ${style.fontWeight} ${SAMPLE_SIZE}px ${style.fontFamily}`;
  const letterSpacing = parseFloat(style.letterSpacing) / parseFloat(style.fontSize) || 0;
  const setFont = () => {
    ctx.font = font;
    ctx.letterSpacing = `${letterSpacing * SAMPLE_SIZE}px`;
  };
  setFont();
  const metrics = ctx.measureText(text);
  const left = Math.min(0, -metrics.actualBoundingBoxLeft);
  const right = Math.max(metrics.width, metrics.actualBoundingBoxRight);
  const inkHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  if (right <= left || inkHeight <= 0) return null;

  const padding = 6;
  const scale = Math.min(1, (MAX_MASK_WIDTH - padding * 2) / (right - left));
  canvas.width = Math.ceil((right - left) * scale) + padding * 2;
  canvas.height = Math.ceil(inkHeight * scale) + padding * 2;
  setFont();
  ctx.scale(scale, scale);
  const x = padding / scale - left;
  const y = padding / scale + metrics.actualBoundingBoxAscent;
  ctx.lineWidth = SAMPLE_SIZE * 0.036;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  return {
    mask: ctx.getImageData(0, 0, canvas.width, canvas.height),
    em: SAMPLE_SIZE * scale,
  };
}

// Marching squares follows the browser-rendered glyphs, including counters and CJK strokes.
function traceContours({ data, width, height }) {
  const edges = new Map();
  const alpha = (pixel) => data[pixel * 4 + 3];
  const intersection = (pixel, vertical) => {
    const key = pixel * 2 + Number(vertical);
    if (!edges.has(key)) {
      const start = alpha(pixel);
      const end = alpha(pixel + (vertical ? width : 1));
      const offset = (EDGE_THRESHOLD - start) / (end - start);
      const x = pixel % width + 0.5;
      const y = Math.floor(pixel / width) + 0.5;
      edges.set(key, {
        x: x + (vertical ? 0 : offset),
        y: y + (vertical ? offset : 0),
        neighbors: [],
      });
    }
    return edges.get(key);
  };
  const connect = (a, b) => {
    a.neighbors.push(b);
    b.neighbors.push(a);
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const pixel = y * width + x;
      const tl = alpha(pixel);
      const tr = alpha(pixel + 1);
      const br = alpha(pixel + width + 1);
      const bl = alpha(pixel + width);
      const topLeft = tl >= EDGE_THRESHOLD;
      const topRight = tr >= EDGE_THRESHOLD;
      const bottomRight = br >= EDGE_THRESHOLD;
      const bottomLeft = bl >= EDGE_THRESHOLD;
      if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) continue;

      const crossings = [];
      if (topLeft !== topRight) crossings.push(intersection(pixel, false));
      if (topRight !== bottomRight) crossings.push(intersection(pixel + 1, true));
      if (bottomRight !== bottomLeft) crossings.push(intersection(pixel + width, false));
      if (bottomLeft !== topLeft) crossings.push(intersection(pixel, true));
      if (crossings.length === 2) {
        connect(crossings[0], crossings[1]);
      } else {
        // Split a saddle cell according to the coverage at its center.
        const centerFilled = tl + tr + br + bl >= EDGE_THRESHOLD * 4;
        if (centerFilled === topLeft) {
          connect(crossings[0], crossings[1]);
          connect(crossings[2], crossings[3]);
        } else {
          connect(crossings[0], crossings[3]);
          connect(crossings[1], crossings[2]);
        }
      }
    }
  }

  const contours = [];
  const visited = new Set();
  for (const start of edges.values()) {
    if (visited.has(start)) continue;
    let point = start;
    let previous;
    let length = 0;
    const coords = [];
    while (point && !visited.has(point)) {
      visited.add(point);
      coords.push(`${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
      const next = point.neighbors.find(neighbor => neighbor !== previous);
      if (next) length += Math.hypot(next.x - point.x, next.y - point.y);
      previous = point;
      point = next;
    }
    if (point === start && length > 0) contours.push({ d: `M${coords.join('L')}Z`, length });
  }
  return contours;
}

export function renderGachaOutlineText(element, text, { filled = false } = {}) {
  element.textContent = text;
  if (!text.trim()) return;
  const raster = rasterizeText(element, text);
  if (!raster) return;
  const { mask, em } = raster;
  const contours = traceContours(mask);
  if (!contours.length) return;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', `0 0 ${mask.width} ${mask.height}`);
  svg.classList.add('gacha-outline');
  svg.style.width = `${mask.width / em}em`;
  svg.style.setProperty('--gacha-outline-width', String(Math.max(1, em * 0.032)));
  if (filled) {
    const ink = document.createElementNS(SVG_NS, 'path');
    ink.classList.add('gacha-outline-ink');
    ink.setAttribute('d', contours.map(({ d }) => d).join(''));
    ink.setAttribute('fill-rule', 'evenodd');
    svg.append(ink);
  }

  contours.forEach(({ d, length }) => {
    const path = document.createElementNS(SVG_NS, 'path');
    const segments = Math.max(1, Math.round(length / (em * 0.55)));
    path.classList.add('gacha-outline-contour');
    path.setAttribute('d', d);
    path.setAttribute('pathLength', '1');
    path.style.setProperty('--gacha-outline-segment', String(1 / segments));
    svg.append(path);
  });

  const label = document.createElement('span');
  label.className = 'gacha-outline-label';
  label.textContent = text;
  element.replaceChildren(label, svg);
}
