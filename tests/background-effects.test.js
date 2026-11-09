const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'background-effects.js'),
    'utf8'
);
const sandbox = {};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const BackgroundEffects = sandbox.RockRadarBackgroundEffects;
assert.ok(BackgroundEffects, 'shared background API should be exported');
assert.equal(BackgroundEffects.VERSION, 2);
assert.deepEqual(
    JSON.parse(JSON.stringify(BackgroundEffects.MODE_OPTIONS.map(item => item[0]))),
    ['particles', 'living-field', 'off']
);
assert.equal(BackgroundEffects.normalizeMode('starfield'), 'living-field');
assert.equal(BackgroundEffects.normalizeMode('ripple'), 'living-field');

const migrated = BackgroundEffects.normalizeConfig(null, {
    PARTICLE_OPACITY_MULT: 1.7,
    PARTICLE_SIZE_MULT: 1.4
});
assert.equal(migrated.common.opacity, 1.7);
assert.equal(migrated.common.size, 1.4);

const normalized = BackgroundEffects.normalizeConfig({
    common: { opacity: 99, speed: -2, density: 1.5 },
    particles: { direction: 'invalid' },
    livingField: { grain: 4, safeMask: -1, beatImpact: 1.4 }
});
assert.equal(normalized.common.opacity, 3);
assert.equal(normalized.common.speed, 0);
assert.equal(normalized.common.density, 1.5);
assert.equal(normalized.particles.direction, 'mixed');
assert.equal(normalized.livingField.grain, 0.2);
assert.equal(normalized.livingField.safeMask, 0);
assert.equal(normalized.livingField.beatImpact, 1.4);

const overrides = BackgroundEffects.normalizeOverrides({
    common: { speed: '2.2', opacity: '' },
    particles: { direction: 'left' },
    livingField: { filament: '1.35', safeMask: '0.7' },
    starfield: { trail: 2 },
    unknown: { value: 5 }
});
assert.deepEqual(
    JSON.parse(JSON.stringify(overrides)),
    {
        common: { speed: 2.2 },
        particles: { direction: 'left' },
        livingField: { filament: 1.35, safeMask: 0.7 }
    }
);

const resolved = BackgroundEffects.resolveConfig(
    { common: { speed: 0.8, density: 1.2 } },
    { common: { speed: 1.8 }, livingField: { chromatic: 0.8 } }
);
assert.equal(resolved.common.speed, 1.8);
assert.equal(resolved.common.density, 1.2);
assert.equal(resolved.livingField.chromatic, 0.8);
assert.deepEqual(
    JSON.parse(JSON.stringify(BackgroundEffects.getFieldsForMode('living-field').map(field => field.path))),
    [
        'common.opacity',
        'common.speed',
        'common.audioResponse',
        'livingField.flowScale',
        'livingField.distortion',
        'livingField.filament',
        'livingField.chromatic',
        'livingField.grain',
        'livingField.beatImpact',
        'livingField.idleMotion',
        'livingField.safeMask'
    ]
);

