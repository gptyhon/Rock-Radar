const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/js/role-comparison.js', 'utf8');
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox);
const comparison = sandbox.globalThis.RockRadarRoleComparison;

assert.ok(comparison, 'module should expose RockRadarRoleComparison');

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(comparison.parseScoreInput('12.345', 2))),
    { valid: true, value: 12.35 },
    'inputs should round to two decimals'
);
assert.strictEqual(comparison.parseScoreInput('', 2).valid, false, 'empty input should be invalid');
assert.strictEqual(comparison.parseScoreInput('not-a-number', 2).valid, false, 'non-number input should be invalid');
assert.strictEqual(comparison.scoreToRatio(5, 5, 10), 0, 'minimum score should map to center');
assert.strictEqual(comparison.scoreToRatio(2, 5, 10), 0, 'score below minimum should stay at center');
assert.strictEqual(comparison.scoreToRatio(12, 2, 10), 1.25, 'score above maximum should extend beyond the outer ring');

const dimensions = comparison.normalizeDimensions({
    VERTEX_COUNT: 6,
    DIM_NAMES: ['A', 'B', 'C', 'D', 'E', 'F'],
    MIN_SCORES: [0, 0, 0, 0, 0, 0],
    BASE_MAX_SCORES: [10, 10, 10, 10, 10, 10]
});
assert.strictEqual(dimensions.length, 6, 'six configured dimensions should create a hexagon');
assert.strictEqual(dimensions[0].name, 'A');

const vertices = comparison.calculateVertices(6, 100, 100, 50);
assert.strictEqual(vertices.length, 6);
assert.ok(Math.abs(vertices[0].x - 100) < 1e-9, 'first vertex should be centered horizontally');
assert.ok(Math.abs(vertices[0].y - 50) < 1e-9, 'first vertex should point upward');

const polygon = comparison.calculatePolygon([10, 10, 10, 10, 10, 20], dimensions, 100, 100, 50);
assert.strictEqual(polygon.length, 6);
assert.strictEqual(polygon[0].ratio, 1);
assert.strictEqual(polygon[5].ratio, 2, 'unbounded value should preserve an over-range polygon ratio');

const leaderDimensions = comparison.normalizeDimensions({
    VERTEX_COUNT: 3,
    DIM_NAMES: ['Power', 'Smoothness', 'Impact'],
    MIN_SCORES: [0, 0, 0],
    BASE_MAX_SCORES: [10, 10, 10]
});
const dimensionLeaders = comparison.calculateDimensionLeaders([
    { name: 'Alpha', points: [8.126, 9, ''] },
    { name: 'Beta', points: [9.555, 9, 'invalid'] },
    { name: 'Gamma', points: [7, 8, null] }
], leaderDimensions, 2);
const plainLeaders = JSON.parse(JSON.stringify(dimensionLeaders));
assert.deepStrictEqual(plainLeaders[0], {
    index: 0,
    name: 'Power',
    score: 9.56,
    leaders: [{ index: 1, name: 'Beta' }]
}, 'highest score should be rounded for display and retain its role');
assert.deepStrictEqual(plainLeaders[1].leaders, [
    { index: 0, name: 'Alpha' },
    { index: 1, name: 'Beta' }
], 'all tied leaders should be retained in source order');
assert.strictEqual(plainLeaders[2].score, null, 'dimension without a valid score should use an empty result');
assert.deepStrictEqual(plainLeaders[2].leaders, []);

console.log('role-comparison tests passed');
