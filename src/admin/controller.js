import { createRuntimeScope } from '../shared/runtimeScope';

// Original editor behavior. React owns the static layout; this controller owns its dynamic lists.
export function startAdmin() {
const scope = createRuntimeScope();
const { listen, setTimeout, clearTimeout, requestAnimationFrame, cancelAnimationFrame, fetch } = scope;
let appData = null;
let currentImageEditor = null;
let cropDraft = null;
let latestImages = [];
let bandSortDragState = null;
let rolePositionDragState = null;
let specialOpenIds = new Set();
let comparisonResizeObserver = null;
let comparisonDrawFrame = 0;
const comparisonState = {
    a: { role: null, index: 0 },
    b: { role: null, index: 1 },
    dirty: false,
    invalid: new Set(),
    message: ''
};
const rolePositionState = {
    dirty: false,
    message: ''
};
let bandViewState = {
    keyword: '',
    gachaOnly: false,
    page: 1,
    pageSize: 20
};
const MIN_VERTEX_COUNT = 6;
const MAX_VERTEX_COUNT = 8;
const FIXED_COLOR_COUNT = 5;
const BackgroundEffects = window.RockRadarBackgroundEffects;
const SpecialProfiles = window.RockRadarSpecialProfiles;
const RoleComparison = window.RockRadarRoleComparison;
const RolePosition = window.RockRadarRolePosition;
const DEFAULT_FIXED_COLOR_PRESETS = [
    { name: '青蓝', color: '#00ffff', bg1: '#001a1a', bg2: '#000d0d' },
    { name: '洋红', color: '#ff00ff', bg1: '#1a001a', bg2: '#0d000d' },
    { name: '明黄', color: '#ffff00', bg1: '#1a1a00', bg2: '#0d0d00' },
    { name: '翠绿', color: '#00ff00', bg1: '#001a00', bg2: '#000d00' },
    { name: '橙红', color: '#ff4500', bg1: '#1a0700', bg2: '#0d0300' }
];
const specialImageSlots = [
    { id: 'door_left', title: '左门图片', baseName: 'gacha_door_left' },
    { id: 'door_right', title: '右门图片', baseName: 'gacha_door_right' }
];

// ===== 初始化 =====
async function init() {
    const res = await fetch('/api/data');
    appData = await res.json();
            if (!scope.active) return;
    appData.IMAGE_META = appData.IMAGE_META || {};
    appData.expertlist = normalizeNameList(appData.expertlist);
    normalizeSpecialProfiles();
    normalizeColorSystem();
    normalizeVertexConfigAndBands();
    bindBandControls();
    bindBandCsvTools();
    bindConfigControls();
    renderBands();
    renderConfig();
    renderColors();
    renderSpecialProfiles();
    initRolePosition();
    initRoleComparison();
    loadImages();
}

function normalizeNameList(value) {
    const items = Array.isArray(value) ? value : String(value || '').split(',');
    return [...new Set(items.map(item => String(item || '').trim()).filter(Boolean))];
}

function normalizeSpecialProfiles() {
    if (!appData || !SpecialProfiles) return;
    const hadProfileField = Object.prototype.hasOwnProperty.call(appData, 'SPECIAL_PROFILES');
    if (!hadProfileField) {
        const legacyBand = (appData.namelist || []).find(band => {
            const name = String(band?.name || '').trim().replace(/\s+/g, '');
            const gachaText = String(band?.gachaText || '').trim().toLowerCase();
            return name === '银狼LV.999' || gachaText === 'silver wolf lv.999';
        });
        if (legacyBand) {
            appData.SPECIAL_PROFILES = [SpecialProfiles.normalizeProfile({
                id: 'silverwolf-lv999',
                name: '银狼 LV.999 专场',
                pluginId: 'silverwolf'
            })];
            legacyBand.specialProfileId = 'silverwolf-lv999';
        }
    }

    appData.SPECIAL_PROFILES = SpecialProfiles.normalizeProfiles(appData.SPECIAL_PROFILES);
    const validIds = new Set(appData.SPECIAL_PROFILES.map(profile => profile.id));
    (appData.namelist || []).forEach(band => {
        const id = String(band.specialProfileId || '').trim();
        if (id && validIds.has(id)) band.specialProfileId = id;
        else delete band.specialProfileId;
    });
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

function normalizeColorTarget(target, defaultIndex, legacyPresets, inheritedTarget = null) {
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
            target.colorIndex = clamp(Number(inheritedTarget.colorIndex) || 0, 0, FIXED_COLOR_COUNT - 1);
        }
        return;
    }

    target.colorMode = 'preset';
    target.colorIndex = clamp(defaultIndex, 0, FIXED_COLOR_COUNT - 1);
}

function normalizeColorSystem() {
    if (!appData) return;
    const legacyPresets = Array.isArray(appData.COLOR_PRESETS) ? appData.COLOR_PRESETS : [];
    const fixedPresets = Array.from({ length: FIXED_COLOR_COUNT }, (_, index) => {
        const fallback = DEFAULT_FIXED_COLOR_PRESETS[index];
        const normalized = normalizeColorObject(legacyPresets[index], fallback);
        return {
            name: String(legacyPresets[index]?.name || fallback.name).trim() || fallback.name,
            ...normalized
        };
    });

    appData.namelist = Array.isArray(appData.namelist) ? appData.namelist : [];
    appData.namelist.forEach((band, index) => {
        normalizeColorTarget(band, index % FIXED_COLOR_COUNT, legacyPresets);
        if (band?.midPhase && typeof band.midPhase === 'object') {
            normalizeColorTarget(band.midPhase, band.colorIndex ?? index % FIXED_COLOR_COUNT, legacyPresets, band);
        }
    });
    appData.COLOR_PRESETS = fixedPresets;
}

function getNormalizedVertexCount(value) {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num)) return MIN_VERTEX_COUNT;
    return clamp(num, MIN_VERTEX_COUNT, MAX_VERTEX_COUNT);
}

function ensureLength(arr, len, factory) {
    const out = Array.isArray(arr) ? arr.slice(0, len) : [];
    while (out.length < len) out.push(factory(out.length));
    return out;
}

function normalizeVertexConfigAndBands() {
    if (!appData) return;
    normalizeColorSystem();
    appData.CONFIG = appData.CONFIG || {};
    const C = appData.CONFIG;
    const vc = getNormalizedVertexCount(C.VERTEX_COUNT);
    C.VERTEX_COUNT = vc;

    C.DIM_NAMES = ensureLength(C.DIM_NAMES, vc, i => `维度${i + 1}`)
        .map((name, i) => {
            const text = String(name ?? '').trim();
            return text || `维度${i + 1}`;
        });

    C.BASE_MAX_SCORES = ensureLength(C.BASE_MAX_SCORES, vc, () => 10)
        .map(v => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 10;
        });

    C.MIN_SCORES = ensureLength(C.MIN_SCORES, vc, () => 0)
        .map(v => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        });

    C.USE_PERCENTAGE = ensureLength(C.USE_PERCENTAGE, vc, () => false)
        .map(v => !!v);
    C.REAL_PERCENTAGE = ensureLength(C.REAL_PERCENTAGE, vc, () => false)
        .map(v => !!v);
    for (let i = 0; i < vc; i++) {
        if (C.REAL_PERCENTAGE[i] && C.USE_PERCENTAGE[i]) {
            C.USE_PERCENTAGE[i] = false;
        }
    }

    appData.namelist = Array.isArray(appData.namelist) ? appData.namelist : [];
    appData.namelist = appData.namelist.map(band => {
        const rawPoints = Array.isArray(band.points) ? band.points : [];
        const points = ensureLength(rawPoints, vc, i => C.MIN_SCORES[i] ?? 0)
            .map((v, i) => {
                const n = Number(v);
                if (Number.isFinite(n)) return n;
                const minScore = Number(C.MIN_SCORES[i] ?? 0);
                return Number.isFinite(minScore) ? minScore : 0;
            });
        return {
            ...band,
            points,
            gachaText: String(band.gachaText ?? '').trim(),
            midPhase: band?.midPhase && typeof band.midPhase === 'object'
                ? {
                    ...band.midPhase,
                    enabled: !!band.midPhase.enabled,
                    triggerRatio: clamp(Number.isFinite(Number(band.midPhase.triggerRatio)) ? Number(band.midPhase.triggerRatio) : 0.5, 0.1, 0.9),
                    photoName: String(band.midPhase.photoName ?? '').trim(),
                    colorMode: band.midPhase.colorMode === 'custom' ? 'custom' : 'preset',
                    colorIndex: band.midPhase.colorMode === 'custom'
                        ? null
                        : clamp(Number(band.midPhase.colorIndex) || 0, 0, FIXED_COLOR_COUNT - 1),
                    customColor: band.midPhase.colorMode === 'custom'
                        ? cloneColorObject(band.midPhase.customColor)
                        : undefined,
                    points: ensureLength(Array.isArray(band.midPhase.points) ? band.midPhase.points : [], vc, i => points[i] ?? 0)
                        .map((v, i) => {
                            const n = Number(v);
                            return Number.isFinite(n) ? n : (points[i] ?? 0);
                        })
                }
                : undefined
        };
    });
}

function bindBandControls() {
    const searchEl = document.getElementById('bandSearch');
    const gachaEl = document.getElementById('bandOnlyGacha');
    const pageSizeEl = document.getElementById('bandPageSize');

    if (searchEl) {
        listen(searchEl, 'input', e => {
            bandViewState.keyword = (e.target.value || '').trim();
            bandViewState.page = 1;
            renderBands();
        });
    }
    if (gachaEl) {
        listen(gachaEl, 'change', e => {
            bandViewState.gachaOnly = !!e.target.checked;
            bandViewState.page = 1;
            renderBands();
        });
    }
    if (pageSizeEl) {
        listen(pageSizeEl, 'change', e => {
            const n = parseInt(e.target.value, 10);
            bandViewState.pageSize = Number.isFinite(n) && n > 0 ? n : 20;
            bandViewState.page = 1;
            renderBands();
        });
    }
}

function bindBandCsvTools() {
    const fileEl = document.getElementById('bandCsvFile');
    if (!fileEl) return;
    listen(fileEl, 'change', importBandsCsv);
}

function bindConfigControls() {
    const vertexInput = document.getElementById('cfg-VERTEX_COUNT');
    if (!vertexInput) return;

    const syncVertexCount = () => {
        if (!appData || !appData.CONFIG) return;
        appData.CONFIG.VERTEX_COUNT = getNormalizedVertexCount(vertexInput.value);
        normalizeVertexConfigAndBands();
        vertexInput.value = appData.CONFIG.VERTEX_COUNT;
        renderDimSettings();
        refreshBandViews();
    };

    listen(vertexInput, 'change', syncVertexCount);
    listen(vertexInput, 'input', syncVertexCount);
}

function getBandCsvHeaders() {
    const dimNames = (appData.CONFIG.DIM_NAMES || []).map((d, i) => String(d || `dim${i + 1}`).trim() || `dim${i + 1}`);
    return [
        'name', 'desc', 'equipmentIds', 'duration',
        'colorMode', 'colorIndex', 'customColor', 'customBg1', 'customBg2',
        'specialProfileId', 'gacha', 'gachaText',
        ...dimNames
    ];
}