const gradient = { addColorStop() {} };
const context = {
    clearRect() {},
    save() {},
    restore() {},
    beginPath() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    createRadialGradient() { return gradient; },
    set globalCompositeOperation(value) {},
    set fillStyle(value) {},
    set strokeStyle(value) {},
    set shadowBlur(value) {},
    set shadowColor(value) {},
    set lineWidth(value) {}
};
const canvas = { width: 1920, height: 1080 };
let livingUpdates = 0;
let livingDraws = 0;
let livingDisposed = 0;
let capturedEnvironment = null;
const manager = BackgroundEffects.createManager({
    canvas,
    context,
    effectFactories: {
        'living-field': () => ({
            resize() {},
            update(_delta, environment) {
                livingUpdates += 1;
                capturedEnvironment = environment;
            },
            draw() {
                livingDraws += 1;
            },
            dispose() {
                livingDisposed += 1;
            }
        })
    }
});
manager.render({
    mode: 'particles',
    enabled: true,
    config: BackgroundEffects.DEFAULT_CONFIG,
    particleTarget: 12,
    deltaTime: 16.7
});
assert.equal(manager.getActiveMode(), 'particles');
manager.render({
    mode: 'living-field',
    enabled: true,
    config: BackgroundEffects.DEFAULT_CONFIG,
    particleTarget: 12,
    deltaTime: 16.7,
    audio: { energy: 0.5, bass: 0.4, mid: 0.3, treble: 0.2, beat: 0.8 },
    palette: { bg1: '#112233', bg2: '#020304' },
    qualityScale: 0.55
});
assert.equal(manager.getActiveMode(), 'living-field');
assert.equal(livingUpdates, 1);
assert.equal(livingDraws, 1);
assert.equal(capturedEnvironment.audio.mid, 0.3);
assert.equal(capturedEnvironment.audio.treble, 0.2);
assert.equal(capturedEnvironment.palette.bg1, '#112233');
assert.equal(capturedEnvironment.qualityScale, 0.55);
manager.render({ mode: 'off', enabled: true, deltaTime: 16.7 });
assert.equal(manager.getActiveMode(), '');
assert.equal(livingDisposed, 1);
manager.render({ mode: 'living-field', enabled: false, deltaTime: 16.7 });
assert.equal(manager.getActiveMode(), '');

const livingSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'living-field-effect.js'),
    'utf8'
);
const livingSandbox = {
    console: { warn() {} },
    innerWidth: 3840,
    innerHeight: 2160
};
livingSandbox.globalThis = livingSandbox;
vm.createContext(livingSandbox);
vm.runInContext(livingSource, livingSandbox);
assert.ok(livingSandbox.RockRadarLivingFieldEffect, 'living field API should be exported');

const classNames = new Set();
const fallbackClassNames = new Set();
const fallbackStyle = { setProperty() {}, removeProperty() {} };
const livingCanvas = {
    width: 2,
    height: 2,
    clientWidth: 3840,
    clientHeight: 2160,
    dataset: {},
    style: {},
    classList: {
        add(value) { classNames.add(value); },
        remove(value) { classNames.delete(value); },
        toggle(value, enabled) {
            if (enabled) classNames.add(value);
            else classNames.delete(value);
        }
    },
    getContext() { return null; },
    addEventListener() {},
    removeEventListener() {}
};
const fallbackElement = {
    dataset: {},
    style: fallbackStyle,
    classList: {
        toggle(value, enabled) {
            if (enabled) fallbackClassNames.add(value);
            else fallbackClassNames.delete(value);
        },
        remove(value) { fallbackClassNames.delete(value); }
    }
};
const livingEffect = livingSandbox.RockRadarLivingFieldEffect.createEffect({
    canvas: livingCanvas,
    fallbackElement
});
livingEffect.resize();
livingEffect.update(1 / 60, {
    accent: '#63e6ff',
    palette: { bg1: '#07121c', bg2: '#050508' },
    qualityScale: 0.58,
    audio: { energy: 0.3, bass: 0.4, mid: 0.2, treble: 0.1, beat: 0.6 }
}, BackgroundEffects.DEFAULT_CONFIG);
assert.equal(livingCanvas.dataset.renderer, 'fallback');
assert.ok(fallbackClassNames.has('is-active'));
livingEffect.dispose();
assert.ok(!fallbackClassNames.has('is-active'));

const specialProfilesSource = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'js', 'special-profiles.js'),
    'utf8'
);
sandbox.window = sandbox;
vm.runInContext(specialProfilesSource, sandbox);
const migratedProfile = sandbox.RockRadarSpecialProfiles.normalizeProfile({
    name: '旧星空专场',
    effects: { backgroundEffect: 'starfield' }
});
assert.equal(migratedProfile.effects.backgroundEffect, 'living-field');

console.log('background-effects tests passed');
