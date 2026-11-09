(function (global) {
    'use strict';

    const DEFAULT_COLORS = Object.freeze({
        a: '#ff4d67',
        b: '#3d8bff'
    });

    function toFiniteNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function roundScore(value, precision = 2) {
        const number = Number(value);
        if (!Number.isFinite(number)) return null;
        const digits = Math.max(0, Math.min(8, Math.trunc(Number(precision) || 0)));
        const scale = 10 ** digits;
        return Math.round((number + Number.EPSILON) * scale) / scale;
    }

    function parseScoreInput(value, precision = 2) {
        if (String(value ?? '').trim() === '') {
            return { valid: false, value: null };
        }
        const rounded = roundScore(value, precision);
        return {
            valid: rounded !== null,
            value: rounded
        };
    }

    function scoreToRatio(value, minScore, maxScore) {
        const score = toFiniteNumber(value, 0);
        const min = toFiniteNumber(minScore, 0);
        const max = toFiniteNumber(maxScore, 10);
        if (max <= min) return score >= max ? 1 : 0;
        return Math.max(0, (score - min) / (max - min));
    }

    function normalizeDimensions(config = {}) {
        const rawCount = Math.trunc(toFiniteNumber(config.VERTEX_COUNT, 6));
        const count = Math.max(3, Math.min(12, rawCount));
        const names = Array.isArray(config.DIM_NAMES) ? config.DIM_NAMES : [];
        const mins = Array.isArray(config.MIN_SCORES) ? config.MIN_SCORES : [];
        const maxes = Array.isArray(config.BASE_MAX_SCORES) ? config.BASE_MAX_SCORES : [];
        return Array.from({ length: count }, (_, index) => {
            const name = String(names[index] ?? '').trim() || `维度${index + 1}`;
            const min = toFiniteNumber(mins[index], 0);
            const max = toFiniteNumber(maxes[index], 10);
            return { name, min, max };
        });
    }

    function calculateDimensionLeaders(roles, dimensions, precision = 2) {
        const roleList = Array.isArray(roles) ? roles : [];
        const dimensionList = Array.isArray(dimensions) ? dimensions : [];
        return dimensionList.map((dimension, dimensionIndex) => {
            let highestScore = null;
            let leaders = [];

            roleList.forEach((role, roleIndex) => {
                const rawValue = role?.points?.[dimensionIndex];
                if (rawValue === '' || rawValue === null || rawValue === undefined) return;
                const score = Number(rawValue);
                if (!Number.isFinite(score)) return;
                const candidate = {
                    index: roleIndex,
                    name: String(role?.name || '').trim() || `未命名角色 ${roleIndex + 1}`
                };
                if (highestScore === null || score > highestScore) {
                    highestScore = score;
                    leaders = [candidate];
                } else if (score === highestScore) {
                    leaders.push(candidate);
                }
            });

            return {
                index: dimensionIndex,
                name: String(dimension?.name || '').trim() || `维度${dimensionIndex + 1}`,
                score: highestScore === null ? null : roundScore(highestScore, precision),
                leaders
            };
        });
    }

    function calculateVertices(count, centerX, centerY, radius) {
        const total = Math.max(3, Math.trunc(toFiniteNumber(count, 6)));
        return Array.from({ length: total }, (_, index) => {
            const angle = -Math.PI / 2 + index * Math.PI * 2 / total;
            return {
                angle,
                cos: Math.cos(angle),
                sin: Math.sin(angle),
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
        });
    }

    function calculatePolygon(scores, dimensions, centerX, centerY, radius) {
        const vertices = calculateVertices(dimensions.length, centerX, centerY, radius);
        return vertices.map((vertex, index) => {
            const dimension = dimensions[index];
            const ratio = scoreToRatio(scores?.[index], dimension.min, dimension.max);
            return {
                x: centerX + vertex.cos * radius * ratio,
                y: centerY + vertex.sin * radius * ratio,
                ratio
            };
        });
    }

    function tracePolygon(ctx, points) {
        if (!points.length) return;
        ctx.beginPath();
        points.forEach((point, index) => {
            if (index === 0) ctx.moveTo(point.x, point.y);
            else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
    }

    function hexToRgba(hex, alpha) {
        const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
        if (!match) return `rgba(255,255,255,${alpha})`;
        return `rgba(${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)},${alpha})`;
    }

    function draw(canvas, options = {}) {
        if (!canvas || typeof canvas.getContext !== 'function') return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const rect = canvas.getBoundingClientRect?.() || {};
        const width = Math.max(320, Math.round(rect.width || canvas.clientWidth || 640));
        const height = Math.max(320, Math.round(rect.height || canvas.clientHeight || width));
        const pixelRatio = Math.max(1, Math.min(2, toFiniteNumber(global.devicePixelRatio, 1)));
        const pixelWidth = Math.round(width * pixelRatio);
        const pixelHeight = Math.round(height * pixelRatio);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, width, height);

        const dimensions = Array.isArray(options.dimensions) && options.dimensions.length >= 3
            ? options.dimensions
            : normalizeDimensions(options.config);
        const colors = { ...DEFAULT_COLORS, ...(options.colors || {}) };
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.315;
        const vertices = calculateVertices(dimensions.length, centerX, centerY, radius);

        const background = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) * 0.62);
        background.addColorStop(0, 'rgba(24, 38, 70, 0.62)');
        background.addColorStop(0.62, 'rgba(10, 20, 40, 0.46)');
        background.addColorStop(1, 'rgba(4, 9, 20, 0)');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        const levels = Math.max(3, Math.min(8, Math.trunc(toFiniteNumber(options.levels, 5))));
        ctx.lineJoin = 'round';
        for (let level = levels; level >= 1; level -= 1) {
            const ratio = level / levels;
            const points = vertices.map(vertex => ({
                x: centerX + vertex.cos * radius * ratio,
                y: centerY + vertex.sin * radius * ratio
            }));
            tracePolygon(ctx, points);
            ctx.fillStyle = level % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'rgba(255,255,255,0.022)';
            ctx.fill();
            ctx.strokeStyle = level === levels ? 'rgba(209,225,255,0.42)' : 'rgba(153,180,226,0.18)';
            ctx.lineWidth = level === levels ? 1.5 : 1;
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(153,180,226,0.2)';
        ctx.lineWidth = 1;
        vertices.forEach(vertex => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(vertex.x, vertex.y);
            ctx.stroke();
        });

        const series = Array.isArray(options.series) ? options.series.slice(0, 2) : [];
        const seriesPoints = [];
        series.forEach((item, index) => {
            const color = item.color || (index === 0 ? colors.a : colors.b);
            const points = calculatePolygon(item.scores, dimensions, centerX, centerY, radius);
            seriesPoints.push(points);

            ctx.save();
            ctx.shadowColor = hexToRgba(color, 0.65);
            ctx.shadowBlur = 14;
            tracePolygon(ctx, points);
            ctx.fillStyle = hexToRgba(color, 0.16);
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.setLineDash(index === 1 ? [10, 7] : []);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#f7fbff';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.stroke();
            });
            ctx.restore();
        });

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${Math.max(12, Math.min(16, width * 0.026))}px "HarmonyOS Sans SC", "Segoe UI", sans-serif`;
        dimensions.forEach((dimension, index) => {
            const vertex = vertices[index];
            const labelRadius = radius + Math.max(28, width * 0.052);
            const x = centerX + vertex.cos * labelRadius;
            const y = centerY + vertex.sin * labelRadius;
            ctx.fillStyle = 'rgba(225,235,255,0.9)';
            ctx.fillText(dimension.name, x, y - 7);
            ctx.fillStyle = 'rgba(139,160,197,0.72)';
            ctx.font = `${Math.max(10, Math.min(12, width * 0.02))}px "HarmonyOS Sans SC", "Segoe UI", sans-serif`;
            ctx.fillText(`${dimension.min}–${dimension.max}`, x, y + 11);
            ctx.font = `${Math.max(12, Math.min(16, width * 0.026))}px "HarmonyOS Sans SC", "Segoe UI", sans-serif`;
        });

        return {
            width,
            height,
            dimensions,
            vertices,
            seriesPoints
        };
    }

    global.RockRadarRoleComparison = Object.freeze({
        DEFAULT_COLORS,
        roundScore,
        parseScoreInput,
        scoreToRatio,
        normalizeDimensions,
        calculateDimensionLeaders,
        calculateVertices,
        calculatePolygon,
        draw
    });
})(typeof window !== 'undefined' ? window : globalThis);
