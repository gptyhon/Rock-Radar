import { createRuntimeScope } from '../shared/runtimeScope';
import { createRadarDefaults } from './defaults';
import { buildS2IntroGuide } from './themes/s2-intro';

// Preserve the original Canvas drawing, timers, transitions and shared animation state.
/** @param {{backgroundEffect?: {render: Function, renderPortrait?: Function, dispose: Function} | null}} options */
export function startRadar({ backgroundEffect = null } = {}) {
const videoCapture = window.rockRadarVideoCapture;
videoCapture?.installClock();
const scope = createRuntimeScope();
const { listen, requestAnimationFrame, setTimeout, clearTimeout, Image, Audio, fetch } = scope;
let { COLOR_PRESETS, CONFIG, mvplist, IMAGE_META, namelist } = createRadarDefaults(window.RockRadarBackgroundEffects);
const MusicTimeline = window.RockRadarMusicTimeline;

        const BackgroundEffects = window.RockRadarBackgroundEffects;
        const LivingFieldEffect = window.RockRadarLivingFieldEffect;
        const SpecialProfiles = window.RockRadarSpecialProfiles;
        

        // 全局配置参数
        
        const MIN_VERTEX_COUNT = 6;
        const MAX_VERTEX_COUNT = 8;
        const FIXED_COLOR_COUNT = 5;
        const DEFAULT_FIXED_COLOR_PRESETS = COLOR_PRESETS.map(preset => ({ ...preset }));

        
        let expertlist = [];
        let independentBondNames = new Set();
        let SPECIAL_PROFILES = [];
        let specialProfilesConfigured = false;
        let activeSpecialProfile = null;
        let isSpecialPreviewMode = false;
        

        // ["创新性", "旋律", "歌词", "影响力", "主唱", "乐器"]
        // 可选属性: 
        // colorMode: preset / custom；固定配色使用 colorIndex 0-4，自定义使用 customColor
        // duration: 该条目持续显示时间 (ms)，默认由 CONFIG.DEFAULT_DURATION 决定
        

        let bands = [];
        let bestScorePerDim = [];
        let avgScorePerDim = [];
        let totalDuration = 0;
        let timeSegments = [];
        let ANIM_DURATION = 1500;
        const MVP_THEME = {
            color: "#ffd86a",
            bg1: "#2f1d06",
            bg2: "#6d4510"
        };

        function normalizeBandIdentity(value) {
            return String(value || '').trim().replace(/\s+/g, '');
        }

        function isLegacySilverwolfBand(band) {
            const name = normalizeBandIdentity(band?.name);
            const gachaText = String(band?.gachaText || '').trim().toLowerCase();
            return name === '银狼LV.999' || gachaText === 'silver wolf lv.999';
        }

        function normalizeRuntimeSpecialProfiles() {
            if (!SpecialProfiles) {
                SPECIAL_PROFILES = [];
                return;
            }
            if (!specialProfilesConfigured) {
                const legacyBand = (namelist || []).find(isLegacySilverwolfBand);
                if (legacyBand) {
                    SPECIAL_PROFILES = [SpecialProfiles.normalizeProfile({
                        id: 'silverwolf-lv999',
                        name: '银狼 LV.999 专场',
                        pluginId: 'silverwolf'
                    })];
                    legacyBand.specialProfileId = 'silverwolf-lv999';
                }
            }
            SPECIAL_PROFILES = SpecialProfiles.normalizeProfiles(SPECIAL_PROFILES);
            const validIds = new Set(SPECIAL_PROFILES.map(profile => profile.id));
            (namelist || []).forEach(band => {
                const id = String(band.specialProfileId || '').trim();
                if (id && validIds.has(id)) band.specialProfileId = id;
                else delete band.specialProfileId;
            });
        }

        function getBandSpecialProfile(band) {
            return SpecialProfiles?.getProfileById(SPECIAL_PROFILES, band?.specialProfileId) || null;
        }

        function resolveSpecialAssetUrl(value) {
            const path = String(value || '').trim();
            if (!path) return '';
            if (/^(?:https?:|data:|blob:|\/)/i.test(path)) return path;
            return `/assets/images/${path}`;
        }

        function getSpecialPhotoTransitionCss(profile = activeSpecialProfile) {
            const duration = Math.max(100, Number(profile?.transitions?.photoDuration) || 820);
            return `opacity ${Math.min(duration, 900)}ms cubic-bezier(0.24, 1, 0.36, 1), transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1), filter ${Math.min(duration, 700)}ms ease`;
        }

        function getSpecialPhotoStartTransform(profile = activeSpecialProfile) {
            const mode = profile?.effects?.photoTransition || 'default';
            if (mode === 'zoom') return 'translate3d(0, 0, 0) scale(1.16)';
            if (mode === 'glitch') return 'translate3d(34px, 0, 0) scale(0.96)';
            return 'translate3d(72px, 0, 0) scale(0.94)';
        }

        function getSpecialNameAnimation(profile = activeSpecialProfile) {
            const duration = Math.max(100, Number(profile?.transitions?.nameDuration) || 1200);
            const mode = profile?.effects?.nameAnimation || 'default';
            const keyframe = mode === 'glitch'
                ? 'specialNameGlitch'
                : mode === 'pulse'
                    ? 'specialNamePulse'
                    : 'nameEntrance';
            return `${keyframe} ${duration}ms cubic-bezier(0.23, 1, 0.32, 1) forwards`;
        }

        function applySpecialProfile(profile) {
            activeSpecialProfile = profile || null;
            const body = document.body;
            const overlay = document.getElementById('specialSceneOverlay');
            const effects = profile?.effects || {};
            const pluginId = profile?.pluginId || '';
            const classMap = {
                'band-theme-silverwolf': pluginId === 'silverwolf',
                'special-profile-active': !!profile,
                'special-name-glitch': effects.nameAnimation === 'glitch',
                'special-name-pulse': effects.nameAnimation === 'pulse',
                'special-photo-zoom': effects.photoTransition === 'zoom',
                'special-photo-glitch': effects.photoTransition === 'glitch',
                'special-radar-pulse': effects.radarTransition === 'pulse'
            };
            Object.entries(classMap).forEach(([className, enabled]) => body.classList.toggle(className, enabled));

            const root = document.documentElement;
            root.style.setProperty('--special-intensity', String(profile?.effects?.intensity ?? 1));
            root.style.setProperty('--special-accent', profile?.theme?.accent || '#7ddfff');
            root.style.setProperty('--special-overlay-opacity', String(profile?.assets?.overlayOpacity ?? 0));

            if (overlay) {
                const imageUrl = resolveSpecialAssetUrl(profile?.assets?.overlayImage);
                overlay.classList.toggle('has-image', !!imageUrl);
                overlay.style.backgroundImage = imageUrl ? `url("${imageUrl.replace(/"/g, '\\"')}")` : '';
            }
        }

        function getBandDisplayName(band) {
            if (!band) return '';
            if (band.phaseKeepIdentity && band.phaseParentName) {
                return String(band.phaseParentName || '').trim();
            }
            return String(band.name || '').trim();
        }

        function normalizePhaseRatio(value, fallback = 0.5) {
            const num = Number(value);
            if (!Number.isFinite(num)) return fallback;
            return Math.max(0.1, Math.min(0.9, num));
        }

        function normalizeHexColor(value, fallback) {
            const color = String(value || '').trim();
            return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
        }

        function normalizeColorObject(value, fallback = DEFAULT_FIXED_COLOR_PRESETS[0]) {
            const source = value && typeof value === 'object' ? value : {};
            return {
                color: normalizeHexColor(source.color, fallback.color),
                bg1: normalizeHexColor(source.bg1, fallback.bg1),
                bg2: normalizeHexColor(source.bg2, fallback.bg2)
            };
        }

        function cloneColorObject(value, fallback = DEFAULT_FIXED_COLOR_PRESETS[0]) {
            return { ...normalizeColorObject(value, fallback) };
        }

        function normalizeRuntimeColorTarget(target, defaultIndex, legacyPresets, inheritedTarget = null) {
            if (!target || typeof target !== 'object') return;
            const legacyIndex = Number(target.colorIndex);
            const hasLegacyIndex = Number.isInteger(legacyIndex);

            if (target.colorMode === 'custom') {
                const fallback = hasLegacyIndex && legacyPresets[legacyIndex]
                    ? legacyPresets[legacyIndex]
                    : inheritedTarget?.customColor || legacyPresets[defaultIndex] || DEFAULT_FIXED_COLOR_PRESETS[defaultIndex];
                target.customColor = cloneColorObject(target.customColor, normalizeColorObject(fallback));
                target.colorIndex = null;
                return;
            }

            if (hasLegacyIndex && legacyIndex >= FIXED_COLOR_COUNT && legacyPresets[legacyIndex]) {
                target.colorMode = 'custom';
                target.colorIndex = null;
                target.customColor = cloneColorObject(legacyPresets[legacyIndex]);
                return;
            }

            if (hasLegacyIndex && legacyIndex >= 0 && legacyIndex < FIXED_COLOR_COUNT) {
                target.colorMode = 'preset';
                target.colorIndex = legacyIndex;
                return;
            }

            if (inheritedTarget) {
                target.colorMode = inheritedTarget.colorMode === 'custom' ? 'custom' : 'preset';
                if (target.colorMode === 'custom') {
                    target.colorIndex = null;
                    target.customColor = cloneColorObject(inheritedTarget.customColor);
                } else {
                    target.colorIndex = Math.max(0, Math.min(FIXED_COLOR_COUNT - 1, Number(inheritedTarget.colorIndex) || 0));
                }
                return;
            }

            target.colorMode = 'preset';
            target.colorIndex = Math.max(0, Math.min(FIXED_COLOR_COUNT - 1, defaultIndex));
        }

        function normalizeRuntimeColorSystem() {
            const legacyPresets = Array.isArray(COLOR_PRESETS) ? COLOR_PRESETS : [];
            const fixedPresets = Array.from({ length: FIXED_COLOR_COUNT }, (_, index) => {
                const fallback = DEFAULT_FIXED_COLOR_PRESETS[index];
                return {
                    name: String(legacyPresets[index]?.name || fallback.name).trim() || fallback.name,
                    ...normalizeColorObject(legacyPresets[index], fallback)
                };
            });

            namelist = Array.isArray(namelist) ? namelist : [];
            namelist.forEach((band, index) => {
                normalizeRuntimeColorTarget(band, index % FIXED_COLOR_COUNT, legacyPresets);
                if (band?.midPhase && typeof band.midPhase === 'object') {
                    normalizeRuntimeColorTarget(band.midPhase, band.colorIndex ?? index % FIXED_COLOR_COUNT, legacyPresets, band);
                }
            });
            COLOR_PRESETS = fixedPresets;
        }

        function buildMidPhaseBand(baseBand, vc) {
            const phase = baseBand?.midPhase;
            if (!phase || !phase.enabled) return null;

            const phasePoints = ensureLength(Array.isArray(phase.points) ? phase.points : [], vc, i => {
                const fallback = Array.isArray(baseBand.points) ? baseBand.points[i] : 0;
                return Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
            }).map((value, i) => {
                const n = Number(value);
                if (Number.isFinite(n)) return n;
                const fallback = Array.isArray(baseBand.points) ? Number(baseBand.points[i]) : 0;
                return Number.isFinite(fallback) ? fallback : 0;
            });

            return {
                ...baseBand,
                points: phasePoints,
                colorMode: phase.colorMode,
                colorIndex: phase.colorMode === 'custom' ? null : phase.colorIndex,
                customColor: phase.colorMode === 'custom' ? cloneColorObject(phase.customColor) : undefined,
                photoName: String(phase.photoName || '').trim() || undefined,
                gacha: false,
                phaseRole: 'mid',
                phaseParentName: baseBand.name,
                phaseKeepIdentity: true
            };
        }

        function resolveColorPresetByIndex(index, fallback = null) {
            const idx = Number(index);
            if (Number.isInteger(idx) && idx >= 0 && idx < COLOR_PRESETS.length && COLOR_PRESETS[idx]) {
                return COLOR_PRESETS[idx];
            }
            return fallback;
        }

        function resolveBandColor(band, fallback = DEFAULT_FIXED_COLOR_PRESETS[0]) {
            if (band?.colorMode === 'custom') {
                return normalizeColorObject(band.customColor, fallback);
            }
            return normalizeColorObject(resolveColorPresetByIndex(band?.colorIndex, fallback), fallback);
        }

        function normalizeScore(value) {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        }

        function normalizeNameList(value) {
            const items = Array.isArray(value) ? value : String(value || '').split(',');
            return [...new Set(items.map(item => String(item || '').trim()).filter(Boolean))];
        }

        function getNormalizedVertexCount(value) {
            const count = parseInt(value, 10);
            if (!Number.isFinite(count)) return MIN_VERTEX_COUNT;
            return Math.max(MIN_VERTEX_COUNT, Math.min(MAX_VERTEX_COUNT, count));
        }

        function ensureLength(arr, len, factory) {
            const out = Array.isArray(arr) ? arr.slice(0, len) : [];
            while (out.length < len) out.push(factory(out.length));
            return out;
        }

        function normalizeConfigAndData() {
            normalizeRuntimeSpecialProfiles();
            normalizeRuntimeColorSystem();
            expertlist = normalizeNameList(expertlist);
            CONFIG.VERTEX_COUNT = getNormalizedVertexCount(CONFIG.VERTEX_COUNT);
            const vc = CONFIG.VERTEX_COUNT;

            CONFIG.DIM_NAMES = ensureLength(CONFIG.DIM_NAMES, vc, i => `维度${i + 1}`)
                .map((name, i) => {
                    const text = String(name ?? '').trim();
                    return text || `维度${i + 1}`;
                });

            CONFIG.BASE_MAX_SCORES = ensureLength(CONFIG.BASE_MAX_SCORES, vc, () => 10)
                .map(v => {
                    const n = Number(v);
                    return Number.isFinite(n) ? n : 10;
                });

            CONFIG.MIN_SCORES = ensureLength(CONFIG.MIN_SCORES, vc, () => 0)
                .map(v => {
                    const n = Number(v);
                    return Number.isFinite(n) ? n : 0;
                });

            CONFIG.USE_PERCENTAGE = ensureLength(CONFIG.USE_PERCENTAGE, vc, () => false)
                .map(v => !!v);
            CONFIG.REAL_PERCENTAGE = ensureLength(CONFIG.REAL_PERCENTAGE, vc, () => false)
                .map(v => !!v);
            for (let i = 0; i < vc; i++) {
                if (CONFIG.REAL_PERCENTAGE[i] && CONFIG.USE_PERCENTAGE[i]) {
                    CONFIG.USE_PERCENTAGE[i] = false;
                }
            }

            {
                const legacyLeftTop = String(CONFIG.BRAND_LEFT_TOP_TEXT || '').trim();
                const topFallback = (legacyLeftTop && legacyLeftTop !== 'IPC LOCK')
                    ? legacyLeftTop
                    : 'HONKAI: STAR RAIL V4.0';
                CONFIG.BRAND_TOP_RIGHT_TEXT = String(CONFIG.BRAND_TOP_RIGHT_TEXT || topFallback).trim() || 'HONKAI: STAR RAIL V4.0';
            }
            CONFIG.BRAND_BOTTOM_LEFT_TEXT = String(CONFIG.BRAND_BOTTOM_LEFT_TEXT || CONFIG.BRAND_RIGHT_BOTTOM_TEXT || 'CURRENCY WAR / IPC').trim() || 'CURRENCY WAR / IPC';
            CONFIG.BRAND_WATERMARK_CN = String(CONFIG.BRAND_WATERMARK_CN || '货币战争').trim() || '货币战争';
            CONFIG.BRAND_WATERMARK_EN = String(CONFIG.BRAND_WATERMARK_EN || 'CURRENCY WAR').trim() || 'CURRENCY WAR';
            CONFIG.INTRO_TITLE_MAIN = String(CONFIG.INTRO_TITLE_MAIN || '货币战争雷达图 V4.0').trim() || '货币战争雷达图 V4.0';
            CONFIG.INTRO_TITLE_SUB = String(CONFIG.INTRO_TITLE_SUB || 'Currency War Radar System').trim() || 'Currency War Radar System';
            CONFIG.BG_EFFECT_MODE = BackgroundEffects.normalizeMode(CONFIG.BG_EFFECT_MODE);
            CONFIG.BG_EFFECT_CONFIG = BackgroundEffects.normalizeConfig(CONFIG.BG_EFFECT_CONFIG, CONFIG);
            CONFIG.MUSIC_DELAY_SECONDS = MusicTimeline.normalizeDelaySeconds(CONFIG.MUSIC_DELAY_SECONDS);
            CONFIG.PARTICLE_OPACITY_MULT = CONFIG.BG_EFFECT_CONFIG.common.opacity;
            CONFIG.PARTICLE_SIZE_MULT = CONFIG.BG_EFFECT_CONFIG.common.size;
            if (!['tech', 'pulse', 'orbit', 'off'].includes(CONFIG.RADAR_AUDIO_FX_MODE)) CONFIG.RADAR_AUDIO_FX_MODE = 'tech';
            namelist = Array.isArray(namelist) ? namelist : [];
            namelist = namelist.map(item => {
                const rawPoints = Array.isArray(item.points) ? item.points : [];
                const points = ensureLength(rawPoints, vc, i => CONFIG.MIN_SCORES[i] ?? 0)
                    .map((value, i) => {
                        const n = Number(value);
                        if (Number.isFinite(n)) return n;
                        const minScore = Number(CONFIG.MIN_SCORES[i] ?? 0);
                        return Number.isFinite(minScore) ? minScore : 0;
                    });
                const midPhase = item?.midPhase && typeof item.midPhase === 'object'
                    ? {
                        ...item.midPhase,
                        enabled: !!item.midPhase.enabled,
                        triggerRatio: normalizePhaseRatio(item.midPhase.triggerRatio, 0.5),
                        photoName: String(item.midPhase.photoName || '').trim(),
                        colorMode: item.midPhase.colorMode,
                        colorIndex: item.midPhase.colorMode === 'custom' ? null : Number(item.midPhase.colorIndex),
                        customColor: item.midPhase.colorMode === 'custom'
                            ? cloneColorObject(item.midPhase.customColor)
                            : undefined,
                        points: ensureLength(Array.isArray(item.midPhase.points) ? item.midPhase.points : [], vc, i => points[i] ?? 0)
                            .map((value, i) => {
                                const n = Number(value);
                                if (Number.isFinite(n)) return n;
                                return points[i] ?? 0;
                            })
                    }
                    : undefined;
                return { ...item, points, midPhase };
            });
        }

        // 维度映射规则：
        // minScore -> 雷达中心(0)
        // maxScore -> 雷达外圈(1)
        // > maxScore 允许继续外扩（>1），< minScore 则压到中心（0）
        function getRadarRatio(value, index) {
            const minScore = Number(CONFIG.MIN_SCORES[index] ?? 0);
            const maxScore = Number(CONFIG.BASE_MAX_SCORES[index] ?? 10);
            const score = normalizeScore(value);
            if (!Number.isFinite(minScore) || !Number.isFinite(maxScore) || maxScore <= minScore) {
                return score >= maxScore ? 1 : 0;
            }
            return Math.max(0, (score - minScore) / (maxScore - minScore));
        }

        function rebuildDerivedData() {
            normalizeConfigAndData();
            applyBrandTexts();
            const derivedBands = [];
            namelist.forEach((b, bandIndex) => {
                const baseDuration = b.duration || CONFIG.DEFAULT_DURATION;
                const basePreset = resolveBandColor(b, COLOR_PRESETS[bandIndex % FIXED_COLOR_COUNT]);
                const basePhaseRatio = b?.midPhase?.enabled ? normalizePhaseRatio(b.midPhase.triggerRatio, 0.5) : null;
                const midBandRaw = buildMidPhaseBand(b, CONFIG.VERTEX_COUNT);
                const basePoints = Array.isArray(b.points) ? b.points : [];
                const basePrecisions = basePoints.map(val => {
                    const s = val.toString();
                    const dotIdx = s.indexOf('.');
                    return dotIdx === -1 ? 0 : s.length - dotIdx - 1;
                });

                const baseBand = {
                    ...b,
                    precisions: basePrecisions,
                    isGoat: mvplist.includes(b.name),
                    duration: midBandRaw ? Math.max(1, Math.round(baseDuration * basePhaseRatio)) : baseDuration,
                    phaseRole: 'base',
                    phaseParentName: b.name,
                    phaseKeepIdentity: false,
                    ...basePreset
                };
                derivedBands.push(baseBand);

                if (midBandRaw) {
                    const midPreset = resolveBandColor(midBandRaw, basePreset);
                    const midPrecisions = midBandRaw.points.map(val => {
                        const s = val.toString();
                        const dotIdx = s.indexOf('.');
                        return dotIdx === -1 ? 0 : s.length - dotIdx - 1;
                    });
                    derivedBands.push({
                        ...midBandRaw,
                        precisions: midPrecisions,
                        isGoat: mvplist.includes(midBandRaw.name),
                        duration: Math.max(1, baseDuration - baseBand.duration),
                        ...midPreset
                    });
                }
            });
            bands = derivedBands;
            bestScorePerDim = Array.from({ length: CONFIG.VERTEX_COUNT }, (_, i) => {
                const values = bands.map(b => normalizeScore(b.points[i], i));
                return values.length ? Math.max(...values) : 0;
            });
            avgScorePerDim = Array.from({ length: CONFIG.VERTEX_COUNT }, (_, i) => {
                const values = bands.map(b => normalizeScore(b.points[i], i));
                return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
            });
            timeSegments = [];
            let accumulatedTime = 0;
            bands.forEach((b, i) => {
                const segmentDuration = getBandTimelineDuration(b, i);
                timeSegments.push({ start: accumulatedTime, end: accumulatedTime + segmentDuration, bandIndex: i });
                accumulatedTime += segmentDuration;
            });
            totalDuration = accumulatedTime;
            ANIM_DURATION = CONFIG.ANIM_DURATION;
        }

        function applySpecialPreviewPayload() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('specialPreview') !== '1' || !SpecialProfiles) return false;
            try {
                const raw = sessionStorage.getItem('rock-radar-special-preview');
                const payload = raw ? JSON.parse(raw) : null;
                const age = Date.now() - Number(payload?.createdAt || 0);
                if (!payload?.profile || !payload?.role || age < 0 || age > 60 * 60 * 1000) return false;
                const profile = SpecialProfiles.normalizeProfile(payload.profile);
                const requestedId = String(params.get('profileId') || '').trim();
                if (requestedId && requestedId !== profile.id) return false;
                SPECIAL_PROFILES = [profile];
                specialProfilesConfigured = true;
                namelist = [{
                    ...payload.role,
                    specialProfileId: profile.id,
                    points: Array.isArray(payload.role.points) ? [...payload.role.points] : []
                }];
                isSpecialPreviewMode = true;
                return true;
            } catch (error) {
                console.warn('专场预览数据无效', error);
                return false;
            }
        }

        // 尝试从 API 加载数据，失败则使用内置默认值
        async function loadData() {
            try {
                const res = await fetch('/api/data');
                if (res.ok) {
                    const data = await res.json();
                    if (data.CONFIG) Object.assign(CONFIG, data.CONFIG);
                    if (data.COLOR_PRESETS) COLOR_PRESETS = data.COLOR_PRESETS;
                    if (data.SPECIAL_PROFILES !== undefined) {
                        SPECIAL_PROFILES = data.SPECIAL_PROFILES;
                        specialProfilesConfigured = true;
                    }
                    if (data.mvplist) mvplist = data.mvplist;
                    if (data.expertlist !== undefined) expertlist = normalizeNameList(data.expertlist);
                    if (data.IMAGE_META) IMAGE_META = data.IMAGE_META;
                    if (data.namelist) namelist = data.namelist;
                    if (Array.isArray(data.S2_CATALOG?.traits)) {
                        independentBondNames = new Set(data.S2_CATALOG.traits
                            .filter(trait => trait?.category === '独立羁绊')
                            .map(trait => trait.name));
                    }
                }
            } catch (e) {
                console.log('未连接到服务器，使用内置数据');
            }
            applySpecialPreviewPayload();
            rebuildDerivedData();
            syncPresentationLayout();
            syncRadarCanvasResolution();
            resizePhotoFxCanvas(true);
            applyMusicPlaylist();
            applyMusicVolume();
        }

        // 首次构建（内置默认值）
        rebuildDerivedData();

        /**
         * 格式化雷达图显示的数值标题
         * @param {number} value - 原始雷达数值
         * @param {number} index - 当前维度的索引（0-5）
         * @returns {string|number} - 将要在图表上显示的文字
         */
        /**
         * 格式化雷达图显示的数值标题
         * @param {number} value - 原始雷达数值
         * @param {number} index - 当前维度的索引（0-5）
         * @returns {string|number} - 将要在图表上显示的文字
         */
        function formatRadarValue(value, index) {
            // 获取当前乐队当前维度预期的精度
            let precision = 0;
            if (currentIndex !== -1 && bands[currentIndex]) {
                precision = bands[currentIndex].precisions[index];
            }

            const normalizedValue = normalizeScore(value);

            if (CONFIG.REAL_PERCENTAGE && CONFIG.REAL_PERCENTAGE[index]) {
                return parseFloat(normalizedValue.toFixed(precision)).toString() + "%";
            }

            // 如果该维度需要显示为百分比
            if (CONFIG.USE_PERCENTAGE && CONFIG.USE_PERCENTAGE[index]) {
                // 百分比按当前维度量程换算：
                // min -> 0%，max -> 100%
                // 例如量程 0~100，填 70 显示 70%
                let pctValue = getRadarRatio(normalizedValue, index) * 100;
                return parseFloat(pctValue.toFixed(precision)).toString() + "%";
            }

            let displayValue = parseFloat(normalizedValue.toFixed(precision)).toString();

            // 如果精度要求为0 (整数)，则显式进行四舍五入
            if (precision === 0) {
                let intVal = Math.round(normalizedValue);
                return intVal.toString();
            }

            return displayValue;
        }

        let currentIndex = -1;
        let isGlobalTimelineDragging = false;
        let globalCurrentTime = 0; // ms
        let isParticlesEnabled = true;
        let isPaused = true; 
        let isStarted = false; // 是否已经按过空格开始
        let lastTimestamp = 0;

        let currentThemeColor = "#00ffff";
        let targetThemeColor = "#00ffff";
        let currentBgColor1 = "#0f1015";
        let currentBgColor2 = "#1a1a2e";
        let currentScores = [0, 0, 0, 0, 0, 0];
        let startScores = [0, 0, 0, 0, 0, 0];
        let targetScores = [0, 0, 0, 0, 0, 0];
        let animProgress = 1;
        let animStartTime = 0;
        let radarLabelRevealTimer = null;
        let radarLabelRevealActive = false;
        let radarLabelRevealHidden = false;
        let radarLabelUseTargetValues = false;
        let radarLabelRevealStartTime = 0;
        let startTime = Date.now();
        let gachaPlaying = false; // 抽卡动画正在播放
        let radarVisible = false;
        let radarRevealTimer = null;

        const radarCanvas = document.getElementById("radarCanvas");
        const ctx = radarCanvas.getContext("2d");
        const RADAR_LOGICAL_SIZE = 1600;
        const PRESENTATION_DESIGN_WIDTH = 1920;
        const PRESENTATION_DESIGN_HEIGHT = 1080;
        const pCanvas = document.getElementById("particles-canvas");
        const pCtx = pCanvas.getContext("2d");
        const introOverlay = document.getElementById("introOverlay");
        const introBackground = introOverlay?.querySelector(".s2-opening-background");
        const introBackgroundCtx = introBackground?.getContext("2d");
        const livingFieldCanvas = document.getElementById("living-field-canvas");
        const livingFieldFallback = document.getElementById("living-field-fallback");
        const backgroundEffectManager = BackgroundEffects.createManager({
            canvas: pCanvas,
            context: pCtx,
            effectFactories: {
                'living-field': () => LivingFieldEffect.createEffect({
                    canvas: livingFieldCanvas,
                    fallbackElement: livingFieldFallback
                })
            }
        });
        const outroOverlay = document.getElementById("outroOverlay");
        const outroVideo = document.getElementById("outroVideo");
        const outroThanks = document.getElementById("outroThanks");
        const photoFxCanvas = document.getElementById("photoFxCanvas");
        const photoFxCtx = photoFxCanvas ? photoFxCanvas.getContext("2d") : null;
        const brandDiamondCanvas = document.getElementById("brandDiamondCanvas");
        const brandDiamondCtx = brandDiamondCanvas ? brandDiamondCanvas.getContext("2d") : null;
        const globalBar = document.getElementById("globalBar");
        const globalTimeline = document.getElementById("globalTimeline");
        const timelineTooltip = document.getElementById("timelineTooltip");
        let perfFrameEma = 16.7;
        let perfAdaptiveQuality = 1;
        let pCanvasScaleApplied = 1;
        let photoFxScaleApplied = 1;
        let photoFxBeatCooldown = 0;
        let photoFxTicker = 0;
        let photoFxCornerPulse = 0;
        let photoFxW = 0;
        let photoFxH = 0;
        let introSequenceTimers = [];
        let namedImageCache = new Map();
        let uiTransitionSession = 0;
        let uiTransitionTimerIds = [];
        let radarVertexCacheKey = -1;
        let radarVertexCache = [];
        let pageVisualsSuspended = !!document.hidden;
        let timelineRectCache = null;
        let timelineTooltipBandEl = null;
        let timelineTooltipTimeEl = null;
        let lastTimelineTooltipBand = '';
        let lastTimelineTooltipTime = '';
        let namedImagePreloadInflight = new Set();
        let namedImageMissingCache = new Set();
        let brandDiamondW = 0;
        let brandDiamondH = 0;
        const RADAR_REVEAL_DELAY = 1180;
        const RADAR_FIRST_REVEAL_DELAY = 520;
        const RADAR_POST_GACHA_REVEAL_DELAY = 200;
        const RADAR_POST_GACHA_REVEAL_FALLBACK = 340;
        const RADAR_LABEL_SLAM_DURATION = 420;
        const RADAR_LABEL_SLAM_STAGGER = 0;
        const RADAR_LABEL_SLAM_OFFSET = 0;
        const RADAR_BEST_FLASH_DURATION = 520;
        let audioVizContext = null;
        let audioVizAnalyser = null;
        let audioVizSource = null;
        let audioVizFreq = null;
        let audioVizEnergy = 0;
        let audioVizBass = 0;
        let audioVizMid = 0;
        let audioVizTreble = 0;
        let audioVizBeat = 0;
        let audioVizPrevBass = 0;
        let musicPlaylist = ["/assets/audio/music.mp3"];
        let musicTrackDurations = [];
        let currentMusicTrackIndex = 0;
        let musicPlaybackCycles = 0;
        let musicEndedHandlerBound = false;
        let musicSessionActive = false;
        let musicIntroActive = false;
        let musicPresentationStartedAt = 0;
        let musicDelayStarted = false;
        let outroActive = false;
        let outroFinished = false;
        let outroVideoLoadToken = 0;
        let outroRevealTimer = null;
        let outroStartedAt = 0;
        let outroSceneSuspended = false;
        let gachaAnimationSession = 0;
        let gachaTimerIds = [];

        function getRadarBackingScale() {
            return Math.max(1, radarCanvas.width / RADAR_LOGICAL_SIZE);
        }

        function getRadarLogicalMetrics() {
            const scale = getRadarBackingScale();
            return {
                scale,
                width: radarCanvas.width / scale,
                height: radarCanvas.height / scale
            };
        }

        function syncRadarCanvasResolution() {
            const rect = radarCanvas.getBoundingClientRect();
            const deviceScale = clampNumber(window.devicePixelRatio || 1, 1, 2);
            const renderedSize = Math.max(rect.width, rect.height, RADAR_LOGICAL_SIZE);
            const backingScale = clampNumber(
                renderedSize * deviceScale / RADAR_LOGICAL_SIZE,
                1,
                3
            );
            const targetSize = Math.ceil((RADAR_LOGICAL_SIZE * backingScale) / 64) * 64;
            if (radarCanvas.width === targetSize && radarCanvas.height === targetSize) return;
            radarCanvas.width = targetSize;
            radarCanvas.height = targetSize;
        }

        function clearRadarCanvas() {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        }

        if (outroVideo) {
            listen(outroVideo, "ended", () => {
                if (!outroActive) return;
                showOutroThanksOnly();
            });
        }

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function easeOutBack(t) {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }

        function clampNumber(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        function getPresentationScale() {
            const configuredScale = Number(CONFIG.PRESENTATION_SCALE);
            return Number.isFinite(configuredScale)
                ? clampNumber(configuredScale, 0.8, 1.6)
                : 1.3;
        }

        function getViewportFitScale() {
            const viewportWidth = Math.max(1, window.innerWidth || PRESENTATION_DESIGN_WIDTH);
            const viewportHeight = Math.max(1, window.innerHeight || PRESENTATION_DESIGN_HEIGHT);
            return Math.min(
                viewportWidth / PRESENTATION_DESIGN_WIDTH,
                viewportHeight / PRESENTATION_DESIGN_HEIGHT
            );
        }

        function syncPresentationLayout() {
            const rootStyle = document.documentElement.style;
            const presentationScale = getPresentationScale();
            rootStyle.setProperty('--viewport-scale', getViewportFitScale().toFixed(6));
            rootStyle.setProperty('--presentation-scale', presentationScale.toFixed(3));
            rootStyle.setProperty('--presentation-layout-width', `${1700 / presentationScale}px`);
            rootStyle.setProperty('--presentation-layout-height', `${1015 / presentationScale}px`);

            const responsivePhotoContainer = document.getElementById('photoContainer');
            if (responsivePhotoContainer) {
                responsivePhotoContainer.style.height = `${380 * CONFIG.IMAGE_SCALE}px`;
            }
            invalidateTimelineRect();
        }

        function getRadarVertices(count = CONFIG.VERTEX_COUNT) {
            const normalizedCount = getNormalizedVertexCount(count);
            if (radarVertexCacheKey === normalizedCount && radarVertexCache.length) {
                return radarVertexCache;
            }
            radarVertexCacheKey = normalizedCount;
            radarVertexCache = Array.from({ length: normalizedCount }, (_, i) => {
                const angle = (i * (360 / normalizedCount) - 90) * Math.PI / 180;
                return {
                    angle,
                    cos: Math.cos(angle),
                    sin: Math.sin(angle)
                };
            });
            return radarVertexCache;
        }

        function invalidateTimelineRect() {
            timelineRectCache = null;
        }

        function refreshTimelineRect() {
            if (!globalTimeline) return null;
            timelineRectCache = globalTimeline.getBoundingClientRect();
            return timelineRectCache;
        }

        function getTimelineRect() {
            return timelineRectCache || refreshTimelineRect();
        }

        function ensureTimelineTooltipStructure() {
            if (!timelineTooltip) return;
            if (timelineTooltipBandEl && timelineTooltipTimeEl) return;

            timelineTooltip.textContent = '';

            timelineTooltipBandEl = document.createElement('div');
            timelineTooltipBandEl.className = 'timeline-tooltip-band';

            timelineTooltipTimeEl = document.createElement('div');
            timelineTooltipTimeEl.className = 'timeline-tooltip-time';

            timelineTooltip.appendChild(timelineTooltipBandEl);
            timelineTooltip.appendChild(timelineTooltipTimeEl);
        }

        function setTimelineTooltipContent(bandName, timeText) {
            ensureTimelineTooltipStructure();
            if (!timelineTooltipBandEl || !timelineTooltipTimeEl) return;

            const nextBand = bandName || '';
            const nextTime = timeText || '00:00';

            if (nextBand !== lastTimelineTooltipBand) {
                timelineTooltipBandEl.textContent = nextBand;
                lastTimelineTooltipBand = nextBand;
            }
            if (nextTime !== lastTimelineTooltipTime) {
                timelineTooltipTimeEl.textContent = nextTime;
                lastTimelineTooltipTime = nextTime;
            }
        }

        function hideRadarBackgroundCleaner() {
            const cleaner = document.getElementById('radarBgCleaner');
            if (!cleaner) return;
            cleaner.style.opacity = '0';
            cleaner.style.removeProperty('clip-path');
        }

        function syncRadarBackgroundCleaner(centerX, centerY, radius, vertices) {
            const cleaner = document.getElementById('radarBgCleaner');
            if (!cleaner || !Array.isArray(vertices) || !vertices.length) return;

            const rect = radarCanvas.getBoundingClientRect();
            const logicalMetrics = getRadarLogicalMetrics();
            const scaleX = rect.width / Math.max(1, logicalMetrics.width);
            const scaleY = rect.height / Math.max(1, logicalMetrics.height);
            const points = vertices.map(vertex => {
                const x = rect.left + (centerX + radius * vertex.cos) * scaleX;
                const y = rect.top + (centerY + radius * vertex.sin) * scaleY;
                return `${x.toFixed(2)}px ${y.toFixed(2)}px`;
            }).join(', ');
            cleaner.style.clipPath = `polygon(${points})`;
            cleaner.style.opacity = '1';
        }

        function prewarmNamedImage(baseNames) {
            const bases = Array.isArray(baseNames) ? baseNames : [baseNames];
            const pendingBases = bases
                .map(base => String(base || '').trim())
                .filter(Boolean)
                .filter(base => !namedImageCache.has(base) && !namedImageMissingCache.has(base) && !namedImagePreloadInflight.has(base));
            if (!pendingBases.length) return;

            pendingBases.forEach(base => {
                namedImagePreloadInflight.add(base);
                loadNamedImage(base, () => {
                    namedImagePreloadInflight.delete(base);
                }, () => {
                    namedImagePreloadInflight.delete(base);
                });
            });
        }

        function prewarmBandAssets(index) {
            if (!Array.isArray(bands) || !bands.length) return;
            const band = bands[index];
            if (!band) return;

            const displayName = getBandDisplayName(band);
            const preloadBases = [displayName || band.name];
            if (band.photoName) preloadBases.push(band.photoName);
            parseBondTags(band.desc || '').forEach(tag => preloadBases.push(`faction_${tag}`));
            if (mvplist.includes(displayName)) preloadBases.push(`${displayName}1`);
            if (shouldPlayGachaForBand(band, index, false)) {
                preloadBases.push(`best_${displayName || band.name}`);
            }

            prewarmNamedImage(preloadBases);
        }

        function prewarmUpcomingBandAssets(startIndex, lookahead = 2) {
            if (!Array.isArray(bands) || !bands.length) return;
            for (let offset = 0; offset <= lookahead; offset++) {
                prewarmBandAssets(startIndex + offset);
            }
        }

        function getTimeSegmentAt(timeMs, inclusiveEnd = false) {
            if (!Array.isArray(timeSegments) || !timeSegments.length) return null;

            let left = 0;
            let right = timeSegments.length - 1;
            while (left <= right) {
                const mid = (left + right) >> 1;
                const segment = timeSegments[mid];
                const afterStart = timeMs >= segment.start;
                const beforeEnd = inclusiveEnd ? timeMs <= segment.end : timeMs < segment.end;
                if (afterStart && beforeEnd) return segment;
                if (timeMs < segment.start) right = mid - 1;
                else left = mid + 1;
            }

            if (inclusiveEnd && timeMs === totalDuration) {
                return timeSegments[timeSegments.length - 1];
            }
            return null;
        }

        function getTimeSegmentByBandIndex(bandIndex) {
            if (!Number.isInteger(bandIndex) || bandIndex < 0) return null;
            const direct = timeSegments[bandIndex];
            if (direct && direct.bandIndex === bandIndex) return direct;
            return timeSegments.find(segment => segment.bandIndex === bandIndex) || null;
        }

        function setBandDetailMode(mode = 'text') {
            const container = document.getElementById('bandDetailContainer');
            const imagePanel = document.getElementById('bandAttachmentPanel');
            if (!container) return;
            const showAttachment = mode === 'attachment';
            container.classList.toggle('has-attachment', showAttachment);
            if (imagePanel) imagePanel.setAttribute('aria-hidden', showAttachment ? 'false' : 'true');
        }

        function showBandAttachmentContainer(containerEl) {
            if (!containerEl) return;
            containerEl.style.display = "block";
            containerEl.style.visibility = "visible";
            containerEl.style.opacity = "1";
            containerEl.style.animation = 'none';
            void containerEl.offsetWidth;
            containerEl.style.animation = "descEntrance 0.72s cubic-bezier(0.16, 1, 0.3, 1) both";
        }

        function parseBondTags(desc = '') {
            return String(desc || '')
                .split(/[\s,，、/|]+/g)
                .map(s => s.trim())
                .filter(Boolean);
        }

        function parseEquipmentIds(value = '') {
            const raw = Array.isArray(value) ? value.join(',') : String(value || '');
            const ids = raw
                .split(/[,\s，、/|]+/g)
                .map(s => s.trim())
                .filter(Boolean)
                .map(s => parseInt(s, 10))
                .filter(n => Number.isFinite(n) && n >= 1 && n <= 40);
            return ids.slice(0, 3);
        }

        function getBandPhotoName(band, currentTimeMs = globalCurrentTime) {
            const phasePhoto = String(band?.photoName || '').trim();
            if (phasePhoto) return phasePhoto;
            const baseName = String(band?.name || '').trim();
            if (!baseName) return '';
            return baseName;
        }

        function crossfadeBandPhotoVariant(nextPhotoName, sessionId = uiTransitionSession) {
            const photoEl = document.getElementById('bandPhoto');
            const photoContainer = document.getElementById('photoContainer');
            if (!photoEl || !photoContainer || !nextPhotoName) return;

            const currentPhotoName = String(photoEl.dataset.photoBandName || '').trim();
            if (currentPhotoName === nextPhotoName) return;

            photoContainer.querySelectorAll('.band-photo-variant').forEach(node => node.remove());

            loadNamedImage(nextPhotoName, candidate => {
                if (!isUiTransitionActive(sessionId)) return;

                const overlay = document.createElement('img');
                overlay.className = 'band-photo-variant';
                overlay.src = candidate.url;
                applyImageMeta(overlay, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
                setElementUserScale(overlay);
                photoContainer.appendChild(overlay);

                photoEl.style.transition = 'opacity 0.8s ease, transform 0.82s cubic-bezier(0.22, 1, 0.36, 1), filter 0.8s ease';
                photoEl.style.filter = 'blur(4px)';
                photoEl.style.opacity = '0';

                requestAnimationFrame(() => {
                    overlay.classList.add('enter');
                });

                setTimeout(() => {
                    if (!isUiTransitionActive(sessionId)) {
                        overlay.remove();
                        return;
                    }
                    photoEl.src = candidate.url;
                    photoEl.dataset.photoBandName = nextPhotoName;
                    applyImageMeta(photoEl, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
                    photoEl.style.filter = 'blur(0)';
                    photoEl.style.opacity = '1';
                    overlay.classList.remove('enter');
                    overlay.classList.add('exit');
                    setTimeout(() => overlay.remove(), 820);
                }, 760);
            }, null, () => isUiTransitionActive(sessionId));
        }

        function isMidPhaseTransition(prevBand, nextBand) {
            if (!prevBand || !nextBand) return false;
            if (String(nextBand.phaseRole || '').trim() !== 'mid') return false;
            return String(prevBand.phaseParentName || prevBand.name || '').trim() === String(nextBand.phaseParentName || '').trim()
                && String(prevBand.phaseRole || 'base').trim() === 'base';
        }

        function clearPhotoWipeLayer(photoContainer) {
            if (!photoContainer) return;
            photoContainer.classList.remove('phase-wipe-active');
            photoContainer.querySelectorAll('.band-phase-wipe-layer').forEach(node => node.remove());
        }

        function createPhotoWipeLayer(photoContainer, oldPhotoCandidate, newPhotoCandidate, sessionId, onComplete = null, onMidpoint = null) {
            if (!photoContainer || !oldPhotoCandidate || !newPhotoCandidate) return null;
            clearPhotoWipeLayer(photoContainer);

            const layer = document.createElement('div');
            layer.className = 'band-phase-wipe-layer';

            const oldImg = document.createElement('img');
            oldImg.className = 'band-phase-wipe-image band-phase-wipe-old';
            oldImg.src = oldPhotoCandidate.url;
            applyImageMeta(oldImg, oldPhotoCandidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
            setElementUserScale(oldImg);

            const newImg = document.createElement('img');
            newImg.className = 'band-phase-wipe-image band-phase-wipe-new';
            newImg.src = newPhotoCandidate.url;
            applyImageMeta(newImg, newPhotoCandidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
            setElementUserScale(newImg);

            const spark = document.createElement('span');
            spark.className = 'band-phase-wipe-spark';

            const line = document.createElement('span');
            line.className = 'band-phase-wipe-line';

            layer.appendChild(oldImg);
            layer.appendChild(newImg);
            layer.appendChild(spark);
            layer.appendChild(line);
            photoContainer.appendChild(layer);

            const duration = Math.max(560, Math.round(ANIM_DURATION * 0.72));
            const startLeft = -18;
            const endLeft = 118;
            const diagonalWidth = 24;
            const settleLeft = 112;
            const startTime = performance.now();
            const midpointX = 50;
            let midpointHandled = false;

            photoContainer.classList.add('phase-wipe-active');

            const animate = now => {
                if (!isUiTransitionActive(sessionId)) return;
                const elapsed = Math.max(0, now - startTime);
                const progress = Math.min(1, elapsed / duration);
                const eased = 1 - Math.pow(1 - progress, 3);
                const lineX = startLeft + (endLeft - startLeft) * eased;
                layer.style.setProperty('--phase-wipe-x', `${lineX.toFixed(2)}%`);
                const topEdge = Math.max(0, Math.min(100, lineX));
                const bottomEdge = Math.max(0, Math.min(100, lineX + diagonalWidth));
                newImg.style.clipPath = `polygon(0 0, ${topEdge.toFixed(2)}% 0, ${bottomEdge.toFixed(2)}% 100%, 0 100%)`;

                if (!midpointHandled && lineX >= midpointX) {
                    midpointHandled = true;
                    oldImg.remove();
                    if (typeof onMidpoint === 'function') {
                        onMidpoint();
                    }
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                    return;
                }

                layer.style.setProperty('--phase-wipe-x', `${settleLeft}%`);
                newImg.style.clipPath = 'polygon(0 0, 100% 0, 100% 100%, 0 100%)';
                requestAnimationFrame(() => {
                    if (!isUiTransitionActive(sessionId)) return;
                    clearPhotoWipeLayer(photoContainer);
                    if (typeof onComplete === 'function') {
                        onComplete();
                    }
                });
            };

            requestAnimationFrame(animate);
            return layer;
        }

        function syncBandPhotoVariant() {
            if (gachaPlaying) return;
            if (currentIndex < 0 || !bands[currentIndex]) return;
            const photoEl = document.getElementById('bandPhoto');
            const photoContainer = document.getElementById('photoContainer');
            if (!photoEl) return;
            if (photoContainer && photoContainer.classList.contains('phase-wipe-active')) return;

            const band = bands[currentIndex];
            const nextPhotoName = getBandPhotoName(band, globalCurrentTime);
            if (!nextPhotoName) return;
            const currentPhotoName = String(photoEl.dataset.photoBandName || '').trim();
            if (currentPhotoName === nextPhotoName) return;
            crossfadeBandPhotoVariant(nextPhotoName);
        }

        function getTransitionPrevBandForIndex(nextIndex) {
            if (!Number.isInteger(nextIndex) || nextIndex <= 0) return null;
            const nextBand = bands[nextIndex];
            if (String(nextBand?.phaseRole || '').trim() !== 'mid') return null;
            return bands[nextIndex - 1] || null;
        }

        function renderBondIcons(desc = '', sessionId = uiTransitionSession) {
            const wrap = document.getElementById('bondIcons');
            if (!wrap) return;
            const tags = parseBondTags(desc);
            if (backgroundEffect) {
                tags.sort((left, right) => Number(independentBondNames.has(right)) - Number(independentBondNames.has(left)));
            }
            wrap.style.animation = 'none';
            wrap.innerHTML = '';
            wrap.style.display = (CONFIG.SHOW_DESC && tags.length) ? 'flex' : 'none';
            if (!CONFIG.SHOW_DESC || !tags.length) return;
            void wrap.offsetWidth;
            wrap.style.animation = '';

            tags.forEach(tag => {
                const slot = document.createElement('span');
                slot.className = 'bond-item no-icon';
                const label = document.createElement('span');
                label.className = 'bond-label';
                label.textContent = tag;
                slot.appendChild(label);
                wrap.appendChild(slot);

                loadNamedImage(`faction_${tag}`, candidate => {
                    if (!isUiTransitionActive(sessionId)) return;
                    const img = document.createElement('img');
                    img.className = 'bond-icon';
                    if (independentBondNames.has(tag)) img.classList.add('bond-icon--independent');
                    img.src = candidate.url;
                    img.alt = tag;
                    img.title = tag;
                    applyImageMeta(img, candidate.name, { fit: 'cover', x: 50, y: 50, scale: 1 }, true);
                    setElementUserScale(img);
                    slot.classList.remove('no-icon');
                    slot.insertBefore(img, label);
                }, null, () => isUiTransitionActive(sessionId));
            });
        }

        function renderEquipmentIcons(band, sessionId = uiTransitionSession) {
            const grid = document.getElementById('bandEquipmentGrid');
            if (!grid) return false;
            const ids = parseEquipmentIds(band?.equipmentIds);
            grid.innerHTML = '';
            if (!ids.length) return false;
            let loadedCount = 0;

            ids.forEach(id => {
                const img = document.createElement('img');
                img.className = 'band-equipment-icon';
                img.src = `/assets/images/${id}.png`;
                img.alt = `装备 ${id}`;
                img.title = `装备 ${id}`;
                img.onload = () => {
                    if (!isUiTransitionActive(sessionId)) return;
                    loadedCount += 1;
                };
                img.onerror = () => {
                    if (!isUiTransitionActive(sessionId)) return;
                    img.remove();
                };
                grid.appendChild(img);
            });
            queueUiTransitionTimer(sessionId, () => {
                if (!grid.children.length && loadedCount === 0) {
                    const container = document.getElementById('bandDetailContainer');
                    if (container) {
                        container.style.display = "none";
                        setBandDetailMode('hidden');
                    }
                }
            }, 220);
            return true;
        }

        function getMusicVolume() {
            const raw = Number(CONFIG.MUSIC_VOLUME);
            if (!Number.isFinite(raw)) return 0.7;
            return clampNumber(raw, 0, 1);
        }

        function getMusicDelaySeconds() {
            return MusicTimeline.normalizeDelaySeconds(CONFIG.MUSIC_DELAY_SECONDS);
        }

        function applyMusicVolume() {
            const audio = document.getElementById("bgMusic");
            if (!audio) return;
            if (musicSessionActive && !musicDelayStarted) {
                audio.volume = 0;
                return;
            }
            audio.volume = getMusicVolume();
        }

        function getCurrentMusicPresentationMs() {
            if (musicIntroActive) {
                return Math.max(0, performance.now() - musicPresentationStartedAt);
            }
            return MusicTimeline.getPresentationTimeMs(globalCurrentTime, getLeadInDurationMs());
        }

        function holdMusicAtDelayStart(audio) {
            if (!audio) return;
            musicDelayStarted = false;
            audio.pause();
            audio.volume = 0;
            musicPlaybackCycles = 0;
            setMusicTrack(audio, 0, 0, false);
        }

        function setMusicToPresentationTime(audio, presentationMs) {
            if (!audio) return false;
            const mappedSeconds = MusicTimeline.mapPresentationMsToAudioSeconds(
                presentationMs,
                getMusicDelaySeconds()
            );
            const delayElapsed = presentationMs >= MusicTimeline.getDelayMs(getMusicDelaySeconds());
            if (!delayElapsed) {
                holdMusicAtDelayStart(audio);
                return false;
            }

            const cycleDuration = getPlaylistCycleDuration(audio);
            musicPlaybackCycles = cycleDuration > 0 ? Math.floor(mappedSeconds / cycleDuration) : 0;
            const pos = mapContentSecondsToPlaylistPosition(mappedSeconds, audio);
            setMusicTrack(audio, pos.trackIndex, pos.time, false);
            musicDelayStarted = true;
            applyMusicVolume();
            return true;
        }

        function playMusicForCurrentTimeline() {
            const audio = document.getElementById("bgMusic");
            if (!audio) return false;
            if (!musicSessionActive) {
                musicSessionActive = true;
                musicIntroActive = false;
            }

            if (!musicDelayStarted) {
                const started = setMusicToPresentationTime(audio, getCurrentMusicPresentationMs());
                if (!started) return false;
            }

            audio.play().catch(error => console.log("Audio play failed", error));
            initAudioVisualizer();
            return true;
        }

        function beginMusicPresentation(audio) {
            if (!audio) return;
            musicSessionActive = true;
            musicIntroActive = true;
            musicPresentationStartedAt = performance.now();
            musicPlaybackCycles = 0;
            holdMusicAtDelayStart(audio);
            if (getMusicDelaySeconds() === 0) {
                playMusicForCurrentTimeline();
            }
        }

        function updateDelayedMusic() {
            if (!musicSessionActive) return;
            const audio = document.getElementById("bgMusic");
            if (!audio) return;

            if (!musicDelayStarted) {
                const presentationMs = getCurrentMusicPresentationMs();
                const delayMs = MusicTimeline.getDelayMs(getMusicDelaySeconds());
                const canStart = musicIntroActive || !isPaused || outroActive;
                if (canStart && presentationMs >= delayMs) {
                    setMusicToPresentationTime(audio, presentationMs);
                    audio.play().catch(error => console.log("Audio play failed", error));
                    initAudioVisualizer();
                }
            }
        }

        function getConfiguredMusicPlaylist() {
            const raw = CONFIG.MUSIC_TRACKS;
            let tracks = [];
            if (Array.isArray(raw)) tracks = raw;
            else if (typeof raw === "string") tracks = raw.split(/[,\n;|]/g);
            tracks = tracks.map(s => String(s || "").trim()).filter(Boolean);
            if (!tracks.length) tracks = ["/assets/audio/music.mp3"];
            return tracks;
        }

        function playlistsEqual(a, b) {
            if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        function getPlaylistCycleDuration(audio = null) {
            const durationsReady = musicTrackDurations.length === musicPlaylist.length
                && musicTrackDurations.every(d => Number.isFinite(d) && d > 0);
            if (durationsReady) {
                return musicTrackDurations.reduce((sum, d) => sum + d, 0);
            }
            const fallbackDuration = Number(audio?.duration);
            if (musicPlaylist.length <= 1 && Number.isFinite(fallbackDuration) && fallbackDuration > 0) {
                return fallbackDuration;
            }
            return 0;
        }

        function ensureMusicTrackDurations() {
            musicTrackDurations = Array(musicPlaylist.length).fill(NaN);
            musicPlaylist.forEach((src, index) => {
                const probe = new Audio();
                probe.preload = "metadata";
                listen(probe, "loadedmetadata", () => {
                    const d = Number(probe.duration);
                    if (Number.isFinite(d) && d > 0) musicTrackDurations[index] = d;
                }, { once: true });
                probe.src = src;
            });
        }

        function setMusicTrack(audio, nextIndex, seekTime = 0, autoPlay = false) {
            if (!audio || !musicPlaylist.length) return;
            const len = musicPlaylist.length;
            const index = ((nextIndex % len) + len) % len;
            const src = musicPlaylist[index];
            const prevSrc = audio.dataset.trackSrc || "";
            const switched = prevSrc !== src;
            currentMusicTrackIndex = index;

            const applySeek = () => {
                const dur = Number(audio.duration);
                const t = Number.isFinite(dur) && dur > 0
                    ? Math.max(0, Math.min(seekTime, Math.max(0, dur - 0.05)))
                    : Math.max(0, seekTime);
                try { audio.currentTime = t; } catch (_) {}
                if (autoPlay) audio.play().catch(() => {});
            };

            if (switched) {
                audio.dataset.trackSrc = src;
                audio.src = src;
                listen(audio, "loadedmetadata", applySeek, { once: true });
                if (autoPlay) audio.play().catch(() => {});
                return;
            }
            applySeek();
        }

        function bindMusicEndedHandler(audio) {
            if (!audio || musicEndedHandlerBound) return;
            listen(audio, "ended", () => {
                const len = Math.max(1, musicPlaylist.length);
                const isLastTrack = currentMusicTrackIndex >= len - 1;
                if (outroActive) {
                    if (!isLastTrack) {
                        setMusicTrack(audio, currentMusicTrackIndex + 1, 0, true);
                    } else {
                        finishOutroSequence();
                    }
                    return;
                }

                const next = (currentMusicTrackIndex + 1) % len;
                if (next === 0) musicPlaybackCycles += 1;
                setMusicTrack(audio, next, 0, true);
            });
            musicEndedHandlerBound = true;
        }

        function applyMusicPlaylist() {
            const audio = document.getElementById("bgMusic");
            if (!audio) return;
            const configured = getConfiguredMusicPlaylist();
            const changed = !playlistsEqual(musicPlaylist, configured);
            musicPlaylist = configured;
            if (changed || !audio.dataset.trackSrc) {
                currentMusicTrackIndex = 0;
                musicPlaybackCycles = 0;
                setMusicTrack(audio, 0, 0, false);
                ensureMusicTrackDurations();
            }
            bindMusicEndedHandler(audio);
        }

        function getConfiguredOutroVideoCandidates() {
            const raw = CONFIG.OUTRO_VIDEO;
            let items = [];
            if (Array.isArray(raw)) items = raw;
            else if (typeof raw === "string") items = raw.split(/[,\n;|]/g);
            items = items.map(s => String(s || "").trim()).filter(Boolean);
            if (items.length === 1) {
                const primary = items[0];
                const dot = primary.lastIndexOf(".");
                if (dot > 0) {
                    const base = primary.slice(0, dot);
                    const ext = primary.slice(dot);
                    items = [
                        `${base}-lite${ext}`,
                        `${base}-720p${ext}`,
                        primary
                    ];
                }
            } else if (!items.length) {
                items = [
                    "/assets/video/ending-lite.mp4",
                    "/assets/video/ending-720p.mp4",
                    "/assets/video/ending.mp4",
                    "/assets/video/ending.webm",
                    "/assets/video/ending.mov",
                    "/assets/video/outro.mp4",
                    "/assets/video/outro.webm",
                    "/assets/video/final.mp4",
                    "/assets/video/final.webm"
                ];
            }
            return Array.from(new Set(items));
        }

        function getOutroTransitionMs() {
            const raw = Number(CONFIG.OUTRO_TRANSITION_MS);
            return Number.isFinite(raw) ? clampNumber(raw, 300, 4000) : 1100;
        }

        function clearOutroRevealTimer() {
            if (outroRevealTimer) {
                clearTimeout(outroRevealTimer);
                outroRevealTimer = null;
            }
        }

        function showOutroThanksOnly() {
            if (!outroOverlay) return;
            outroOverlay.classList.remove("video-ready");
            outroOverlay.classList.add("show-thanks");
            if (outroVideo) {
                try { outroVideo.pause(); } catch (_) {}
            }
            if (outroThanks) {
                outroThanks.textContent = "感谢观看";
            }
        }

        function resetOutroSequence() {
            outroActive = false;
            outroFinished = false;
            outroStartedAt = 0;
            outroSceneSuspended = false;
            outroVideoLoadToken += 1;
            clearOutroRevealTimer();
            document.body.classList.remove("outro-mode");

            if (outroOverlay) {
                outroOverlay.classList.remove("active", "video-ready", "fallback-only", "ended", "show-thanks");
            }
            if (outroVideo) {
                try { outroVideo.pause(); } catch (_) {}
                outroVideo.muted = true;
                outroVideo.volume = 0;
                outroVideo.removeAttribute("src");
                outroVideo.load();
            }
        }

        function revealOutroVideoWhenReady(loadToken, useFallbackOnly = false) {
            if (!outroOverlay || loadToken !== outroVideoLoadToken) return;
            videoCapture?.markOutroReady(useFallbackOnly);
            const elapsed = outroStartedAt ? performance.now() - outroStartedAt : 0;
            const waitMs = Math.max(0, getOutroTransitionMs() - elapsed);
            clearOutroRevealTimer();
            outroRevealTimer = setTimeout(() => {
                if (!outroOverlay || loadToken !== outroVideoLoadToken) return;
                if (useFallbackOnly) outroOverlay.classList.add("fallback-only");
                outroOverlay.classList.add("video-ready");
                if (!useFallbackOnly && outroVideo) {
                    outroVideo.play().catch(() => {});
                }
            }, waitMs);
        }

        function tryLoadOutroVideoCandidate(candidates, index, loadToken) {
            if (!outroVideo || loadToken !== outroVideoLoadToken) return;
            if (index >= candidates.length) {
                revealOutroVideoWhenReady(loadToken, true);
                return;
            }

            const src = candidates[index];
            const handleLoaded = () => {
                outroVideo.removeEventListener("loadeddata", handleLoaded);
                outroVideo.removeEventListener("error", handleError);
                if (loadToken !== outroVideoLoadToken) return;
                outroOverlay?.classList.remove("fallback-only");
                revealOutroVideoWhenReady(loadToken, false);
            };
            const handleError = () => {
                outroVideo.removeEventListener("loadeddata", handleLoaded);
                outroVideo.removeEventListener("error", handleError);
                if (loadToken !== outroVideoLoadToken) return;
                tryLoadOutroVideoCandidate(candidates, index + 1, loadToken);
            };

            try { outroVideo.pause(); } catch (_) {}
            outroVideo.muted = true;
            outroVideo.volume = 0;
            outroVideo.loop = false;
            outroVideo.playsInline = true;
            outroVideo.removeEventListener("loadeddata", handleLoaded);
            outroVideo.removeEventListener("error", handleError);
            listen(outroVideo, "loadeddata", handleLoaded, { once: true });
            listen(outroVideo, "error", handleError, { once: true });
            outroVideo.src = src;
            outroVideo.load();
        }

        function startOutroSequence() {
            if (outroActive) return;
            outroActive = true;
            outroFinished = false;
            outroStartedAt = performance.now();
            outroSceneSuspended = false;
            clearOutroRevealTimer();
            cancelGachaAnimation();
            document.body.classList.add("outro-mode");

            if (outroOverlay) {
                outroOverlay.classList.remove("video-ready", "fallback-only", "ended", "show-thanks");
                outroOverlay.classList.add("active");
            }

            if (!outroVideo) {
                revealOutroVideoWhenReady(outroVideoLoadToken, true);
                return;
            }

            const loadToken = ++outroVideoLoadToken;
            tryLoadOutroVideoCandidate(getConfiguredOutroVideoCandidates(), 0, loadToken);
        }

        function finishOutroSequence() {
            outroFinished = true;
            clearOutroRevealTimer();
            showOutroThanksOnly();
            if (outroOverlay) outroOverlay.classList.add("ended");
            if (outroVideo) {
                try { outroVideo.pause(); } catch (_) {}
            }
        }

        function mapContentSecondsToPlaylistPosition(contentSeconds, audio) {
            const seconds = Math.max(0, contentSeconds);
            if (musicPlaylist.length <= 1) {
                const dur = Number(audio?.duration) || 0;
                return { trackIndex: 0, time: dur > 0 ? seconds % dur : seconds };
            }
            const durationsReady = musicTrackDurations.length === musicPlaylist.length
                && musicTrackDurations.every(d => Number.isFinite(d) && d > 0);
            if (!durationsReady) {
                const dur = Number(audio?.duration) || 0;
                return { trackIndex: currentMusicTrackIndex, time: dur > 0 ? seconds % dur : seconds };
            }
            const total = musicTrackDurations.reduce((sum, d) => sum + d, 0);
            let t = total > 0 ? seconds % total : seconds;
            for (let i = 0; i < musicTrackDurations.length; i++) {
                const d = musicTrackDurations[i];
                if (t < d) return { trackIndex: i, time: t };
                t -= d;
            }
            const last = musicTrackDurations.length - 1;
            return { trackIndex: last, time: Math.max(0, musicTrackDurations[last] - 0.05) };
        }

        function getPhotoFxIntensity() {
            const raw = Number(CONFIG.PHOTO_FX_INTENSITY);
            if (!Number.isFinite(raw)) return 1;
            return clampNumber(raw, 0.35, 2.2);
        }

        const PERF_PRESETS = {
            high: { renderScale: 1.0, bgParticles: 75, audioDensity: 1.0, photoDensity: 1.0 },
            balanced: { renderScale: 0.9, bgParticles: 56, audioDensity: 0.82, photoDensity: 0.88 },
            smooth: { renderScale: 0.78, bgParticles: 40, audioDensity: 0.62, photoDensity: 0.72 }
        };

        function getPerfPreset() {
            const key = CONFIG.PERFORMANCE_MODE || 'balanced';
            return PERF_PRESETS[key] || PERF_PRESETS.balanced;
        }

        function updatePerformanceState(deltaTime) {
            perfFrameEma = perfFrameEma * 0.9 + deltaTime * 0.1;
            if (!CONFIG.ADAPTIVE_PERF) {
                perfAdaptiveQuality = 1;
                return;
            }
            if (perfFrameEma > 21) {
                perfAdaptiveQuality = Math.max(0.6, perfAdaptiveQuality - 0.02);
            } else if (perfFrameEma < 16.5) {
                perfAdaptiveQuality = Math.min(1, perfAdaptiveQuality + 0.01);
            }
        }

        function getCurrentRenderScale() {
            const base = getPerfPreset().renderScale;
            if (!CONFIG.ADAPTIVE_PERF) return base;
            return clampNumber(base * perfAdaptiveQuality, 0.62, 1);
        }

        function getAudioQualityScale() {
            const base = getPerfPreset().audioDensity;
            if (!CONFIG.ADAPTIVE_PERF) return base;
            return clampNumber(base * (0.8 + perfAdaptiveQuality * 0.2), 0.5, 1);
        }

        function getPhotoQualityScale() {
            const base = getPerfPreset().photoDensity;
            if (!CONFIG.ADAPTIVE_PERF) return base;
            return clampNumber(base * (0.78 + perfAdaptiveQuality * 0.22), 0.55, 1);
        }

        function getBgParticleTarget() {
            const base = getPerfPreset().bgParticles;
            if (!CONFIG.ADAPTIVE_PERF) return base;
            return Math.max(24, Math.round(base * (0.72 + perfAdaptiveQuality * 0.28)));
        }

        function getLivingFieldQualityScale() {
            const preset = CONFIG.PERFORMANCE_MODE || 'balanced';
            const ceiling = preset === 'high' ? 0.72 : preset === 'smooth' ? 0.5 : 0.58;
            return clampNumber(ceiling * (0.84 + perfAdaptiveQuality * 0.16), 0.42, ceiling);
        }

        function getBgEffectMode() {
            const specialMode = activeSpecialProfile?.effects?.backgroundEffect;
            const configuredMode = specialMode && specialMode !== 'inherit' ? specialMode : CONFIG.BG_EFFECT_MODE;
            return BackgroundEffects.normalizeMode(configuredMode);
        }

        function getBgEffectConfig() {
            return BackgroundEffects.resolveConfig(
                CONFIG.BG_EFFECT_CONFIG,
                activeSpecialProfile?.effects?.backgroundConfig,
                CONFIG
            );
        }

        function getRadarAudioFxMode() {
            return ['tech', 'pulse', 'orbit', 'off'].includes(CONFIG.RADAR_AUDIO_FX_MODE)
                ? CONFIG.RADAR_AUDIO_FX_MODE
                : 'tech';
        }

        function initAudioVisualizer() {
            const audio = document.getElementById("bgMusic");
            if (!audio) return;
            try {
                if (!audioVizContext) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return;
                    audioVizContext = new Ctx();
                }
                if (!audioVizSource) {
                    audioVizSource = audioVizContext.createMediaElementSource(audio);
                    audioVizAnalyser = audioVizContext.createAnalyser();
                    audioVizAnalyser.fftSize = 256;
                    audioVizAnalyser.smoothingTimeConstant = 0.86;
                    audioVizFreq = new Uint8Array(audioVizAnalyser.frequencyBinCount);
                    audioVizSource.connect(audioVizAnalyser);
                    audioVizAnalyser.connect(audioVizContext.destination);
                }
                if (audioVizContext.state === "suspended") {
                    audioVizContext.resume().catch(() => {});
                }
            } catch (err) {
                console.log("Audio visualizer init failed", err);
            }
        }

        function updateAudioVisualizerData() {
            if (!audioVizAnalyser || !audioVizFreq) {
                audioVizEnergy *= 0.92;
                audioVizBass *= 0.9;
                audioVizMid *= 0.9;
                audioVizTreble *= 0.9;
                audioVizBeat *= 0.86;
                return;
            }

            audioVizAnalyser.getByteFrequencyData(audioVizFreq);
            const len = audioVizFreq.length;
            const bassEnd = Math.max(2, Math.floor(len * 0.12));
            const midEnd = Math.max(bassEnd + 1, Math.floor(len * 0.45));
            const trebleStart = Math.max(midEnd, Math.floor(len * 0.7));

            let bassSum = 0;
            let midSum = 0;
            let trebleSum = 0;
            let fullSum = 0;
            for (let i = 0; i < len; i++) {
                const v = audioVizFreq[i];
                fullSum += v;
                if (i < bassEnd) bassSum += v;
                else if (i < midEnd) midSum += v;
                else if (i >= trebleStart) trebleSum += v;
            }

            const bass = bassSum / bassEnd / 255;
            const mid = midSum / (midEnd - bassEnd) / 255;
            const treble = trebleSum / Math.max(1, (len - trebleStart)) / 255;
            const full = fullSum / len / 255;
            const targetEnergy = full * 0.58 + bass * 0.42;
            const bassRise = Math.max(0, bass - audioVizPrevBass);
            const beatKick = Math.max(0, bassRise * 2.2 + (bass > 0.2 ? bass * 0.42 : 0));

            audioVizEnergy += (targetEnergy - audioVizEnergy) * 0.2;
            audioVizBass += (bass - audioVizBass) * 0.24;
            audioVizMid += (mid - audioVizMid) * 0.2;
            audioVizTreble += (treble - audioVizTreble) * 0.22;
            audioVizBeat = Math.max(audioVizBeat * 0.86, Math.min(1, beatKick));
            audioVizPrevBass = bass;
        }

        function drawAudioOuterRing(centerX, centerY, maxR, accentColor) {
            if (!audioVizFreq || audioVizEnergy < 0.01) return;
            const audioQuality = getAudioQualityScale();
            const pulse = Math.min(1, audioVizBeat * 0.7 + audioVizBass * 0.52);
            const baseRadius = maxR * (1.085 + pulse * 0.02);
            const maxBarLen = maxR * (0.118 + pulse * 0.034);
            const now = performance.now() * 0.0017;
            const phaseA = now * 0.13;
            const phaseB = -now * 0.18;
            const techPrimary = "#63e6ff";
            const techSecondary = "#7fb5ff";
            const techCore = "#f2feff";
            const accent = accentColor || techSecondary;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.7;

            // 层1：量化短刺（数字信号条）
            const denseCount = Math.max(40, Math.round(96 * audioQuality));
            for (let i = 0; i < denseCount; i++) {
                const idx = Math.min(audioVizFreq.length - 1, Math.floor((i / denseCount) * audioVizFreq.length * 0.95));
                const raw = audioVizFreq[idx] / 255;
                const shaped = Math.pow(raw, 1.45);
                const quant = Math.round(shaped * 7) / 7;
                const wobble = 0.95 + 0.05 * Math.sin(now * 1.4 + i * 0.32);
                const barLen = maxBarLen * (0.16 + quant * 0.84) * (0.68 + audioVizBass * 0.32) * wobble;
                const angle = (i / denseCount) * Math.PI * 2 - Math.PI / 2 + phaseA;

                const x1 = centerX + baseRadius * Math.cos(angle);
                const y1 = centerY + baseRadius * Math.sin(angle);
                const x2 = centerX + (baseRadius + barLen) * Math.cos(angle);
                const y2 = centerY + (baseRadius + barLen) * Math.sin(angle);

                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, hexToRgbA(techSecondary, 0));
                grad.addColorStop(0.42, hexToRgbA(techPrimary, 0.16 + quant * 0.28));
                grad.addColorStop(1, hexToRgbA(techCore, 0.06 + quant * 0.34));

                ctx.strokeStyle = grad;
                ctx.lineWidth = 0.66 + quant * 1.08;
                ctx.shadowBlur = (3 + quant * 8 + pulse * 6) * (0.76 + audioQuality * 0.24);
                ctx.shadowColor = hexToRgbA(techPrimary, 0.1 + quant * 0.24);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                // 数据粒子：方形比圆点更科技
                if (audioQuality > 0.72 && quant > 0.58 && i % 12 === 0) {
                    const px = x2 - 1.2;
                    const py = y2 - 1.2;
                    const size = 1.6 + quant * 1.5;
                    ctx.fillStyle = hexToRgbA(techCore, 0.12 + quant * 0.22);
                    ctx.fillRect(px, py, size, size);
                }
            }

            // 层2：稀疏长刺（扫描脉冲）
            const sparseCount = Math.max(12, Math.round(30 * audioQuality));
            for (let i = 0; i < sparseCount; i++) {
                const idx = Math.min(audioVizFreq.length - 1, Math.floor((i / sparseCount) * audioVizFreq.length * 0.6));
                const raw = audioVizFreq[idx] / 255;
                const shaped = Math.pow(raw, 1.22);
                if (shaped < 0.16) continue;
                const barLen = maxBarLen * (0.46 + shaped * 0.9) * (0.4 + pulse * 0.6);
                const angle = (i / sparseCount) * Math.PI * 2 - Math.PI / 2 + phaseB;
                const r1 = baseRadius + maxBarLen * 0.11;
                const x1 = centerX + r1 * Math.cos(angle);
                const y1 = centerY + r1 * Math.sin(angle);
                const x2 = centerX + (r1 + barLen) * Math.cos(angle);
                const y2 = centerY + (r1 + barLen) * Math.sin(angle);
                const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                grad.addColorStop(0, hexToRgbA(techSecondary, 0));
                grad.addColorStop(0.34, hexToRgbA(techPrimary, 0.08 + shaped * 0.2));
                grad.addColorStop(1, hexToRgbA(techCore, 0));
                ctx.strokeStyle = grad;
                ctx.lineWidth = 0.44 + shaped * 0.9;
                ctx.shadowBlur = (4 + shaped * 6) * (0.74 + audioQuality * 0.26);
                ctx.shadowColor = hexToRgbA(techPrimary, 0.1 + shaped * 0.14);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // 层3：六边形 HUD 扫描框（与雷达同构）
            const hudR = baseRadius + maxBarLen * 0.33;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + now * 0.08;
                const x = centerX + hudR * Math.cos(a);
                const y = centerY + hudR * Math.sin(a);
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.setLineDash([10, 8]);
            ctx.lineDashOffset = -now * 18;
            ctx.lineWidth = 1.15 + pulse * 0.55;
            ctx.shadowBlur = 10 + pulse * 8;
            ctx.shadowColor = hexToRgbA(techPrimary, 0.18);
            ctx.strokeStyle = hexToRgbA(accent, 0.1 + audioVizEnergy * 0.14);
            ctx.stroke();
            ctx.setLineDash([]);

            // 层4：分段扫描弧
            const sweepR = hudR + 4.5;
            if (audioQuality > 0.62) {
                ctx.setLineDash([8, 10]);
                for (let k = 0; k < 3; k++) {
                    const start = now * (1.05 + k * 0.16) + k * 2.05;
                    const span = Math.PI * (0.13 + audioVizEnergy * 0.11 + k * 0.018);
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, sweepR + k * 3.05, start, start + span);
                    ctx.lineDashOffset = -now * (23 + k * 8);
                    ctx.lineWidth = 0.78 + k * 0.3 + pulse * 0.45;
                    ctx.shadowBlur = 7 + pulse * 8;
                    ctx.shadowColor = hexToRgbA(techPrimary, 0.12 + k * 0.05);
                    ctx.strokeStyle = hexToRgbA(techPrimary, 0.08 + audioVizEnergy * 0.12 + k * 0.035);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]);

            // 层5：环形扫描扇区（低透明度，避免压住雷达）
            const sweepOuter = sweepR + 9;
            if (audioQuality > 0.7) {
                const sweepInner = sweepOuter - 9;
                const sweepAngle = (now * 0.92) % (Math.PI * 2);
                const sweepSpan = 0.22 + audioVizMid * 0.18;
                const sweepGrad = ctx.createRadialGradient(centerX, centerY, sweepInner, centerX, centerY, sweepOuter);
                sweepGrad.addColorStop(0, hexToRgbA(techPrimary, 0));
                sweepGrad.addColorStop(0.5, hexToRgbA(techPrimary, 0.04 + pulse * 0.04));
                sweepGrad.addColorStop(1, hexToRgbA(techCore, 0.09 + pulse * 0.07));
                ctx.fillStyle = sweepGrad;
                ctx.beginPath();
                ctx.arc(centerX, centerY, sweepOuter, sweepAngle - sweepSpan, sweepAngle + sweepSpan);
                ctx.arc(centerX, centerY, sweepInner, sweepAngle + sweepSpan, sweepAngle - sweepSpan, true);
                ctx.closePath();
                ctx.fill();

                // 层6：刻度圈 + 主环
                const tickCount = 30;
                const tickR = sweepOuter + 1.5;
                for (let t = 0; t < tickCount; t++) {
                    const a = (t / tickCount) * Math.PI * 2 - Math.PI / 2;
                    const rIn = tickR;
                    const rOut = tickR + (t % 5 === 0 ? 7 : 3.5);
                    const tx1 = centerX + rIn * Math.cos(a);
                    const ty1 = centerY + rIn * Math.sin(a);
                    const tx2 = centerX + rOut * Math.cos(a);
                    const ty2 = centerY + rOut * Math.sin(a);
                    ctx.beginPath();
                    ctx.moveTo(tx1, ty1);
                    ctx.lineTo(tx2, ty2);
                    ctx.lineWidth = t % 5 === 0 ? 1.05 : 0.75;
                    ctx.strokeStyle = hexToRgbA(techSecondary, 0.06 + pulse * 0.08);
                    ctx.stroke();
                }
            }

            ctx.beginPath();
            ctx.arc(centerX, centerY, baseRadius + maxBarLen * 0.2, 0, Math.PI * 2);
            ctx.lineWidth = 1.02 + pulse * 1.28;
            ctx.shadowBlur = 10 + pulse * 10;
            ctx.shadowColor = hexToRgbA(techPrimary, 0.18);
            ctx.strokeStyle = hexToRgbA(techPrimary, 0.12 + audioVizEnergy * 0.16);
            ctx.stroke();

            if (audioVizBeat > 0.1) {
                const beatRadius = baseRadius + maxBarLen * (0.44 + audioVizBeat * 0.34);
                ctx.beginPath();
                ctx.arc(centerX, centerY, beatRadius, 0, Math.PI * 2);
                ctx.lineWidth = 1.1 + audioVizBeat * 1.1;
                ctx.shadowBlur = 11 + audioVizBeat * 12;
                ctx.shadowColor = hexToRgbA(techPrimary, 0.16);
                ctx.strokeStyle = hexToRgbA(techPrimary, Math.max(0, 0.14 - audioVizBeat * 0.07));
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawRadarAudioPulseRings(centerX, centerY, maxR, accentColor, coreColor) {
            const energy = Math.max(audioVizEnergy, 0.035);
            const pulse = clampNumber(audioVizBeat * 0.85 + audioVizBass * 0.55, 0, 1);
            const now = performance.now() * 0.001;
            const ringCount = Math.max(4, Math.round(7 * getAudioQualityScale()));
            const accent = accentColor || '#63e6ff';
            const core = coreColor || '#f6fbff';

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < ringCount; i++) {
                const phase = (now * (0.15 + pulse * 0.1) + i / ringCount) % 1;
                const radius = maxR * (1.05 + phase * (0.34 + pulse * 0.08));
                const alpha = (1 - phase) * (0.13 + energy * 0.24);
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.lineWidth = 1.15 + i * 0.16 + pulse * 2.4;
                ctx.shadowBlur = 12 + pulse * 26;
                ctx.shadowColor = hexToRgbA(accent, alpha * 1.6);
                ctx.strokeStyle = hexToRgbA(i % 2 ? core : accent, alpha);
                ctx.stroke();
            }

            const spikeCount = Math.max(12, Math.round(24 * getAudioQualityScale()));
            for (let i = 0; i < spikeCount; i++) {
                const angle = i / spikeCount * Math.PI * 2 - Math.PI / 2;
                const wave = 0.5 + 0.5 * Math.sin(now * 3.2 + i * 0.9);
                const len = maxR * (0.018 + energy * 0.05 + pulse * 0.055) * wave;
                const r1 = maxR * 1.18;
                const r2 = r1 + len;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
                ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
                ctx.lineWidth = 0.8 + pulse * 1.1;
                ctx.strokeStyle = hexToRgbA(accent, 0.08 + energy * 0.16);
                ctx.shadowBlur = 8 + pulse * 14;
                ctx.shadowColor = hexToRgbA(accent, 0.14 + pulse * 0.22);
                ctx.stroke();
            }
            ctx.restore();
        }

        function drawRadarAudioOrbitDots(centerX, centerY, maxR, accentColor, coreColor) {
            const energy = Math.max(audioVizEnergy, 0.025);
            const pulse = clampNumber(audioVizBeat * 0.75 + audioVizBass * 0.5, 0, 1);
            const now = performance.now() * 0.001;
            const accent = accentColor || '#63e6ff';
            const core = coreColor || '#f6fbff';
            const orbitCount = getAudioQualityScale() > 0.72 ? 3 : 2;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let layer = 0; layer < orbitCount; layer++) {
                const dotCount = 8 + layer * 4;
                const radius = maxR * (1.11 + layer * 0.07 + pulse * 0.018);
                const rotation = now * (0.55 + layer * 0.16) * (layer % 2 ? -1 : 1);

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.setLineDash([8 + layer * 2, 14 + layer * 3]);
                ctx.lineDashOffset = -now * (18 + layer * 8);
                ctx.lineWidth = 0.8 + layer * 0.18;
                ctx.strokeStyle = hexToRgbA(accent, 0.055 + energy * 0.08);
                ctx.shadowBlur = 8 + pulse * 12;
                ctx.shadowColor = hexToRgbA(accent, 0.12 + pulse * 0.18);
                ctx.stroke();
                ctx.setLineDash([]);

                for (let i = 0; i < dotCount; i++) {
                    const angle = rotation + i / dotCount * Math.PI * 2;
                    const amp = 0.84 + 0.16 * Math.sin(now * 2.4 + i + layer);
                    const size = (2.2 + layer * 0.75 + pulse * 2.2) * amp;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fillStyle = hexToRgbA(i % 3 === 0 ? core : accent, 0.22 + energy * 0.36 + pulse * 0.16);
                    ctx.shadowBlur = 10 + pulse * 22;
                    ctx.shadowColor = hexToRgbA(accent, 0.18 + pulse * 0.28);
                    ctx.fill();
                }
            }
            ctx.restore();
        }

        function drawRadarAudioFx(centerX, centerY, maxR, accentColor, coreColor) {
            const mode = getRadarAudioFxMode();
            if (mode === 'off') return;
            if (mode === 'pulse') {
                drawRadarAudioPulseRings(centerX, centerY, maxR, accentColor, coreColor);
            } else if (mode === 'orbit') {
                drawRadarAudioOrbitDots(centerX, centerY, maxR, accentColor, coreColor);
            } else {
                drawAudioOuterRing(centerX, centerY, maxR, accentColor);
            }
        }

        function drawRadarSatelliteMarkers(centerX, centerY, maxR, accentColor, coreColor, isMvpRadar = false) {
            const now = performance.now() * 0.001;
            const orbitRadius = maxR * 1.16;
            const markerCount = isMvpRadar ? 5 : 4;
            const activeIndex = Math.floor((now * 0.72) % markerCount);

            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            for (let i = 0; i < markerCount; i++) {
                const angle = now * (0.58 + i * 0.03) + (Math.PI * 2 * i / markerCount);
                const wobble = Math.sin(now * 5.4 + i * 1.7) * maxR * 0.012;
                const radius = orbitRadius + wobble + (i % 2 === 0 ? maxR * 0.015 : 0);
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                const unit = maxR * (0.048 + (i % 3) * 0.006);
                const active = i === activeIndex;
                const alpha = (active ? 0.26 : 0.13) + audioVizBeat * 0.05 + (isMvpRadar ? 0.04 : 0);
                const markerColor = isMvpRadar ? '#fff3c9' : accentColor;
                const glowColor = isMvpRadar ? '#ffe18f' : accentColor;

                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(angle + Math.PI / 2);
                ctx.strokeStyle = hexToRgbA(markerColor, alpha);
                ctx.shadowColor = hexToRgbA(glowColor, active ? alpha * 1.6 : alpha * 0.95);
                ctx.shadowBlur = active ? 15 : 8;
                ctx.lineWidth = active ? 1.55 : 1.02;

                ctx.beginPath();
                ctx.moveTo(-unit * 0.58, -unit * 0.3);
                ctx.lineTo(-unit * 0.24, -unit * 0.3);
                ctx.lineTo(-unit * 0.24, -unit * 0.1);
                ctx.moveTo(unit * 0.58, -unit * 0.3);
                ctx.lineTo(unit * 0.24, -unit * 0.3);
                ctx.lineTo(unit * 0.24, -unit * 0.1);
                ctx.moveTo(-unit * 0.58, unit * 0.3);
                ctx.lineTo(-unit * 0.24, unit * 0.3);
                ctx.lineTo(-unit * 0.24, unit * 0.1);
                ctx.moveTo(unit * 0.58, unit * 0.3);
                ctx.lineTo(unit * 0.24, unit * 0.3);
                ctx.lineTo(unit * 0.24, unit * 0.1);
                ctx.stroke();

                ctx.beginPath();
                ctx.rect(-unit * 0.28, -unit * 0.07, unit * 0.56, unit * 0.14);
                ctx.stroke();

                ctx.fillStyle = hexToRgbA(coreColor, active ? 0.92 : 0.68);
                ctx.beginPath();
                ctx.arc(0, 0, active ? 1.95 : 1.45, 0, Math.PI * 2);
                ctx.fill();

                if (active) {
                    ctx.beginPath();
                    ctx.moveTo(0, -unit * 0.56);
                    ctx.lineTo(0, -unit * 0.9);
                    ctx.strokeStyle = hexToRgbA(markerColor, alpha * 0.86);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.restore();

                if (i % 2 === 0) {
                    ctx.save();
                    ctx.strokeStyle = hexToRgbA(markerColor, active ? 0.16 : 0.08);
                    ctx.lineWidth = 0.85;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, angle - 0.085, angle + 0.085);
                    ctx.stroke();
                    ctx.restore();
                }
            }

            ctx.restore();
        }

        function drawRadarSweepArcs(centerX, centerY, maxR, accentColor, coreColor, isMvpRadar = false) {
            const now = performance.now() * 0.001;
            const accent = accentColor || "#63e6ff";
            const bright = isMvpRadar ? "#fff4cd" : coreColor || "#f2feff";
            const arcLayers = isMvpRadar ? 4 : 3;

            ctx.save();
            ctx.globalCompositeOperation = "lighter";

            for (let i = 0; i < arcLayers; i++) {
                const radius = maxR * (1.105 + i * 0.048 + Math.sin(now * (0.85 + i * 0.1)) * 0.004);
                const baseAngle = now * (0.28 + i * 0.055) + i * 1.42;
                const span = 0.2 + i * 0.055 + audioVizMid * 0.08;
                const alpha = (0.08 + i * 0.03 + audioVizBeat * 0.04) * (isMvpRadar ? 1.14 : 1);

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, baseAngle, baseAngle + span);
                ctx.lineWidth = 1.05 + i * 0.3;
                ctx.strokeStyle = hexToRgbA(accent, alpha);
                ctx.shadowColor = hexToRgbA(accent, alpha * 1.4);
                ctx.shadowBlur = 10 + i * 5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, baseAngle + Math.PI, baseAngle + Math.PI + span * 0.82);
                ctx.lineWidth = 0.95 + i * 0.26;
                ctx.strokeStyle = hexToRgbA(bright, alpha * 0.84);
                ctx.shadowColor = hexToRgbA(bright, alpha);
                ctx.shadowBlur = 8 + i * 4;
                ctx.stroke();

                const tickCount = 4 + i;
                for (let k = 0; k < tickCount; k++) {
                    const tickAngle = baseAngle - 0.42 + k * 0.13;
                    const ix = centerX + Math.cos(tickAngle) * (radius - maxR * 0.016);
                    const iy = centerY + Math.sin(tickAngle) * (radius - maxR * 0.016);
                    const ox = centerX + Math.cos(tickAngle) * (radius + maxR * 0.016);
                    const oy = centerY + Math.sin(tickAngle) * (radius + maxR * 0.016);
                    ctx.beginPath();
                    ctx.moveTo(ix, iy);
                    ctx.lineTo(ox, oy);
                    ctx.lineWidth = 0.78;
                    ctx.strokeStyle = hexToRgbA(accent, alpha * 0.46);
                    ctx.shadowBlur = 0;
                    ctx.stroke();
                }
            }

            const gateRadius = maxR * 1.23;
            const gateAngle = now * 0.22 + audioVizTreble * 0.4;
            for (let side = -1; side <= 1; side += 2) {
                const a = gateAngle + side * 0.92;
                const x = centerX + Math.cos(a) * gateRadius;
                const y = centerY + Math.sin(a) * gateRadius;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(a + Math.PI / 2);
                ctx.strokeStyle = hexToRgbA(accent, 0.15 + audioVizBeat * 0.05);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-maxR * 0.024, -maxR * 0.018);
                ctx.lineTo(maxR * 0.024, -maxR * 0.018);
                ctx.moveTo(-maxR * 0.036, maxR * 0.018);
                ctx.lineTo(maxR * 0.036, maxR * 0.018);
                ctx.stroke();
                ctx.restore();
            }

            ctx.restore();
        }

        function getImageMeta(name, defaults = {}) {
            const fallback = { fit: 'contain', x: 50, y: 50, scale: 1, ...defaults };
            if (!name) return fallback;
            return { ...fallback, ...(IMAGE_META[name] || {}) };
        }

        function remapImageMetaForPlacement(meta, placement = '') {
            const next = { ...meta };
            if (placement === 'left-half') {
                next.x = (meta.x ?? 50) / 2;
            } else if (placement === 'right-half') {
                next.x = 50 + ((meta.x ?? 50) / 2);
            } else if (placement === 'mvp-left-fade') {
                next.x = ((meta.x ?? 50) * 0.58);
            }
            return next;
        }

        function applyImageMeta(imgEl, imageName, defaults = {}, includeScale = true, placement = '') {
            const meta = getImageMeta(imageName, defaults);
            const displayMeta = remapImageMetaForPlacement(meta, placement);
            imgEl.style.objectFit = displayMeta.fit || defaults.fit || 'contain';
            imgEl.style.objectPosition = `${displayMeta.x ?? 50}% ${displayMeta.y ?? 50}%`;
            imgEl.style.transformOrigin = `${displayMeta.x ?? 50}% ${displayMeta.y ?? 50}%`;
            imgEl.dataset.userScale = String(includeScale ? (meta.scale ?? 1) : 1);
            imgEl.style.setProperty('--user-image-scale', String(includeScale ? (meta.scale ?? 1) : 1));
            imgEl.dataset.imageMetaName = imageName || '';
            imgEl.dataset.imagePlacement = placement || '';
            return meta;
        }

        function setElementUserScale(imgEl, baseTransform = '') {
            const scale = parseFloat(imgEl.dataset.userScale || '1');
            imgEl.style.transform = `${baseTransform} scale(${scale})`.trim();
        }

        function setPhotoTransform(photoEl, baseTransform) {
            const scale = parseFloat(photoEl.dataset.userScale || '1');
            photoEl.style.transform = `${baseTransform} scale(${scale})`;
        }

        function loadNamedImage(baseNames, onLoad, onMissing, canApply = () => true) {
            const bases = Array.isArray(baseNames) ? baseNames : [baseNames];
            const normalizedBases = bases.map(base => String(base || '').trim()).filter(Boolean);
            if (!normalizedBases.length) {
                if (onMissing && canApply()) onMissing();
                return;
            }

            if (normalizedBases.length === 1) {
                const onlyBase = normalizedBases[0];
                if (namedImageMissingCache.has(onlyBase) && !namedImageCache.has(onlyBase)) {
                    if (onMissing && canApply()) onMissing();
                    return;
                }
            }

            const extensions = ['webp', 'jpg', 'png', 'jpeg'];
            const candidates = [];
            normalizedBases.forEach(base => {
                const cached = namedImageCache.get(base);
                if (cached) candidates.push(cached);
                extensions.forEach(ext => {
                    const candidate = { base, name: `${base}.${ext}`, url: `/assets/images/${base}.${ext}` };
                    if (cached && cached.name === candidate.name) return;
                    candidates.push(candidate);
                });
            });
            const tryNext = index => {
                if (!canApply()) return;
                if (index >= candidates.length) {
                    if (normalizedBases.length === 1) {
                        namedImageMissingCache.add(normalizedBases[0]);
                    }
                    if (onMissing && canApply()) onMissing();
                    return;
                }
                const candidate = candidates[index];
                const img = new Image();
                img.onload = () => {
                    if (!canApply()) return;
                    namedImageMissingCache.delete(candidate.base);
                    if (candidate.base) namedImageCache.set(candidate.base, candidate);
                    onLoad(candidate);
                };
                img.onerror = () => {
                    if (!canApply()) return;
                    if (candidate.base) {
                        const cached = namedImageCache.get(candidate.base);
                        if (cached && cached.name === candidate.name) {
                            namedImageCache.delete(candidate.base);
                        }
                    }
                    tryNext(index + 1);
                };
                img.src = candidate.url;
            };
            tryNext(0);
        }

        function getLeadInDurationMs() {
            return Math.max(5200, Number(CONFIG.INTRO_WAIT_TIME) || 0);
        }

        function clearUiTransitionTimers() {
            uiTransitionTimerIds.forEach(id => clearTimeout(id));
            uiTransitionTimerIds = [];
        }

        function removeUiTransitionTimer(id) {
            const idx = uiTransitionTimerIds.indexOf(id);
            if (idx !== -1) uiTransitionTimerIds.splice(idx, 1);
        }

        function beginUiTransitionSession() {
            uiTransitionSession += 1;
            clearUiTransitionTimers();
            return uiTransitionSession;
        }

        function isUiTransitionActive(sessionId) {
            return sessionId === uiTransitionSession;
        }

        function queueUiTransitionTimer(sessionId, fn, delay) {
            const timerId = setTimeout(() => {
                removeUiTransitionTimer(timerId);
                if (!isUiTransitionActive(sessionId)) return;
                fn();
            }, Math.max(0, delay));
            uiTransitionTimerIds.push(timerId);
            return timerId;
        }

        function clearIntroSequenceTimers() {
            introSequenceTimers.forEach(timer => clearTimeout(timer));
            introSequenceTimers = [];
        }

        function queueIntroSequenceTimer(fn, delay) {
            const timer = setTimeout(fn, delay);
            introSequenceTimers.push(timer);
            return timer;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function applyTextById(id, value) {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = value;
        }

        function applyBrandTexts() {
            applyTextById('brandTopRightText', CONFIG.BRAND_TOP_RIGHT_TEXT);
            applyTextById('brandBottomLeftText', CONFIG.BRAND_BOTTOM_LEFT_TEXT);
            applyTextById('brandWatermarkCn', CONFIG.BRAND_WATERMARK_CN);
            applyTextById('brandWatermarkEn', CONFIG.BRAND_WATERMARK_EN);
            applyTextById('introTitleMain', CONFIG.INTRO_TITLE_MAIN);
            applyTextById('introTitleSub', CONFIG.INTRO_TITLE_SUB);
        }

        function getIntroMaxLabel(index) {
            if (CONFIG.REAL_PERCENTAGE && CONFIG.REAL_PERCENTAGE[index]) {
                const maxValue = Number(CONFIG.BASE_MAX_SCORES[index] ?? 0);
                if (!Number.isFinite(maxValue)) return '--';
                const text = Number.isInteger(maxValue)
                    ? String(maxValue)
                    : String(parseFloat(maxValue.toFixed(2)));
                return `${text}%`;
            }
            if (CONFIG.USE_PERCENTAGE && CONFIG.USE_PERCENTAGE[index]) return '100%';
            const maxValue = Number(CONFIG.BASE_MAX_SCORES[index] ?? 0);
            if (!Number.isFinite(maxValue)) return '--';
            return Number.isInteger(maxValue)
                ? String(maxValue)
                : String(parseFloat(maxValue.toFixed(2)));
        }

        function buildIntroRadarGuide() {
            const svg = document.getElementById("introRadarSvg");
            const labels = document.getElementById("introGuideLabels");
            if (!svg || !labels) return;

            const count = getNormalizedVertexCount(CONFIG.VERTEX_COUNT);
            if (document.getElementById('introOverlay')?.classList.contains('s2-intro')) {
                buildS2IntroGuide({ config: CONFIG, averages: avgScorePerDim,
                    ratios: Array.from({ length: count }, (_, i) => getRadarRatio(avgScorePerDim[i] ?? 0, i)),
                    count, scope });
                return;
            }
            const center = 300;
            const radius = 160;
            const layers = Math.max(4, Math.min(6, Number(CONFIG.RADAR_GRID_LEVELS) || 5));
            const sampleRatios = Array.from({ length: count }, () => 1);
            const averageRatios = Array.from({ length: count }, (_, i) =>
                getRadarRatio(avgScorePerDim[i] ?? 0, i)
            );
            const angleStep = (Math.PI * 2) / count;

            const pointAt = (ratio, index, baseRadius = radius) => {
                const angle = -Math.PI / 2 + angleStep * index;
                return {
                    x: center + Math.cos(angle) * baseRadius * ratio,
                    y: center + Math.sin(angle) * baseRadius * ratio,
                    angle
                };
            };

            const gridMarkup = [];
            for (let layer = 1; layer <= layers; layer++) {
                const ringRatio = layer / layers;
                const points = Array.from({ length: count }, (_, i) => {
                    const pt = pointAt(ringRatio, i);
                    return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
                }).join(' ');
                gridMarkup.push(
                    `<polygon class="intro-radar-grid-line${layer === layers ? ' outer' : ''}" points="${points}" stroke-width="${layer === layers ? '2.1' : '1.3'}"></polygon>`
                );
            }

            const axisMarkup = Array.from({ length: count }, (_, i) => {
                const pt = pointAt(1, i);
                return `<line class="intro-radar-axis-line" x1="${center}" y1="${center}" x2="${pt.x.toFixed(2)}" y2="${pt.y.toFixed(2)}" stroke-width="1.1"></line>`;
            }).join('');

            const shapePoints = Array.from({ length: count }, (_, i) => {
                const pt = pointAt(sampleRatios[i], i);
                return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
            }).join(' ');
            const averagePoints = Array.from({ length: count }, (_, i) => {
                const pt = pointAt(averageRatios[i], i);
                return `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
            }).join(' ');
            const averageLabelPoint = pointAt(Math.max(...averageRatios, 0.4), 0);
            const averageLabelX = Math.min(520, averageLabelPoint.x + 18);
            const averageLabelY = Math.max(46, averageLabelPoint.y - 10);

            svg.innerHTML = `
                <defs>
                    <radialGradient id="introRadarFill" cx="50%" cy="46%" r="58%">
                        <stop offset="0%" stop-color="#f1fbff" stop-opacity="0.36"></stop>
                        <stop offset="45%" stop-color="#95e0ff" stop-opacity="0.22"></stop>
                        <stop offset="100%" stop-color="#6eceff" stop-opacity="0.02"></stop>
                    </radialGradient>
                </defs>
                <g>
                    ${gridMarkup.join('')}
                    ${axisMarkup}
                    <polygon class="intro-radar-average-fill" points="${averagePoints}"></polygon>
                    <polygon class="intro-radar-average-stroke" points="${averagePoints}"></polygon>
                    <polygon class="intro-radar-shape-glow" points="${shapePoints}"></polygon>
                    <polygon class="intro-radar-shape-fill" points="${shapePoints}" fill="url(#introRadarFill)"></polygon>
                    <polygon class="intro-radar-shape-stroke" points="${shapePoints}"></polygon>
                    <circle cx="${center}" cy="${center}" r="5" fill="rgba(244,251,255,0.96)"></circle>
                    <text class="intro-radar-average-label" x="${averageLabelX.toFixed(2)}" y="${averageLabelY.toFixed(2)}">平均值</text>
                </g>
            `;

            labels.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + angleStep * i;
                const left = 50 + Math.cos(angle) * 48.5;
                const top = 50 + Math.sin(angle) * 48.5;
                let alignClass = '';
                if (Math.cos(angle) > 0.22) alignClass = 'left';
                else if (Math.cos(angle) < -0.22) alignClass = 'right';

                const dimName = CONFIG.DIM_NAMES[i] || `维度 ${i + 1}`;
                const item = document.createElement('div');
                item.className = `intro-guide-axis ${alignClass}`.trim();
                item.style.left = `${left}%`;
                item.style.top = `${top}%`;
                item.innerHTML = `
                    <span class="intro-guide-axis-name">${escapeHtml(dimName)}</span>
                    <span class="intro-guide-axis-max">${escapeHtml(getIntroMaxLabel(i))}</span>
                `;
                labels.appendChild(item);
            }
        }

        function getAudioTimeForContentMs(contentMs, audioDuration = 0) {
            const mapped = MusicTimeline.mapContentMsToAudioSeconds(
                contentMs,
                getLeadInDurationMs(),
                getMusicDelaySeconds()
            );
            if (audioDuration > 0) return mapped % audioDuration;
            return mapped;
        }

        function getAudioElapsedSeconds(audio) {
            if (!audio) return NaN;
            const currentTime = Number(audio.currentTime);
            if (!Number.isFinite(currentTime) || currentTime < 0) return NaN;

            const cycleDuration = getPlaylistCycleDuration(audio);
            if (musicPlaylist.length <= 1) {
                return cycleDuration > 0
                    ? musicPlaybackCycles * cycleDuration + currentTime
                    : currentTime;
            }

            if (!(cycleDuration > 0)) return NaN;
            let elapsed = musicPlaybackCycles * cycleDuration + currentTime;
            for (let i = 0; i < currentMusicTrackIndex; i++) {
                elapsed += musicTrackDurations[i] || 0;
            }
            return elapsed;
        }

        function getContentTimeFromAudio(audio) {
            if (!musicDelayStarted || audio?.paused) return NaN;
            const elapsed = getAudioElapsedSeconds(audio);
            if (!Number.isFinite(elapsed)) return NaN;
            return MusicTimeline.mapAudioSecondsToContentMs(
                elapsed,
                getLeadInDurationMs(),
                getMusicDelaySeconds()
            );
        }

        function syncContentTimeFromAudio() {
            const audio = document.getElementById("bgMusic");
            if (!audio) return false;
            const contentMs = getContentTimeFromAudio(audio);
            if (!Number.isFinite(contentMs)) return false;
            globalCurrentTime = Math.max(0, Math.min(totalDuration, contentMs));
            return true;
        }

        function syncAudioToContentTime(contentMs = globalCurrentTime) {
            const audio = document.getElementById("bgMusic");
            if (!audio) return;
            musicSessionActive = true;
            musicIntroActive = false;
            const presentationMs = MusicTimeline.getPresentationTimeMs(
                contentMs,
                getLeadInDurationMs()
            );
            if (presentationMs < MusicTimeline.getDelayMs(getMusicDelaySeconds())) {
                holdMusicAtDelayStart(audio);
                return;
            }
            const mappedSeconds = getAudioTimeForContentMs(contentMs, 0);
            const cycleDuration = getPlaylistCycleDuration(audio);
            musicPlaybackCycles = cycleDuration > 0 ? Math.floor(mappedSeconds / cycleDuration) : 0;
            const pos = mapContentSecondsToPlaylistPosition(mappedSeconds, audio);
            setMusicTrack(audio, pos.trackIndex, pos.time, false);
            musicDelayStarted = true;
            applyMusicVolume();
        }

        function clearGachaTimers() {
            gachaTimerIds.forEach(id => clearTimeout(id));
            gachaTimerIds = [];
        }

        function queueGachaTimer(sessionId, fn, delay) {
            const timerId = setTimeout(() => {
                if (sessionId !== gachaAnimationSession) return;
                fn();
            }, Math.max(0, delay));
            gachaTimerIds.push(timerId);
            return timerId;
        }

        function resetGachaOverlayState() {
            const overlay = document.getElementById('gachaOverlay');
            const panelTop = document.getElementById('gachaPanelTop');
            const panelBottom = document.getElementById('gachaPanelBottom');
            const logo = document.getElementById('gachaLogo');
            const bgImg = document.getElementById('gachaBgImg');
            const nameEl = document.getElementById('gachaName');
            if (!overlay || !panelTop || !panelBottom || !logo || !bgImg || !nameEl) return;

            overlay.classList.remove('active', 'gacha-fadeout');
            overlay.classList.remove('gacha-type-0', 'gacha-type-1', 'gacha-type-2');
            overlay.classList.remove('gacha-band-silverwolf');
            overlay.style.removeProperty('--gacha-accent');
            panelTop.classList.remove('open');
            panelBottom.classList.remove('open');
            logo.classList.remove('show');
            bgImg.classList.remove('show');
            bgImg.style.removeProperty('transform');
            bgImg.style.removeProperty('filter');
            bgImg.removeAttribute('src');
            nameEl.classList.remove('show');
            nameEl.className = 'gacha-name';
        }

        function cancelGachaAnimation() {
            gachaAnimationSession += 1;
            clearGachaTimers();
            resetGachaOverlayState();
            gachaPlaying = false;
        }

        function shouldPlayGachaForBand(band, index = -1, isFirst = false) {
            if (isFirst) return false;
            if (index === 0) return false;
            return !!band?.gacha;
        }

        function getBandGachaPauseDuration(band, index = -1) {
            if (!shouldPlayGachaForBand(band, index, false)) return 0;
            const profile = getBandSpecialProfile(band);
            const duration = profile?.transitions?.gachaDuration || CONFIG.GACHA_ANIM_DURATION || 4500;
            return Math.max(duration, 2200) + 800;
        }

        function getBandTimelineDuration(band, index = -1) {
            return Math.max(0, Number(band?.duration) || 0) + getBandGachaPauseDuration(band, index);
        }

        function bandHasBest(band) {
            return band.points.some((value, index) => normalizeScore(value, index) >= bestScorePerDim[index]);
        }

        function syncCurrentBandToTimeline() {
            if (gachaPlaying) return;
            const currentSegment = getTimeSegmentAt(globalCurrentTime, false);
            if (currentSegment && currentSegment.bandIndex !== currentIndex) {
                const prevBand = getTransitionPrevBandForIndex(currentSegment.bandIndex);
                currentIndex = currentSegment.bandIndex;
                updateUI(bands[currentIndex], currentIndex === 0 && globalCurrentTime < 1000, prevBand);
            }
        }

        function clearRadarLabelRevealTimer() {
            if (radarLabelRevealTimer) {
                clearTimeout(radarLabelRevealTimer);
                radarLabelRevealTimer = null;
            }
        }

        function resetRadarLabelRevealState(hidden = false, useTargetValues = false) {
            clearRadarLabelRevealTimer();
            radarLabelRevealActive = false;
            radarLabelRevealHidden = hidden;
            radarLabelUseTargetValues = useTargetValues;
            radarLabelRevealStartTime = 0;
        }

        function queueRadarLabelReveal(delay, useTargetValues = true) {
            clearRadarLabelRevealTimer();
            radarLabelRevealHidden = true;
            radarLabelRevealActive = false;
            radarLabelUseTargetValues = useTargetValues;
            radarLabelRevealTimer = setTimeout(() => {
                radarLabelRevealHidden = false;
                radarLabelRevealActive = true;
                radarLabelRevealStartTime = performance.now();
                radarLabelRevealTimer = null;
            }, Math.max(0, delay));
        }

        function getRadarLabelMotion(index) {
            if (radarLabelRevealHidden) {
                return { visible: false, alpha: 0, offsetY: -RADAR_LABEL_SLAM_OFFSET };
            }
            if (!radarLabelRevealActive) {
                return { visible: true, alpha: 1, offsetY: 0 };
            }

            const elapsed = performance.now() - radarLabelRevealStartTime - index * RADAR_LABEL_SLAM_STAGGER;
            if (elapsed <= 0) {
                return { visible: false, alpha: 0, offsetY: -RADAR_LABEL_SLAM_OFFSET };
            }

            const t = clampNumber(elapsed / RADAR_LABEL_SLAM_DURATION, 0, 1);
            return {
                visible: true,
                alpha: t,
                offsetY: 0
            };
        }

        function getBestRevealFlash(index) {
            if (!radarLabelRevealActive || !radarLabelUseTargetValues) return 0;
            const elapsed = performance.now() - radarLabelRevealStartTime - index * RADAR_LABEL_SLAM_STAGGER;
            if (elapsed <= 0 || elapsed >= RADAR_BEST_FLASH_DURATION) return 0;
            const t = clampNumber(elapsed / RADAR_BEST_FLASH_DURATION, 0, 1);
            const pulse = Math.max(0, Math.sin(t * Math.PI * 4.25));
            return pulse * (1 - t);
        }

        function hideRadar() {
            if (radarRevealTimer) {
                clearTimeout(radarRevealTimer);
                radarRevealTimer = null;
            }
            clearRadarLabelRevealTimer();
            hideRadarBackgroundCleaner();
            radarVisible = false;
            radarCanvas.classList.remove("radar-reveal");
            radarCanvas.classList.add("radar-hidden");
            clearRadarCanvas();
        }

        function queueRadarReveal(nextStartScores, nextTargetScores, delay) {
            hideRadar();
            startScores = [...nextStartScores];
            currentScores = [...nextStartScores];
            targetScores = [...nextTargetScores];
            animProgress = 1;

            radarRevealTimer = setTimeout(() => {
                startScores = [...nextStartScores];
                currentScores = [...nextStartScores];
                targetScores = [...nextTargetScores];
                animProgress = 0;
                animStartTime = performance.now();
                radarVisible = true;
                radarCanvas.classList.remove("radar-hidden");
                radarCanvas.classList.remove("radar-reveal");
                void radarCanvas.offsetWidth;
                radarCanvas.classList.add("radar-reveal");
                setTimeout(() => radarCanvas.classList.remove("radar-reveal"), 820);
                radarRevealTimer = null;
            }, delay);
        }

        function computeRadarLayout(scores) {
            const logicalMetrics = getRadarLogicalMetrics();
            const w = logicalMetrics.width;
            const h = logicalMetrics.height;
            const baseCenterX = w / 2;
            const baseCenterY = h / 2;
            const baseMaxR = 1000 * 0.4 * CONFIG.RADAR_SCALE;
            const safePadding = 135;
            const labelPadX = 150;
            const labelPadY = 74;
            const vertices = getRadarVertices(CONFIG.VERTEX_COUNT);

            const ratios = Array.from({ length: vertices.length }, (_, i) =>
                getRadarRatio(scores[i] ?? 0, i)
            );

            const measureBounds = (scale) => {
                let minX = Infinity;
                let maxX = -Infinity;
                let minY = Infinity;
                let maxY = -Infinity;
                const scaledMaxR = baseMaxR * scale;
                const scaledLabelRadius = (baseMaxR + CONFIG.LABEL_MARGIN) * scale;

                for (let i = 0; i < vertices.length; i++) {
                    const vertex = vertices[i];
                    const px = baseCenterX + scaledMaxR * ratios[i] * vertex.cos;
                    const py = baseCenterY + scaledMaxR * ratios[i] * vertex.sin;
                    minX = Math.min(minX, px);
                    maxX = Math.max(maxX, px);
                    minY = Math.min(minY, py);
                    maxY = Math.max(maxY, py);

                    const lx = baseCenterX + scaledLabelRadius * vertex.cos;
                    const ly = baseCenterY + scaledLabelRadius * vertex.sin;
                    minX = Math.min(minX, lx - labelPadX);
                    maxX = Math.max(maxX, lx + labelPadX);
                    minY = Math.min(minY, ly - labelPadY);
                    maxY = Math.max(maxY, ly + labelPadY);
                }

                return { minX, maxX, minY, maxY };
            };

            const baseBounds = measureBounds(1);
            const contentWidth = Math.max(baseBounds.maxX - baseBounds.minX, 1);
            const contentHeight = Math.max(baseBounds.maxY - baseBounds.minY, 1);
            const fitScale = Math.min(1, (w - safePadding * 2) / contentWidth, (h - safePadding * 2) / contentHeight);
            const scaledBounds = measureBounds(fitScale);

            let offsetX = 0;
            let offsetY = 0;
            if (scaledBounds.minX < safePadding) offsetX += safePadding - scaledBounds.minX;
            if (scaledBounds.maxX > w - safePadding) offsetX -= scaledBounds.maxX - (w - safePadding);
            if (scaledBounds.minY < safePadding) offsetY += safePadding - scaledBounds.minY;
            if (scaledBounds.maxY > h - safePadding) offsetY -= scaledBounds.maxY - (h - safePadding);
            if (!CONFIG.RADAR_AUTO_OFFSET) {
                offsetX = 0;
                offsetY = 0;
            }
            return {
                centerX: baseCenterX + offsetX,
                centerY: baseCenterY + offsetY,
                maxR: baseMaxR * fitScale,
                labelRadius: (baseMaxR + CONFIG.LABEL_MARGIN) * fitScale,
                ratios,
                vertices
            };
        }

        function resizeCanvas() {
            syncPresentationLayout();
            syncRadarCanvasResolution();
            const scale = getCurrentRenderScale();
            pCanvasScaleApplied = scale;
            pCanvas.width = Math.max(2, Math.round(window.innerWidth * scale));
            pCanvas.height = Math.max(2, Math.round(window.innerHeight * scale));
            pCanvas.style.width = `${window.innerWidth}px`;
            pCanvas.style.height = `${window.innerHeight}px`;
            resizePhotoFxCanvas(true);
        }
        listen(window, "resize", resizeCanvas);
        resizeCanvas();

        function maybeRefreshCanvasScale() {
            const target = getCurrentRenderScale();
            if (Math.abs(target - pCanvasScaleApplied) > 0.08) resizeCanvas();
        }

        function resizePhotoFxCanvas(forceReset = false) {
            if (!photoFxCanvas || !photoFxCtx) return;
            const container = document.getElementById("photoContainer");
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const scale = getCurrentRenderScale();
            const nextW = Math.max(2, Math.round(rect.width * scale));
            const nextH = Math.max(2, Math.round(rect.height * scale));
            if (!forceReset && Math.abs(scale - photoFxScaleApplied) < 0.08 && photoFxCanvas.width === nextW && photoFxCanvas.height === nextH) return;
            photoFxScaleApplied = scale;
            photoFxCanvas.width = nextW;
            photoFxCanvas.height = nextH;
            photoFxCanvas.style.width = `${rect.width}px`;
            photoFxCanvas.style.height = `${rect.height}px`;
            photoFxW = nextW;
            photoFxH = nextH;
            photoFxTicker = 0;
            photoFxCornerPulse = 0;
        }

        function drawBackgroundEffect(deltaTime) {
            if (backgroundEffect) {
                backgroundEffect.render({ canvas: pCanvas, context: pCtx, deltaTime, enabled: isParticlesEnabled });
                if (introBackgroundCtx && !isSpecialPreviewMode && introOverlay.style.display !== "none") {
                    // Use the same composited frame on both sides of the opening fade.
                    if (introBackground.width !== pCanvas.width) introBackground.width = pCanvas.width;
                    if (introBackground.height !== pCanvas.height) introBackground.height = pCanvas.height;
                    introBackgroundCtx.drawImage(pCanvas, 0, 0);
                } else if (introBackground?.width) {
                    introBackground.width = 0;
                    introBackground.height = 0;
                }
                return;
            }
            const mode = getBgEffectMode();
            pCanvas.dataset.effectMode = mode;
            pCanvas.dataset.effectEnabled = String(isParticlesEnabled);
            livingFieldCanvas.dataset.effectMode = mode;
            livingFieldCanvas.dataset.effectEnabled = String(isParticlesEnabled);
            backgroundEffectManager.render({
                enabled: isParticlesEnabled,
                mode,
                config: getBgEffectConfig(),
                deltaTime,
                accent: currentThemeColor,
                particleTarget: getBgParticleTarget(),
                qualityScale: getLivingFieldQualityScale(),
                palette: {
                    bg1: currentBgColor1,
                    bg2: currentBgColor2
                },
                audio: {
                    energy: audioVizEnergy,
                    bass: audioVizBass,
                    mid: audioVizMid,
                    treble: audioVizTreble,
                    beat: audioVizBeat
                }
            });
        }

        function drawRoundedRectPath(context, x, y, w, h, r) {
            const radius = Math.min(r, w * 0.5, h * 0.5);
            context.beginPath();
            context.moveTo(x + radius, y);
            context.lineTo(x + w - radius, y);
            context.quadraticCurveTo(x + w, y, x + w, y + radius);
            context.lineTo(x + w, y + h - radius);
            context.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
            context.lineTo(x + radius, y + h);
            context.quadraticCurveTo(x, y + h, x, y + h - radius);
            context.lineTo(x, y + radius);
            context.quadraticCurveTo(x, y, x + radius, y);
            context.closePath();
        }

        function drawHexPath(context, x, y, r, rotate = 0) {
            context.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i / 6) + rotate;
                const px = x + Math.cos(a) * r;
                const py = y + Math.sin(a) * r;
                if (i === 0) context.moveTo(px, py);
                else context.lineTo(px, py);
            }
            context.closePath();
        }

        function drawTechShardPath(context, x, y, w, h, skew = 0.34) {
            const slant = w * skew;
            context.beginPath();
            context.moveTo(x - w * 0.5 + slant * 0.5, y - h * 0.5);
            context.lineTo(x + w * 0.5 + slant * 0.5, y - h * 0.5);
            context.lineTo(x + w * 0.5 - slant * 0.5, y + h * 0.5);
            context.lineTo(x - w * 0.5 - slant * 0.5, y + h * 0.5);
            context.closePath();
        }

        function drawHudCorner(context, x, y, sx, sy, alpha) {
            const longLen = 26;
            const shortLen = 14;
            context.strokeStyle = `rgba(146, 210, 255, ${alpha})`;
            context.lineWidth = 1.2;
            context.beginPath();
            context.moveTo(x, y + sy * longLen);
            context.lineTo(x, y);
            context.lineTo(x + sx * longLen, y);
            context.stroke();

            context.beginPath();
            context.moveTo(x + sx * (longLen + 5), y + sy * 4);
            context.lineTo(x + sx * (longLen + 5 + shortLen), y + sy * 4);
            context.moveTo(x + sx * 4, y + sy * (longLen + 5));
            context.lineTo(x + sx * 4, y + sy * (longLen + 5 + shortLen));
            context.stroke();

            context.fillStyle = `rgba(227, 250, 255, ${alpha * 0.9})`;
            context.fillRect(x + sx * 12 - 1.5, y + sy * 12 - 1.5, 3, 3);
        }

        function updateAndDrawPhotoFx(deltaTime) {
            if (!photoFxCanvas || !photoFxCtx) return;
            if (!photoFxW || !photoFxH) return;

            if (backgroundEffect?.renderPortrait) {
                backgroundEffect.renderPortrait({
                    canvas: photoFxCanvas, context: photoFxCtx,
                    visible: CONFIG.PHOTO_FX_ENABLED && !gachaPlaying && currentIndex >= 0,
                    roleKey: currentIndex, intensity: getPhotoFxIntensity(),
                });
                return;
            }

            if (!CONFIG.PHOTO_FX_ENABLED || gachaPlaying || currentIndex < 0) {
                photoFxCtx.clearRect(0, 0, photoFxW, photoFxH);
                return;
            }

            const intensity = getPhotoFxIntensity();
            const fxQuality = getPhotoQualityScale();
            const beat = clampNumber(audioVizBeat * 0.95 + audioVizBass * 0.4, 0, 1);
            photoFxTicker += deltaTime * 0.0016;
            photoFxBeatCooldown -= deltaTime;
            if (beat > 0.2 && photoFxBeatCooldown <= 0) {
                photoFxCornerPulse = Math.max(photoFxCornerPulse, 0.45 + beat * 0.55);
                photoFxBeatCooldown = 280 - beat * 100;
            }
            photoFxCornerPulse = Math.max(photoFxCornerPulse * 0.94, beat * 0.4);

            photoFxCtx.clearRect(0, 0, photoFxW, photoFxH);
            photoFxCtx.save();
            photoFxCtx.globalCompositeOperation = "lighter";

            // B6: 角色图后数据碎片流
            const shardCount = Math.max(10, Math.round((10 + fxQuality * 10) * (0.82 + intensity * 0.36)));
            const shardAccent = currentThemeColor || "#63e6ff";
            const shardGlow = (0.68 + fxQuality * 0.32);
            for (let i = 0; i < shardCount; i++) {
                const lane = (Math.sin(i * 13.17 + 0.65) + 1) * 0.5;
                const prog = (photoFxTicker * (0.046 + (i % 5) * 0.007) + i * 0.127) % 1;
                const x = -photoFxW * 0.14 + prog * photoFxW * 1.34;
                const y = photoFxH * (0.17 + lane * 0.64) + (0.5 - prog) * (22 + lane * 42);
                const w = (20 + (i % 6) * 6) * (0.92 + beat * 0.32);
                const h = Math.max(5, w * (0.16 + (i % 4) * 0.028));
                const pulse = 0.72 + 0.28 * Math.sin(photoFxTicker * (1.8 + (i % 4) * 0.22) + i * 1.4);
                const alpha = (0.032 + intensity * 0.03 + beat * 0.026) * shardGlow * pulse;

                photoFxCtx.save();
                photoFxCtx.translate(x, y);
                photoFxCtx.rotate(-0.36 + Math.sin(i * 2.7 + photoFxTicker * 0.55) * 0.07);
                photoFxCtx.shadowBlur = (8 + beat * 10) * shardGlow;
                photoFxCtx.shadowColor = hexToRgbA(shardAccent, alpha * 1.4);

                const fillGradient = photoFxCtx.createLinearGradient(-w * 0.7, 0, w * 0.7, 0);
                fillGradient.addColorStop(0, hexToRgbA(shardAccent, 0));
                fillGradient.addColorStop(0.18, hexToRgbA(shardAccent, alpha * 0.54));
                fillGradient.addColorStop(0.5, `rgba(242,251,255,${alpha * 1.18})`);
                fillGradient.addColorStop(0.82, hexToRgbA(shardAccent, alpha * 0.34));
                fillGradient.addColorStop(1, hexToRgbA(shardAccent, 0));

                drawTechShardPath(photoFxCtx, 0, 0, w, h, 0.42);
                photoFxCtx.fillStyle = fillGradient;
                photoFxCtx.fill();
                photoFxCtx.strokeStyle = `rgba(238,250,255,${alpha * 0.5})`;
                photoFxCtx.lineWidth = 0.85;
                photoFxCtx.stroke();

                if (i % 3 === 0) {
                    photoFxCtx.beginPath();
                    photoFxCtx.moveTo(-w * 0.82, 0);
                    photoFxCtx.lineTo(-w * 1.18, 0);
                    photoFxCtx.moveTo(w * 0.82, 0);
                    photoFxCtx.lineTo(w * 1.12, 0);
                    photoFxCtx.strokeStyle = hexToRgbA(shardAccent, alpha * 0.38);
                    photoFxCtx.lineWidth = 0.75;
                    photoFxCtx.stroke();
                }
                photoFxCtx.restore();
            }

            // A3: 六边形网格呼吸
            if (fxQuality > 0.62) {
                const hexR = 18 * (1 + (1 - fxQuality) * 0.52);
                const hexStepX = hexR * 1.68;
                const hexStepY = hexR * 1.46;
                const gridStride = fxQuality < 0.76 ? 2 : 1;
                for (let row = -1; row < Math.ceil(photoFxH / hexStepY) + 1; row += gridStride) {
                    for (let col = -1; col < Math.ceil(photoFxW / hexStepX) + 1; col += gridStride) {
                        const offsetX = (row % 2 === 0) ? 0 : hexStepX * 0.5;
                        const x = col * hexStepX + offsetX;
                        const y = row * hexStepY;
                        const phase = (x * 0.012 + y * 0.016) + photoFxTicker * 1.9;
                        const blink = 0.52 + 0.48 * Math.sin(phase);
                        const a = (0.024 + intensity * 0.02) * blink * (0.72 + fxQuality * 0.28);
                        photoFxCtx.strokeStyle = `rgba(120, 190, 255, ${a})`;
                        photoFxCtx.lineWidth = 1.1;
                        drawHexPath(photoFxCtx, x, y, hexR * (0.95 + 0.05 * blink), photoFxTicker * 0.04);
                        photoFxCtx.stroke();
                    }
                }
            }

            // A10: 边缘霓虹流光
            const edgePad = 5;
            const edgeAlpha = (0.14 + intensity * 0.07) * (0.74 + fxQuality * 0.26);
            photoFxCtx.save();
            drawRoundedRectPath(photoFxCtx, edgePad, edgePad, photoFxW - edgePad * 2, photoFxH - edgePad * 2, 24);
            photoFxCtx.setLineDash([22, 16, 8, 18]);
            photoFxCtx.lineDashOffset = -photoFxTicker * (26 + intensity * 10);
            photoFxCtx.lineWidth = 1.6;
            photoFxCtx.shadowBlur = 12 + beat * 10;
            photoFxCtx.shadowColor = `rgba(99, 230, 255, ${edgeAlpha * 0.9})`;
            photoFxCtx.strokeStyle = `rgba(99, 230, 255, ${edgeAlpha})`;
            photoFxCtx.stroke();
            if (fxQuality > 0.68) {
                photoFxCtx.setLineDash([10, 24]);
                photoFxCtx.lineDashOffset = photoFxTicker * 30;
                photoFxCtx.lineWidth = 1.05;
                photoFxCtx.strokeStyle = `rgba(236, 251, 255, ${0.12 + beat * 0.08})`;
                photoFxCtx.stroke();
            }
            photoFxCtx.restore();

            // A7: 角落 HUD 组件
            if (fxQuality > 0.74) {
                const cAlpha = 0.12 + intensity * 0.08 + photoFxCornerPulse * 0.16;
                drawHudCorner(photoFxCtx, 16, 16, 1, 1, cAlpha);
                drawHudCorner(photoFxCtx, photoFxW - 16, 16, -1, 1, cAlpha);
                drawHudCorner(photoFxCtx, 16, photoFxH - 16, 1, -1, cAlpha);
                drawHudCorner(photoFxCtx, photoFxW - 16, photoFxH - 16, -1, -1, cAlpha);
            }

            photoFxCtx.restore();
        }

        function hexToRgbA(hex, alpha) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})` : `rgba(255,255,255,${alpha})`;
        }

        function lerpColor(c1, c2, t) {
            const r1 = parseInt(c1.substring(1, 3), 16);
            const g1 = parseInt(c1.substring(3, 5), 16);
            const b1 = parseInt(c1.substring(5, 7), 16);
            const r2 = parseInt(c2.substring(1, 3), 16);
            const g2 = parseInt(c2.substring(3, 5), 16);
            const b2 = parseInt(c2.substring(5, 7), 16);
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        function updateTimer() {
            let diff = Math.floor(globalCurrentTime / 1000);
            let h = Math.floor(diff / 3600).toString().padStart(2, '0');
            let m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
            let s = (diff % 60).toString().padStart(2, '0');
            document.getElementById("sessionTimer").textContent = `${h}:${m}:${s}`;
        }

        function setProgressBar(duration) {
            const bar = document.getElementById("progressBar");
            bar.style.transition = 'none';
            bar.style.width = '0%';
            void bar.offsetWidth;
            bar.style.transition = `width ${duration}ms linear, background 2s ease, box-shadow 2s ease`;
            bar.style.width = '100%';
        }

        function setGachaWaveText(nameEl, text) {
            nameEl.innerHTML = '';
            const energy = document.createElement('span');
            energy.className = 'gacha-name-energy';
            const ribbonA = document.createElement('span');
            ribbonA.className = 'gacha-name-ribbon ribbon-a';
            const waveA = document.createElement('span');
            waveA.className = 'gacha-name-particle-wave wave-a';
            const waveB = document.createElement('span');
            waveB.className = 'gacha-name-particle-wave wave-b';
            const textEl = document.createElement('span');
            textEl.className = 'gacha-name-text';
            textEl.textContent = text || '';
            textEl.dataset.text = text || '';
            const ribbonB = document.createElement('span');
            ribbonB.className = 'gacha-name-ribbon ribbon-b';
            const sweep = document.createElement('span');
            sweep.className = 'gacha-name-sweep';
            nameEl.appendChild(energy);
            nameEl.appendChild(ribbonA);
            nameEl.appendChild(waveA);
            nameEl.appendChild(textEl);
            nameEl.appendChild(waveB);
            nameEl.appendChild(ribbonB);
            nameEl.appendChild(sweep);
        }

        function getBandGachaDisplayText(band) {
            const custom = String(band?.gachaText || '').trim();
            if (custom) return custom;
            return getBandDisplayName(band);
        }

        function fadeOutExpertBadge() {
            const badge = document.getElementById('expertBadge');
            if (!badge || badge.hidden) return;
            badge.classList.remove('is-visible');
            badge.classList.add('fade-out');
        }

        function syncExpertBadge(displayName) {
            const badge = document.getElementById('expertBadge');
            if (!badge) return;
            const isExpert = expertlist.includes(String(displayName || '').trim());
            badge.classList.remove('fade-out');
            badge.classList.toggle('is-visible', isExpert);
            badge.hidden = !isExpert;
        }

        /**
         * 播放抽卡出金动画
         * @param {Object} band - 即将展示的乐队数据对象
         * @returns {Promise} 动画完成后 resolve
         */
        function playGachaAnimation(band) {
            return new Promise(resolve => {
                cancelGachaAnimation();
                gachaPlaying = true;
                const sessionId = gachaAnimationSession;
                const overlay = document.getElementById('gachaOverlay');
                const panelTop = document.getElementById('gachaPanelTop');
                const panelBottom = document.getElementById('gachaPanelBottom');
                const logo = document.getElementById('gachaLogo');
                const bgImg = document.getElementById('gachaBgImg');
                const nameEl = document.getElementById('gachaName');
                const animType = 2;
                const displayName = getBandDisplayName(band);
                const displayIdentityBand = displayName && displayName !== band.name
                    ? { ...band, name: displayName }
                    : band;
                const specialProfile = getBandSpecialProfile(displayIdentityBand);
                const specialGachaStyle = specialProfile?.gacha?.style || 'inherit';
                const isSilverWolfGacha = specialGachaStyle === 'silverwolf';
                const overlayTypeClass = `gacha-type-${animType}`;
                const duration = Math.max(
                    specialProfile?.transitions?.gachaDuration || CONFIG.GACHA_ANIM_DURATION || 4500,
                    2200
                );

                const timelineByType = {
                    0: { logoOn: 160, openAt: 1180, bgOn: 1480, nameOn: 2250 },
                    1: { logoOn: 80, openAt: 520, bgOn: 660, nameOn: 980 },
                    2: { logoOn: 120, logoOff: 520, openAt: 700, bgOn: 720, nameOn: 1000 }
                };
                const timeline = { ...(timelineByType[animType] || timelineByType[0]) };
                const logoOnOverride = Number(CONFIG.GACHA_LOGO_ON_TIME);
                if (Number.isFinite(logoOnOverride) && logoOnOverride >= 0) {
                    timeline.logoOn = logoOnOverride;
                }
                const logoDuration = Number(CONFIG.GACHA_LOGO_DURATION);
                if (Number.isFinite(logoDuration) && logoDuration > 0) {
                    timeline.logoOff = timeline.logoOn + logoDuration;
                }

                // 重置状态
                resetGachaOverlayState();
                overlay.offsetWidth;

                const gachaBackgroundName = specialProfile?.assets?.gachaBackgroundName || `best_${displayName || band.name}`;
                loadNamedImage(gachaBackgroundName, candidate => {
                    bgImg.src = candidate.url;
                    applyImageMeta(bgImg, candidate.name, { fit: 'cover', x: 50, y: 50, scale: 1 }, true);
                }, () => {
                    bgImg.src = '';
                }, () => sessionId === gachaAnimationSession);

                // 设置艺术字名称和风格
                setGachaWaveText(nameEl, getBandGachaDisplayText(band));
                if (animType !== 2) {
                    nameEl.classList.add(`gacha-font-${CONFIG.GACHA_FONT_STYLE}`);
                }

                // 显示遮罩
                overlay.classList.add(overlayTypeClass);
                overlay.classList.toggle('gacha-band-silverwolf', isSilverWolfGacha);
                if (specialProfile?.gacha?.accent) {
                    overlay.style.setProperty('--gacha-accent', specialProfile.gacha.accent);
                } else {
                    overlay.style.removeProperty('--gacha-accent');
                }
                overlay.classList.add('active');

                // T+logoOn: 显示 logo
                queueGachaTimer(sessionId, () => logo.classList.add('show'), timeline.logoOn);

                if (timeline.logoOff != null) {
                    queueGachaTimer(sessionId, () => logo.classList.remove('show'), timeline.logoOff);
                }

                // T+openAt: 分屏打开
                queueGachaTimer(sessionId, () => {
                    logo.classList.remove('show');
                    panelTop.classList.add('open');
                    panelBottom.classList.add('open');
                }, timeline.openAt);

                // T+bgOn: 显示背景
                queueGachaTimer(sessionId, () => bgImg.classList.add('show'), timeline.bgOn);

                // T+nameOn: 显示艺术字名称
                queueGachaTimer(sessionId, () => nameEl.classList.add('show'), timeline.nameOn);

                // T+GACHA_ANIM_DURATION: 淡出并清理
                queueGachaTimer(sessionId, () => {
                    overlay.classList.add('gacha-fadeout');
                    queueGachaTimer(sessionId, () => {
                        clearGachaTimers();
                        resetGachaOverlayState();
                        gachaPlaying = false;
                        resolve();
                    }, 800);
                }, duration);
            });
        }

        /**
         * 调度并执行UI的淡出过渡，然后调用核心切换逻辑
         * @param {Object} band - 即将展示的乐队数据对象
         * @param {boolean} isFirst - 是否是初始首次加载
         */
        function updateUI(band, isFirst = false, forcedPrevBand = null) {
            const sessionId = beginUiTransitionSession();
            const nameEl = document.getElementById("bandName");
            const containerEl = document.getElementById("bandDetailContainer");
            const photoEl = document.getElementById("bandPhoto");
            const prevBand = forcedPrevBand || null;
            const isMidPhase = isMidPhaseTransition(prevBand, band);

            // 抽卡出金动画检查
            if (shouldPlayGachaForBand(band, currentIndex, isFirst)) {
                const gachaTargetBand = band;
                const gachaTargetIndex = currentIndex;
                const gachaTargetPrevBand = prevBand;

                hideRadar();

                // 先淡出旧内容
                nameEl.style.animation = 'none';
                containerEl.style.animation = 'none';
                nameEl.classList.add("fade-out");
                fadeOutExpertBadge();
                containerEl.classList.add("fade-out");
                setPhotoTransform(photoEl, "translate3d(88px, 0, 0) scale(0.92)");
                photoEl.style.opacity = "0";

                playGachaAnimation(gachaTargetBand).then(() => {
                    if (!isUiTransitionActive(sessionId)) return;
                    currentIndex = gachaTargetIndex;
                    performTransition(gachaTargetBand, false, sessionId, {
                        postGachaFastReveal: true,
                        prevBand: gachaTargetPrevBand
                    });
                });
                return;
            }

            if (isMidPhase) {
                nameEl.style.animation = 'none';
                containerEl.style.animation = 'none';
                performTransition(band, isFirst, sessionId, { prevBand, isMidPhase });
                return;
            }

            if (!isFirst) {
                nameEl.style.animation = 'none';
                containerEl.style.animation = 'none';
                nameEl.classList.add("fade-out");
                fadeOutExpertBadge();
                containerEl.classList.add("fade-out");
                setPhotoTransform(photoEl, "translate3d(88px, 0, 0) scale(0.92)");
                photoEl.style.opacity = "0";

                queueUiTransitionTimer(sessionId, () => {
                    performTransition(band, isFirst, sessionId, { prevBand, isMidPhase });
                }, 500);
            } else {
                performTransition(band, isFirst, sessionId, { prevBand, isMidPhase });
            }
        }

        /**
         * 核心的视图与数据切换：更换文字、图片加载、应用主题色及计算雷达图目标分数
         * @param {Object} band - 即将展示的乐队数据对象
         * @param {boolean} isFirst - 是否是初始首次加载
         */
        function performTransition(band, isFirst, sessionId = uiTransitionSession, options = {}) {
            if (!isUiTransitionActive(sessionId)) return;
            const nameEl = document.getElementById("bandName");
            const containerEl = document.getElementById("bandDetailContainer");
            const equipmentGridEl = document.getElementById("bandEquipmentGrid");
            const photoContainer = document.querySelector(".band-photo-container");
            const photoEl = document.getElementById("bandPhoto");
            const mvpContainer = document.getElementById("mvpBgContainer");
            const prevBand = options.prevBand || null;
            const isMidPhase = options.isMidPhase === true || isMidPhaseTransition(prevBand, band);
            const displayName = getBandDisplayName(band);
            const displayIdentityBand = displayName && displayName !== band.name
                ? { ...band, name: displayName }
                : band;
            const specialProfile = getBandSpecialProfile(displayIdentityBand);
            const radarTransition = specialProfile?.effects?.radarTransition || 'default';
            const shouldCenterReveal = radarTransition === 'morph'
                ? isFirst
                : isFirst
                    || bandHasBest(band)
                    || radarTransition === 'center-reveal'
                    || radarTransition === 'pulse';
            const shouldUsePostGachaTiming = !!options.postGachaFastReveal && shouldCenterReveal;
            let centerRevealQueued = false;

            // MVP 底图逻辑
            const isMvp = mvplist.includes(displayName);
            const fallbackTheme = isMvp ? MVP_THEME : band;
            const themeColor = specialProfile?.theme?.color || fallbackTheme.color;
            const bgColor1 = specialProfile?.theme?.bg1 || fallbackTheme.bg1;
            const bgColor2 = specialProfile?.theme?.bg2 || fallbackTheme.bg2;

            applySpecialProfile(specialProfile);
            ANIM_DURATION = Math.max(100, Number(specialProfile?.transitions?.radarDuration) || CONFIG.ANIM_DURATION);
            targetThemeColor = themeColor;
            currentBgColor1 = bgColor1;
            currentBgColor2 = bgColor2;
            document.documentElement.style.setProperty('--theme-color', themeColor);
            document.documentElement.style.setProperty('--bg-color-1', bgColor1);
            document.documentElement.style.setProperty('--bg-color-2', bgColor2);

            nameEl.classList.remove("fade-out");
            containerEl.classList.remove("fade-out");
            setBandDetailMode('hidden');
            containerEl.style.display = "none";
            if (equipmentGridEl) equipmentGridEl.innerHTML = '';
            photoContainer.querySelectorAll('.band-photo-variant').forEach(node => node.remove());
            photoEl.style.filter = specialProfile?.effects?.photoTransition === 'glitch'
                ? 'blur(8px) hue-rotate(22deg) saturate(1.25)'
                : specialProfile?.effects?.photoTransition === 'zoom'
                    ? 'blur(4px)'
                    : 'blur(0)';
            if (isMidPhase) {
                photoEl.style.transition = 'none';
                photoEl.style.opacity = "0";
                setPhotoTransform(photoEl, "translate3d(0, 0, 0)");
            } else {
                photoEl.style.transition = getSpecialPhotoTransitionCss(specialProfile);
                photoEl.style.opacity = "0";
                setPhotoTransform(photoEl, getSpecialPhotoStartTransform(specialProfile));
            }
            clearPhotoWipeLayer(photoContainer);

            // 根据配置调整图片容器高度以改变“外界大小”
            // 默认 380px 为 1.0 比例的基准高度
            photoContainer.style.height = `${380 * CONFIG.IMAGE_SCALE}px`;
            resizePhotoFxCanvas(true);

            const oldMvpImg = mvpContainer.querySelector(".mvp-bg-image.active");
            mvpContainer.classList.toggle("mvp-active", isMvp);

            if (oldMvpImg) {
                oldMvpImg.classList.remove("active");
                oldMvpImg.classList.add("exit");
                setTimeout(() => oldMvpImg.remove(), 2000);
            }

            if (isMvp) {
                const img = document.createElement("img");
                img.className = "mvp-bg-image";
                img.src = ""; 
                mvpContainer.appendChild(img);
                loadNamedImage(`${displayName}1`, candidate => {
                    if (!isUiTransitionActive(sessionId)) return;
                    img.src = candidate.url;
                    applyImageMeta(img, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true, 'mvp-left-fade');
                    // 略微延迟以确保 DOM 渲染后触发 CSS 动画
                    requestAnimationFrame(() => {
                        if (!isUiTransitionActive(sessionId)) return;
                        img.classList.add("active");
                    });
                }, null, () => isUiTransitionActive(sessionId));
            }

            if (!isFirst && !isMidPhase) {
                void nameEl.offsetWidth;
                void containerEl.offsetWidth;
            }

            // 带 Best 的条目从中心整体展开；普通条目则直接从上一张雷达图形状平滑变形
            const zeroScores = Array(CONFIG.VERTEX_COUNT).fill(0);
            targetScores = band.points.map((v, i) => normalizeScore(v, i));
            const startCenterReveal = (delayOverride = null) => {
                if (centerRevealQueued || !isUiTransitionActive(sessionId)) return;
                centerRevealQueued = true;
                startScores = [...zeroScores];
                const revealDelay = delayOverride ?? (isFirst ? RADAR_FIRST_REVEAL_DELAY : RADAR_REVEAL_DELAY);
                queueRadarReveal(startScores, targetScores, revealDelay);
                if (shouldUsePostGachaTiming) {
                    const labelDelay = revealDelay + Math.max(420, Math.round(ANIM_DURATION * 0.58));
                    queueRadarLabelReveal(labelDelay, true);
                } else {
                    resetRadarLabelRevealState(false, false);
                }
            };
            if (shouldCenterReveal) {
                if (shouldUsePostGachaTiming) {
                    resetRadarLabelRevealState(true, true);
                    queueUiTransitionTimer(sessionId, () => {
                        startCenterReveal(RADAR_POST_GACHA_REVEAL_FALLBACK);
                    }, RADAR_POST_GACHA_REVEAL_FALLBACK);
                } else {
                    startCenterReveal();
                }
            } else {
                resetRadarLabelRevealState(false, false);
                if (radarRevealTimer) {
                    clearTimeout(radarRevealTimer);
                    radarRevealTimer = null;
                }
                radarVisible = true;
                radarCanvas.classList.remove("radar-hidden");
                radarCanvas.classList.remove("radar-reveal");
                startScores = [...currentScores];
                currentScores = [...startScores];
                animProgress = 0;
                animStartTime = performance.now();
            }

            nameEl.textContent = displayName;
            syncExpertBadge(displayName);
            renderBondIcons(band.desc || '', sessionId);

            if (!isMidPhase) {
                nameEl.style.animation = getSpecialNameAnimation(specialProfile);
                containerEl.style.animation = "descEntrance 1s ease-out 0.3s both";
            }

            const photoName = getBandPhotoName(band, globalCurrentTime);
            loadNamedImage(photoName, candidate => {
                if (!isUiTransitionActive(sessionId)) return;
                if (isMidPhase && prevBand) {
                    const oldPhotoName = String(photoEl.dataset.photoBandName || prevBand.photoName || prevBand.name || '').trim() || photoName;
                    const oldPhotoSrc = photoEl.currentSrc || photoEl.src || '';
                    const oldCandidate = oldPhotoSrc
                        ? { url: oldPhotoSrc, name: oldPhotoName }
                        : null;
                    if (oldCandidate) {
                        createPhotoWipeLayer(
                            photoContainer,
                            oldCandidate,
                            candidate,
                            sessionId,
                            () => {
                                if (!isUiTransitionActive(sessionId)) return;
                                photoEl.style.transition = getSpecialPhotoTransitionCss(specialProfile);
                            },
                            () => {
                                if (!isUiTransitionActive(sessionId)) return;
                                photoEl.style.transition = 'none';
                                photoEl.src = candidate.url;
                                photoEl.dataset.photoBandName = photoName;
                                applyImageMeta(photoEl, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
                                photoEl.style.opacity = '1';
                                photoEl.style.filter = 'blur(0)';
                                setPhotoTransform(photoEl, "translate3d(0, 0, 0)");
                            }
                        );
                    } else {
                        photoEl.src = candidate.url;
                        photoEl.dataset.photoBandName = photoName;
                        applyImageMeta(photoEl, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
                        photoEl.style.transition = getSpecialPhotoTransitionCss(specialProfile);
                        photoEl.style.opacity = '1';
                        photoEl.style.filter = 'blur(0)';
                        setPhotoTransform(photoEl, "translate3d(0, 0, 0)");
                        clearPhotoWipeLayer(photoContainer);
                    }
                } else {
                    photoEl.src = candidate.url;
                    photoEl.dataset.photoBandName = photoName;
                    applyImageMeta(photoEl, candidate.name, { fit: 'contain', x: 50, y: 50, scale: 1 }, true);
                    setPhotoTransform(photoEl, "translate3d(0, 0, 0)");
                    photoEl.style.filter = 'blur(0)';
                    photoEl.style.opacity = "1";
                    clearPhotoWipeLayer(photoContainer);
                }

                if (shouldUsePostGachaTiming) {
                    startCenterReveal(RADAR_POST_GACHA_REVEAL_DELAY);
                }
            }, () => {
                if (!isUiTransitionActive(sessionId)) return;
                photoEl.style.opacity = "0";
                clearPhotoWipeLayer(photoContainer);
                if (shouldUsePostGachaTiming) {
                    startCenterReveal(RADAR_POST_GACHA_REVEAL_DELAY);
                }
            }, () => isUiTransitionActive(sessionId));

            // 获取当前乐队相对于当前总进度的剩余时间
            const segment = getTimeSegmentByBandIndex(currentIndex);
            const remainingInSegment = segment ? (segment.end - globalCurrentTime) : band.duration;
            setProgressBar(remainingInSegment > 0 ? remainingInSegment : band.duration);

            if (renderEquipmentIcons(band, sessionId)) {
                showBandAttachmentContainer(containerEl);
                setBandDetailMode('attachment');
            } else {
                containerEl.style.display = "none";
                setBandDetailMode('hidden');
            }

            prewarmUpcomingBandAssets(currentIndex, 2);
        }

        /**
         * 负责在 Canvas 上绘制六维雷达图、背景网格、连接线及其光晕特效
         */
        function drawRadar() {
            const logicalMetrics = getRadarLogicalMetrics();
            const w = logicalMetrics.width;
            const h = logicalMetrics.height;
            clearRadarCanvas();
            if (!radarVisible || currentIndex < 0) return;
            ctx.setTransform(logicalMetrics.scale, 0, 0, logicalMetrics.scale, 0, 0);

            const currentBand = bands[currentIndex];
            const isMvpRadar = !!currentBand?.isGoat && !activeSpecialProfile;
            const isJikoMvpRadar = isMvpRadar
                && getBandDisplayName(currentBand) === '姬子·启行';
            const radarAccentColor = isMvpRadar ? '#ffd86a' : currentThemeColor;
            const radarCoreColor = isMvpRadar ? '#fffaf0' : '#fff';
            const radarLabelColor = isMvpRadar ? '#fff5da' : '#fff';
            const radarGridCoreColor = isMvpRadar ? '#fff1bf' : '#fff';
            const radarGridHighlightColor = isMvpRadar ? '#fffdf5' : '#fff';
            const radarTextStrokeColor = isMvpRadar ? 'rgba(122, 82, 18, 0.72)' : 'rgba(0,0,0,0)';
            const configuredBestColor = CONFIG.BEST_COLOR || '#fff2a6';
            const bestTextColor = String(configuredBestColor).toLowerCase() === '#ffd700'
                ? '#fff2a6'
                : configuredBestColor;
            const bestBrightColor = '#fff8cc';
            const bestGlowColor = '#ffe36f';
            const bestLabelFont = CONFIG.BEST_LABEL_FONT || 'italic 800 36px "Cormorant Garamond", "Georgia", "Times New Roman", serif';
            const bestValueFont = CONFIG.BEST_VALUE_FONT || 'italic 900 42px "Cormorant Garamond", "Georgia", "Times New Roman", serif';
            const bestWordFont = CONFIG.BEST_FONT || 'italic 800 34px "Cormorant Garamond", "Georgia", "Times New Roman", serif';

            const layout = computeRadarLayout(currentScores);
            const centerX = layout.centerX;
            const centerY = layout.centerY;
            const maxR = layout.maxR;
            const vertices = layout.vertices;

            if (isJikoMvpRadar) {
                hideRadarBackgroundCleaner();
            } else {
                syncRadarBackgroundCleaner(centerX, centerY, maxR, vertices);
            }

            ctx.save();
            ctx.lineWidth = CONFIG.RADAR_GRID_LINE_WIDTH;

            // 背景网格 (固定10级基础刻度)，每层都按每个维度的满分计算半径比例
            for (let layer = 1; layer <= CONFIG.RADAR_GRID_LEVELS; layer++) {
                ctx.beginPath();
                for (let i = 0; i < vertices.length; i++) {
                    // grid表示满分的比例，比如第10层即 10/10 = 1倍的maxR
                    const r = (layer / CONFIG.RADAR_GRID_LEVELS) * maxR;
                    const vertex = vertices[i];
                    const x = centerX + r * vertex.cos;
                    const y = centerY + r * vertex.sin;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
                // 最外层网格线增强2.5倍以突出边界感
                const gridOpacity = layer === CONFIG.RADAR_GRID_LEVELS ? CONFIG.RADAR_GRID_LINE_OPACITY * 2.5 : CONFIG.RADAR_GRID_LINE_OPACITY;
                if (isMvpRadar) {
                    ctx.save();
                    ctx.lineWidth = CONFIG.RADAR_GRID_LINE_WIDTH + (layer === CONFIG.RADAR_GRID_LEVELS ? 0.7 : 0.25);
                    ctx.shadowBlur = layer === CONFIG.RADAR_GRID_LEVELS ? 18 : 7;
                    ctx.shadowColor = hexToRgbA(radarAccentColor, layer === CONFIG.RADAR_GRID_LEVELS ? 0.22 : 0.1);
                    ctx.strokeStyle = hexToRgbA(radarGridHighlightColor, Math.min(gridOpacity * 0.9, 0.5));
                    ctx.stroke();
                    ctx.restore();
                    ctx.strokeStyle = hexToRgbA(radarGridCoreColor, Math.min(gridOpacity * 0.8, 0.36));
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`;
                }
                ctx.stroke();
            }

            // 轴向量
            for (let i = 0; i < vertices.length; i++) {
                const vertex = vertices[i];
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + maxR * vertex.cos, centerY + maxR * vertex.sin);
                if (isMvpRadar) {
                    ctx.save();
                    ctx.lineWidth = 1.5;
                    ctx.shadowBlur = 7;
                    ctx.shadowColor = hexToRgbA(radarAccentColor, 0.12);
                    ctx.strokeStyle = hexToRgbA(radarGridHighlightColor, 0.18);
                    ctx.stroke();
                    ctx.restore();
                    ctx.strokeStyle = hexToRgbA(radarGridCoreColor, 0.14);
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${CONFIG.RADAR_GRID_LINE_OPACITY})`;
                }
                ctx.stroke();
            }

            // 六边形内部底板遮罩：姬子·启行 MVP 保持透明，让专属背景透出
            if (!isJikoMvpRadar) {
                ctx.save();
                ctx.beginPath();
                for (let i = 0; i < vertices.length; i++) {
                    const r = maxR;
                    const vertex = vertices[i];
                    const x = centerX + r * vertex.cos;
                    const y = centerY + r * vertex.sin;
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.closePath();
                const radarInnerBase = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    maxR * 0.06,
                    centerX,
                    centerY,
                    maxR * 1.02
                );
                radarInnerBase.addColorStop(0, 'rgba(14, 30, 72, 0.36)');
                radarInnerBase.addColorStop(0.58, 'rgba(10, 24, 60, 0.22)');
                radarInnerBase.addColorStop(1, 'rgba(7, 18, 42, 0.14)');
                ctx.fillStyle = radarInnerBase;
                ctx.fill();
                ctx.restore();
            }

            drawRadarAudioFx(centerX, centerY, maxR, radarAccentColor, radarCoreColor);
            drawRadarSweepArcs(centerX, centerY, maxR, radarAccentColor, radarCoreColor, isMvpRadar);

            if (isMvpRadar) {
                const haloGradient = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    maxR * 0.05,
                    centerX,
                    centerY,
                    maxR * 1.22
                );
                haloGradient.addColorStop(0, 'rgba(255,252,240,0.12)');
                haloGradient.addColorStop(0.24, 'rgba(255,235,176,0.08)');
                haloGradient.addColorStop(0.58, 'rgba(255,212,106,0.04)');
                haloGradient.addColorStop(1, 'rgba(255,212,106,0)');
                ctx.beginPath();
                ctx.arc(centerX, centerY, maxR * 1.22, 0, Math.PI * 2);
                ctx.fillStyle = haloGradient;
                ctx.fill();
            }

            // 全角色平均值：红色参考层，位于当前角色雷达图之下
            if (avgScorePerDim && avgScorePerDim.length) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                const avgPoints = vertices.map((vertex, i) => {
                    const avgRatio = getRadarRatio(avgScorePerDim[i] ?? 0, i);
                    const currentRatio = layout.ratios[i] ?? 0;
                    return {
                        x: centerX + avgRatio * maxR * vertex.cos,
                        y: centerY + avgRatio * maxR * vertex.sin,
                        avgRatio,
                        currentRatio
                    };
                });

                for (let i = 0; i < avgPoints.length; i++) {
                    const a = avgPoints[i];
                    const b = avgPoints[(i + 1) % avgPoints.length];
                    const closeness = 1 - clampNumber(
                        (Math.abs(a.avgRatio - a.currentRatio) + Math.abs(b.avgRatio - b.currentRatio)) / 0.18,
                        0,
                        1
                    );
                    const alpha = 0.18 + (1 - closeness) * 0.54;
                    const glowAlpha = 0.1 + (1 - closeness) * 0.32;

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.shadowBlur = 6 + (1 - closeness) * 10;
                    ctx.shadowColor = `rgba(255, 58, 58, ${glowAlpha})`;
                    ctx.strokeStyle = `rgba(255, 78, 78, ${alpha})`;
                    ctx.lineWidth = isMvpRadar ? 2.1 : 1.9;
                    ctx.stroke();

                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = `rgba(255, 190, 180, ${0.08 + (1 - closeness) * 0.18})`;
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
                ctx.restore();
            }

            // 雷达多边形 (允许超出 maxR，每个维度的基准线单独映射配置)
            ctx.beginPath();
            for (let i = 0; i < vertices.length; i++) {
                const r = layout.ratios[i] * maxR;
                const vertex = vertices[i];
                const x = centerX + r * vertex.cos;
                const y = centerY + r * vertex.sin;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();

            // 基础填充 (稍微增强一点存在感)
            ctx.shadowBlur = 0;
            if (isMvpRadar) {
                const fillGradient = ctx.createRadialGradient(
                    centerX,
                    centerY,
                    maxR * 0.06,
                    centerX,
                    centerY,
                    maxR
                );
                fillGradient.addColorStop(0, 'rgba(255,251,236,0.22)');
                fillGradient.addColorStop(0.22, 'rgba(255,235,170,0.16)');
                fillGradient.addColorStop(0.62, 'rgba(255,212,104,0.08)');
                fillGradient.addColorStop(1, 'rgba(255,190,80,0.03)');
                ctx.fillStyle = fillGradient;
            } else {
                ctx.fillStyle = hexToRgbA(radarAccentColor, 0.25);
            }
            ctx.fill();

            if (isMvpRadar) {
                ctx.save();
                ctx.shadowBlur = 52;
                ctx.shadowColor = 'rgba(255,227,138,0.44)';
                ctx.fillStyle = 'rgba(255,228,150,0.07)';
                ctx.fill();
                ctx.restore();
            }

            // 激光边缘效果 - 更加激进的多重高亮叠加
            ctx.save();
            ctx.lineJoin = "round";
            ctx.lineCap = "round";

            // 1. 超宽范围的环境光晕 (辉光)
            ctx.shadowBlur = isMvpRadar ? 64 : 100;
            ctx.shadowColor = radarAccentColor;
            ctx.strokeStyle = radarAccentColor;
            ctx.lineWidth = isMvpRadar ? 4.2 : 4;
            ctx.stroke();

            // 2. 中层高饱和度激光束
            ctx.shadowBlur = isMvpRadar ? 28 : 40;
            ctx.shadowColor = isMvpRadar ? '#ffe8a6' : radarAccentColor;
            ctx.strokeStyle = isMvpRadar ? '#ffe8a6' : radarAccentColor;
            ctx.lineWidth = isMvpRadar ? 2.4 : 2.5;
            ctx.stroke();

            // 3. 核心亮白色高能射线
            ctx.shadowBlur = isMvpRadar ? 12 : 15;
            ctx.shadowColor = radarCoreColor;
            ctx.strokeStyle = radarCoreColor;
            ctx.lineWidth = isMvpRadar ? 1.35 : 1.2;
            ctx.stroke();

            // 4. 二次强化最亮核心 (防止偏色，增加白光质感)
            ctx.shadowBlur = isMvpRadar ? 6 : 5;
            ctx.strokeStyle = radarCoreColor;
            ctx.lineWidth = isMvpRadar ? 0.9 : 0.8;
            ctx.stroke();

            ctx.restore();

            // 1600宽时留更多留白给极端数值以免被截断
            const drawMvpLabelText = (text, x, y, font, fillColor = radarLabelColor) => {
                ctx.save();
                ctx.font = font;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.lineWidth = 4;
                ctx.strokeStyle = radarTextStrokeColor;
                ctx.shadowColor = hexToRgbA(radarAccentColor, 0.14);
                ctx.shadowBlur = 8;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = fillColor;
                ctx.shadowColor = fillColor === CONFIG.BEST_COLOR
                    ? hexToRgbA(CONFIG.BEST_COLOR, 0.24)
                    : hexToRgbA(radarCoreColor, 0.18);
                ctx.shadowBlur = 4;
                ctx.fillText(text, x, y);
                ctx.restore();
            };

            const drawBestFlashOverlay = (text, x, y, font, intensity) => {
                if (!(intensity > 0)) return;
                ctx.save();
                ctx.font = font;
                ctx.lineJoin = 'round';
                ctx.globalAlpha *= 0.16 + intensity * 0.72;
                ctx.strokeStyle = `rgba(255,248,224,${0.18 + intensity * 0.34})`;
                ctx.shadowColor = `rgba(255,224,140,${0.28 + intensity * 0.5})`;
                ctx.shadowBlur = 16 + intensity * 24;
                ctx.lineWidth = 1.1 + intensity * 1.8;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = `rgba(255,251,238,${0.16 + intensity * 0.6})`;
                ctx.fillText(text, x, y);
                ctx.restore();
            };

            const drawBestBrightText = (text, x, y, font, intensity = 0.34) => {
                ctx.save();
                ctx.font = font;
                ctx.lineJoin = 'round';
                ctx.miterLimit = 2;
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha *= 0.78;
                ctx.lineWidth = 4.2;
                ctx.strokeStyle = `rgba(255, 246, 196, ${0.2 + intensity * 0.28})`;
                ctx.shadowColor = `rgba(255, 228, 108, ${0.38 + intensity * 0.28})`;
                ctx.shadowBlur = 18 + intensity * 22;
                ctx.strokeText(text, x, y);
                ctx.fillStyle = bestBrightColor;
                ctx.shadowBlur = 10 + intensity * 16;
                ctx.fillText(text, x, y);
                ctx.restore();
            };

            for (let i = 0; i < vertices.length; i++) {
                const vertex = vertices[i];
                let x = centerX + layout.labelRadius * vertex.cos;
                let y = centerY + layout.labelRadius * vertex.sin;
                ctx.textAlign = Math.abs(vertex.cos) < 0.1 ? 'center' : (vertex.cos > 0 ? 'left' : 'right');
                ctx.textBaseline = 'middle';

                const labelMotion = getRadarLabelMotion(i);
                if (!labelMotion.visible) continue;

                const displayedTargetScore = currentIndex >= 0 ? normalizeScore(bands[currentIndex].points[i], i) : 0;
                const displayedLabelScore = radarLabelUseTargetValues
                    ? displayedTargetScore
                    : normalizeScore(currentScores[i], i);
                const valStr = formatRadarValue(displayedLabelScore, i);
                const isBest = currentIndex >= 0
                    && displayedTargetScore >= bestScorePerDim[i];
                const bestFlash = isBest ? getBestRevealFlash(i) : 0;
                y += labelMotion.offsetY;

                ctx.save();
                ctx.globalAlpha *= labelMotion.alpha;

                if (CONFIG.SHOW_SCORE_UNDER_NAME) {
                    // 第一行：维度名
                    ctx.font = isBest ? bestLabelFont : 'bold 28px "Orbitron", sans-serif';
                    ctx.fillStyle = isBest ? bestTextColor : radarLabelColor;
                    if (isMvpRadar) {
                        drawMvpLabelText(CONFIG.DIM_NAMES[i], x, y - 18, ctx.font, ctx.fillStyle);
                    } else {
                        ctx.fillText(CONFIG.DIM_NAMES[i], x, y - 18);
                    }
                    if (isBest) drawBestBrightText(CONFIG.DIM_NAMES[i], x, y - 18, ctx.font, 0.22 + bestFlash * 0.45);
                    drawBestFlashOverlay(CONFIG.DIM_NAMES[i], x, y - 18, ctx.font, bestFlash * 0.55);
                    // 第二行：数值
                    ctx.font = isBest ? bestValueFont : 'normal 24px "Orbitron", sans-serif';
                    ctx.fillStyle = isBest ? bestTextColor : radarLabelColor;
                    if (isMvpRadar) {
                        drawMvpLabelText(valStr, x, y + 18, ctx.font, ctx.fillStyle);
                    } else {
                        ctx.fillText(valStr, x, y + 18);
                    }
                    if (isBest) drawBestBrightText(valStr, x, y + 18, ctx.font, 0.36 + bestFlash * 0.6);
                    drawBestFlashOverlay(valStr, x, y + 18, ctx.font, bestFlash);
                    // Best 标记（仅 Best 文本使用 Best 字体）
                    if (isBest) {
                        ctx.font = bestWordFont;
                        ctx.fillStyle = bestTextColor;
                        ctx.shadowColor = bestGlowColor;
                        ctx.shadowBlur = 30;
                        const bestY = y + 48;
                        ctx.fillText('Best', x, bestY);
                        drawBestBrightText('Best', x, bestY, ctx.font, 0.42 + bestFlash * 0.7);
                        drawBestFlashOverlay('Best', x, bestY, ctx.font, bestFlash * 1.15);
                    }
                    ctx.shadowBlur = 0;
                } else {
                    ctx.font = isBest ? bestValueFont : 'bold 28px "Orbitron", sans-serif';
                    ctx.fillStyle = isBest ? bestTextColor : radarLabelColor;
                    const combinedText = `${CONFIG.DIM_NAMES[i]} ${valStr}`;
                    if (isMvpRadar) {
                        drawMvpLabelText(combinedText, x, y, ctx.font, ctx.fillStyle);
                    } else {
                        ctx.fillText(combinedText, x, y);
                    }
                    if (isBest) drawBestBrightText(combinedText, x, y, ctx.font, 0.36 + bestFlash * 0.6);
                    drawBestFlashOverlay(combinedText, x, y, ctx.font, bestFlash);
                    // Best 标记（仅 Best 文本使用 Best 字体）
                    if (isBest) {
                        ctx.font = bestWordFont;
                        ctx.fillStyle = bestTextColor;
                        ctx.shadowColor = bestGlowColor;
                        ctx.shadowBlur = 30;
                        const bestY = CONFIG.SHOW_SCORE_UNDER_NAME ? y + 48 : y + 40;
                        ctx.fillText('Best', x, bestY);
                        drawBestBrightText('Best', x, bestY, ctx.font, 0.42 + bestFlash * 0.7);
                        drawBestFlashOverlay('Best', x, bestY, ctx.font, bestFlash * 1.15);
                    }
                    ctx.shadowBlur = 0;
                }
                ctx.fillStyle = radarLabelColor;
                ctx.restore();
            }
            ctx.restore();
        }

        const BRAND_DIAMOND_VERTICES = (() => {
            const vertices = [];
            const count = 8;
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
                vertices.push([Math.cos(angle) * 0.58, -0.5, Math.sin(angle) * 0.34]);
            }
            for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
                vertices.push([Math.cos(angle) * 1.08, 0.02, Math.sin(angle) * 0.76]);
            }
            vertices.push([0, 1.54, 0]);
            return vertices;
        })();

        const BRAND_DIAMOND_FACES = (() => {
            const faces = [];
            const count = 8;
            faces.push({ indices: [0, 1, 2, 3, 4, 5, 6, 7], kind: 'table', index: 0 });
            for (let i = 0; i < count; i++) {
                const next = (i + 1) % count;
                faces.push({ indices: [i, next, 8 + next, 8 + i], kind: 'crown', index: i });
            }
            for (let i = 0; i < count; i++) {
                const next = (i + 1) % count;
                faces.push({ indices: [8 + i, 8 + next, 16], kind: 'pavilion', index: i });
            }
            return faces;
        })();

        function clamp01(value) {
            return Math.max(0, Math.min(1, value));
        }

        function ensureBrandDiamondCanvasSize() {
            if (!brandDiamondCanvas || !brandDiamondCtx) return false;
            const cssW = brandDiamondCanvas.clientWidth || 0;
            const cssH = brandDiamondCanvas.clientHeight || cssW;
            if (!cssW || !cssH) return false;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const realW = Math.round(cssW * dpr);
            const realH = Math.round(cssH * dpr);
            if (brandDiamondCanvas.width !== realW || brandDiamondCanvas.height !== realH) {
                brandDiamondCanvas.width = realW;
                brandDiamondCanvas.height = realH;
                brandDiamondCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            brandDiamondW = cssW;
            brandDiamondH = cssH;
            return true;
        }

        function rotateDiamondPoint(point, rotX, rotY, rotZ) {
            let [x, y, z] = point;

            const cosX = Math.cos(rotX);
            const sinX = Math.sin(rotX);
            let ny = y * cosX - z * sinX;
            let nz = y * sinX + z * cosX;
            y = ny;
            z = nz;

            const cosY = Math.cos(rotY);
            const sinY = Math.sin(rotY);
            let nx = x * cosY + z * sinY;
            nz = -x * sinY + z * cosY;
            x = nx;
            z = nz;

            const cosZ = Math.cos(rotZ);
            const sinZ = Math.sin(rotZ);
            nx = x * cosZ - y * sinZ;
            ny = x * sinZ + y * cosZ;
            x = nx;
            y = ny;

            return { x, y, z };
        }

        function projectDiamondPoint(point, cx, cy, scale, cameraZ) {
            const perspective = scale / Math.max(0.8, cameraZ - point.z);
            return {
                x: cx + point.x * perspective,
                y: cy + point.y * perspective,
                z: point.z
            };
        }

        function computeDiamondNormal(points) {
            const p0 = points[0];
            const p1 = points[1];
            const p2 = points[2];
            const ux = p1.x - p0.x;
            const uy = p1.y - p0.y;
            const uz = p1.z - p0.z;
            const vx = p2.x - p0.x;
            const vy = p2.y - p0.y;
            const vz = p2.z - p0.z;
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            const len = Math.hypot(nx, ny, nz) || 1;
            return { x: nx / len, y: ny / len, z: nz / len };
        }

        function drawDiamondPath(context, points) {
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                context.lineTo(points[i].x, points[i].y);
            }
            context.closePath();
        }

        function drawBrandDiamond3D(timestamp) {
            if (!brandDiamondCtx || !ensureBrandDiamondCanvasSize()) return;

            const ctx2 = brandDiamondCtx;
            const w = brandDiamondW;
            const h = brandDiamondH;
            ctx2.clearRect(0, 0, w, h);

            const t = timestamp * 0.001;
            const cx = w * 0.5;
            const cy = h * 0.43;
            const cameraZ = 5.6;
            const scale = Math.min(w, h) * 2.18;
            const rotX = 0.22 + Math.sin(t * 0.52) * 0.05;
            const rotY = t * 0.9;
            const rotZ = Math.sin(t * 0.28) * 0.03;
            const lightDir = { x: -0.34, y: -0.82, z: 0.46 };
            const prismHues = [192, 208, 286, 318, 42, 170, 226, 302];

            ctx2.save();

            const glow = ctx2.createRadialGradient(cx, cy - h * 0.08, 0, cx, cy - h * 0.04, w * 0.42);
            glow.addColorStop(0, 'rgba(255,255,255,0.16)');
            glow.addColorStop(0.32, 'rgba(194,240,255,0.11)');
            glow.addColorStop(0.62, 'rgba(255,195,246,0.06)');
            glow.addColorStop(1, 'rgba(255,255,255,0)');
            ctx2.fillStyle = glow;
            ctx2.beginPath();
            ctx2.arc(cx, cy - h * 0.04, w * 0.34, 0, Math.PI * 2);
            ctx2.fill();

            ctx2.fillStyle = 'rgba(120, 205, 255, 0.08)';
            ctx2.beginPath();
            ctx2.ellipse(cx, h * 0.84, w * 0.17, h * 0.06, 0, 0, Math.PI * 2);
            ctx2.fill();

            const rotated = BRAND_DIAMOND_VERTICES.map(point => rotateDiamondPoint(point, rotX, rotY, rotZ));
            const projected = rotated.map(point => projectDiamondPoint(point, cx, cy, scale, cameraZ));
            const faces = BRAND_DIAMOND_FACES.map(face => {
                const face3d = face.indices.map(index => rotated[index]);
                const face2d = face.indices.map(index => projected[index]);
                const normal = computeDiamondNormal(face3d);
                const avgZ = face3d.reduce((sum, point) => sum + point.z, 0) / face3d.length;
                const facing = normal.z;
                const light = clamp01((normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z + 1) * 0.5);
                return { ...face, face2d, avgZ, facing, light };
            }).sort((a, b) => a.avgZ - b.avgZ);

            faces.forEach(face => {
                const minX = Math.min(...face.face2d.map(p => p.x));
                const minY = Math.min(...face.face2d.map(p => p.y));
                const maxX = Math.max(...face.face2d.map(p => p.x));
                const maxY = Math.max(...face.face2d.map(p => p.y));
                const hueBase = face.kind === 'table' ? 198 : prismHues[face.index % prismHues.length];
                const hueAlt = (hueBase + (face.kind === 'pavilion' ? 34 : 18)) % 360;
                const baseAlpha = face.kind === 'table' ? 0.48 : face.kind === 'crown' ? 0.36 : 0.28;
                const visibility = 0.24 + Math.max(0, face.facing) * 0.72 + face.light * 0.2;
                const alpha = baseAlpha * visibility;
                const lightA = 66 + face.light * 18;
                const lightB = 34 + face.light * 18;

                const grad = ctx2.createLinearGradient(minX, minY, maxX, maxY);
                grad.addColorStop(0, `hsla(${hueBase}, 90%, ${lightA}%, ${alpha})`);
                grad.addColorStop(0.55, `hsla(${(hueBase + hueAlt) / 2}, 92%, ${lightA - 6}%, ${alpha * 0.92})`);
                grad.addColorStop(1, `hsla(${hueAlt}, 86%, ${lightB}%, ${alpha * 0.96})`);

                drawDiamondPath(ctx2, face.face2d);
                ctx2.fillStyle = grad;
                ctx2.fill();

                ctx2.strokeStyle = `rgba(255,255,255,${0.1 + Math.max(0, face.facing) * 0.24 + face.light * 0.12})`;
                ctx2.lineWidth = face.kind === 'table' ? 1.18 : 0.92;
                ctx2.stroke();
            });

            const edgeSets = [
                [8, 9, 10, 11, 12, 13, 14, 15],
                [0, 1, 2, 3, 4, 5, 6, 7]
            ];
            edgeSets.forEach((set, edgeIndex) => {
                ctx2.beginPath();
                ctx2.moveTo(projected[set[0]].x, projected[set[0]].y);
                for (let i = 1; i < set.length; i++) {
                    ctx2.lineTo(projected[set[i]].x, projected[set[i]].y);
                }
                ctx2.closePath();
                ctx2.strokeStyle = edgeIndex === 0 ? 'rgba(255,255,255,0.42)' : 'rgba(255,247,230,0.32)';
                ctx2.lineWidth = edgeIndex === 0 ? 1.24 : 1.02;
                ctx2.stroke();
            });

            [0, 2, 4, 6, 8, 10, 12, 14, 16].forEach(index => {
                const p = projected[index];
                const radius = index === 16 ? 2.6 : index < 8 ? 2.1 : 1.8;
                const nodeGlow = ctx2.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4.4);
                nodeGlow.addColorStop(0, 'rgba(255,255,255,0.9)');
                nodeGlow.addColorStop(0.35, 'rgba(196,243,255,0.46)');
                nodeGlow.addColorStop(0.75, 'rgba(255,193,241,0.14)');
                nodeGlow.addColorStop(1, 'rgba(255,255,255,0)');
                ctx2.fillStyle = nodeGlow;
                ctx2.beginPath();
                ctx2.arc(p.x, p.y, radius * 4.4, 0, Math.PI * 2);
                ctx2.fill();
            });

            const gleamX = cx + Math.sin(t * 1.4) * w * 0.18;
            const gleamY = cy - h * 0.05 + Math.cos(t * 1.1) * h * 0.05;
            const gleam = ctx2.createLinearGradient(gleamX - 18, gleamY - 70, gleamX + 26, gleamY + 92);
            gleam.addColorStop(0, 'rgba(255,255,255,0)');
            gleam.addColorStop(0.45, 'rgba(255,250,240,0.28)');
            gleam.addColorStop(0.55, 'rgba(191,244,255,0.42)');
            gleam.addColorStop(1, 'rgba(255,255,255,0)');
            ctx2.strokeStyle = gleam;
            ctx2.lineWidth = 3.4;
            ctx2.beginPath();
            ctx2.moveTo(gleamX - 14, gleamY - 62);
            ctx2.lineTo(gleamX + 18, gleamY + 84);
            ctx2.stroke();

            ctx2.restore();
        }

        /**
         * 引擎的核心帧循环（游戏循环）
         * 负责：1. 处理全局的时间线与播放状态; 2. 颜色插值平滑渐变; 3. 处理得分切换的缓动动画; 4. 触发Canvas绘图更新
         * @param {number} timestamp - 配合requestAnimationFrame注入的当前帧高精时间戳
         */
        function tick(timestamp) {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            updateDelayedMusic();

            if (outroActive) {
                if (!outroSceneSuspended) {
                    pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                    if (photoFxCtx && photoFxCanvas) {
                        photoFxCtx.clearRect(0, 0, photoFxCanvas.width, photoFxCanvas.height);
                    }
                    clearRadarCanvas();
                    outroSceneSuspended = true;
                }
                updateTimer();
                requestAnimationFrame(tick);
                return;
            }
            if (outroSceneSuspended) {
                outroSceneSuspended = false;
            }

            if (!pageVisualsSuspended) {
                updatePerformanceState(deltaTime);
                maybeRefreshCanvasScale();
            }

            // 1. 全局进度逻辑
            if (!isPaused && globalCurrentTime < totalDuration) {
                const audio = document.getElementById("bgMusic");
                const syncedFromAudio = !isGlobalTimelineDragging && syncContentTimeFromAudio();
                if (!syncedFromAudio) {
                    globalCurrentTime += deltaTime;
                }
                if (globalCurrentTime >= totalDuration) {
                    globalCurrentTime = totalDuration;
                    isPaused = true; // 内容播放结束，切换到结尾视频阶段
                    startOutroSequence();
                }

                // 更新全局进度条展示
                const progressPer = (globalCurrentTime / totalDuration) * 100;
                globalBar.style.width = progressPer + "%";

                // 检查是否需要切换乐队（抽卡动画播放期间跳过切换）
                syncCurrentBandToTimeline();
                syncBandPhotoVariant();
            }

            // 2. 颜色平滑过渡
            if (currentThemeColor !== targetThemeColor) {
                currentThemeColor = lerpColor(currentThemeColor, targetThemeColor, 0.02);
            }

            // 3. 雷达数值动画
            if (animProgress < 1) {
                const elapsed = performance.now() - animStartTime;
                const rawT = Math.min(elapsed / ANIM_DURATION, 1);
                const t = easeInOutCubic(rawT);
                for (let i = 0; i < CONFIG.VERTEX_COUNT; i++) {
                    currentScores[i] = startScores[i] + (targetScores[i] - startScores[i]) * t;
                }
                if (rawT >= 1) animProgress = 1;
            }

            if (pageVisualsSuspended) {
                updateTimer();
                requestAnimationFrame(tick);
                return;
            }

            updateAudioVisualizerData();

            // 4. 渲染
            drawBackgroundEffect(deltaTime);
            updateAndDrawPhotoFx(deltaTime);
            drawRadar();
            updateTimer();
            requestAnimationFrame(tick);
        }

        listen(document, 'visibilitychange', () => {
            pageVisualsSuspended = !!document.hidden;
            lastTimestamp = 0;
            invalidateTimelineRect();

            if (pageVisualsSuspended) {
                backgroundEffectManager.dispose();
                pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
                if (photoFxCtx && photoFxCanvas) {
                    photoFxCtx.clearRect(0, 0, photoFxCanvas.width, photoFxCanvas.height);
                }
                clearRadarCanvas();
                return;
            }

            maybeRefreshCanvasScale();
            resizePhotoFxCanvas(true);
            if (!isGlobalTimelineDragging) syncContentTimeFromAudio();
            syncCurrentBandToTimeline();
            if (audioVizContext && audioVizContext.state === 'suspended') {
                audioVizContext.resume().catch(() => {});
            }
        });

        listen(window, 'resize', invalidateTimelineRect);
        listen(window, 'scroll', invalidateTimelineRect, true);
        listen(document, 'fullscreenchange', invalidateTimelineRect);

        // 全局进度条拖动逻辑
        listen(globalTimeline, 'mouseenter', () => {
             refreshTimelineRect();
             ensureTimelineTooltipStructure();
             timelineTooltip.style.display = 'block';
        });

        listen(globalTimeline, 'mousedown', (e) => {
            isGlobalTimelineDragging = true;
            refreshTimelineRect();
            ensureTimelineTooltipStructure();
            timelineTooltip.style.display = 'block';
            updateGlobalTimeFromClick(e);
        });

        listen(window, 'mousemove', (e) => {
            // 获取相对于 timeline 的坐标
            const rect = getTimelineRect();
            if (!rect) return;
            const isInTimeline = (e.clientY >= rect.top && e.clientY <= rect.bottom);

            if (isInTimeline || isGlobalTimelineDragging) {
                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                const per = x / rect.width;
                const previewTime = per * totalDuration;

                // 找到预览时间对应的乐队
                const previewSegment = getTimeSegmentAt(previewTime, true);
                const previewBandName = previewSegment ? bands[previewSegment.bandIndex].name : "";

                const diff = Math.floor(previewTime / 1000);
                const m = Math.floor(diff / 60).toString().padStart(2, '0');
                const s = (diff % 60).toString().padStart(2, '0');

                timelineTooltip.style.left = `${e.clientX - 25}px`;
                setTimelineTooltipContent(previewBandName, `${m}:${s}`);
                timelineTooltip.style.display = 'block';
            } else if (!isGlobalTimelineDragging) {
                timelineTooltip.style.display = 'none';
            }

            if (isGlobalTimelineDragging) updateGlobalTimeFromClick(e);
        });

        listen(globalTimeline, 'mouseleave', () => {
            if (!isGlobalTimelineDragging) timelineTooltip.style.display = 'none';
        });

        listen(window, 'mouseup', () => {
            isGlobalTimelineDragging = false;
            timelineTooltip.style.display = 'none';
        });

        function updateGlobalTimeFromClick(e) {
            const rect = getTimelineRect();
            if (!rect) return;
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const per = x / rect.width;
            const clickedTime = per * totalDuration;
            const clickedSegment = getTimeSegmentAt(clickedTime, true);
            const clickedBand = clickedSegment ? bands[clickedSegment.bandIndex] : null;
            globalCurrentTime = clickedSegment && shouldPlayGachaForBand(clickedBand, clickedSegment.bandIndex, false)
                ? clickedSegment.start
                : clickedTime;
            cancelGachaAnimation();

            // 同步音频进度
            const audio = document.getElementById("bgMusic");
            if (audio) syncAudioToContentTime(globalCurrentTime);
            if (globalCurrentTime < totalDuration) resetOutroSequence();

            // 立即检查并切换
            const currentSegment = getTimeSegmentAt(globalCurrentTime, true);
            if (currentSegment && currentSegment.bandIndex !== currentIndex) {
                const prevBand = getTransitionPrevBandForIndex(currentSegment.bandIndex);
                currentIndex = currentSegment.bandIndex;
                updateUI(bands[currentIndex], false, prevBand);
            }
            if (globalCurrentTime < totalDuration) {
                isPaused = false;
                if (audio) {
                    playMusicForCurrentTimeline();
                }
            } else {
                isPaused = true;
                if (audio) {
                    playMusicForCurrentTimeline();
                }
                startOutroSequence();
            }
        }

        listen(window, "keydown", (e) => {
            if (e.key === "f" || e.key === "F" || e.key === "F11") {
                // 如果是 F11，阻止默认行为以使用我们自定义的全屏逻辑控制 UI 隐藏
                if (e.key === "F11") e.preventDefault();

                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                }
            }

            const audio = document.getElementById("bgMusic");
            if (e.key.toLowerCase() === 'p') {
                isParticlesEnabled = !isParticlesEnabled;
                if (!isParticlesEnabled) pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            }
            if (e.key === " ") { // 空格暂停/播放 或 开始准备页
                if (!isStarted) {
                    isStarted = true;
                    startIntroSystem(); // 开始准备系统
                    return;
                }
                if (outroActive) {
                    if (outroFinished) return;
                    if (audio) {
                        if (audio.paused) {
                            playMusicForCurrentTimeline();
                            if (outroVideo && outroOverlay?.classList.contains("video-ready")) {
                                outroVideo.play().catch(() => {});
                            }
                        } else {
                            audio.pause();
                            if (outroVideo) {
                                try { outroVideo.pause(); } catch (_) {}
                            }
                        }
                    }
                    return;
                }
                isPaused = !isPaused;
                if (audio) {
                    if (isPaused) audio.pause();
                    else {
                        playMusicForCurrentTimeline();
                    }
                }
            } else if (e.key === "ArrowLeft") {
                const nextIdx = Math.max(0, currentIndex - 1);
                globalCurrentTime = timeSegments[nextIdx].start;
                cancelGachaAnimation();
                resetOutroSequence();
                if (audio) syncAudioToContentTime(globalCurrentTime);
                isPaused = false;
                if (audio) {
                    playMusicForCurrentTimeline();
                }
            } else if (e.key === "ArrowRight") {
                const nextIdx = Math.min(bands.length - 1, currentIndex + 1);
                globalCurrentTime = timeSegments[nextIdx].start;
                cancelGachaAnimation();
                resetOutroSequence();
                if (audio) syncAudioToContentTime(globalCurrentTime);
                isPaused = false;
                if (audio) {
                    playMusicForCurrentTimeline();
                }
            }
        });

        function startIntroSystem() {
            const audio = document.getElementById("bgMusic");
            const overlay = document.getElementById("introOverlay");
            const pCanvas = document.getElementById("particles-canvas");
            const leadIn = getLeadInDurationMs();
            const guideStart = Math.max(900, Math.round(leadIn * 0.32));
            const exitStart = Math.max(guideStart + 1200, Math.round(leadIn * 0.82));

            clearIntroSequenceTimers();
            resetOutroSequence();
            buildIntroRadarGuide();

            overlay.classList.add("started"); 
            overlay.classList.add("lead-in");
            overlay.classList.add("intro-run");
            overlay.classList.remove("intro-stage-guide", "intro-stage-exit");
            overlay.style.display = "flex";
            overlay.style.opacity = "1";
            isPaused = true;
            pCanvas.style.zIndex = "1";

            if (audio) {
                initAudioVisualizer();
                beginMusicPresentation(audio);
            }

            queueIntroSequenceTimer(() => {
                overlay.classList.add("intro-stage-guide");
            }, guideStart);

            queueIntroSequenceTimer(() => {
                overlay.classList.add("intro-stage-exit");
            }, exitStart);

            queueIntroSequenceTimer(() => {
                    musicIntroActive = false;
                    globalCurrentTime = 0;
                    if (bands.length) {
                        currentIndex = 0;
                        updateUI(bands[0], true, null);
                    }
                overlay.style.opacity = "0";
                isPaused = false; 
                queueIntroSequenceTimer(() => {
                    overlay.style.display = "none";
                    overlay.classList.remove("lead-in", "intro-run", "intro-stage-guide", "intro-stage-exit");
                }, 1000);
            }, leadIn);
        }

        async function initialize() {
            // 尝试从服务器加载数据
            await loadData();
            if (!scope.active) return;
            ensureTimelineTooltipStructure();
            prewarmUpcomingBandAssets(0, 2);
            buildIntroRadarGuide();
            videoCapture?.configure({
                leadInMs: getLeadInDurationMs(),
                durationMs: totalDuration,
                outroTransitionMs: getOutroTransitionMs(),
                tracks: getConfiguredMusicPlaylist(),
                musicDelayMs: MusicTimeline.getDelayMs(getMusicDelaySeconds()),
                musicVolume: getMusicVolume(),
            }, finishOutroSequence);

            if (isSpecialPreviewMode && bands.length) {
                isStarted = true;
                isPaused = true;
                globalCurrentTime = 0;
                currentIndex = 0;
                document.body.classList.add('special-preview-mode');
                document.title = `${SPECIAL_PROFILES[0]?.name || '专场'} - 预览`;
                updateUI(bands[0], true, null);
            }

            // 在正式播放前就开始渲染粒子和雷达（静态背景）
            requestAnimationFrame(tick);

            // 拖拽图片下载功能
            listen(window, 'dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            listen(window, 'drop', (e) => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length > 0 && currentIndex >= 0) {
                    const file = files[0];
                    if (file.type.startsWith('image/')) {
                        const currentBandName = bands[currentIndex].name;
                        const extension = file.name.split('.').pop();
                        const newFileName = `${currentBandName}.${extension}`;

                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const link = document.createElement('a');
                            link.href = event.target.result;
                            link.download = newFileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        };
                        reader.readAsDataURL(file);
                    }
                }
            });
        };
scope.onDispose(() => {
  backgroundEffect?.dispose();
  backgroundEffectManager.dispose();
  uiTransitionSession++;
  gachaAnimationSession++;
  outroVideoLoadToken++;
  if (audioVizContext && audioVizContext.state !== 'closed') void audioVizContext.close();
});
if (document.readyState === 'complete') void initialize();
else listen(window, 'load', initialize, { once: true });
return scope.dispose;
}
