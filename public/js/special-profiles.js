(function (global) {
    'use strict';

    const PROFILE_VERSION = 1;
    const BackgroundEffects = global.RockRadarBackgroundEffects;
    const PLUGINS = [
        {
            id: 'custom-theme',
            name: '通用主题',
            description: '使用结构化颜色、背景、名称、角色图、雷达和抽卡配置。'
        },
        {
            id: 'silverwolf',
            name: '银狼故障科技',
            description: '银狼 LV.999 使用的紫蓝故障科技界面与抽卡风格。'
        }
    ];

    const OPTIONS = {
        backgroundEffect: [
            ['inherit', '继承全局'],
            ...(BackgroundEffects?.MODE_OPTIONS || [
                ['particles', '粒子流'],
                ['living-field', '深空流体折射场'],
                ['off', '关闭']
            ])
        ],
        nameAnimation: [
            ['default', '默认滑入'],
            ['glitch', '故障闪烁'],
            ['pulse', '能量脉冲']
        ],
        photoTransition: [
            ['default', '默认滑入'],
            ['slide', '侧向滑入'],
            ['zoom', '缩放聚焦'],
            ['glitch', '故障切片']
        ],
        radarTransition: [
            ['default', '默认规则'],
            ['morph', '连续变形'],
            ['center-reveal', '中心展开'],
            ['pulse', '脉冲展开']
        ],
        gachaStyle: [
            ['inherit', '继承默认'],
            ['default', '标准金色'],
            ['silverwolf', '银狼故障科技']
        ]
    };

    const BASE_DEFAULTS = {
        version: PROFILE_VERSION,
        id: '',
        name: '新专场',
        description: '',
        enabled: true,
        pluginId: 'custom-theme',
        theme: {
            color: '#00ffff',
            bg1: '#001a1a',
            bg2: '#000d0d',
            accent: '#7ddfff'
        },
        effects: {
            backgroundEffect: 'inherit',
            backgroundConfig: {},
            nameAnimation: 'default',
            photoTransition: 'default',
            radarTransition: 'default',
            intensity: 1
        },
        transitions: {
            nameDuration: 1200,
            photoDuration: 820,
            radarDuration: 1500,
            gachaDuration: 3000
        },
        gacha: {
            style: 'inherit',
            accent: '#ffd76a'
        },
        assets: {
            overlayImage: '',
            overlayOpacity: 0.18,
            gachaBackgroundName: ''
        }
    };

    const PLUGIN_DEFAULTS = {
        'custom-theme': {},
        silverwolf: {
            name: '银狼 LV.999 专场',
            description: '紫蓝故障科技主题、专属角色区样式与抽卡风格。',
            theme: {
                color: '#7f8fff',
                bg1: '#130c34',
                bg2: '#060816',
                accent: '#59e4ff'
            },
            effects: {
                backgroundEffect: 'inherit',
                nameAnimation: 'glitch',
                photoTransition: 'glitch',
                radarTransition: 'center-reveal',
                intensity: 1
            },
            transitions: {
                nameDuration: 1200,
                photoDuration: 820,
                radarDuration: 1500,
                gachaDuration: 3000
            },
            gacha: {
                style: 'silverwolf',
                accent: '#7d83ff'
            }
        }
    };

    function isPlainObject(value) {
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function deepMerge(base, override) {
        const output = { ...base };
        if (!isPlainObject(override)) return output;
        Object.keys(override).forEach(key => {
            const baseValue = output[key];
            const nextValue = override[key];
            output[key] = isPlainObject(baseValue) && isPlainObject(nextValue)
                ? deepMerge(baseValue, nextValue)
                : nextValue;
        });
        return output;
    }

    function clamp(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.max(min, Math.min(max, number));
    }

    function normalizeHex(value, fallback) {
        const text = String(value || '').trim();
        return /^#[0-9a-f]{6}$/i.test(text) ? text.toLowerCase() : fallback;
    }

    function normalizeText(value, fallback = '') {
        const text = String(value ?? '').trim();
        return text || fallback;
    }

    function normalizeOption(value, options, fallback) {
        const allowed = new Set(options.map(item => item[0]));
        return allowed.has(value) ? value : fallback;
    }

    function normalizeBackgroundEffect(value, fallback) {
        if (value === 'inherit') return 'inherit';
        if (BackgroundEffects) return BackgroundEffects.normalizeMode(value, fallback, true);
        return normalizeOption(value, OPTIONS.backgroundEffect, fallback);
    }

    function slugify(value) {
        const text = String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return text || 'special-profile';
    }

    function createProfileId(name, existingIds = []) {
        const used = new Set(existingIds.map(String));
        const base = slugify(name);
        let id = base;
        let suffix = 2;
        while (used.has(id)) {
            id = `${base}-${suffix}`;
            suffix += 1;
        }
        return id;
    }

    function getPlugin(pluginId) {
        return PLUGINS.find(plugin => plugin.id === pluginId) || PLUGINS[0];
    }

    function normalizeProfile(value, index = 0, existingIds = []) {
        const source = isPlainObject(value) ? value : {};
        const plugin = getPlugin(source.pluginId);
        const pluginDefaults = PLUGIN_DEFAULTS[plugin.id] || {};
        const mergedDefaults = deepMerge(BASE_DEFAULTS, pluginDefaults);
        const merged = deepMerge(mergedDefaults, source);
        const fallbackId = createProfileId(merged.name || `special-profile-${index + 1}`, existingIds);

        return {
            version: PROFILE_VERSION,
            id: normalizeText(source.id, fallbackId),
            name: normalizeText(merged.name, `专场 ${index + 1}`),
            description: String(merged.description || '').trim(),
            enabled: merged.enabled !== false,
            pluginId: plugin.id,
            theme: {
                color: normalizeHex(merged.theme?.color, mergedDefaults.theme.color),
                bg1: normalizeHex(merged.theme?.bg1, mergedDefaults.theme.bg1),
                bg2: normalizeHex(merged.theme?.bg2, mergedDefaults.theme.bg2),
                accent: normalizeHex(merged.theme?.accent, mergedDefaults.theme.accent)
            },
            effects: {
                backgroundEffect: normalizeBackgroundEffect(
                    merged.effects?.backgroundEffect,
                    mergedDefaults.effects.backgroundEffect
                ),
                backgroundConfig: BackgroundEffects?.normalizeOverrides(source.effects?.backgroundConfig) || {},
                nameAnimation: normalizeOption(merged.effects?.nameAnimation, OPTIONS.nameAnimation, mergedDefaults.effects.nameAnimation),
                photoTransition: normalizeOption(merged.effects?.photoTransition, OPTIONS.photoTransition, mergedDefaults.effects.photoTransition),
                radarTransition: normalizeOption(merged.effects?.radarTransition, OPTIONS.radarTransition, mergedDefaults.effects.radarTransition),
                intensity: clamp(merged.effects?.intensity, 0, 2, mergedDefaults.effects.intensity)
            },
            transitions: {
                nameDuration: Math.round(clamp(merged.transitions?.nameDuration, 100, 5000, mergedDefaults.transitions.nameDuration)),
                photoDuration: Math.round(clamp(merged.transitions?.photoDuration, 100, 5000, mergedDefaults.transitions.photoDuration)),
                radarDuration: Math.round(clamp(merged.transitions?.radarDuration, 100, 8000, mergedDefaults.transitions.radarDuration)),
                gachaDuration: Math.round(clamp(merged.transitions?.gachaDuration, 1000, 12000, mergedDefaults.transitions.gachaDuration))
            },
            gacha: {
                style: normalizeOption(merged.gacha?.style, OPTIONS.gachaStyle, mergedDefaults.gacha.style),
                accent: normalizeHex(merged.gacha?.accent, mergedDefaults.gacha.accent)
            },
            assets: {
                overlayImage: String(merged.assets?.overlayImage || '').trim(),
                overlayOpacity: clamp(merged.assets?.overlayOpacity, 0, 1, mergedDefaults.assets.overlayOpacity),
                gachaBackgroundName: String(merged.assets?.gachaBackgroundName || '').trim()
            }
        };
    }

    function normalizeProfiles(value) {
        const profiles = Array.isArray(value) ? value : [];
        const normalized = [];
        const usedIds = [];
        profiles.forEach((profile, index) => {
            const next = normalizeProfile(profile, index, usedIds);
            if (usedIds.includes(next.id)) {
                next.id = createProfileId(next.id, usedIds);
            }
            usedIds.push(next.id);
            normalized.push(next);
        });
        return normalized;
    }

    function createProfile(existingProfiles = [], overrides = {}) {
        const existingIds = normalizeProfiles(existingProfiles).map(profile => profile.id);
        const seed = deepMerge(BASE_DEFAULTS, overrides);
        seed.id = createProfileId(seed.name, existingIds);
        return normalizeProfile(seed, existingProfiles.length, existingIds);
    }

    function cloneProfile(profile, existingProfiles = []) {
        const source = normalizeProfile(profile);
        return createProfile(existingProfiles, {
            ...source,
            id: '',
            name: `${source.name} 副本`
        });
    }

    function getProfileById(profiles, profileId) {
        const id = String(profileId || '').trim();
        if (!id) return null;
        const profile = normalizeProfiles(profiles).find(item => item.id === id);
        return profile && profile.enabled ? profile : null;
    }

    global.RockRadarSpecialProfiles = Object.freeze({
        PROFILE_VERSION,
        PLUGINS,
        OPTIONS,
        BASE_DEFAULTS,
        PLUGIN_DEFAULTS,
        createProfileId,
        createProfile,
        cloneProfile,
        getPlugin,
        getProfileById,
        normalizeProfile,
        normalizeProfiles
    });
})(window);