function escapeCsvCell(value) {
    const text = value === undefined || value === null ? '' : String(value);
    if (!/[",\r\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportBandsCsv() {
    const headers = getBandCsvHeaders();
    const dimCount = Math.max(0, headers.length - 12);
    const lines = [headers.map(escapeCsvCell).join(',')];

    appData.namelist.forEach(b => {
        const row = [
            b.name || '',
            b.desc || '',
            b.equipmentIds || '',
            b.duration ?? '',
            b.colorMode || 'preset',
            b.colorIndex ?? '',
            b.customColor?.color || '',
            b.customColor?.bg1 || '',
            b.customColor?.bg2 || '',
            b.specialProfileId || '',
            b.gacha ? '1' : '0',
            b.gachaText || ''
        ];
        for (let i = 0; i < dimCount; i++) {
            row.push((b.points && b.points[i] !== undefined) ? b.points[i] : '');
        }
        lines.push(row.map(escapeCsvCell).join(','));
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const t = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `bands-${t}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV 已导出，可用 Excel 编辑后再导入', 'success');
}

function triggerImportBandsCsv() {
    const fileEl = document.getElementById('bandCsvFile');
    if (!fileEl) return;
    fileEl.value = '';
    fileEl.click();
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                cell += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cell += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(cell);
            cell = '';
        } else if (ch === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else if (ch === '\r') {
            // skip
        } else {
            cell += ch;
        }
    }
    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows;
}

function toNumberOrDefault(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function toOptionalNumber(v) {
    if (v === undefined || v === null || String(v).trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
}

function toBool(v) {
    const s = String(v || '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === '是';
}

async function importBandsCsv(event) {
    const fileEl = event.target;
    const file = fileEl.files && fileEl.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const rows = parseCsv(text).filter(r => r.some(c => String(c || '').trim() !== ''));
        if (rows.length < 2) {
            showToast('CSV 内容为空或缺少数据行', 'error');
            return;
        }

        const headers = rows[0].map(h => String(h || '').trim());
        const lowered = headers.map(h => h.toLowerCase());
        const findHeader = aliases => lowered.findIndex(h => aliases.includes(h));
        const nameIdx = findHeader(['name', '名称']);
        if (nameIdx < 0) {
            showToast('CSV 缺少 name/名称 列', 'error');
            return;
        }

        const descIdx = findHeader(['desc', 'description', '描述']);
        const equipmentIdx = findHeader(['equipmentids', 'equipment_ids', 'equipment', 'equipments', '装备', '装备图', '装备列表']);
        const durationIdx = findHeader(['duration', '时长', 'duration(ms)']);
        const colorModeIdx = findHeader(['colormode', 'color_mode', '配色模式']);
        const colorIdx = findHeader(['colorindex', '配色索引']);
        const customColorIdx = findHeader(['customcolor', 'custom_color', '自定义主色']);
        const customBg1Idx = findHeader(['custombg1', 'custom_bg1', '自定义背景1']);
        const customBg2Idx = findHeader(['custombg2', 'custom_bg2', '自定义背景2']);
        const specialProfileIdx = findHeader(['specialprofileid', 'special_profile_id', '专场id', '专场']);
        const gachaIdx = findHeader(['gacha', '抽卡出金']);
        const gachaTextIdx = findHeader(['gachatext', 'gacha_text', '抽卡艺术字', '抽卡文字', '抽卡文案']);
        const dimNames = appData.CONFIG.DIM_NAMES || [];
        const dimIndexes = dimNames.map((dim, i) => {
            const exact = headers.findIndex(h => h === dim);
            if (exact >= 0) return exact;
            const lower = lowered.findIndex(h => h === String(dim || '').toLowerCase());
            if (lower >= 0) return lower;
            const fallback = findHeader([`dim${i + 1}`, `point${i + 1}`, `维度${i + 1}`]);
            return fallback;
        });

        const imported = [];
        for (let r = 1; r < rows.length; r++) {
            const row = rows[r];
            const name = String(row[nameIdx] || '').trim();
            if (!name) continue;
            const band = {
                name,
                desc: descIdx >= 0 ? String(row[descIdx] || '').trim() : '',
                points: dimIndexes.map(idx => idx >= 0 ? toNumberOrDefault(row[idx], 0) : 0)
            };
            const equipmentIds = equipmentIdx >= 0 ? String(row[equipmentIdx] || '').trim() : '';
            const duration = durationIdx >= 0 ? toOptionalNumber(row[durationIdx]) : undefined;
            const colorIndex = colorIdx >= 0 ? toOptionalNumber(row[colorIdx]) : undefined;
            const colorMode = colorModeIdx >= 0 ? String(row[colorModeIdx] || '').trim().toLowerCase() : '';
            const hasCustomColorValue = [customColorIdx, customBg1Idx, customBg2Idx]
                .some(idx => idx >= 0 && String(row[idx] || '').trim() !== '');
            const gachaText = gachaTextIdx >= 0 ? String(row[gachaTextIdx] || '').trim() : undefined;
            if (equipmentIds) band.equipmentIds = equipmentIds;
            if (duration !== undefined) band.duration = Math.max(0, duration);
            if (specialProfileIdx >= 0) {
                const specialProfileId = String(row[specialProfileIdx] || '').trim();
                if (specialProfileId) band.specialProfileId = specialProfileId;
            }
            if (colorMode === 'custom' || hasCustomColorValue) {
                const fallback = appData.COLOR_PRESETS[
                    colorIndex !== undefined ? clamp(Math.floor(colorIndex), 0, FIXED_COLOR_COUNT - 1) : 0
                ] || DEFAULT_FIXED_COLOR_PRESETS[0];
                band.colorMode = 'custom';
                band.colorIndex = null;
                band.customColor = normalizeColorObject({
                    color: customColorIdx >= 0 ? row[customColorIdx] : '',
                    bg1: customBg1Idx >= 0 ? row[customBg1Idx] : '',
                    bg2: customBg2Idx >= 0 ? row[customBg2Idx] : ''
                }, fallback);
            } else if (colorIndex !== undefined) {
                band.colorMode = 'preset';
                band.colorIndex = clamp(Math.floor(colorIndex), 0, FIXED_COLOR_COUNT - 1);
            }
            if (gachaIdx >= 0) band.gacha = toBool(row[gachaIdx]);
            if (gachaTextIdx >= 0) band.gachaText = gachaText || '';
            imported.push(band);
        }

        if (!imported.length) {
            showToast('CSV 没有可导入的选手数据', 'error');
            return;
        }

        const replaceAll = confirm('导入模式：确定=覆盖全部选手，取消=按名称更新/新增');
        if (replaceAll) {
            appData.namelist = imported;
        } else {
            const merged = appData.namelist.map(b => ({
                ...b,
                points: Array.isArray(b.points) ? [...b.points] : []
            }));
            imported.forEach(nextBand => {
                const idx = merged.findIndex(b => String(b.name || '').trim() === nextBand.name);
                if (idx >= 0) merged[idx] = { ...merged[idx], ...nextBand, points: nextBand.points };
                else merged.push(nextBand);
            });
            appData.namelist = merged;
        }

        normalizeVertexConfigAndBands();
        bandViewState.page = 1;
        refreshBandViews();
        showToast(`CSV 导入完成：${imported.length} 条`, 'success');
    } catch (err) {
        showToast('CSV 导入失败，请检查格式', 'error');
    } finally {
        fileEl.value = '';
    }
}

function imageBaseName(name) {
    return String(name || '').replace(/\.[^.]+$/, '');
}

function getSpecialImages(slotId, images = latestImages) {
    const slot = specialImageSlots.find(item => item.id === slotId);
    if (!slot) return [];
    return (images || [])
        .filter(img => imageBaseName(img.name) === slot.baseName || String(img.name || '').startsWith(`${slot.baseName}.`))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function findSpecialImage(slotId, images = latestImages) {
    return getSpecialImages(slotId, images)[0] || null;
}

async function refreshLatestImages() {
    const res = await fetch('/api/images');
    latestImages = await res.json();
    return latestImages;
}

function renderSpecialImages() {
    const el = document.getElementById('specialImageGrid');
    if (!el) return;
    el.innerHTML = specialImageSlots.map(slot => {
        const img = findSpecialImage(slot.id);
        const preview = img
            ? `<button type="button" class="special-image-preview special-image-preview-btn" onclick="window.__rockRadarAdmin.openSpecialImageEditor(${window.__rockRadarAdmin.jsonAttr(slot.id)})"><img src="${img.url}" alt="${escAttr(slot.title)}"></button>`
            : `<button type="button" class="special-image-preview special-image-preview-btn" onclick="window.__rockRadarAdmin.triggerSpecialUpload(${window.__rockRadarAdmin.jsonAttr(slot.id)})"><div>未上传 ${esc(slot.title)}<br><span style="font-size:0.78rem;color:#93a0c6;">点击先上传图片</span></div></button>`;
        const badge = img
            ? `<span class="image-badge">${esc(img.name)}</span>`
            : `<span class="image-badge" style="color:#667;">使用默认纯色门板</span>`;
        return `
            <div class="special-image-card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <strong style="color:var(--accent)">${esc(slot.title)}</strong>
                    ${badge}
                </div>
                <div class="special-image-preview">${preview}</div>
                <div class="special-image-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.triggerSpecialUpload(${window.__rockRadarAdmin.jsonAttr(slot.id)})">${img ? '更换图片' : '上传图片'}</button>
                    <button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.openSpecialImageEditor(${window.__rockRadarAdmin.jsonAttr(slot.id)})">${img ? '取景' : '上传后取景'}</button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== 角色专场 =====
function renderBackgroundField(field, value, attributes = '', inheritedValue) {
    const hasInheritedValue = inheritedValue !== undefined;
    if (field.type === 'select') {
        const inheritOption = hasInheritedValue
            ? `<option value="" ${value === undefined ? 'selected' : ''}>继承（${esc(field.options.find(item => item[0] === inheritedValue)?.[1] || inheritedValue)}）</option>`
            : '';
        const options = field.options.map(([optionValue, label]) => `
            <option value="${escAttr(optionValue)}" ${optionValue === value ? 'selected' : ''}>${esc(label)}</option>
        `).join('');
        return `<div class="form-group"><label>${esc(field.label)}</label><select ${attributes}>${inheritOption}${options}</select></div>`;
    }

    const normalizedValue = value === undefined ? '' : value;
    const placeholder = hasInheritedValue ? ` placeholder="继承：${escAttr(inheritedValue)}"` : '';
    return `<div class="form-group"><label>${esc(field.label)}</label><input type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${escAttr(normalizedValue)}"${placeholder} ${attributes}></div>`;
}

function getBackgroundFieldsForMode(mode) {
    if (!BackgroundEffects || mode === 'off') return [];
    return BackgroundEffects.getFieldsForMode(mode);
}

function renderSpecialBackgroundFields(profile) {
    if (!BackgroundEffects) return '';
    const selectedMode = profile.effects?.backgroundEffect || 'inherit';
    const effectiveMode = selectedMode === 'inherit'
        ? BackgroundEffects.normalizeMode(appData.CONFIG?.BG_EFFECT_MODE)
        : BackgroundEffects.normalizeMode(selectedMode);
    const globalConfig = BackgroundEffects.normalizeConfig(appData.CONFIG?.BG_EFFECT_CONFIG, appData.CONFIG);
    const overrides = BackgroundEffects.normalizeOverrides(profile.effects?.backgroundConfig);
    const fields = getBackgroundFieldsForMode(effectiveMode);
    const modeLabel = BackgroundEffects.MODE_DEFINITIONS[effectiveMode]?.label || effectiveMode;

    if (!fields.length) {
        return `<div class="background-effect-note">当前有效模式为“${esc(modeLabel)}”，没有额外参数。基础渐变背景仍会保留。</div>`;
    }

    return `
        <div class="background-effect-note">当前参数对应“${esc(modeLabel)}”。输入框留空即继承全局值，只有填写的字段会作为此专场的覆盖项。</div>
        ${fields.map(field => renderBackgroundField(
            field,
            BackgroundEffects.getPath(overrides, field.path),
            `data-special-bg-profile="${escAttr(profile.id)}" data-special-bg-path="${escAttr(field.path)}" onchange="window.__rockRadarAdmin.updateSpecialBackgroundOverride(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'${field.path}',this.value)"`,
            BackgroundEffects.getPath(globalConfig, field.path)
        )).join('')}
    `;
}

function getSpecialProfile(profileId) {
    return (appData.SPECIAL_PROFILES || []).find(profile => profile.id === profileId) || null;
}

function getSpecialBoundEntries(profileId) {
    return (appData.namelist || [])
        .map((band, index) => ({ band, index }))
        .filter(({ band }) => band.specialProfileId === profileId);
}

function renderSpecialOptions(options, selected) {
    return options.map(([value, label]) => `
        <option value="${escAttr(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>
    `).join('');
}

function specialProfileSwatch(profile) {
    const theme = profile.theme || {};
    return `background:linear-gradient(135deg,${theme.color} 0 34%,${theme.bg1} 34% 67%,${theme.bg2} 67% 100%);`;
}

function setSpecialOpen(profileId, open) {
    if (open) specialOpenIds.add(profileId);
    else specialOpenIds.delete(profileId);
}

function renderSpecialRoleBindings(profile) {
    const key = imageInputKey(profile.id);
    return `
        <div class="form-group" style="margin-bottom:10px;">
            <label>筛选角色</label>
            <input type="text" placeholder="输入角色名" oninput="window.__rockRadarAdmin.filterSpecialRoleOptions(${window.__rockRadarAdmin.jsStringAttr(profile.id)},this.value)">
        </div>
        <div class="special-role-list" id="special-roles-${key}">
            ${(appData.namelist || []).map((band, index) => {
                const bound = band.specialProfileId === profile.id;
                const occupied = band.specialProfileId && !bound
                    ? getSpecialProfile(band.specialProfileId)?.name || band.specialProfileId
                    : '';
                return `
                    <label class="special-role-option ${bound ? 'is-bound' : ''}" data-role-name="${escAttr(String(band.name || '').toLowerCase())}">
                        <input type="checkbox" ${bound ? 'checked' : ''}
                            onchange="window.__rockRadarAdmin.toggleSpecialRole(${window.__rockRadarAdmin.jsStringAttr(profile.id)},${index},this.checked)">
                        <span>${esc(band.name || `角色 ${index + 1}`)}${occupied ? ` <small style="color:#7183a0;">(${esc(occupied)})</small>` : ''}</span>
                    </label>
                `;
            }).join('')}
        </div>
    `;
}

function renderSpecialPreviewRoleOptions(profile) {
    const boundIndexes = new Set(getSpecialBoundEntries(profile.id).map(entry => entry.index));
    return (appData.namelist || [])
        .map((band, index) => ({ band, index, bound: boundIndexes.has(index) }))
        .sort((a, b) => Number(b.bound) - Number(a.bound) || a.index - b.index)
        .map(({ band, index, bound }) => `
            <option value="${index}">${bound ? '★ ' : ''}${esc(band.name || `角色 ${index + 1}`)}</option>
        `).join('');
}

function renderSpecialProfiles() {
    const list = document.getElementById('specialProfileList');
    if (!list || !appData || !SpecialProfiles) return;
    const keyword = String(document.getElementById('specialProfileSearch')?.value || '').trim().toLowerCase();
    const profiles = (appData.SPECIAL_PROFILES || []).filter(profile => {
        if (!keyword) return true;
        const boundNames = getSpecialBoundEntries(profile.id).map(entry => entry.band.name).join(' ');
        return `${profile.name} ${profile.description} ${boundNames}`.toLowerCase().includes(keyword);
    });

    if (!profiles.length) {
        list.innerHTML = `<div class="special-empty">${keyword ? '没有匹配的专场' : '尚未创建专场，点击右上角“新建专场”开始配置。'}</div>`;
        return;
    }

    list.innerHTML = profiles.map(profile => {
        const plugin = SpecialProfiles.getPlugin(profile.pluginId);
        const boundEntries = getSpecialBoundEntries(profile.id);
        const boundNames = boundEntries.map(entry => entry.band.name);
        const boundSummary = boundNames.length
            ? `${boundNames.slice(0, 4).join('、')}${boundNames.length > 4 ? ` 等 ${boundNames.length} 个角色` : ''}`
            : '尚未绑定角色';
        const isOpen = specialOpenIds.has(profile.id);
        const key = imageInputKey(profile.id);
        return `
            <details class="special-profile-card" data-special-profile-id="${escAttr(profile.id)}" ${isOpen ? 'open' : ''}
                ontoggle="window.__rockRadarAdmin.setSpecialOpen(${window.__rockRadarAdmin.jsStringAttr(profile.id)},this.open)">
                <summary class="special-profile-summary">
                    <span class="special-profile-swatch" style="${specialProfileSwatch(profile)}"></span>
                    <span>
                        <span class="special-profile-title">${esc(profile.name)}</span>
                        <span class="special-profile-desc">${esc(profile.description || '暂无简介')}</span>
                    </span>
                    <span class="special-profile-meta">
                        <span class="special-pill">${esc(plugin.name)}</span>
                        <span class="special-pill ${profile.enabled ? '' : 'off'}">${profile.enabled ? '已启用' : '已停用'}</span>
                        <span class="special-pill">${esc(boundSummary)}</span>
                    </span>
                </summary>
                <div class="special-profile-body">
                    <div class="special-section">
                        <h4>基本信息</h4>
                        <div class="special-grid">
                            <div class="form-group"><label>专场名称</label><input type="text" value="${escAttr(profile.name)}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'name',this.value)"></div>
                            <div class="form-group"><label>插件类型</label><select onchange="window.__rockRadarAdmin.setSpecialProfilePlugin(${window.__rockRadarAdmin.jsStringAttr(profile.id)},this.value)">
                                ${SpecialProfiles.PLUGINS.map(item => `<option value="${escAttr(item.id)}" ${item.id === profile.pluginId ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}
                            </select></div>
                            <div class="form-group"><label>启用状态</label><div class="checkbox-row"><input type="checkbox" ${profile.enabled ? 'checked' : ''} onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'enabled',this.checked)"><label>允许绑定角色使用此专场</label></div></div>
                        </div>
                        <div class="form-group"><label>简介</label><input type="text" value="${escAttr(profile.description)}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'description',this.value)"></div>
                    </div>

                    <div class="special-section">
                        <h4>角色绑定</h4>
                        <div class="hint" style="margin-bottom:10px;">一个角色只能绑定一个专场。勾选后会自动从原专场切换到当前专场。</div>
                        ${renderSpecialRoleBindings(profile)}
                    </div>

                    <div class="special-section">
                        <h4>主题与场景</h4>
                        <div class="special-grid">
                            ${[
                                ['theme.color', '主题主色', profile.theme.color],
                                ['theme.bg1', '背景色 1', profile.theme.bg1],
                                ['theme.bg2', '背景色 2', profile.theme.bg2],
                                ['theme.accent', '强调色', profile.theme.accent]
                            ].map(([path, label, value]) => `<div class="form-group"><label>${label}</label><input type="color" value="${escAttr(value)}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'${path}',this.value)"></div>`).join('')}
                            <div class="form-group"><label>背景效果</label><select data-special-bg-mode-profile="${escAttr(profile.id)}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'effects.backgroundEffect',this.value)">${renderSpecialOptions(SpecialProfiles.OPTIONS.backgroundEffect, profile.effects.backgroundEffect)}</select></div>
                            <div class="form-group"><label>效果强度</label><input type="number" min="0" max="2" step="0.1" value="${profile.effects.intensity}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'effects.intensity',+this.value)"></div>
                            ${renderSpecialBackgroundFields(profile)}
                        </div>
                    </div>

                    <div class="special-section">
                        <h4>角色界面与转场</h4>
                        <div class="special-grid">
                            <div class="form-group"><label>名称动画</label><select onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'effects.nameAnimation',this.value)">${renderSpecialOptions(SpecialProfiles.OPTIONS.nameAnimation, profile.effects.nameAnimation)}</select></div>
                            <div class="form-group"><label>角色图转场</label><select onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'effects.photoTransition',this.value)">${renderSpecialOptions(SpecialProfiles.OPTIONS.photoTransition, profile.effects.photoTransition)}</select></div>
                            <div class="form-group"><label>雷达转场</label><select onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'effects.radarTransition',this.value)">${renderSpecialOptions(SpecialProfiles.OPTIONS.radarTransition, profile.effects.radarTransition)}</select></div>
                            <div class="form-group"><label>名称动画时长(ms)</label><input type="number" min="100" max="5000" step="50" value="${profile.transitions.nameDuration}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'transitions.nameDuration',+this.value)"></div>
                            <div class="form-group"><label>角色图转场时长(ms)</label><input type="number" min="100" max="5000" step="50" value="${profile.transitions.photoDuration}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'transitions.photoDuration',+this.value)"></div>
                            <div class="form-group"><label>雷达动画时长(ms)</label><input type="number" min="100" max="8000" step="50" value="${profile.transitions.radarDuration}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'transitions.radarDuration',+this.value)"></div>
                        </div>
                    </div>

                    <div class="special-section">
                        <h4>抽卡与素材覆盖</h4>
                        <div class="special-grid">
                            <div class="form-group"><label>抽卡风格</label><select onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'gacha.style',this.value)">${renderSpecialOptions(SpecialProfiles.OPTIONS.gachaStyle, profile.gacha.style)}</select></div>
                            <div class="form-group"><label>抽卡强调色</label><input type="color" value="${escAttr(profile.gacha.accent)}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'gacha.accent',this.value)"></div>
                            <div class="form-group"><label>抽卡总时长(ms)</label><input type="number" min="1000" max="12000" step="100" value="${profile.transitions.gachaDuration}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'transitions.gachaDuration',+this.value)"></div>
                            <div class="form-group"><label>抽卡背景素材名</label><input type="text" value="${escAttr(profile.assets.gachaBackgroundName)}" placeholder="留空使用 best_角色名" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'assets.gachaBackgroundName',this.value)"></div>
                            <div class="form-group"><label>场景叠加图路径</label><input type="text" value="${escAttr(profile.assets.overlayImage)}" placeholder="/assets/images/xxx.png" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'assets.overlayImage',this.value)"></div>
                            <div class="form-group"><label>叠加图透明度</label><input type="number" min="0" max="1" step="0.05" value="${profile.assets.overlayOpacity}" onchange="window.__rockRadarAdmin.updateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)},'assets.overlayOpacity',+this.value)"></div>
                        </div>
                    </div>

                    <div class="special-section">
                        <h4>预览与操作</h4>
                        <div class="special-grid">
                            <div class="form-group"><label>预览角色</label><select id="special-preview-role-${key}">${renderSpecialPreviewRoleOptions(profile)}</select></div>
                        </div>
                        <div class="special-actions">
                            <button class="btn btn-primary" data-special-preview-profile="${escAttr(profile.id)}" onclick="window.__rockRadarAdmin.previewSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)})">打开展示页预览 ↗</button>
                            <button class="btn btn-outline" onclick="window.__rockRadarAdmin.duplicateSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)})">复制专场</button>
                            <button class="btn btn-danger" onclick="window.__rockRadarAdmin.deleteSpecialProfile(${window.__rockRadarAdmin.jsStringAttr(profile.id)})">删除专场</button>
                        </div>
                    </div>
                </div>
            </details>
        `;
    }).join('');
}

function filterSpecialRoleOptions(profileId, keyword) {
    const list = document.getElementById(`special-roles-${imageInputKey(profileId)}`);
    if (!list) return;
    const query = String(keyword || '').trim().toLowerCase();
    list.querySelectorAll('.special-role-option').forEach(option => {
        option.style.display = !query || String(option.dataset.roleName || '').includes(query) ? '' : 'none';
    });
}

function deleteNestedPath(source, path) {
    const keys = String(path || '').split('.').filter(Boolean);
    const stack = [];
    let cursor = source;
    for (const key of keys.slice(0, -1)) {
        if (!cursor || typeof cursor !== 'object') return;
        stack.push([cursor, key]);
        cursor = cursor[key];
    }
    if (!cursor || typeof cursor !== 'object') return;
    delete cursor[keys[keys.length - 1]];
    for (let index = stack.length - 1; index >= 0; index -= 1) {
        const [parent, key] = stack[index];
        if (parent[key] && typeof parent[key] === 'object' && !Object.keys(parent[key]).length) {
            delete parent[key];
        }
    }
}

function updateSpecialBackgroundOverride(profileId, path, rawValue) {
    const index = (appData.SPECIAL_PROFILES || []).findIndex(profile => profile.id === profileId);
    if (index < 0 || !BackgroundEffects) return;
    const source = { ...appData.SPECIAL_PROFILES[index] };
    source.effects = { ...(source.effects || {}) };
    source.effects.backgroundConfig = JSON.parse(JSON.stringify(source.effects.backgroundConfig || {}));
    if (rawValue === '') {
        deleteNestedPath(source.effects.backgroundConfig, path);
    } else {
        BackgroundEffects.setPath(source.effects.backgroundConfig, path, rawValue);
    }
    source.effects.backgroundConfig = BackgroundEffects.normalizeOverrides(source.effects.backgroundConfig);
    appData.SPECIAL_PROFILES[index] = SpecialProfiles.normalizeProfile(source, index);
    renderSpecialProfiles();
}

function updateSpecialProfile(profileId, path, value) {
    const index = (appData.SPECIAL_PROFILES || []).findIndex(profile => profile.id === profileId);
    if (index < 0) return;
    const source = { ...appData.SPECIAL_PROFILES[index] };
    const keys = String(path || '').split('.').filter(Boolean);
    let target = source;
    keys.forEach((key, keyIndex) => {
        if (keyIndex === keys.length - 1) {
            target[key] = value;
        } else {
            target[key] = { ...(target[key] || {}) };
            target = target[key];
        }
    });
    appData.SPECIAL_PROFILES[index] = SpecialProfiles.normalizeProfile(source, index);
    renderSpecialProfiles();
}

function setSpecialProfilePlugin(profileId, pluginId) {
    const index = (appData.SPECIAL_PROFILES || []).findIndex(profile => profile.id === profileId);
    if (index < 0) return;
    const current = appData.SPECIAL_PROFILES[index];
    appData.SPECIAL_PROFILES[index] = SpecialProfiles.normalizeProfile({
        id: current.id,
        name: current.name,
        description: current.description,
        enabled: current.enabled,
        pluginId
    }, index);
    renderSpecialProfiles();
}

function toggleSpecialRole(profileId, bandIndex, checked) {
    const band = appData.namelist?.[bandIndex];
    if (!band || !getSpecialProfile(profileId)) return;
    if (checked) band.specialProfileId = profileId;
    else if (band.specialProfileId === profileId) delete band.specialProfileId;
    renderSpecialProfiles();
}

function addSpecialProfile() {
    const profile = SpecialProfiles.createProfile(appData.SPECIAL_PROFILES || []);
    appData.SPECIAL_PROFILES.push(profile);
    specialOpenIds.add(profile.id);
    renderSpecialProfiles();
}

function duplicateSpecialProfile(profileId) {
    const profile = getSpecialProfile(profileId);
    if (!profile) return;
    const copy = SpecialProfiles.cloneProfile(profile, appData.SPECIAL_PROFILES || []);
    appData.SPECIAL_PROFILES.push(copy);
    specialOpenIds.add(copy.id);
    renderSpecialProfiles();
}

function deleteSpecialProfile(profileId) {
    const profile = getSpecialProfile(profileId);
    if (!profile) return;
    if (!confirm(`确定删除专场“${profile.name}”吗？绑定角色将回退到普通界面。`)) return;
    (appData.namelist || []).forEach(band => {
        if (band.specialProfileId === profileId) delete band.specialProfileId;
    });
    appData.SPECIAL_PROFILES = appData.SPECIAL_PROFILES.filter(item => item.id !== profileId);
    specialOpenIds.delete(profileId);
    renderSpecialProfiles();
}

function previewSpecialProfile(profileId) {
    const profile = getSpecialProfile(profileId);
    if (!profile) return;
    const select = document.getElementById(`special-preview-role-${imageInputKey(profileId)}`);
    const bandIndex = Number(select?.value);
    const role = appData.namelist?.[Number.isInteger(bandIndex) ? bandIndex : 0];
    if (!role) {
        showToast('没有可用于预览的角色', 'error');
        return;
    }
    const previewPayload = {
        createdAt: Date.now(),
        profile: SpecialProfiles.normalizeProfile(profile),
        role: {
            ...role,
            specialProfileId: profile.id,
            points: Array.isArray(role.points) ? [...role.points] : []
        }
    };
    sessionStorage.setItem('rock-radar-special-preview', JSON.stringify(previewPayload));
    window.open(`/radar?specialPreview=1&profileId=${encodeURIComponent(profile.id)}`, '_blank');
}

// ===== Tab 切换 =====
document.querySelectorAll('.tab').forEach(tab => {
    listen(tab, 'click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
        if (tab.dataset.tab === 'position') {
            renderRolePosition();
        }
        if (tab.dataset.tab === 'comparison') {
            renderRoleComparison();
        }
    });
});

// ===== 角色位置 =====
function initRolePosition() {
    renderRolePosition();
}

function isRolePositionBest(role) {
    return !!RolePosition && RolePosition.isBestRole(role, appData?.mvplist, latestImages);
}

function renderRolePosition() {
    if (!appData || !RolePosition) return;
    const list = Array.isArray(appData.namelist) ? appData.namelist : [];
    const grid = document.getElementById('rolePositionGrid');
    const empty = document.getElementById('rolePositionEmpty');
    const count = document.getElementById('rolePositionCount');
    const bestCount = document.getElementById('rolePositionBestCount');
    if (!grid) return;

    const bestFlags = list.map(isRolePositionBest);
    if (count) count.textContent = String(list.length);
    if (bestCount) bestCount.textContent = String(bestFlags.filter(Boolean).length);
    if (empty) empty.classList.toggle('is-visible', list.length === 0);
    grid.classList.toggle('is-empty', list.length === 0);
    grid.dataset.roleCount = String(list.length);
    grid.dataset.bestCount = String(bestFlags.filter(Boolean).length);
    grid.innerHTML = list.map((role, index) => {
        const name = String(role?.name || '').trim() || `未命名角色 ${index + 1}`;
        const isBest = bestFlags[index];
        return `
            <div
                class="role-position-card${isBest ? ' is-best' : ''}"
                data-idx="${index}"
                draggable="true"
                title="${escAttr(`#${index + 1} ${name}${isBest ? ' · BEST' : ''}`)}"
                aria-label="${escAttr(`顺位 ${index + 1}，${name}${isBest ? '，Best' : ''}`)}"
            >
                <span class="role-position-rank">#${index + 1}</span>
                <span class="role-position-name">${esc(name)}</span>
            </div>
        `;
    }).join('');
    updateRolePositionSaveState();
}

function clearRolePositionDropState() {
    const grid = document.getElementById('rolePositionGrid');
    if (!grid) return;
    grid.querySelectorAll('.is-drop-before, .is-drop-after').forEach(card => {
        card.classList.remove('is-drop-before', 'is-drop-after');
    });
}

function markRolePositionDirty(message = '顺序已修改') {
    rolePositionState.dirty = true;
    rolePositionState.message = message;
    updateRolePositionSaveState();
}

function updateRolePositionSaveState() {
    const status = document.getElementById('rolePositionStatus');
    const button = document.getElementById('rolePositionSaveButton');
    if (button) button.disabled = !rolePositionState.dirty;
    if (status) {
        status.classList.toggle('is-dirty', rolePositionState.dirty);
        status.textContent = rolePositionState.dirty
            ? (rolePositionState.message || '顺序已修改')
            : (rolePositionState.message || '尚未修改');
    }
}

// ===== 角色对比 =====
function initRoleComparison() {
    if (!RoleComparison) return;
    const stage = document.getElementById('comparisonChartStage');
    if (stage && typeof ResizeObserver === 'function') {
        comparisonResizeObserver?.disconnect();
        comparisonResizeObserver = new ResizeObserver(() => queueComparisonDraw());
        comparisonResizeObserver.observe(stage);
    }
    renderRoleComparison();
}

function isComparisonPanelActive() {
    return document.getElementById('panel-comparison')?.classList.contains('active');
}

function resolveComparisonSlot(side, fallbackIndex) {
    const list = Array.isArray(appData?.namelist) ? appData.namelist : [];
    const slot = comparisonState[side];
    if (!slot || !list.length) return null;
    let index = slot.role ? list.indexOf(slot.role) : -1;
    if (index < 0 && Number.isInteger(slot.index) && list[slot.index]) index = slot.index;
    if (index < 0 && list[fallbackIndex]) index = fallbackIndex;
    if (index < 0) index = 0;
    slot.index = index;
    slot.role = list[index] || null;
    return slot.role;
}

function ensureComparisonSelection() {
    const list = Array.isArray(appData?.namelist) ? appData.namelist : [];
    if (!list.length) {
        comparisonState.a.role = null;
        comparisonState.b.role = null;
        comparisonState.a.index = -1;
        comparisonState.b.index = -1;
        return { a: null, b: null };
    }

    const a = resolveComparisonSlot('a', 0);
    let b = resolveComparisonSlot('b', 1);
    if (a && b === a) {
        const nextIndex = list.findIndex(role => role !== a);
        comparisonState.b.index = nextIndex;
        comparisonState.b.role = nextIndex >= 0 ? list[nextIndex] : null;
        b = comparisonState.b.role;
    }
    return { a, b };
}

function getComparisonRoleIndex(side) {
    const list = Array.isArray(appData?.namelist) ? appData.namelist : [];
    const role = comparisonState[side]?.role;
    return role ? list.indexOf(role) : -1;
}

function getComparisonRoleLabel(role, index) {
    const name = String(role?.name || '').trim() || `未命名角色 ${index + 1}`;
    const duplicateCount = (appData?.namelist || []).filter(item => String(item?.name || '').trim() === String(role?.name || '').trim()).length;
    return duplicateCount > 1 ? `${name}（顺位 ${index + 1}）` : name;
}

function renderComparisonRoleOptions(side, roles) {
    const select = document.getElementById(side === 'a' ? 'comparisonRoleA' : 'comparisonRoleB');
    if (!select) return;
    const list = appData.namelist || [];
    const currentRole = roles[side];
    const otherRole = roles[side === 'a' ? 'b' : 'a'];
    select.innerHTML = list
        .map((role, index) => ({ role, index }))
        .filter(({ role }) => role !== otherRole)
        .map(({ role, index }) => `<option value="${index}" ${role === currentRole ? 'selected' : ''}>${esc(getComparisonRoleLabel(role, index))}</option>`)
        .join('');
    select.disabled = list.length < 2;
}

function formatComparisonScore(value) {
    const rounded = RoleComparison.roundScore(value, 2);
    return rounded === null ? '0' : String(rounded);
}

function renderComparisonPointFields(side, role) {
    const container = document.getElementById(side === 'a' ? 'comparisonFieldsA' : 'comparisonFieldsB');
    if (!container || !role) return;
    const dimensions = RoleComparison.normalizeDimensions(appData.CONFIG);
    container.innerHTML = dimensions.map((dimension, index) => `
        <div class="form-group comparison-point-field">
            <label title="${escAttr(dimension.name)}">${esc(dimension.name)}</label>
            <input
                class="comparison-point-input"
                type="number"
                step="0.01"
                value="${escAttr(formatComparisonScore(role.points?.[index]))}"
                aria-label="${escAttr(`${getComparisonRoleLabel(role, getComparisonRoleIndex(side))} ${dimension.name}`)}"
                oninput="window.__rockRadarAdmin.updateComparisonPoint('${side}', ${index}, this)"
                onblur="window.__rockRadarAdmin.normalizeComparisonPointInput('${side}', ${index}, this)"
            >
        </div>
    `).join('');
}

function renderComparisonDimensionLeaders() {
    const container = document.getElementById('comparisonDimensionLeaders');
    if (!container || !RoleComparison || !appData) return;
    const dimensions = RoleComparison.normalizeDimensions(appData.CONFIG);
    const leaders = RoleComparison.calculateDimensionLeaders(appData.namelist, dimensions, 2);
    container.innerHTML = leaders.map(item => {
        const score = item.score === null ? '--' : formatComparisonScore(item.score);
        const roleLabels = item.leaders.map(leader => {
            const role = appData.namelist?.[leader.index];
            return getComparisonRoleLabel(role, leader.index);
        });
        const rolesText = roleLabels.length ? roleLabels.join('、') : '--';
        return `
            <article class="comparison-leader-card" data-dimension-index="${item.index}" data-high-score="${escAttr(score)}">
                <div class="comparison-leader-dimension">${esc(item.name)}</div>
                <div class="comparison-leader-score">${esc(score)}</div>
                <div class="comparison-leader-roles" title="${escAttr(rolesText)}">${esc(rolesText)}</div>
            </article>
        `;
    }).join('');
    container.dataset.dimensionCount = String(leaders.length);
}

function renderRoleComparison() {
    if (!appData || !RoleComparison) return;
    const roles = ensureComparisonSelection();
    const ready = !!roles.a && !!roles.b && roles.a !== roles.b;
    const empty = document.getElementById('comparisonEmpty');
    const content = document.getElementById('comparisonContent');
    if (empty) empty.classList.toggle('is-visible', !ready);
    if (content) content.hidden = !ready;
    if (!ready) {
        comparisonState.invalid.clear();
        updateComparisonSaveState();
        return;
    }

    comparisonState.invalid.clear();
    renderComparisonRoleOptions('a', roles);
    renderComparisonRoleOptions('b', roles);
    renderComparisonPointFields('a', roles.a);
    renderComparisonPointFields('b', roles.b);
    const indexA = getComparisonRoleIndex('a');
    const indexB = getComparisonRoleIndex('b');
    const legendA = document.getElementById('comparisonLegendA');
    const legendB = document.getElementById('comparisonLegendB');
    if (legendA) legendA.textContent = getComparisonRoleLabel(roles.a, indexA);
    if (legendB) legendB.textContent = getComparisonRoleLabel(roles.b, indexB);
    renderComparisonDimensionLeaders();
    updateComparisonSaveState();
    queueComparisonDraw();
}

function selectComparisonRole(side, rawIndex) {
    const index = Number(rawIndex);
    const list = appData?.namelist || [];
    const role = Number.isInteger(index) ? list[index] : null;
    const otherSide = side === 'a' ? 'b' : 'a';
    if (!role || role === comparisonState[otherSide].role) {
        renderRoleComparison();
        return;
    }
    comparisonState[side].role = role;
    comparisonState[side].index = index;
    comparisonState.invalid.clear();
    comparisonState.message = '';
    renderRoleComparison();
}

function updateComparisonPoint(side, dimensionIndex, input) {
    const role = comparisonState[side]?.role;
    if (!role || !input) return;
    const result = RoleComparison.parseScoreInput(input.value, 2);
    const key = `${side}:${dimensionIndex}`;
    input.classList.toggle('is-invalid', !result.valid);
    input.setAttribute('aria-invalid', String(!result.valid));
    if (!result.valid) {
        comparisonState.invalid.add(key);
        comparisonState.message = '存在无效数字，请修正后保存';
        updateComparisonSaveState();
        return;
    }

    comparisonState.invalid.delete(key);
    role.points = Array.isArray(role.points) ? role.points : [];
    if (role.points[dimensionIndex] !== result.value) {
        role.points[dimensionIndex] = result.value;
        comparisonState.dirty = true;
        comparisonState.message = '';
    }
    renderComparisonDimensionLeaders();
    updateComparisonSaveState();
    queueComparisonDraw();
}

function normalizeComparisonPointInput(side, dimensionIndex, input) {
    const result = RoleComparison.parseScoreInput(input?.value, 2);
    if (!result.valid || !input) return;
    input.value = formatComparisonScore(result.value);
    updateComparisonPoint(side, dimensionIndex, input);
}

function updateComparisonSaveState() {
    const button = document.getElementById('comparisonSaveButton');
    const status = document.getElementById('comparisonSaveStatus');
    const ready = !!comparisonState.a.role && !!comparisonState.b.role && comparisonState.a.role !== comparisonState.b.role;
    const hasInvalid = comparisonState.invalid.size > 0;
    if (button) button.disabled = !ready || !comparisonState.dirty || hasInvalid;
    if (!status) return;
    status.classList.toggle('is-dirty', comparisonState.dirty && !hasInvalid);
    status.classList.toggle('is-error', hasInvalid);
    status.textContent = hasInvalid
        ? (comparisonState.message || '存在无效数字')
        : comparisonState.dirty
            ? '有未保存修改'
            : (comparisonState.message || '尚未修改');
}

function queueComparisonDraw() {
    if (!RoleComparison || !isComparisonPanelActive()) return;
    if (comparisonDrawFrame) cancelAnimationFrame(comparisonDrawFrame);
    comparisonDrawFrame = requestAnimationFrame(() => {
        comparisonDrawFrame = 0;
        drawRoleComparison();
    });
}

function drawRoleComparison() {
    const canvas = document.getElementById('comparisonRadarCanvas');
    const roles = ensureComparisonSelection();
    if (!canvas || !roles.a || !roles.b || roles.a === roles.b) return;
    const dimensions = RoleComparison.normalizeDimensions(appData.CONFIG);
    const result = RoleComparison.draw(canvas, {
        dimensions,
        levels: appData.CONFIG?.RADAR_GRID_LEVELS || 5,
        series: [
            { name: roles.a.name, scores: roles.a.points, color: RoleComparison.DEFAULT_COLORS.a },
            { name: roles.b.name, scores: roles.b.points, color: RoleComparison.DEFAULT_COLORS.b }
        ]
    });
    if (result) {
        canvas.dataset.rendered = 'true';
        canvas.dataset.vertexCount = String(result.dimensions.length);
        canvas.dataset.seriesCount = String(result.seriesPoints.length);
        canvas.dataset.roleAIndex = String(getComparisonRoleIndex('a'));
        canvas.dataset.roleBIndex = String(getComparisonRoleIndex('b'));
    }
}

// ===== 选手管理 =====
function getFilteredBandEntries() {
    const keyword = (bandViewState.keyword || '').toLowerCase();
    return appData.namelist
        .map((b, idx) => ({ b, idx }))
        .filter(({ b }) => {
            if (bandViewState.gachaOnly && !b.gacha) return false;
            if (!keyword) return true;
            const name = String(b.name || '').toLowerCase();
            const desc = String(b.desc || '').toLowerCase();
            return name.includes(keyword) || desc.includes(keyword);
        });
}

function renderBandPager(total, totalPages, start, shownCount) {
    const pager = document.getElementById('bandPager');
    if (!pager) return;
    if (total === 0) {
        pager.innerHTML = '';
        return;
    }
    pager.innerHTML = `
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;">
            <div style="color:#9fb6ff;font-size:0.9rem;">
                显示第 ${start + 1} - ${start + shownCount} 条（筛选后共 ${total} 条）
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <button class="btn btn-outline btn-sm" ${bandViewState.page <= 1 ? 'disabled' : ''} onclick="window.__rockRadarAdmin.changeBandPage(-1)">上一页</button>
                <span style="min-width:70px;text-align:center;color:#e6edf3;">${bandViewState.page} / ${totalPages}</span>
                <button class="btn btn-outline btn-sm" ${bandViewState.page >= totalPages ? 'disabled' : ''} onclick="window.__rockRadarAdmin.changeBandPage(1)">下一页</button>
            </div>
        </div>
    `;
}

function changeBandPage(delta) {
    const entries = getFilteredBandEntries();
    const totalPages = Math.max(1, Math.ceil(entries.length / bandViewState.pageSize));
    const next = Math.max(1, Math.min(totalPages, bandViewState.page + delta));
    if (next === bandViewState.page) return;
    bandViewState.page = next;
    renderBands();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isBandSortModalOpen() {
    const modal = document.getElementById('bandSortModal');
    return !!modal && modal.classList.contains('show');
}

function refreshBandViews() {
    renderBands();
    if (isBandSortModalOpen()) renderBandSortTable();
    renderRolePosition();
    renderRoleComparison();
}

function getBandColorTarget(index, scope = 'base') {
    const band = appData.namelist[index];
    if (!band) return null;
    return scope === 'mid' ? ensureBandMidPhase(index) : band;
}

function resolveTargetColor(target, fallbackIndex = 0) {
    if (target?.colorMode === 'custom') {
        return normalizeColorObject(target.customColor, appData.COLOR_PRESETS[fallbackIndex] || DEFAULT_FIXED_COLOR_PRESETS[0]);
    }
    const index = Number.isInteger(Number(target?.colorIndex))
        ? clamp(Number(target.colorIndex), 0, FIXED_COLOR_COUNT - 1)
        : clamp(fallbackIndex, 0, FIXED_COLOR_COUNT - 1);
    return normalizeColorObject(appData.COLOR_PRESETS[index], DEFAULT_FIXED_COLOR_PRESETS[index]);
}

function colorPreviewStyle(color) {
    const normalized = normalizeColorObject(color);
    return `background:linear-gradient(135deg,${normalized.color} 0 34%,${normalized.bg1} 34% 67%,${normalized.bg2} 67% 100%);`;
}

function renderBandColorPicker(band, index, scope, label) {
    const target = scope === 'mid' ? (band.midPhase || band) : band;
    const fallbackIndex = Number.isInteger(Number(band.colorIndex)) ? Number(band.colorIndex) : index % FIXED_COLOR_COUNT;
    const isCustom = target?.colorMode === 'custom';
    const selectedIndex = !isCustom && Number.isInteger(Number(target?.colorIndex))
        ? clamp(Number(target.colorIndex), 0, FIXED_COLOR_COUNT - 1)
        : fallbackIndex;
    const selectedColor = resolveTargetColor(target, fallbackIndex);
    const selectedName = isCustom
        ? '自定义'
        : (appData.COLOR_PRESETS[selectedIndex]?.name || `固定配色 ${selectedIndex + 1}`);
    const choices = appData.COLOR_PRESETS.map((preset, presetIndex) => `
        <button type="button" class="color-choice ${!isCustom && selectedIndex === presetIndex ? 'active' : ''}"
            onclick="window.__rockRadarAdmin.selectBandColor(${index},'${scope}','preset',${presetIndex})">
            <span class="color-preview" style="${colorPreviewStyle(preset)}"></span>
            <span class="color-choice-label">${esc(preset.name || `固定配色 ${presetIndex + 1}`)}</span>
        </button>
    `).join('');
    const customFields = isCustom ? `
        <div class="custom-color-fields">
            ${[
                ['color', '主色'],
                ['bg1', '背景 1'],
                ['bg2', '背景 2']
            ].map(([key, text]) => `
                <div class="form-group">
                    <label>${text}</label>
                    <input type="color" value="${escAttr(selectedColor[key])}"
                        onchange="window.__rockRadarAdmin.updateBandCustomColor(${index},'${scope}','${key}',this.value)">
                </div>
            `).join('')}
        </div>
    ` : '';

    return `
        <div class="form-group">
            <label>${label}</label>
            <details class="color-picker" id="color-picker-${scope}-${index}">
                <summary>
                    <span class="color-preview" style="${colorPreviewStyle(selectedColor)}"></span>
                    <span>${esc(selectedName)}</span>
                </summary>
                <div class="color-picker-menu">
                    <div class="color-choice-grid">
                        ${choices}
                        <button type="button" class="color-choice ${isCustom ? 'active' : ''}"
                            onclick="window.__rockRadarAdmin.selectBandColor(${index},'${scope}','custom')">
                            <span class="color-preview" style="${colorPreviewStyle(selectedColor)}"></span>
                            <span class="color-choice-label">自定义</span>
                        </button>
                    </div>
                    ${customFields}
                </div>
            </details>
        </div>
    `;
}

function selectBandColor(index, scope, mode, presetIndex = 0) {
    const band = appData.namelist[index];
    const target = getBandColorTarget(index, scope);
    if (!band || !target) return;
    const fallbackIndex = Number.isInteger(Number(band.colorIndex)) ? Number(band.colorIndex) : index % FIXED_COLOR_COUNT;
    const currentColor = resolveTargetColor(target, fallbackIndex);
    if (mode === 'custom') {
        target.colorMode = 'custom';
        target.colorIndex = null;
        target.customColor = cloneColorObject(target.customColor, currentColor);
    } else {
        target.colorMode = 'preset';
        target.colorIndex = clamp(Number(presetIndex) || 0, 0, FIXED_COLOR_COUNT - 1);
    }
    refreshBandViews();
    if (mode === 'custom') {
        requestAnimationFrame(() => {
            const picker = document.getElementById(`color-picker-${scope}-${index}`);
            if (picker) picker.open = true;
        });
    }
}

function updateBandCustomColor(index, scope, key, value) {
    const band = appData.namelist[index];
    const target = getBandColorTarget(index, scope);
    if (!band || !target || !['color', 'bg1', 'bg2'].includes(key)) return;
    const fallbackIndex = Number.isInteger(Number(band.colorIndex)) ? Number(band.colorIndex) : index % FIXED_COLOR_COUNT;
    target.colorMode = 'custom';
    target.colorIndex = null;
    target.customColor = cloneColorObject(target.customColor, resolveTargetColor(target, fallbackIndex));
    target.customColor[key] = normalizeHexColor(value, target.customColor[key]);
    const picker = document.getElementById(`color-picker-${scope}-${index}`);
    if (picker) {
        const style = colorPreviewStyle(target.customColor);
        picker.querySelectorAll('summary .color-preview, .color-choice.active .color-preview').forEach(preview => {
            preview.style.cssText = style;
        });
    }
}

function openBandSortModal() {
    renderBandSortTable();
    document.getElementById('bandSortModal').classList.add('show');
}

function closeBandSortModal() {
    clearBandSortHoverState();
    bandSortDragState = null;
    document.getElementById('bandSortModal').classList.remove('show');
}

function clearBandSortHoverState() {
    const table = document.getElementById('bandSortTable');
    if (!table) return;
    table.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(row => {
        row.classList.remove('drag-over-top', 'drag-over-bottom');
    });
}

function renderBandSortTable() {
    const table = document.getElementById('bandSortTable');
    const summary = document.getElementById('bandSortSummary');
    if (!table || !appData) return;
    if (summary) summary.textContent = `共 ${appData.namelist.length} 个角色`;
    if (!appData.namelist.length) {
        table.innerHTML = `<div class="sort-empty">当前没有角色可排序。</div>`;
        return;
    }
    table.innerHTML = appData.namelist.map((band, idx) => `
        <div class="sort-row" data-idx="${idx}" draggable="true">
            <div class="sort-handle" title="拖动排序">⋮⋮</div>
            <div class="sort-rank">#${idx + 1}</div>
            <div class="sort-name">
                <span class="sort-name-text">${esc(band.name || `角色 ${idx + 1}`)}</span>
                ${band.gacha ? '<span class="sort-badge">出金</span>' : ''}
            </div>
            <div class="sort-desc">${esc(band.desc || ' ')}</div>
        </div>
    `).join('');
}

function reorderBandByDrag(fromIdx, toIdx, insertAfter) {
    const list = appData.namelist;
    if (!Array.isArray(list)) return;
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) return;
    const finalIndex = insertAfter
        ? (fromIdx < toIdx ? toIdx : toIdx + 1)
        : (fromIdx < toIdx ? toIdx - 1 : toIdx);
    moveBandTo(fromIdx, finalIndex);
}

function renderBands() {
    const list = document.getElementById('bandList');
    const countEl = document.getElementById('bandCount');
    const entries = getFilteredBandEntries();
    const total = entries.length;
    const totalPages = Math.max(1, Math.ceil(total / bandViewState.pageSize));
    if (bandViewState.page > totalPages) bandViewState.page = totalPages;
    const start = (bandViewState.page - 1) * bandViewState.pageSize;
    const pageEntries = entries.slice(start, start + bandViewState.pageSize);

    if (countEl) countEl.textContent = `共 ${appData.namelist.length} 条，筛选后 ${total} 条`;
    renderBandPager(total, totalPages, start, pageEntries.length);

    if (!pageEntries.length) {
        list.innerHTML = `<div class="card" style="padding:18px;color:#9fb6ff;">没有匹配的选手，试试清空搜索或取消筛选。</div>`;
        return;
    }

    list.innerHTML = pageEntries.map(({ b, idx }) => `
        <div class="card band-card" data-idx="${idx}">
            <div class="band-index">${idx + 1}</div>
            <div class="band-card-main">
                <div class="form-row">
                    <div class="form-group"><label>名称</label><input type="text" value="${esc(b.name)}" onchange="window.__rockRadarAdmin.updateBand(${idx},'name',this.value)"></div>
                    <div class="form-group"><label>描述</label><input type="text" value="${esc(b.desc || '')}" onchange="window.__rockRadarAdmin.updateBand(${idx},'desc',this.value)" style="width:300px;"></div>
                    <div class="form-group"><label>装备图</label><input type="text" value="${esc(b.equipmentIds || '')}" onchange="window.__rockRadarAdmin.updateBand(${idx},'equipmentIds',this.value)" placeholder="3,4 或 3,8,16" style="width:180px;"></div>
                    ${renderBandColorPicker(b, idx, 'base', '角色配色')}
                    <div class="form-group"><label>时长(ms)</label><input type="number" value="${b.duration || ''}" step="500" onchange="window.__rockRadarAdmin.updateBand(${idx},'duration',this.value?+this.value:undefined)" style="width:100px;"></div>
                    <div class="checkbox-row" style="margin-top:18px;"><input type="checkbox" ${b.gacha ? 'checked' : ''} onchange="window.__rockRadarAdmin.updateBand(${idx},'gacha',this.checked)"><label>抽卡出金</label></div>
                    <div class="form-group"><label>抽卡艺术字</label><input type="text" value="${esc(b.gachaText || '')}" onchange="window.__rockRadarAdmin.updateBand(${idx},'gachaText',this.value)" placeholder="留空则使用角色名" style="width:220px;"></div>
                </div>
                <div class="card" style="margin-top:14px;padding:14px 16px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);">
                    <div class="form-row" style="align-items:flex-end;">
                        <div class="checkbox-row" style="margin-top:0;"><input type="checkbox" ${(b.midPhase && b.midPhase.enabled) ? 'checked' : ''} onchange="window.__rockRadarAdmin.updateMidPhase(${idx},'enabled',this.checked)"><label>启用中途形态</label></div>
                        <div class="form-group"><label>切换比例</label><input type="number" min="0.1" max="0.9" step="0.05" value="${b.midPhase && b.midPhase.triggerRatio !== undefined ? b.midPhase.triggerRatio : 0.5}" onchange="window.__rockRadarAdmin.updateMidPhase(${idx},'triggerRatio',Math.max(0.1,Math.min(0.9,+this.value||0.5)))" style="width:90px;"></div>
                        <div class="form-group"><label>二段图片名</label><input type="text" value="${esc((b.midPhase && b.midPhase.photoName) || '')}" onchange="window.__rockRadarAdmin.updateMidPhase(${idx},'photoName',this.value)" placeholder="如：罗刹" style="width:180px;"></div>
                        ${renderBandColorPicker(b, idx, 'mid', '二段配色')}
                    </div>
                    <div class="points-grid" style="margin-top:10px;">
                        ${(appData.CONFIG.DIM_NAMES || []).map((dim, di) => `
                            <div class="form-group">
                                <label>二段${esc(dim)}</label>
                                <input type="number" value="${b.midPhase && b.midPhase.points && b.midPhase.points[di] !== undefined ? b.midPhase.points[di] : (b.points[di] !== undefined ? b.points[di] : 0)}" step="0.1" onchange="window.__rockRadarAdmin.updateMidPhasePoint(${idx},${di},+this.value)">
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="points-grid">
                    ${(appData.CONFIG.DIM_NAMES || []).map((dim, di) => `
                        <div class="form-group">
                            <label>${esc(dim)}</label>
                            <input type="number" value="${b.points[di] !== undefined ? b.points[di] : 0}" step="0.1" onchange="window.__rockRadarAdmin.updatePoint(${idx},${di},+this.value)">
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="band-card-actions">
                ${idx > 0 ? `<button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.moveBandTo(${idx},0)">⤒</button>` : ''}
                ${idx > 0 ? `<button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.moveBand(${idx},-1)">↑</button>` : ''}
                ${idx < appData.namelist.length - 1 ? `<button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.moveBand(${idx},1)">↓</button>` : ''}
                ${idx < appData.namelist.length - 1 ? `<button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.moveBandTo(${idx},${window.__rockRadarAdmin.data.namelist.length - 1})">⤓</button>` : ''}
                <div style="display:flex;align-items:center;gap:6px;">
                    <input type="number" id="band-pos-${idx}" min="1" max="${appData.namelist.length}" value="${idx + 1}" style="width:64px;text-align:center;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;color:var(--text);">
                    <button class="btn btn-outline btn-sm" onclick="window.__rockRadarAdmin.jumpBandTo(${idx})">跳转</button>
                </div>
                <button class="btn btn-danger btn-sm" onclick="window.__rockRadarAdmin.removeBand(${idx})">删除</button>
            </div>
        </div>
    `).join('');
}

function updateBand(idx, key, val) { appData.namelist[idx][key] = val; }
function updatePoint(idx, dim, val) { appData.namelist[idx].points[dim] = val; }
function ensureBandMidPhase(idx) {
    const band = appData.namelist[idx];
    const vc = getNormalizedVertexCount(appData.CONFIG?.VERTEX_COUNT);
    if (!band.midPhase || typeof band.midPhase !== 'object') {
        band.midPhase = {
            enabled: false,
            triggerRatio: 0.5,
            photoName: '',
            colorMode: band.colorMode === 'custom' ? 'custom' : 'preset',
            colorIndex: band.colorMode === 'custom' ? null : band.colorIndex,
            customColor: band.colorMode === 'custom' ? cloneColorObject(band.customColor) : undefined,
            points: Array.isArray(band.points) ? band.points.slice(0, vc) : Array(vc).fill(0)
        };
    }
    band.midPhase.points = ensureLength(Array.isArray(band.midPhase.points) ? band.midPhase.points : [], vc, i => band.points?.[i] ?? 0);
    return band.midPhase;
}
function updateMidPhase(idx, key, val) { ensureBandMidPhase(idx)[key] = val; }
function updateMidPhasePoint(idx, dim, val) { ensureBandMidPhase(idx).points[dim] = val; }

function addBand() {
    normalizeVertexConfigAndBands();
    const vc = getNormalizedVertexCount(appData.CONFIG.VERTEX_COUNT);
    const colorIndex = appData.namelist.length % FIXED_COLOR_COUNT;
    appData.namelist.push({
        name: "New",
        points: Array(vc).fill(5),
        desc: "",
        gachaText: "",
        colorMode: 'preset',
        colorIndex,
        midPhase: {
            enabled: false,
            triggerRatio: 0.5,
            photoName: '',
            colorMode: 'preset',
            colorIndex,
            points: Array(vc).fill(5)
        }
    });
    refreshBandViews();
}

function removeBand(idx) {
    if (!confirm(`确认删除 "${appData.namelist[idx].name}"？`)) return;
    appData.namelist.splice(idx, 1);
    refreshBandViews();
}

function moveBand(idx, dir) {
    const target = idx + dir;
    [appData.namelist[idx], appData.namelist[target]] = [appData.namelist[target], appData.namelist[idx]];
    markRolePositionDirty();
    refreshBandViews();
}

function moveBandTo(idx, target) {
    const len = appData.namelist.length;
    if (!len) return;
    const to = Math.max(0, Math.min(len - 1, target));
    if (idx === to) return;
    if (RolePosition) {
        appData.namelist = RolePosition.moveItem(appData.namelist, idx, to);
    } else {
        const [item] = appData.namelist.splice(idx, 1);
        appData.namelist.splice(to, 0, item);
    }
    markRolePositionDirty();
    refreshBandViews();
}

function jumpBandTo(idx) {
    const input = document.getElementById(`band-pos-${idx}`);
    if (!input) return;
    const to = parseInt(input.value, 10);
    if (!Number.isFinite(to)) return;
    moveBandTo(idx, to - 1);
}

// ===== 全局配置 =====
function collectBackgroundEffectConfigFields() {
    if (!appData?.CONFIG || !BackgroundEffects) return;
    const config = BackgroundEffects.normalizeConfig(appData.CONFIG.BG_EFFECT_CONFIG, appData.CONFIG);
    document.querySelectorAll('[data-bg-config-path]').forEach(input => {
        BackgroundEffects.setPath(config, input.dataset.bgConfigPath, input.value);
    });
    appData.CONFIG.BG_EFFECT_CONFIG = BackgroundEffects.normalizeConfig(config, appData.CONFIG);
    appData.CONFIG.PARTICLE_OPACITY_MULT = appData.CONFIG.BG_EFFECT_CONFIG.common.opacity;
    appData.CONFIG.PARTICLE_SIZE_MULT = appData.CONFIG.BG_EFFECT_CONFIG.common.size;
}

function renderBackgroundEffectConfigFields(skipCollect = false) {
    if (!appData?.CONFIG || !BackgroundEffects) return;
    if (!skipCollect) collectBackgroundEffectConfigFields();
    const select = document.getElementById('cfg-BG_EFFECT_MODE');
    const container = document.getElementById('bgEffectConfigFields');
    if (!select || !container) return;
    const mode = BackgroundEffects.normalizeMode(select.value || appData.CONFIG.BG_EFFECT_MODE);
    appData.CONFIG.BG_EFFECT_MODE = mode;
    const config = BackgroundEffects.normalizeConfig(appData.CONFIG.BG_EFFECT_CONFIG, appData.CONFIG);
    appData.CONFIG.BG_EFFECT_CONFIG = config;
    const fields = getBackgroundFieldsForMode(mode);
    container.innerHTML = fields.length
        ? fields.map(field => renderBackgroundField(
            field,
            BackgroundEffects.getPath(config, field.path),
            `data-bg-config-path="${escAttr(field.path)}"`
        )).join('')
        : '<div class="background-effect-note">Canvas 背景特效已关闭，独立的基础渐变背景仍会保留。</div>';
}

function renderConfig() {
    const C = appData.CONFIG;
    if (C.PHOTO_FX_ENABLED === undefined) C.PHOTO_FX_ENABLED = true;
    if (C.PHOTO_FX_INTENSITY === undefined) C.PHOTO_FX_INTENSITY = 1;
    if (C.MUSIC_VOLUME === undefined) C.MUSIC_VOLUME = 0.7;
    if (C.MUSIC_DELAY_SECONDS === undefined) C.MUSIC_DELAY_SECONDS = 0;
    if (C.MUSIC_TRACKS === undefined) C.MUSIC_TRACKS = '/assets/audio/music.mp3';
    if (C.PRESENTATION_SCALE === undefined) C.PRESENTATION_SCALE = 1.3;
    if (C.GACHA_LOGO_ON_TIME === undefined) C.GACHA_LOGO_ON_TIME = 120;
    if (C.GACHA_LOGO_DURATION === undefined) C.GACHA_LOGO_DURATION = 400;
    if (C.RADAR_AUTO_OFFSET === undefined) C.RADAR_AUTO_OFFSET = false;
    if (C.PERFORMANCE_MODE === undefined) C.PERFORMANCE_MODE = 'balanced';
    if (C.BG_EFFECT_MODE === undefined) C.BG_EFFECT_MODE = 'living-field';
    C.BG_EFFECT_CONFIG = BackgroundEffects.normalizeConfig(C.BG_EFFECT_CONFIG, C);
    C.PARTICLE_OPACITY_MULT = C.BG_EFFECT_CONFIG.common.opacity;
    C.PARTICLE_SIZE_MULT = C.BG_EFFECT_CONFIG.common.size;
    if (C.RADAR_AUDIO_FX_MODE === undefined) C.RADAR_AUDIO_FX_MODE = 'tech';
    if (C.ADAPTIVE_PERF === undefined) C.ADAPTIVE_PERF = true;
    if (C.BRAND_TOP_RIGHT_TEXT === undefined) {
        const legacy = String(C.BRAND_LEFT_TOP_TEXT || '').trim();
        C.BRAND_TOP_RIGHT_TEXT = (legacy && legacy !== 'IPC LOCK') ? legacy : 'HONKAI: STAR RAIL V4.0';
    }
    if (C.BRAND_BOTTOM_LEFT_TEXT === undefined) C.BRAND_BOTTOM_LEFT_TEXT = C.BRAND_RIGHT_BOTTOM_TEXT || 'CURRENCY WAR / IPC';
    if (C.BRAND_WATERMARK_CN === undefined) C.BRAND_WATERMARK_CN = '货币战争';
    if (C.BRAND_WATERMARK_EN === undefined) C.BRAND_WATERMARK_EN = 'CURRENCY WAR';
    if (C.INTRO_TITLE_MAIN === undefined) C.INTRO_TITLE_MAIN = '货币战争雷达图 V4.0';
    if (C.INTRO_TITLE_SUB === undefined) C.INTRO_TITLE_SUB = 'Currency War Radar System';
    normalizeVertexConfigAndBands();
    // 数字/文本字段
    ['RADAR_SCALE','RADAR_GRID_LEVELS','RADAR_GRID_LINE_WIDTH','RADAR_GRID_LINE_OPACITY',
      'VERTEX_COUNT','LABEL_MARGIN','ANIM_DURATION','DEFAULT_DURATION','INTRO_WAIT_TIME',
      'MUSIC_VOLUME','MUSIC_DELAY_SECONDS','MUSIC_TRACKS','IMAGE_SCALE','PRESENTATION_SCALE','PHOTO_FX_INTENSITY','GACHA_ANIM_DURATION','GACHA_LOGO_ON_TIME','GACHA_LOGO_DURATION','BEST_FONT',
      'BRAND_TOP_RIGHT_TEXT','BRAND_BOTTOM_LEFT_TEXT','BRAND_WATERMARK_CN','BRAND_WATERMARK_EN','INTRO_TITLE_MAIN','INTRO_TITLE_SUB'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) el.value = C[k] !== undefined ? C[k] : '';
    });
    // 复选框
    ['SHOW_DESC','ENABLE_SPECIAL_FORMAT','USE_AUTO_PRECISION','SHOW_SCORE_UNDER_NAME','PHOTO_FX_ENABLED','RADAR_AUTO_OFFSET','ADAPTIVE_PERF'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) el.checked = !!C[k];
    });
    // 颜色
    const bestColorEl = document.getElementById('cfg-BEST_COLOR');
    if (bestColorEl) bestColorEl.value = C.BEST_COLOR || '#fff2a6';
    // 下拉
    const gachaStyle = document.getElementById('cfg-GACHA_FONT_STYLE');
    if (gachaStyle) gachaStyle.value = C.GACHA_FONT_STYLE || 0;
    const perfMode = document.getElementById('cfg-PERFORMANCE_MODE');
    if (perfMode) perfMode.value = C.PERFORMANCE_MODE || 'balanced';
    const bgEffectMode = document.getElementById('cfg-BG_EFFECT_MODE');
    if (bgEffectMode) {
        bgEffectMode.innerHTML = BackgroundEffects.MODE_OPTIONS
            .map(([value, label]) => `<option value="${escAttr(value)}">${esc(label)}</option>`)
            .join('');
        bgEffectMode.value = BackgroundEffects.normalizeMode(C.BG_EFFECT_MODE);
        renderBackgroundEffectConfigFields(true);
    }
    const radarAudioFxMode = document.getElementById('cfg-RADAR_AUDIO_FX_MODE');
    if (radarAudioFxMode) radarAudioFxMode.value = C.RADAR_AUDIO_FX_MODE || 'tech';
    // MVP
    document.getElementById('cfg-mvplist').value = (appData.mvplist || []).join(', ');
    // 专家
    document.getElementById('cfg-expertlist').value = normalizeNameList(appData.expertlist).join(', ');
    // 维度设置
    renderDimSettings();
}

function setDimPercentMode(index, mode, checked) {
    const C = appData && appData.CONFIG ? appData.CONFIG : null;
    if (!C) return;
    C.USE_PERCENTAGE[index] = !!C.USE_PERCENTAGE[index];
    C.REAL_PERCENTAGE[index] = !!C.REAL_PERCENTAGE[index];
    if (mode === 'range') {
        C.USE_PERCENTAGE[index] = !!checked;
        if (checked) C.REAL_PERCENTAGE[index] = false;
    } else if (mode === 'real') {
        C.REAL_PERCENTAGE[index] = !!checked;
        if (checked) C.USE_PERCENTAGE[index] = false;
    }
    renderDimSettings();
    refreshBandViews();
}

function renderDimSettings() {
    const C = appData.CONFIG;
    const vc = getNormalizedVertexCount(C.VERTEX_COUNT);
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">';
    for (let i = 0; i < vc; i++) {
        html += `<div class="card" style="padding:12px;">
            <div class="form-group"><label>维度 ${i + 1} 名称</label><input type="text" value="${esc(C.DIM_NAMES[i] || '')}" onchange="window.__rockRadarAdmin.data.CONFIG.DIM_NAMES[${i}]=this.value" style="width:100%;"></div>
            <div class="form-group"><label>满分</label><input type="number" value="${C.BASE_MAX_SCORES[i] || 10}" step="1" onchange="window.__rockRadarAdmin.data.CONFIG.BASE_MAX_SCORES[${i}]=+this.value" style="width:100%;"></div>
            <div class="form-group"><label>最低分</label><input type="number" value="${C.MIN_SCORES[i] || 0}" step="1" onchange="window.__rockRadarAdmin.data.CONFIG.MIN_SCORES[${i}]=+this.value" style="width:100%;"></div>
            <div class="checkbox-row"><input type="checkbox" ${C.USE_PERCENTAGE[i] ? 'checked' : ''} onchange="window.__rockRadarAdmin.setDimPercentMode(${i},'range',this.checked)"><label>百分比（按量程）</label></div>
            <div class="checkbox-row"><input type="checkbox" ${C.REAL_PERCENTAGE && C.REAL_PERCENTAGE[i] ? 'checked' : ''} onchange="window.__rockRadarAdmin.setDimPercentMode(${i},'real',this.checked)"><label>真实百分比</label></div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('dimSettings').innerHTML = html;
}

function collectConfig() {
    const C = appData.CONFIG;
    ['RADAR_SCALE','RADAR_GRID_LINE_WIDTH','RADAR_GRID_LINE_OPACITY','MUSIC_VOLUME','MUSIC_DELAY_SECONDS','IMAGE_SCALE','PHOTO_FX_INTENSITY'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) C[k] = parseFloat(el.value) || 0;
    });
    ['RADAR_GRID_LEVELS','VERTEX_COUNT','LABEL_MARGIN','ANIM_DURATION','DEFAULT_DURATION','INTRO_WAIT_TIME','GACHA_ANIM_DURATION'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) C[k] = parseInt(el.value) || 0;
    });
    ['GACHA_LOGO_ON_TIME','GACHA_LOGO_DURATION'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) C[k] = Math.max(0, parseInt(el.value) || 0);
    });
    {
        const musicVolume = Number(C.MUSIC_VOLUME);
        C.MUSIC_VOLUME = Number.isFinite(musicVolume) ? Math.max(0, Math.min(1, musicVolume)) : 0.7;
    }
    {
        const musicDelay = Number(C.MUSIC_DELAY_SECONDS);
        C.MUSIC_DELAY_SECONDS = Number.isFinite(musicDelay)
            ? Math.round(Math.max(0, Math.min(60, musicDelay)) * 10) / 10
            : 0;
    }
    {
        const presentationScale = Number.parseFloat(document.getElementById('cfg-PRESENTATION_SCALE')?.value);
        C.PRESENTATION_SCALE = Number.isFinite(presentationScale)
            ? Math.max(0.8, Math.min(1.6, presentationScale))
            : 1.3;
    }
    ['SHOW_DESC','ENABLE_SPECIAL_FORMAT','USE_AUTO_PRECISION','SHOW_SCORE_UNDER_NAME','PHOTO_FX_ENABLED','RADAR_AUTO_OFFSET','ADAPTIVE_PERF'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) C[k] = el.checked;
    });
    C.BEST_COLOR = document.getElementById('cfg-BEST_COLOR').value;
    C.BEST_FONT = document.getElementById('cfg-BEST_FONT').value;
    C.MUSIC_TRACKS = String(document.getElementById('cfg-MUSIC_TRACKS').value || '').trim();
    ['BRAND_TOP_RIGHT_TEXT','BRAND_BOTTOM_LEFT_TEXT','BRAND_WATERMARK_CN','BRAND_WATERMARK_EN','INTRO_TITLE_MAIN','INTRO_TITLE_SUB'].forEach(k => {
        const el = document.getElementById(`cfg-${k}`);
        if (el) C[k] = String(el.value || '').trim();
    });
    C.PERFORMANCE_MODE = document.getElementById('cfg-PERFORMANCE_MODE').value || 'balanced';
    collectBackgroundEffectConfigFields();
    C.BG_EFFECT_MODE = BackgroundEffects.normalizeMode(document.getElementById('cfg-BG_EFFECT_MODE').value);
    C.RADAR_AUDIO_FX_MODE = document.getElementById('cfg-RADAR_AUDIO_FX_MODE').value || 'tech';
    C.GACHA_ANIM_TYPE = 2;
    C.GACHA_FONT_STYLE = parseInt(document.getElementById('cfg-GACHA_FONT_STYLE').value);
    // MVP list
    appData.mvplist = document.getElementById('cfg-mvplist').value.split(',').map(s => s.trim()).filter(Boolean);
    // 专家 list
    appData.expertlist = normalizeNameList(document.getElementById('cfg-expertlist').value);
    normalizeSpecialProfiles();
    normalizeVertexConfigAndBands();
}

