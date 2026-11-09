(function (global) {
    'use strict';

    const VERSION = 2;
    const MODE_OPTIONS = [
        ['particles', '粒子流'],
        ['living-field', '深空流体折射场'],
        ['off', '关闭']
    ];
    const MODE_IDS = new Set(MODE_OPTIONS.map(item => item[0]));
    const LEGACY_MODE_MAP = Object.freeze({
        starfield: 'living-field',
        ripple: 'living-field'
    });

    const COMMON_FIELDS = [
        { path: 'common.opacity', label: '透明度', type: 'number', min: 0, max: 3, step: 0.1 },
        { path: 'common.size', label: '大小', type: 'number', min: 0.25, max: 4, step: 0.05 },
        { path: 'common.speed', label: '速度', type: 'number', min: 0, max: 3, step: 0.05 },
        { path: 'common.density', label: '密度', type: 'number', min: 0.25, max: 3, step: 0.05 },
        { path: 'common.audioResponse', label: '音频响应', type: 'number', min: 0, max: 2, step: 0.05 }
    ];

    const MODE_DEFINITIONS = Object.freeze({
        particles: {
            id: 'particles',
            label: '粒子流',
            fields: [
                {
                    path: 'particles.direction',
                    label: '流动方向',
                    type: 'select',
                    options: [
                        ['mixed', '上下交汇'],
                        ['down', '向下'],
                        ['up', '向上'],
                        ['right', '向右'],
                        ['left', '向左']
                    ]
                },
                { path: 'particles.drift', label: '漂移幅度', type: 'number', min: 0, max: 3, step: 0.05 },
                { path: 'particles.glow', label: '辉光强度', type: 'number', min: 0, max: 3, step: 0.05 }
            ]
        },
        'living-field': {
            id: 'living-field',
            label: '深空流体折射场',
            commonFields: COMMON_FIELDS.filter(field => [
                'common.opacity',
                'common.speed',
                'common.audioResponse'
            ].includes(field.path)),
            fields: [
                { path: 'livingField.flowScale', label: '流场尺度', type: 'number', min: 0.5, max: 2, step: 0.05 },
                { path: 'livingField.distortion', label: '空间折射', type: 'number', min: 0, max: 2, step: 0.05 },
                { path: 'livingField.filament', label: '能量丝线', type: 'number', min: 0, max: 2, step: 0.05 },
                { path: 'livingField.chromatic', label: '光谱色散', type: 'number', min: 0, max: 1.5, step: 0.05 },
                { path: 'livingField.grain', label: '动态颗粒', type: 'number', min: 0, max: 0.2, step: 0.01 },
                { path: 'livingField.beatImpact', label: '节拍冲击', type: 'number', min: 0, max: 2, step: 0.05 },
                { path: 'livingField.idleMotion', label: '静默律动', type: 'number', min: 0, max: 1.5, step: 0.05 },
                { path: 'livingField.safeMask', label: '主体避让', type: 'number', min: 0, max: 1, step: 0.05 }
            ]
        },
        off: {
            id: 'off',
            label: '关闭',
            fields: []
        }
    });

    const DEFAULT_CONFIG = Object.freeze({
        version: VERSION,
        common: {
            opacity: 2,
            size: 2,
            speed: 1,
            density: 1,
            audioResponse: 1
        },
        particles: {
            direction: 'mixed',
            drift: 1,
            glow: 1
        },
        livingField: {
            flowScale: 1,
            distortion: 1,
            filament: 0.9,
            chromatic: 0.35,
            grain: 0.06,
            beatImpact: 0.85,
            idleMotion: 0.55,
            safeMask: 0.78
        }
    });

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function deepClone(value) {
        if (Array.isArray(value)) return value.map(deepClone);
        if (!isPlainObject(value)) return value;
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)]));
    }

    function deepMerge(base, override) {
        const output = deepClone(base);
        if (!isPlainObject(override)) return output;
        Object.entries(override).forEach(([key, value]) => {
            output[key] = isPlainObject(output[key]) && isPlainObject(value)
                ? deepMerge(output[key], value)
                : deepClone(value);
        });
        return output;
    }

    function clamp(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, number));
    }

    function clampInteger(value, min, max, fallback) {
        return Math.round(clamp(value, min, max, fallback));
    }

    function getPath(source, path) {
        return String(path || '').split('.').filter(Boolean).reduce((value, key) => value?.[key], source);
    }

    function setPath(target, path, value) {
        const keys = String(path || '').split('.').filter(Boolean);
        let cursor = target;
        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                cursor[key] = value;
            } else {
                cursor[key] = isPlainObject(cursor[key]) ? cursor[key] : {};
                cursor = cursor[key];
            }
        });
        return target;
    }

    function normalizeMode(value, fallback = 'particles', allowInherit = false) {
        if (allowInherit && value === 'inherit') return 'inherit';
        const migrated = LEGACY_MODE_MAP[value] || value;
        const migratedFallback = LEGACY_MODE_MAP[fallback] || fallback;
        if (MODE_IDS.has(migrated)) return migrated;
        if (allowInherit && migratedFallback === 'inherit') return 'inherit';
        return MODE_IDS.has(migratedFallback) ? migratedFallback : 'particles';
    }

    function normalizeDirection(value, fallback = 'mixed') {
        return ['mixed', 'down', 'up', 'right', 'left'].includes(value) ? value : fallback;
    }

    function normalizeConfig(value, legacy = {}) {
        const source = deepMerge(DEFAULT_CONFIG, isPlainObject(value) ? value : {});
        const legacyOpacity = Number(legacy.PARTICLE_OPACITY_MULT);
        const legacySize = Number(legacy.PARTICLE_SIZE_MULT);
        const hasNewOpacity = isPlainObject(value?.common) && value.common.opacity !== undefined;
        const hasNewSize = isPlainObject(value?.common) && value.common.size !== undefined;

        return {
            version: VERSION,
            common: {
                opacity: clamp(hasNewOpacity ? source.common.opacity : legacyOpacity, 0, 3, DEFAULT_CONFIG.common.opacity),
                size: clamp(hasNewSize ? source.common.size : legacySize, 0.25, 4, DEFAULT_CONFIG.common.size),
                speed: clamp(source.common.speed, 0, 3, DEFAULT_CONFIG.common.speed),
                density: clamp(source.common.density, 0.25, 3, DEFAULT_CONFIG.common.density),
                audioResponse: clamp(source.common.audioResponse, 0, 2, DEFAULT_CONFIG.common.audioResponse)
            },
            particles: {
                direction: normalizeDirection(source.particles.direction),
                drift: clamp(source.particles.drift, 0, 3, DEFAULT_CONFIG.particles.drift),
                glow: clamp(source.particles.glow, 0, 3, DEFAULT_CONFIG.particles.glow)
            },
            livingField: {
                flowScale: clamp(source.livingField.flowScale, 0.5, 2, DEFAULT_CONFIG.livingField.flowScale),
                distortion: clamp(source.livingField.distortion, 0, 2, DEFAULT_CONFIG.livingField.distortion),
                filament: clamp(source.livingField.filament, 0, 2, DEFAULT_CONFIG.livingField.filament),
                chromatic: clamp(source.livingField.chromatic, 0, 1.5, DEFAULT_CONFIG.livingField.chromatic),
                grain: clamp(source.livingField.grain, 0, 0.2, DEFAULT_CONFIG.livingField.grain),
                beatImpact: clamp(source.livingField.beatImpact, 0, 2, DEFAULT_CONFIG.livingField.beatImpact),
                idleMotion: clamp(source.livingField.idleMotion, 0, 1.5, DEFAULT_CONFIG.livingField.idleMotion),
                safeMask: clamp(source.livingField.safeMask, 0, 1, DEFAULT_CONFIG.livingField.safeMask)
            }
        };
    }

    function normalizeOverrides(value) {
        if (!isPlainObject(value)) return {};
        const output = {};
        const fields = [
            ...COMMON_FIELDS,
            ...MODE_DEFINITIONS.particles.fields,
            ...MODE_DEFINITIONS['living-field'].fields
        ];

        fields.forEach(field => {
            const raw = getPath(value, field.path);
            if (raw === undefined || raw === null || raw === '') return;
            if (field.type === 'select') {
                const allowed = new Set(field.options.map(option => option[0]));
                if (allowed.has(raw)) setPath(output, field.path, raw);
                return;
            }
            const number = Number(raw);
            if (!Number.isFinite(number)) return;
            const normalized = field.integer
                ? clampInteger(number, field.min, field.max, field.min)
                : clamp(number, field.min, field.max, field.min);
            setPath(output, field.path, normalized);
        });

        return output;
    }

    function resolveConfig(globalConfig, profileOverrides, legacy = {}) {
        return normalizeConfig(deepMerge(normalizeConfig(globalConfig, legacy), normalizeOverrides(profileOverrides)));
    }

    function getFieldsForMode(mode) {
        const definition = MODE_DEFINITIONS[normalizeMode(mode)];
        if (!definition || definition.id === 'off') return [];
        return [
            ...(definition.commonFields || COMMON_FIELDS),
            ...(definition.fields || [])
        ];
    }

    function hexToRgba(hex, alpha) {
        const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || ''));
        if (!match) return `rgba(255,255,255,${alpha})`;
        return `rgba(${parseInt(match[1], 16)},${parseInt(match[2], 16)},${parseInt(match[3], 16)},${alpha})`;
    }

    function createParticleEffect() {
        let particles = [];
        let width = 1;
        let height = 1;
        let lastDirection = '';

        function resetParticle(particle, config, initial = false) {
            const direction = config.particles.direction;
            const selected = direction === 'mixed' ? (Math.random() > 0.5 ? 'down' : 'up') : direction;
            particle.direction = selected;
            particle.x = Math.random() * width;
            particle.y = Math.random() * height;
            if (!initial) {
                if (selected === 'down') particle.y = -height * 0.05;
                if (selected === 'up') particle.y = height * 1.05;
                if (selected === 'right') particle.x = -width * 0.05;
                if (selected === 'left') particle.x = width * 1.05;
            }
            particle.baseX = particle.x;
            particle.baseY = particle.y;
            particle.speed = 0.035 + Math.random() * 0.075;
            particle.size = 0.55 + Math.random() * 1.65;
            particle.phase = Math.random() * Math.PI * 2;
            particle.wave = 0.012 + Math.random() * 0.028;
            particle.alpha = 0.35 + Math.random() * 0.55;
            particle.nebula = Math.random() > 0.8;
        }

        function ensureCount(target, config) {
            while (particles.length < target) {
                const particle = {};
                resetParticle(particle, config, true);
                particles.push(particle);
            }
            if (particles.length > target) particles.length = target;
        }

        return {
            resize(nextWidth, nextHeight) {
                width = Math.max(1, nextWidth);
                height = Math.max(1, nextHeight);
                particles.forEach(particle => resetParticle(particle, DEFAULT_CONFIG, true));
            },
            update(deltaSeconds, env, config) {
                if (lastDirection !== config.particles.direction) {
                    particles.forEach(particle => resetParticle(particle, config, true));
                    lastDirection = config.particles.direction;
                }
                const count = Math.max(12, Math.round(env.particleTarget * config.common.density));
                ensureCount(count, config);
                const audioLift = 1 + (env.audio.bass * 0.28 + env.audio.beat * 0.22) * config.common.audioResponse;
                const travel = Math.min(width, height) * config.common.speed * audioLift;
                const drift = Math.min(width, height) * 0.022 * config.particles.drift;

                particles.forEach(particle => {
                    const distance = particle.speed * travel * deltaSeconds;
                    particle.phase += deltaSeconds * (0.65 + particle.wave * 8) * Math.max(0.1, config.common.speed);
                    const wave = Math.sin(particle.phase) * drift;
                    if (particle.direction === 'down' || particle.direction === 'up') {
                        particle.y += particle.direction === 'down' ? distance : -distance;
                        particle.x = particle.baseX + wave;
                    } else {
                        particle.x += particle.direction === 'right' ? distance : -distance;
                        particle.y = particle.baseY + wave;
                    }
                    if (
                        particle.x < -width * 0.1 || particle.x > width * 1.1 ||
                        particle.y < -height * 0.1 || particle.y > height * 1.1
                    ) resetParticle(particle, config);
                });
            },
            draw(context, env, config) {
                const accent = env.accent;
                const pulse = 1 + env.audio.beat * 0.45 * config.common.audioResponse;
                context.save();
                context.globalCompositeOperation = 'lighter';
                particles.forEach(particle => {
                    const size = particle.size * config.common.size * pulse;
                    const glow = size * (5 + config.particles.glow * (particle.nebula ? 8 : 4));
                    const alpha = Math.min(0.92, particle.alpha * config.common.opacity * 0.34);
                    const gradient = context.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, glow);
                    gradient.addColorStop(0, hexToRgba('#ffffff', alpha));
                    gradient.addColorStop(0.16, hexToRgba(accent, alpha * 0.78));
                    gradient.addColorStop(1, hexToRgba(accent, 0));
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(particle.x, particle.y, glow, 0, Math.PI * 2);
                    context.fill();
                    if (!particle.nebula) {
                        context.fillStyle = hexToRgba('#f7fcff', Math.min(1, alpha * 1.25));
                        context.beginPath();
                        context.arc(particle.x, particle.y, Math.max(0.55, size * 0.42), 0, Math.PI * 2);
                        context.fill();
                    }
                });
                context.restore();
            },
            dispose() {
                particles = [];
                lastDirection = '';
            }
        };
    }

    const EFFECT_FACTORIES = {
        particles: createParticleEffect
    };

    function createManager({ canvas, context, effectFactories = {} }) {
        if (!canvas || !context) throw new Error('BackgroundEffects requires a canvas and 2D context.');
        let activeMode = '';
        let activeEffect = null;
        let lastWidth = 0;
        let lastHeight = 0;

        function disposeActive() {
            activeEffect?.dispose?.();
            activeEffect = null;
            activeMode = '';
        }

        function render(frame = {}) {
            const width = Math.max(1, canvas.width || 1);
            const height = Math.max(1, canvas.height || 1);
            context.clearRect(0, 0, width, height);

            const mode = normalizeMode(frame.mode);
            if (frame.enabled === false || mode === 'off') {
                disposeActive();
                return;
            }

            if (mode !== activeMode) {
                disposeActive();
                activeMode = mode;
                const factory = effectFactories[mode] || EFFECT_FACTORIES[mode];
                activeEffect = factory?.() || null;
                lastWidth = 0;
                lastHeight = 0;
            }
            if (!activeEffect) return;

            if (width !== lastWidth || height !== lastHeight) {
                activeEffect.resize?.(width, height);
                lastWidth = width;
                lastHeight = height;
            }

            const config = normalizeConfig(frame.config);
            const deltaMilliseconds = clamp(frame.deltaTime, 0, 50, 16.7);
            const environment = {
                accent: /^#[0-9a-f]{6}$/i.test(frame.accent || '') ? frame.accent : '#63e6ff',
                particleTarget: Math.max(12, Number(frame.particleTarget) || 56),
                audio: {
                    energy: clamp(frame.audio?.energy, 0, 1, 0),
                    bass: clamp(frame.audio?.bass, 0, 1, 0),
                    mid: clamp(frame.audio?.mid, 0, 1, 0),
                    treble: clamp(frame.audio?.treble, 0, 1, 0),
                    beat: clamp(frame.audio?.beat, 0, 1, 0)
                },
                palette: {
                    bg1: /^#[0-9a-f]{6}$/i.test(frame.palette?.bg1 || '') ? frame.palette.bg1 : '#07121c',
                    bg2: /^#[0-9a-f]{6}$/i.test(frame.palette?.bg2 || '') ? frame.palette.bg2 : '#050508'
                },
                qualityScale: clamp(frame.qualityScale, 0.42, 0.72, 0.58)
            };

            activeEffect.update?.(deltaMilliseconds / 1000, environment, config);
            activeEffect.draw?.(context, environment, config);
        }

        return Object.freeze({
            render,
            dispose: disposeActive,
            getActiveMode: () => activeMode
        });
    }

    global.RockRadarBackgroundEffects = Object.freeze({
        VERSION,
        MODE_OPTIONS,
        MODE_DEFINITIONS,
        COMMON_FIELDS,
        DEFAULT_CONFIG,
        getPath,
        setPath,
        getFieldsForMode,
        normalizeMode,
        normalizeConfig,
        normalizeOverrides,
        resolveConfig,
        createManager
    });
})(typeof window !== 'undefined' ? window : globalThis);
