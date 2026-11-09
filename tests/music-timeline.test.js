const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('public/js/music-timeline.js', 'utf8');
const sandbox = { globalThis: {} };
vm.runInNewContext(source, sandbox);
const timeline = sandbox.globalThis.RockRadarMusicTimeline;

assert.ok(timeline, 'module should expose RockRadarMusicTimeline');
assert.strictEqual(timeline.normalizeDelaySeconds(undefined), 0);
assert.strictEqual(timeline.normalizeDelaySeconds(-2), 0);
assert.strictEqual(timeline.normalizeDelaySeconds(2.26), 2.3);
assert.strictEqual(timeline.normalizeDelaySeconds(99), 60);

assert.strictEqual(
    timeline.mapContentMsToAudioSeconds(0, 6000, 2),
    4,
    'content start should account for lead-in and delayed music start'
);
assert.strictEqual(
    timeline.mapContentMsToAudioSeconds(0, 6000, 10),
    0,
    'content inside the delay window should map to the start of the playlist'
);
assert.strictEqual(
    timeline.getRemainingDelayMs(1000, 6000, 10),
    3000,
    'remaining delay should use the full presentation axis'
);
assert.strictEqual(
    timeline.mapAudioSecondsToContentMs(4, 6000, 2),
    0,
    'audio-to-content mapping should invert the configured delay'
);
assert.strictEqual(
    timeline.mapAudioSecondsToContentMs(7.5, 6000, 2),
    3500,
    'audio-to-content mapping should preserve fractional seconds'
);

console.log('music-timeline tests passed');
