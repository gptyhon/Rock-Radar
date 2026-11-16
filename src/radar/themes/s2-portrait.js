/** S2 comic stage: hard-cut panels, halftone print, neon accents and paper fragments. */
export function drawS2Portrait(
  context,
  width,
  height,
  time,
  { enhanced = true, intensity = 1, entryAge = 10, scene = "reveal" } = {},
) {
  const c = context;
  const strength = Math.min(1.1, Math.max(0.35, intensity));
  const motion = enhanced ? 1 : 0.35;
  const t = time * motion;
  const reveal = scene === "reveal";
  // Zero velocity and acceleration at both ends avoid a jump on the first frame.
  const progress = Math.min(1, Math.max(0, entryAge) / 1.05);
  const entrance = 1 - progress ** 3 * (10 - 15 * progress + 6 * progress ** 2);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, width, height);
  c.scale(width / 400, height / 440);
  c.beginPath();
  c.rect(0, 0, 400, 440);
  c.clip();

  function polygon(points, fill, stroke = null, lineWidth = 1) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = lineWidth;
      c.stroke();
    }
  }
  function line(points, color, lineWidth = 1) {
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = color;
    c.lineWidth = lineWidth;
    c.stroke();
  }
  function star(x, y, radius, alpha) {
    c.save();
    c.globalAlpha = alpha * strength;
    polygon(
      [
        [x, y - radius],
        [x + radius * 0.23, y - radius * 0.2],
        [x + radius * 0.7, y],
        [x + radius * 0.23, y + radius * 0.2],
        [x, y + radius],
        [x - radius * 0.23, y + radius * 0.2],
        [x - radius * 0.7, y],
        [x - radius * 0.23, y - radius * 0.2],
      ],
      "#ddd1ff",
    );
    c.restore();
  }

  // Dark print stock; saturated color remains confined to the two side panels.
  const paper = c.createLinearGradient(0, 0, 80, 440);
  paper.addColorStop(0, "#100a32");
  paper.addColorStop(1, "#1d1453");
  c.fillStyle = paper;
  c.fillRect(0, 0, 400, 440);
  c.globalAlpha = strength;
  const drift = Math.sin(t * 0.38) * 4;
  c.save();
  c.translate(-entrance * 60, drift);
  polygon(
    [
      [-25, 180],
      [90, 142],
      [30, 450],
      [-25, 450],
    ],
    "#342278",
    "#08061c",
    6,
  );
  polygon(
    [
      [-15, 334],
      [55, 300],
      [26, 440],
      [-15, 440],
    ],
    "#493296",
  );
  line(
    [
      [0, 194],
      [76, 164],
      [23, 438],
    ],
    "#7960c3",
    1.5,
  );
  c.restore();
  c.save();
  c.translate(entrance * 60, -drift);
  polygon(
    [
      [307, -20],
      [420, -20],
      [420, 322],
      [246, 370],
    ],
    reveal ? "#482b9b" : "#302269",
    "#08061c",
    7,
  );
  polygon(
    [
      [340, -15],
      [371, -15],
      [302, 326],
      [270, 336],
    ],
    "#6244c0",
  );
  line(
    [
      [311, 0],
      [258, 350],
      [400, 310],
    ],
    "#8d6bd2",
    1.5,
  );
  // Halftone is clipped to the printed panel, never sprayed across the face.
  c.save();
  polygon(
    [
      [318, 6],
      [400, 6],
      [400, 300],
      [263, 346],
    ],
    null,
  );
  c.clip();
  const dotOffset = (t * 3) % 24;
  for (let row = -2; row < 31; row++)
    for (let col = 0; col < 14; col++) {
      const x = 250 + col * 12 + (row % 2 ? 6 : 0),
        y = row * 12 + dotOffset;
      c.fillStyle = "rgba(180,147,237,0.26)";
      c.beginPath();
      c.arc(x, y, 1.4, 0, Math.PI * 2);
      c.fill();
    }
  c.restore();
  c.restore();

  // Flat diagonal paper pieces and the cyan corner echo the surrounding S2 stage.
  polygon(
    [
      [0, 398],
      [115, 363],
      [104, 384],
      [0, 420],
    ],
    "#253f8b",
  );
  polygon(
    [
      [0, 421],
      [78, 395],
      [72, 409],
      [0, 434],
    ],
    "#4c9ebc",
  );
  polygon(
    [
      [331, 0],
      [400, 0],
      [400, 20],
      [327, 10],
    ],
    "#6950bc",
  );

  // A broad, feathered reflection brushes across the printed stage behind the image.
  // The longer dark interval keeps the comic panels readable between passes.
  const sweep = (t % 7.5) / 3.2;
  if (sweep < 1) {
    const x = -170 + sweep * 800;
    c.save();
    c.globalCompositeOperation = "screen";
    c.globalAlpha = Math.sin(sweep * Math.PI) ** 2 * 0.34 * strength;
    c.transform(1, 0, -0.3, 1, 0, 0);
    const reflection = c.createLinearGradient(x - 135, 0, x + 135, 0);
    reflection.addColorStop(0, "rgba(137,115,218,0)");
    reflection.addColorStop(0.25, "rgba(145,123,224,0.15)");
    reflection.addColorStop(0.5, "rgba(208,195,249,0.85)");
    reflection.addColorStop(0.75, "rgba(117,185,216,0.18)");
    reflection.addColorStop(1, "rgba(117,185,216,0)");
    c.fillStyle = reflection;
    c.fillRect(x - 135, 0, 270, 440);
    c.restore();
  }

  const pieces = [
    [28, 94, "#65c8e5"],
    [369, 112, "#d66195"],
    [48, 355, "#a1cf75"],
    [350, 391, "#d1ac60"],
  ];
  pieces.forEach(([x, y, color], i) => {
    const phase = t * 0.7 + i * 1.8;
    c.save();
    c.translate(x + Math.sin(phase) * 4, y + Math.cos(phase * 0.8) * 7);
    c.rotate(Math.sin(phase) * 0.17);
    c.scale(0.65 + 0.35 * Math.cos(phase) ** 2, 1);
    c.globalAlpha = 0.65 * strength;
    polygon(
      [
        [-5, 1],
        [4, -5],
        [7, 1],
        [-3, 7],
      ],
      color,
    );
    c.restore();
  });
  star(43, 155, 5, 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.2)));
  star(365, 300, 4, 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.3 + 2)));

  // Broken neon corner brackets are internal to the portrait, below all image layers.
  c.globalAlpha = (0.4 + 0.12 * Math.sin(t * 0.9)) * strength;
  line(
    [
      [4, 50],
      [4, 4],
      [48, 4],
    ],
    "#a788eb",
    1.5,
  );
  line(
    [
      [352, 436],
      [396, 436],
      [396, 390],
    ],
    "#a788eb",
    1.5,
  );
  c.restore();
}