// ===== 颜色方案 =====
function renderColors() {
    const list = document.getElementById('fixedColorList');
    if (!list) return;
    list.innerHTML = appData.COLOR_PRESETS.map((preset, index) => `
        <div class="fixed-color-card">
            <div class="color-preview" style="${colorPreviewStyle(preset)}"></div>
            <div class="fixed-color-fields">
                <div class="form-group name-field">
                    <label>固定配色 ${index + 1} 名称</label>
                    <input type="text" value="${escAttr(preset.name)}"
                        onchange="window.__rockRadarAdmin.updateFixedColor(${index},'name',this.value)">
                </div>
                ${[
                    ['color', '主色'],
                    ['bg1', '背景 1'],
                    ['bg2', '背景 2']
                ].map(([key, label]) => `
                    <div class="form-group">
                        <label>${label}</label>
                        <input type="color" value="${escAttr(preset[key])}"
                            onchange="window.__rockRadarAdmin.updateFixedColor(${index},'${key}',this.value)">
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function updateFixedColor(index, key, value) {
    const preset = appData.COLOR_PRESETS[index];
    if (!preset || !['name', 'color', 'bg1', 'bg2'].includes(key)) return;
    if (key === 'name') {
        preset.name = String(value || '').trim() || `固定配色 ${index + 1}`;
    } else {
        preset[key] = normalizeHexColor(value, preset[key]);
    }
    renderColors();
    refreshBandViews();
}

// ===== 图片管理 =====
async function loadImages() {
    const images = await refreshLatestImages();
            if (!scope.active) return;
    renderSpecialImages();
    renderRolePosition();
    const grid = document.getElementById('imageGrid');
    grid.innerHTML = images.map(img => `
        <div class="image-item">
            <img src="${img.url}" loading="lazy" alt="${esc(img.name)}">
            <button class="image-del" onclick='window.__rockRadarAdmin.deleteImage(${window.__rockRadarAdmin.jsonAttr(img.name)})' title="删除">✕</button>
            <div class="image-info">${esc(img.name)}<br><span style="color:#666">${(img.size / 1024).toFixed(1)} KB</span></div>
            <div class="image-rename">
                <input type="text" id="rename-${imageInputKey(img.name)}" value="${escAttr(img.name)}" placeholder="新文件名">
                <button class="btn btn-outline btn-sm" onclick='window.__rockRadarAdmin.renameImage(${window.__rockRadarAdmin.jsonAttr(img.name)})'>改名</button>
            </div>
            <div class="image-tools">
                <button class="btn btn-outline btn-sm" onclick='window.__rockRadarAdmin.openImageEditor(${window.__rockRadarAdmin.jsonAttr(img.name)}, ${window.__rockRadarAdmin.jsonAttr(img.url)})'>取景</button>
                ${appData.IMAGE_META && appData.IMAGE_META[img.name] ? '<span class="image-badge">已设置取景</span>' : '<span class="image-badge" style="color:#667;">默认</span>'}
            </div>
        </div>
    `).join('');
}

function triggerSpecialUpload(slotId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    listen(input, 'change', () => {
        const file = input.files && input.files[0];
        if (file) uploadSpecialFile(slotId, file);
        input.remove();
    }, { once: true });
    document.body.appendChild(input);
    input.click();
}

async function uploadSpecialFile(slotId, file) {
    const slot = specialImageSlots.find(item => item.id === slotId);
    if (!slot || !file) return;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const formData = new FormData();
    formData.append('filename', `${slot.baseName}.${ext}`);
    formData.append('image', file);
    try {
        console.debug('[door-upload] start', { slotId, filename: `${slot.baseName}.${ext}`, originalName: file.name, size: file.size });
        showToast(`正在上传${slot.title}...`, 'success');
        const res = await fetch(`/api/upload-slot/${encodeURIComponent(slotId)}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        console.debug('[door-upload] response', { slotId, ok: res.ok, status: res.status, data });
        if (data.success) {
            showToast(`${slot.title}上传成功`, 'success');
            await loadImages();
        } else {
            showToast(data.error || '上传失败', 'error');
        }
    } catch (e) {
        console.error('[door-upload] error', { slotId, error: e });
        showToast('上传出错', 'error');
    }
}

async function openSpecialImageEditor(slotId) {
    let img = findSpecialImage(slotId);
    if (!img) {
        await refreshLatestImages();
        renderSpecialImages();
        img = findSpecialImage(slotId);
    }
    if (!img) {
        showToast('请先上传图片', 'error');
        return;
    }
    openImageEditor(img.name, img.url);
}

async function uploadFile(file) {
    if (!file) return;
    const formData = new FormData();
    const customName = document.getElementById('uploadFilename').value.trim();
    if (customName) formData.append('filename', customName);
    formData.append('image', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(`上传成功: ${data.filename}`, 'success');
            loadImages();
            document.getElementById('uploadFilename').value = '';
        } else {
            showToast(data.error || '上传失败', 'error');
        }
    } catch (e) {
        showToast('上传出错', 'error');
    }
}

async function deleteImage(name) {
    if (!confirm(`确认删除图片 "${name}"？`)) return;
    try {
        const res = await fetch(`/api/images/${encodeURIComponent(name)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            delete appData.IMAGE_META?.[name];
            showToast('已删除', 'success');
            loadImages();
        } else {
            showToast(data.error || '删除失败', 'error');
        }
    } catch (e) {
        showToast('删除出错', 'error');
    }
}

async function renameImage(oldName) {
    const input = document.getElementById(`rename-${imageInputKey(oldName)}`);
    if (!input) return;
    const filename = input.value.trim();
    if (!filename) {
        showToast('文件名不能为空', 'error');
        return;
    }
    try {
        const res = await fetch(`/api/images/${encodeURIComponent(oldName)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });
        const data = await res.json();
        if (data.success) {
            if (appData.IMAGE_META && appData.IMAGE_META[oldName]) {
                appData.IMAGE_META[data.filename] = appData.IMAGE_META[oldName];
                delete appData.IMAGE_META[oldName];
            }
            showToast(`已改名为: ${data.filename}`, 'success');
            loadImages();
        } else {
            showToast(data.error || '改名失败', 'error');
        }
    } catch (e) {
        showToast('改名出错', 'error');
    }
}

function getDefaultImageMeta(name = '', placement = '') {
    const base = imageBaseName(name);
    if (placement === 'left-half' || placement === 'right-half') {
        return { fit: 'cover', scale: 1, x: 50, y: 50 };
    }
    if (placement === 'gacha-full-bg' || base.startsWith('best_')) {
        return { fit: 'cover', scale: 1, x: 50, y: 50 };
    }
    if (placement === 'info-card') {
        return { fit: 'cover', scale: 1, x: 50, y: 50 };
    }
    if (placement === 'mvp-left-fade') {
        return { fit: 'contain', scale: 1, x: 50, y: 50 };
    }
    return { fit: 'contain', scale: 1, x: 50, y: 50 };
}

function getImageMeta(name) {
    appData.IMAGE_META = appData.IMAGE_META || {};
    return {
        ...getDefaultImageMeta(name, getImagePlacement(name)),
        ...(appData.IMAGE_META[name] || {})
    };
}

function getImagePlacement(name) {
    const base = imageBaseName(name);
    if (base === 'gacha_door_left') return 'left-half';
    if (base === 'gacha_door_right') return 'right-half';
    if (base.startsWith('best_')) return 'gacha-full-bg';
    if (base.endsWith('1')) return 'mvp-left-fade';
    if (base.endsWith('2')) return 'info-card';
    return '';
}

function remapImageMetaForPlacement(meta, placement = '') {
    const next = { ...meta };
    if (placement === 'left-half') {
        next.x = (meta.x ?? 50) / 2;
    } else if (placement === 'right-half') {
        next.x = 50 + ((meta.x ?? 50) / 2);
    } else if (placement === 'mvp-left-fade') {
        // MVP 只展示左侧渐隐区域，编辑时让 0-100 直接对应这个可见区
        next.x = ((meta.x ?? 50) * 0.58);
    }
    return next;
}

function openImageEditor(name, url) {
    currentImageEditor = { name, url, placement: getImagePlacement(name) };
    cropDraft = { ...getImageMeta(name) };
    document.getElementById('editorImageName').textContent = name;
    document.getElementById('cropPreviewImage').src = url;
    cropStage.classList.toggle('door-preview', currentImageEditor.placement === 'left-half' || currentImageEditor.placement === 'right-half');
    cropStage.classList.toggle('mvp-preview', currentImageEditor.placement === 'mvp-left-fade');
    cropStage.classList.toggle('info-preview', currentImageEditor.placement === 'info-card');
    cropStage.classList.toggle('best-preview', currentImageEditor.placement === 'gacha-full-bg');
    cropStage.classList.toggle('door-left', currentImageEditor.placement === 'left-half');
    cropStage.classList.toggle('door-right', currentImageEditor.placement === 'right-half');
    document.getElementById('imageEditorModal').classList.add('show');
    syncImageEditorControls();
    renderImageEditorPreview();
}

function closeImageEditor() {
    document.getElementById('imageEditorModal').classList.remove('show');
    cropStage.classList.remove('door-preview', 'mvp-preview', 'info-preview', 'best-preview', 'door-left', 'door-right');
    currentImageEditor = null;
    cropDraft = null;
}

function resetImageEditor() {
    if (!currentImageEditor) return;
    cropDraft = { ...getDefaultImageMeta(currentImageEditor.name, currentImageEditor.placement) };
    syncImageEditorControls();
    renderImageEditorPreview();
}

function saveImageEditor() {
    if (!currentImageEditor || !cropDraft) return;
    appData.IMAGE_META[currentImageEditor.name] = { ...cropDraft };
    showToast(`已更新取景: ${currentImageEditor.name}`, 'success');
    closeImageEditor();
    loadImages();
}

function syncImageEditorControls() {
    if (!cropDraft) return;
    document.getElementById('cropFitMode').value = cropDraft.fit;
    document.getElementById('cropScale').value = cropDraft.scale;
    document.getElementById('cropX').value = cropDraft.x;
    document.getElementById('cropY').value = cropDraft.y;
    document.getElementById('cropScaleOut').textContent = `${Number(cropDraft.scale).toFixed(2)}x`;
    document.getElementById('cropXOut').textContent = `${Number(cropDraft.x).toFixed(1)}%`;
    document.getElementById('cropYOut').textContent = `${Number(cropDraft.y).toFixed(1)}%`;
}

function renderImageEditorPreview() {
    if (!cropDraft) return;
    const img = document.getElementById('cropPreviewImage');
    const displayMeta = remapImageMetaForPlacement(cropDraft, currentImageEditor?.placement || '');
    img.style.objectFit = displayMeta.fit;
    img.style.objectPosition = `${displayMeta.x}% ${displayMeta.y}%`;
    img.style.transform = `scale(${cropDraft.scale})`;
    if (currentImageEditor?.placement === 'left-half') {
        img.style.clipPath = 'inset(0 50% 0 0)';
        img.style.webkitClipPath = 'inset(0 50% 0 0)';
    } else if (currentImageEditor?.placement === 'right-half') {
        img.style.clipPath = 'inset(0 0 0 50%)';
        img.style.webkitClipPath = 'inset(0 0 0 50%)';
    } else {
        img.style.clipPath = 'none';
        img.style.webkitClipPath = 'none';
    }
}

// 拖拽上传
const uploadZone = document.getElementById('uploadZone');
listen(uploadZone, 'dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--accent)'; });
listen(uploadZone, 'dragleave', () => { uploadZone.style.borderColor = ''; });
listen(uploadZone, 'drop', e => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    if (e.dataTransfer.files.length > 0) uploadFile(e.dataTransfer.files[0]);
});

const cropStage = document.getElementById('cropStage');
const cropFitMode = document.getElementById('cropFitMode');
const cropScale = document.getElementById('cropScale');
const cropX = document.getElementById('cropX');
const cropY = document.getElementById('cropY');
let cropDragState = null;

listen(cropFitMode, 'change', () => {
    if (!cropDraft) return;
    cropDraft.fit = cropFitMode.value;
    syncImageEditorControls();
    renderImageEditorPreview();
});

listen(cropScale, 'input', () => {
    if (!cropDraft) return;
    cropDraft.scale = parseFloat(cropScale.value);
    syncImageEditorControls();
    renderImageEditorPreview();
});

listen(cropX, 'input', () => {
    if (!cropDraft) return;
    cropDraft.x = parseFloat(cropX.value);
    syncImageEditorControls();
    renderImageEditorPreview();
});

listen(cropY, 'input', () => {
    if (!cropDraft) return;
    cropDraft.y = parseFloat(cropY.value);
    syncImageEditorControls();
    renderImageEditorPreview();
});

listen(cropStage, 'mousedown', e => {
    if (!cropDraft) return;
    cropDragState = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: cropDraft.x,
        baseY: cropDraft.y
    };
    cropStage.classList.add('dragging');
});

listen(window, 'mousemove', e => {
    if (!cropDragState || !cropDraft) return;
    const dx = e.clientX - cropDragState.startX;
    const dy = e.clientY - cropDragState.startY;
    cropDraft.x = clamp(cropDragState.baseX - dx * 0.12, 0, 100);
    cropDraft.y = clamp(cropDragState.baseY - dy * 0.12, 0, 100);
    syncImageEditorControls();
    renderImageEditorPreview();
});

listen(window, 'mouseup', () => {
    cropDragState = null;
    cropStage.classList.remove('dragging');
});

listen(document.getElementById('imageEditorModal'), 'mousedown', e => {
    if (e.target.id === 'imageEditorModal') closeImageEditor();
});

listen(document.getElementById('bandSortModal'), 'mousedown', e => {
    if (e.target.id === 'bandSortModal') closeBandSortModal();
});

listen(document.getElementById('bandSortTable'), 'dragstart', e => {
    const row = e.target.closest('.sort-row');
    if (!row) return;
    bandSortDragState = { fromIdx: Number(row.dataset.idx) };
    clearBandSortHoverState();
    row.classList.add('dragging');
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', row.dataset.idx || '');
        } catch (_) {}
    }
});

listen(document.getElementById('bandSortTable'), 'dragover', e => {
    const row = e.target.closest('.sort-row');
    if (!row || !bandSortDragState) return;
    e.preventDefault();
    clearBandSortHoverState();
    const rect = row.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    row.classList.add(insertAfter ? 'drag-over-bottom' : 'drag-over-top');
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
});

listen(document.getElementById('bandSortTable'), 'drop', e => {
    const row = e.target.closest('.sort-row');
    if (!row || !bandSortDragState) return;
    e.preventDefault();
    const rect = row.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    const toIdx = Number(row.dataset.idx);
    const fromIdx = bandSortDragState.fromIdx;
    bandSortDragState = null;
    reorderBandByDrag(fromIdx, toIdx, insertAfter);
});

listen(document.getElementById('bandSortTable'), 'dragend', () => {
    clearBandSortHoverState();
    document.querySelectorAll('#bandSortTable .sort-row.dragging').forEach(row => {
        row.classList.remove('dragging');
    });
    bandSortDragState = null;
});

const rolePositionGrid = document.getElementById('rolePositionGrid');

listen(rolePositionGrid, 'dragstart', e => {
    const card = e.target.closest('.role-position-card');
    if (!card) return;
    rolePositionDragState = { fromIdx: Number(card.dataset.idx) };
    clearRolePositionDropState();
    card.classList.add('is-dragging');
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
            e.dataTransfer.setData('text/plain', card.dataset.idx || '');
        } catch (_) {}
    }
});

listen(rolePositionGrid, 'dragover', e => {
    if (!rolePositionDragState) return;
    e.preventDefault();
    const scrollDelta = RolePosition.getAutoScrollDelta(e.clientY, window.innerHeight);
    if (scrollDelta) window.scrollBy(0, scrollDelta);

    clearRolePositionDropState();
    const card = e.target.closest('.role-position-card');
    if (card && Number(card.dataset.idx) !== rolePositionDragState.fromIdx) {
        const placement = RolePosition.getDropPlacement(
            e.clientX,
            e.clientY,
            card.getBoundingClientRect()
        );
        card.classList.add(placement === 'after' ? 'is-drop-after' : 'is-drop-before');
    }
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
});

listen(rolePositionGrid, 'drop', e => {
    if (!rolePositionDragState) return;
    e.preventDefault();
    const fromIdx = rolePositionDragState.fromIdx;
    const card = e.target.closest('.role-position-card');
    rolePositionDragState = null;

    if (!card) {
        moveBandTo(fromIdx, appData.namelist.length - 1);
        clearRolePositionDropState();
        return;
    }

    const toIdx = Number(card.dataset.idx);
    if (fromIdx === toIdx) {
        clearRolePositionDropState();
        return;
    }
    const placement = RolePosition.getDropPlacement(
        e.clientX,
        e.clientY,
        card.getBoundingClientRect()
    );
    reorderBandByDrag(fromIdx, toIdx, placement === 'after');
});

listen(rolePositionGrid, 'dragend', () => {
    clearRolePositionDropState();
    rolePositionGrid.querySelectorAll('.is-dragging').forEach(card => {
        card.classList.remove('is-dragging');
    });
    rolePositionDragState = null;
});

// ===== 保存 =====
async function persistAppData(successMessage) {
    try {
        const res = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appData)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            showToast(data.error || '保存失败', 'error');
            return false;
        }
        showToast(successMessage, 'success');
        return true;
    } catch (e) {
        showToast('保存出错', 'error');
        return false;
    }
}

async function saveComparisonChanges() {
    if (comparisonState.invalid.size) {
        showToast('请先修正无效数字', 'error');
        return;
    }
    if (!comparisonState.dirty) return;
    const saved = await persistAppData('角色对比数据已保存，刷新雷达页生效');
    if (!saved) return;
    comparisonState.dirty = false;
    comparisonState.message = '修改已保存';
    updateComparisonSaveState();
}

async function saveRolePositionOrder() {
    if (!rolePositionState.dirty) return;
    const saved = await persistAppData('角色顺序已保存，刷新雷达页生效');
    if (!saved) return;
    rolePositionState.dirty = false;
    rolePositionState.message = '顺序已保存';
    updateRolePositionSaveState();
}

async function saveAll() {
    collectConfig();
    const saved = await persistAppData('保存成功！刷新雷达页生效');
    if (!saved) return;
    comparisonState.dirty = false;
    comparisonState.invalid.clear();
    comparisonState.message = '修改已保存';
    rolePositionState.dirty = false;
    rolePositionState.message = '顺序已保存';
    updateRolePositionSaveState();
    renderRoleComparison();
}

// ===== 工具函数 =====
function esc(str) {
    if (str === undefined || str === null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function escAttr(str) {
    return esc(str).replace(/"/g, '&quot;');
}

function jsonAttr(value) {
    return JSON.stringify(String(value)).replace(/'/g, '&#39;');
}

function jsStringAttr(value) {
    const text = String(value)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n')
        .replace(/"/g, '&quot;')
        .replace(/</g, '\\x3c');
    return `'${text}'`;
}

function imageInputKey(name) {
    return encodeURIComponent(String(name)).replace(/%/g, '_');
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}


const actions = { get data() { return appData; }, init, normalizeNameList, normalizeSpecialProfiles, normalizeHexColor, normalizeColorObject, cloneColorObject, normalizeColorTarget, normalizeColorSystem, getNormalizedVertexCount, ensureLength, normalizeVertexConfigAndBands, bindBandControls, bindBandCsvTools, bindConfigControls, getBandCsvHeaders, escapeCsvCell, exportBandsCsv, triggerImportBandsCsv, parseCsv, toNumberOrDefault, toOptionalNumber, toBool, importBandsCsv, imageBaseName, getSpecialImages, findSpecialImage, refreshLatestImages, renderSpecialImages, renderBackgroundField, getBackgroundFieldsForMode, renderSpecialBackgroundFields, getSpecialProfile, getSpecialBoundEntries, renderSpecialOptions, specialProfileSwatch, setSpecialOpen, renderSpecialRoleBindings, renderSpecialPreviewRoleOptions, renderSpecialProfiles, filterSpecialRoleOptions, deleteNestedPath, updateSpecialBackgroundOverride, updateSpecialProfile, setSpecialProfilePlugin, toggleSpecialRole, addSpecialProfile, duplicateSpecialProfile, deleteSpecialProfile, previewSpecialProfile, initRolePosition, isRolePositionBest, renderRolePosition, clearRolePositionDropState, markRolePositionDirty, updateRolePositionSaveState, initRoleComparison, isComparisonPanelActive, resolveComparisonSlot, ensureComparisonSelection, getComparisonRoleIndex, getComparisonRoleLabel, renderComparisonRoleOptions, formatComparisonScore, renderComparisonPointFields, renderComparisonDimensionLeaders, renderRoleComparison, selectComparisonRole, updateComparisonPoint, normalizeComparisonPointInput, updateComparisonSaveState, queueComparisonDraw, drawRoleComparison, getFilteredBandEntries, renderBandPager, changeBandPage, isBandSortModalOpen, refreshBandViews, getBandColorTarget, resolveTargetColor, colorPreviewStyle, renderBandColorPicker, selectBandColor, updateBandCustomColor, openBandSortModal, closeBandSortModal, clearBandSortHoverState, renderBandSortTable, reorderBandByDrag, renderBands, updateBand, updatePoint, ensureBandMidPhase, updateMidPhase, updateMidPhasePoint, addBand, removeBand, moveBand, moveBandTo, jumpBandTo, collectBackgroundEffectConfigFields, renderBackgroundEffectConfigFields, renderConfig, setDimPercentMode, renderDimSettings, collectConfig, renderColors, updateFixedColor, loadImages, triggerSpecialUpload, uploadSpecialFile, openSpecialImageEditor, uploadFile, deleteImage, renameImage, getDefaultImageMeta, getImageMeta, getImagePlacement, remapImageMetaForPlacement, openImageEditor, closeImageEditor, resetImageEditor, saveImageEditor, syncImageEditorControls, renderImageEditorPreview, persistAppData, saveComparisonChanges, saveRolePositionOrder, saveAll, esc, escAttr, jsonAttr, jsStringAttr, imageInputKey, clamp, showToast };
scope.onDispose(() => comparisonResizeObserver?.disconnect());
const previous = window.__rockRadarAdmin;
window.__rockRadarAdmin = actions;
scope.onDispose(() => {
  if (previous === undefined) delete window.__rockRadarAdmin;
  else window.__rockRadarAdmin = previous;
});
void init().catch(error => { if (scope.active) showToast('数据加载失败：' + error.message, 'error'); });
return { ...actions, dispose: scope.dispose };
}
