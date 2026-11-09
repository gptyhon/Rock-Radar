const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/js/role-position.js', 'utf8');
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox);
const position = sandbox.globalThis.RockRadarRolePosition;

assert.ok(position, 'module should expose RockRadarRolePosition');

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(position.moveItem(['A', 'B', 'C', 'D'], 0, 2))),
    ['B', 'C', 'A', 'D'],
    'moveItem should place a role at the requested final index'
);
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(position.moveItem(['A', 'B', 'C'], 2, 0))),
    ['C', 'A', 'B'],
    'moveItem should support moving backward'
);
const duplicateA = { name: 'Same', id: 'a' };
const duplicateB = { name: 'Same', id: 'b' };
const duplicateResult = position.moveItem([duplicateA, duplicateB, { name: 'Other' }], 1, 2);
assert.strictEqual(duplicateResult[0], duplicateA, 'duplicate names should keep their item identity');
assert.strictEqual(duplicateResult[2], duplicateB, 'the dragged duplicate should move by index');
assert.strictEqual(position.getDropPlacement(90, 50, { left: 0, top: 0, width: 100, height: 100 }), 'after');
assert.strictEqual(position.getDropPlacement(10, 50, { left: 0, top: 0, width: 100, height: 100 }), 'before');
assert.strictEqual(position.getDropPlacement(50, 92, { left: 0, top: 0, width: 100, height: 100 }), 'after');
assert.ok(position.getAutoScrollDelta(10, 1000) < 0, 'top edge should scroll upward');
assert.ok(position.getAutoScrollDelta(990, 1000) > 0, 'bottom edge should scroll downward');
assert.strictEqual(position.getAutoScrollDelta(500, 1000), 0, 'middle area should not auto-scroll');

assert.strictEqual(
    position.isBestRole({ name: 'Alpha' }, ['Alpha'], []),
    true,
    'MVP role should be highlighted'
);
assert.strictEqual(
    position.isBestRole({ name: 'Beta' }, [], [{ name: 'best_Beta.webp' }]),
    true,
    'role with a best asset should be highlighted'
);
assert.strictEqual(
    position.isBestRole({ name: 'Gamma' }, ['Alpha'], [{ name: 'best_Beta.webp' }]),
    false,
    'ordinary role should not be highlighted'
);

console.log('role-position tests passed');
