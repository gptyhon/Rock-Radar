(function (global) {
    'use strict';

    function clampIndex(value, length) {
        const index = Math.trunc(Number(value));
        if (!Number.isFinite(index) || length <= 0) return -1;
        return Math.max(0, Math.min(length - 1, index));
    }

    function moveItem(items, fromIndex, toIndex) {
        const list = Array.isArray(items) ? items.slice() : [];
        const from = clampIndex(fromIndex, list.length);
        const to = clampIndex(toIndex, list.length);
        if (from < 0 || to < 0 || from === to) return list;
        const [item] = list.splice(from, 1);
        list.splice(to, 0, item);
        return list;
    }

    function getDropPlacement(clientX, clientY, rect = {}) {
        const left = Number(rect.left) || 0;
        const top = Number(rect.top) || 0;
        const width = Math.max(1, Number(rect.width) || 1);
        const height = Math.max(1, Number(rect.height) || 1);
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const normalizedX = (Number(clientX) - centerX) / width;
        const normalizedY = (Number(clientY) - centerY) / height;
        if (Math.abs(normalizedY) > 0.28) {
            return normalizedY >= 0 ? 'after' : 'before';
        }
        return normalizedX >= 0 ? 'after' : 'before';
    }

    function getAutoScrollDelta(clientY, viewportHeight, edgeSize = 110, maxStep = 28) {
        const y = Number(clientY);
        const height = Number(viewportHeight);
        const edge = Math.max(24, Number(edgeSize) || 110);
        const limit = Math.max(1, Number(maxStep) || 28);
        if (!Number.isFinite(y) || !Number.isFinite(height) || height <= 0) return 0;
        if (y < edge) {
            const ratio = Math.max(0, Math.min(1, (edge - y) / edge));
            return -Math.max(1, Math.round(limit * ratio));
        }
        if (y > height - edge) {
            const ratio = Math.max(0, Math.min(1, (y - (height - edge)) / edge));
            return Math.max(1, Math.round(limit * ratio));
        }
        return 0;
    }

    function imageBaseName(value) {
        const name = typeof value === 'object' && value !== null ? value.name : value;
        return String(name || '').trim().replace(/\.[^.]+$/, '');
    }

    function isBestRole(role, mvpList, images) {
        const name = String(role?.name || '').trim();
        if (!name) return false;
        const normalizedName = name.toLocaleLowerCase();
        const isMvp = (Array.isArray(mvpList) ? mvpList : [])
            .some(item => String(item || '').trim().toLocaleLowerCase() === normalizedName);
        if (isMvp) return true;
        const expectedAsset = `best_${name}`.toLocaleLowerCase();
        return (Array.isArray(images) ? images : [])
            .some(image => imageBaseName(image).toLocaleLowerCase() === expectedAsset);
    }

    global.RockRadarRolePosition = Object.freeze({
        moveItem,
        getDropPlacement,
        getAutoScrollDelta,
        imageBaseName,
        isBestRole
    });
})(typeof window !== 'undefined' ? window : globalThis);
