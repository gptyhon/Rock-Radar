/** S2 preview background. Driven by the existing radar frame loop, never its own RAF. */
export function createS2Background() {
  const settings = {
    detail: 1,
    glow: 1,
    motion: 0.8,
    speed: 1,
    enhanced: true,
  };
  const bases = new WeakMap();
  const scenes = new Map();
  let scene = "reveal";
  let seconds = 0;
  let sincePaint = Infinity;
  let dirty = true;
  let disposed = false;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reducedMotion.matches;
  function random(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function paint(canvas) {
    const w = 1280,
      h = 720;
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d");
    const isReveal = canvas.dataset.scene === "reveal";
    const rand = random(20261116);
    function polygon(points, fill, stroke, width = 1, blur = 0) {
      c.save();
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      if (fill) {
        c.fillStyle = fill;
        c.fill();
      }
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = width;
        c.shadowColor = stroke;
        c.shadowBlur = blur;
        c.stroke();
      }
      c.restore();
    }
    function gradient(x0, y0, x1, y1, stops) {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([p, color]) => g.addColorStop(p, color));
      return g;
    }
    function bloom(x, y, rx, ry, color, alpha) {
      c.save();
      c.translate(x, y);
      c.scale(rx, ry);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      c.globalAlpha = alpha;
      c.fillStyle = g;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    }
    function line(points, color, width, blur = 0) {
      c.save();
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.strokeStyle = color;
      c.lineWidth = width;
      c.lineJoin = "miter";
      c.shadowColor = color;
      c.shadowBlur = blur;
      c.stroke();
      c.restore();
    }
    function star(x, y, r, color, opacity = 1) {
      c.save();
      c.globalAlpha = opacity;
      c.shadowBlur = r * 2;
      c.shadowColor = color;
      polygon(
        [
          [x, y - r],
          [x + r * 0.16, y - r * 0.16],
          [x + r * 0.65, y],
          [x + r * 0.16, y + r * 0.16],
          [x, y + r],
          [x - r * 0.16, y + r * 0.16],
          [x - r * 0.65, y],
          [x - r * 0.16, y - r * 0.16],
        ],
        color,
      );
      c.restore();
    }
    c.fillStyle = gradient(
      0,
      0,
      160,
      720,
      isReveal
        ? [
            [0, "#05051f"],
            [0.36, "#0e0a40"],
            [0.78, "#251687"],
            [1, "#5141cb"],
          ]
        : [
            [0, "#05051d"],
            [0.22, "#0b0935"],
            [0.56, "#29216e"],
            [1, "#6650c9"],
          ],
    );
    c.fillRect(0, 0, w, h);
    bloom(765, 640, 950, 440, "#6f50e9", 0.48);
    bloom(142, 530, 460, 270, "#335fd9", 0.28);
    if (!isReveal) {
      // The low-contrast stage rig visible above the cards in the reference.
      c.save();
      c.translate(590, 175);
      c.scale(1, 0.38);
      c.beginPath();
      c.arc(0, 0, 357, Math.PI * 1.04, Math.PI * 1.97);
      c.lineWidth = 72;
      c.strokeStyle = "#17133d";
      c.stroke();
      c.restore();
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * 1.04 + i * 0.245;
        const x = 590 + Math.cos(a) * 357,
          y = 175 + Math.sin(a) * 136;
        polygon(
          [
            [x - 32, y],
            [x, y - 18],
            [x + 32, y],
            [x, y + 18],
          ],
          i % 2 ? "#252052" : "#100d32",
        );
      }
      for (const [x, y, r] of [
        [416, 59, 38],
        [743, 80, 32],
      ]) {
        c.save();
        c.translate(x, y);
        c.rotate(-0.35);
        c.scale(0.8, 1);
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fillStyle = "#141035";
        c.fill();
        c.lineWidth = 7;
        c.strokeStyle = "#201950";
        c.stroke();
        c.beginPath();
        c.arc(-3, -3, r - 9, 0, Math.PI * 2);
        c.strokeStyle = "#0d0b29";
        c.lineWidth = 6;
        c.stroke();
        c.restore();
      }
      polygon(
        [
          [1290, -30],
          [1380, -30],
          [1260, 520],
          [1200, 505],
        ],
        gradient(1100, 0, 870, 490, [
          [0, "#5432bb"],
          [0.4, "#8748eb"],
          [1, "#423491"],
        ]),
      );
      polygon(
        [
          [1380, -30],
          [1390, -30],
          [1270, 525],
          [1260, 520],
        ],
        "#b184f0",
      );
      c.save();
      c.beginPath();
      c.moveTo(1115, -30);
      c.lineTo(1225, -30);
      c.lineTo(1260, 520);
      c.lineTo(1200, 505);
      c.closePath();
      c.clip();
      for (let y = 0; y < 500; y += 12)
        for (let x = 800; x < 1250; x += 12) {
          c.beginPath();
          c.arc(x + (y % 24 ? 6 : 0), y, 2.3, 0, 7);
          c.fillStyle = "rgba(227,183,255,.3)";
          c.fill();
        }
      c.restore();
      // Halftone field grows toward the lower corners, leaving the score area quiet.
      for (let y = 400; y < 720; y += 9)
        for (let x = 0; x < 1280; x += 9) {
          const edge = Math.pow(Math.abs(x - 640) / 640, 1.5),
            a = ((y - 400) / 320) * 0.22 * settings.detail * (0.2 + edge);
          c.fillStyle = `rgba(190,167,255,${a})`;
          c.beginPath();
          c.arc(x + (y % 18 ? 4.5 : 0), y, 1.15, 0, 7);
          c.fill();
        }
      polygon(
        [
          [0, 485],
          [275, 600],
          [180, 720],
          [0, 720],
        ],
        "rgba(53,39,116,.14)",
      );
      bloom(1255, 340, 175, 350, "#5327d5", 0.2);
    } else {
      // Angled planes and neon rails follow the reference reveal composition.
      polygon(
        [
          [795, 182],
          [1225, 176],
          [1225, 612],
          [795, 620],
        ],
        gradient(700, 100, 800, 650, [
          [0, "#4937be"],
          [0.5, "#171148"],
          [1, "#302571"],
        ]),
      );
      polygon(
        [
          [810, 196],
          [1208, 192],
          [1208, 599],
          [810, 605],
        ],
        "#0a0828",
      );
      polygon(
        [
          [810, 196],
          [928, 192],
          [810, 605],
        ],
        "#26205f",
      );
      polygon(
        [
          [1230, 420],
          [1330, 455],
          [1300, 690],
          [1225, 650],
        ],
        "#663bd1",
      );
      c.save();
      c.beginPath();
      c.moveTo(1230, 420);
      c.lineTo(1330, 455);
      c.lineTo(1300, 690);
      c.lineTo(1225, 650);
      c.closePath();
      c.clip();
      for (let y = 350; y < 640; y += 11)
        for (let x = 930; x < 1210; x += 11) {
          c.fillStyle = "rgba(237,192,255,.35)";
          c.beginPath();
          c.arc(x + (y % 22 ? 5 : 0), y, 2.1, 0, 7);
          c.fill();
        }
      c.restore();
      const rails = [
        [
          [790, 180],
          [1225, 180],
          [1225, 615],
          [1170, 634],
        ],
        [
          [-30, 610],
          [40, 698],
          [300, 698],
        ],
        [
          [740, 730],
          [1270, 646],
          [1330, 654],
        ],
      ];
      for (const path of rails) {
        line(path, "#8a36ff", 10, 20 * settings.glow);
        line(path, "#dc8fff", 4, 12 * settings.glow);
        line(path, "#fff3ff", 2, 5 * settings.glow);
      }
      polygon(
        [
          [560, 780],
          [700, 731],
          [1190, 675],
          [1320, 623],
          [1320, 710],
          [950, 756],
          [870, 795],
        ],
        gradient(400, 680, 1100, 380, [
          [0, "#3916ab"],
          [0.35, "#3557f0"],
          [0.68, "#087cdd"],
          [1, "#57d4f4"],
        ]),
        "#69c7ff",
        2,
        15 * settings.glow,
      );
      line(
        [
          [560, 780],
          [700, 731],
          [1190, 675],
          [1320, 623],
        ],
        "#a6edff",
        4,
        16 * settings.glow,
      );
      polygon(
        [
          [29, 648],
          [73, 635],
          [79, 620],
          [98, 632],
          [126, 622],
          [114, 650],
          [129, 665],
          [96, 664],
          [80, 689],
          [72, 666],
        ],
        "#4b30b4",
        "#7f8eff",
        2,
        10,
      );
      bloom(80, 665, 105, 70, "#bd5dff", 0.5 * settings.glow);
    }
    // Repeatable subtle grain and restrained scattered particles.
    for (let i = 0; i < 25000 * settings.detail; i++) {
      c.fillStyle = i % 2 ? "rgba(211,189,255,.025)" : "rgba(7,4,34,.035)";
      c.fillRect(rand() * 1280, rand() * 720, 1, 1);
    }
    const base = document.createElement("canvas");
    base.width = w;
    base.height = h;
    base.getContext("2d").drawImage(canvas, 0, 0);
    bases.set(canvas, base);
  }
  function draw(canvas, time) {
    const c = canvas.getContext("2d"),
      isReveal = canvas.dataset.scene === "reveal";
    const phase = (time / 12) * Math.PI * 2,
      m = settings.motion,
      extra = settings.enhanced ? 1 : 0;
    c.drawImage(bases.get(canvas), 0, 0);
    function shape(points, fill, stroke) {
      c.beginPath();
      points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 2;
        c.shadowColor = stroke;
        c.shadowBlur = 12 * settings.glow;
        c.stroke();
        c.shadowBlur = 0;
      }
    }
    if (isReveal) {
      c.save();
      c.translate(
        Math.sin(phase) * 12 * m * extra,
        Math.cos(phase) * 9 * m * extra,
      );
      let g = c.createLinearGradient(450, 20, 710, 250);
      g.addColorStop(0, "#5710bc");
      g.addColorStop(0.5, "#37159a");
      g.addColorStop(1, "#12218e");
      shape(
        [
          [-60, -90],
          [38, -80],
          [160, 55],
          [105, 112],
          [30, 64],
          [-80, 12],
        ],
        g,
        "#791dff",
      );
      c.restore();
      c.save();
      c.translate(
        Math.cos(phase) * -14 * m * extra,
        Math.sin(phase) * 10 * m * extra,
      );
      g = c.createLinearGradient(1200, 0, 900, 380);
      g.addColorStop(0, "#8050ff");
      g.addColorStop(0.45, "#3919d3");
      g.addColorStop(1, "#133bca");
      shape(
        [
          [1320, -70],
          [1370, 15],
          [1258, 292],
          [1224, 240],
        ],
        g,
        "#8e4bff",
      );
      c.restore();
    }
    function haze(x, y, r, color, alpha) {
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = color;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
      c.restore();
    }
    function sparkle(x, y, r, alpha) {
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = "#e8dcff";
      c.shadowColor = "#ac73ff";
      c.shadowBlur = r * 3;
      c.beginPath();
      c.moveTo(x, y - r);
      c.lineTo(x + r * 0.18, y - r * 0.18);
      c.lineTo(x + r * 0.7, y);
      c.lineTo(x + r * 0.18, y + r * 0.18);
      c.lineTo(x, y + r);
      c.lineTo(x - r * 0.18, y + r * 0.18);
      c.lineTo(x - r * 0.7, y);
      c.lineTo(x - r * 0.18, y - r * 0.18);
      c.closePath();
      c.fill();
      c.restore();
    }
    const breath =
      (0.5 + 0.5 * Math.sin(phase * 2)) *
      (0.09 + 0.1 * extra) *
      m *
      settings.glow;
    c.save();
    c.globalCompositeOperation = "screen";
    haze(960 + Math.sin(phase) * 28 * m, 490, 360, "#7b45ef", breath);
    haze(170, 590 + Math.cos(phase) * 18 * m, 330, "#4169ed", breath * 0.7);
    c.restore();
    if (extra) {
      // Soft angled stage lights move independently, with no full-screen flash.
      c.save();
      c.globalCompositeOperation = "screen";
      for (let k = 0; k < 2; k++) {
        const x = (k ? 1070 : 120) + Math.sin(phase + k * 2) * 65 * m;
        c.save();
        c.translate(x, -60);
        c.rotate((k ? -0.27 : 0.3) + Math.sin(phase + k) * 0.08 * m);
        const g = c.createLinearGradient(0, 0, 0, 820);
        g.addColorStop(0, "rgba(145,111,255,0)");
        g.addColorStop(0.4, `rgba(116,106,255,${0.08 * m})`);
        g.addColorStop(0.75, `rgba(100,174,255,${0.12 * m})`);
        g.addColorStop(1, "rgba(100,174,255,0)");
        shape(
          [
            [-6, 0],
            [6, 0],
            [160, 820],
            [-160, 820],
          ],
          g,
        );
        c.restore();
      }
      c.restore();
      // A narrow reflective sheen travels along the existing cyan ribbon.
      c.save();
      c.beginPath();
      const ribbon = isReveal
        ? [
            [560, 780],
            [700, 731],
            [1190, 675],
            [1320, 623],
            [1320, 710],
            [950, 756],
            [870, 795],
          ]
        : [
            [1290, -30],
            [1380, -30],
            [1260, 520],
            [1200, 505],
          ];
      ribbon.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.closePath();
      c.clip();
      const sweep = (time / 6) % 1,
        sx = -180 + sweep * 1650,
        g = c.createLinearGradient(sx - 160, 0, sx + 160, 0);
      g.addColorStop(0, "transparent");
      g.addColorStop(0.45, `rgba(193,230,255,${0.2 * m})`);
      g.addColorStop(0.5, `rgba(246,246,255,${0.32 * m})`);
      g.addColorStop(0.65, `rgba(154,207,255,${0.12 * m})`);
      g.addColorStop(1, "transparent");
      c.fillStyle = g;
      c.fillRect(0, 0, 1280, 720);
      c.restore();
    }
    const rng = random(144);
    for (let i = 0; i < (isReveal ? 60 : 32) * settings.detail; i++) {
      const x = rng() * 1280,
        y = rng() * 720,
        p = rng() * Math.PI * 2,
        r = 0.7 + rng() * 2;
      if (
        (x > 100 && x < 790 && y > 65 && y < 650) ||
        (x > 810 && x < 1210 && y > 65 && y < 625)
      )
        continue;
      sparkle(
        x + Math.sin(phase + p) * 4 * m,
        y + Math.cos(phase + p) * 6 * m,
        r,
        0.18 + 0.3 * (0.5 + 0.5 * Math.sin(phase * (2 + (i % 3)) + p)) * m,
      );
    }
    if (isReveal) {
      for (let i = 0; i < (extra ? 36 : 22); i++) {
        const a = rng() * Math.PI * 2,
          r = rng() * 58,
          p = rng() * Math.PI * 2,
          u = (time / 4 + i / 36) % 1;
        const radius = extra ? 8 + u * 62 * m : r;
        const alpha = extra
          ? Math.sin(Math.PI * u) ** 2 * 0.8 * m
          : 0.15 + 0.55 * (0.5 + 0.5 * Math.sin(phase * 3 + p)) * m;
        sparkle(
          80 + Math.cos(a) * radius + Math.sin(phase + p) * 3 * m,
          665 + Math.sin(a) * radius * 0.7,
          1.5 + rng() * 4,
          alpha,
        );
      }
    }
    const pieces = isReveal
      ? [
          [136, 184, "#7deb64"],
          [1064, 68, "#f64769"],
          [223, 586, "#ffc348"],
          [841, 530, "#f34b71"],
          [1200, 599, "#53d3f9"],
          [291, 371, "#9679ff"],
          [985, 171, "#7ade62"],
          [516, 412, "#45bcf4"],
        ]
      : [
          [1235, 142, "#9bdd69"],
          [64, 351, "#8ab661"],
          [1111, 520, "#e48d63"],
          [211, 633, "#aa85ed"],
        ];
    if (extra)
      pieces.push(
        [70, 470, "#7ddbff"],
        [1180, 238, "#d28dff"],
        [465, 88, "#b6a0ff"],
        [948, 668, "#ffcc66"],
        [1135, 530, "#ff6b9c"],
      );
    pieces.forEach(([x, y, color], i) => {
      if (x > 100 && x < 1210 && y > 65 && y < 650) return;
      const p = i * 1.71;
      c.save();
      c.translate(
        x + Math.sin(phase + p) * (12 + 14 * extra) * m,
        y + Math.sin(phase * 2 + p) * (8 + 14 * extra) * m,
      );
      c.rotate(Math.sin(phase + p) * (0.22 + 0.45 * extra) * m);
      c.scale(
        extra ? Math.cos(phase * 2 + p) : 0.9 + 0.1 * Math.cos(phase * 2 + p),
        1,
      );
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(13, -6);
      c.lineTo(11, 7);
      c.lineTo(-4, 12);
      c.closePath();
      c.fill();
      c.restore();
    });
    if (extra) {
      // Sparse diagonal streaks fade at each end of their repeating flight.
      for (let i = 0; i < 8; i++) {
        const u = (time / 6 + i / 8) % 1,
          x = 80 + i * 150 + u * 130,
          y = 640 - (i % 4) * 135 - u * 120;
        if (x > 100 && x < 1210 && y > 65 && y < 650) continue;
        c.save();
        c.globalAlpha = Math.sin(Math.PI * u) ** 4 * 0.45 * m;
        const g = c.createLinearGradient(x - 25, y + 22, x, y);
        g.addColorStop(0, "transparent");
        g.addColorStop(1, "#d8c6ff");
        c.strokeStyle = g;
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(x - 25, y + 22);
        c.lineTo(x, y);
        c.stroke();
        c.restore();
      }
    }
    if (isReveal) {
      const points = [
        [790, 180],
        [1225, 180],
        [1225, 615],
        [1170, 634],
      ];
      const lengths = points
        .slice(1)
        .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
      const total = lengths.reduce((a, b) => a + b, 0),
        u = (((time / 12) % 1) + 1) % 1;
      function pointAt(distance) {
        let d = Math.max(0, Math.min(total, distance));
        for (let i = 0; i < lengths.length; i++) {
          if (d <= lengths[i]) {
            const t = d / lengths[i];
            return [
              points[i][0] + (points[i + 1][0] - points[i][0]) * t,
              points[i][1] + (points[i + 1][1] - points[i][1]) * t,
            ];
          }
          d -= lengths[i];
        }
        return points.at(-1);
      }
      c.save();
      c.globalCompositeOperation = "screen";
      for (let j = 0; j < 18; j++) {
        const [x, y] = pointAt(u * total - j * 4);
        const alpha =
          Math.sin(Math.PI * u) ** 2 * (1 - j / 18) * 0.4 * m * settings.glow;
        haze(x, y, 8, "#fff0ff", alpha);
      }
      c.restore();
    } else {
      haze(
        99,
        99,
        23,
        "#a656ff",
        (0.45 + 0.15 * Math.sin(phase * 3)) * settings.glow,
      );
      sparkle(99, 99, 3, 0.7);
    }
  }

  function getScene() {
    if (!scenes.has(scene)) {
      const canvas = document.createElement("canvas");
      canvas.dataset.scene = scene;
      paint(canvas);
      scenes.set(scene, canvas);
    }
    return scenes.get(scene);
  }
  return {
    get paused() {
      return paused;
    },
    setScene(value) {
      scene = value === "normal" ? "normal" : "reveal";
      dirty = true;
    },
    setEnhanced(value) {
      settings.enhanced = !!value;
      dirty = true;
    },
    setPaused(value) {
      paused = !!value;
    },
    render({ canvas, context, deltaTime, enabled = true }) {
      if (disposed) return;
      const dt = Math.max(0, Math.min(50, deltaTime || 0)) / 1000;
      if (!paused && enabled) seconds += dt;
      sincePaint += dt;
      const frame = getScene();
      if (dirty || (!paused && enabled && sincePaint >= 1 / 30)) {
        draw(frame, seconds);
        dirty = false;
        sincePaint = 0;
      }
      // Match the two presentation columns across viewport aspect ratios.
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      // Presentation geometry scales with viewport width and stays vertically centered.
      const sceneHeight = canvas.width * 720 / 1280;
      const offsetY = (canvas.height - sceneHeight) / 2;
      const fill = context.createLinearGradient(0, offsetY, 0, offsetY + sceneHeight);
      fill.addColorStop(0, scene === 'reveal' ? '#05051f' : '#05051d');
      fill.addColorStop(1, scene === 'reveal' ? '#5141cb' : '#6650c9');
      context.fillStyle = fill;
      context.fillRect(0, 0, canvas.width, canvas.height);
      // Extend edge colors into taller viewports without moving the content frame.
      if (offsetY > 0) {
        context.drawImage(frame, 0, 0, 1280, 1, 0, 0, canvas.width, offsetY + 1);
        context.drawImage(frame, 0, 719, 1280, 1, 0, offsetY + sceneHeight - 1, canvas.width, offsetY + 1);
      }
      context.drawImage(frame, 0, offsetY, canvas.width, sceneHeight);
      context.restore();
      canvas.dataset.effectMode = "s2-" + scene;
      canvas.dataset.effectEnabled = String(enabled);
    },
    dispose() {
      disposed = true;
      for (const canvas of scenes.values()) {
        const base = bases.get(canvas);
        if (base) {
          base.width = 0;
          base.height = 0;
        }
        canvas.width = 0;
        canvas.height = 0;
        bases.delete(canvas);
      }
      scenes.clear();
    },
  };
}
