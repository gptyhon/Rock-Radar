(function (global) {
    'use strict';

    const MAX_DELAY_SECONDS = 60;

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeDelaySeconds(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 0;
        return Math.round(clamp(number, 0, MAX_DELAY_SECONDS) * 10) / 10;
    }

    function getDelayMs(delaySeconds) {
        return normalizeDelaySeconds(delaySeconds) * 1000;
    }

    function getPresentationTimeMs(contentMs, leadInMs) {
        return Math.max(0, Number(leadInMs) || 0) + Math.max(0, Number(contentMs) || 0);
    }

    function mapPresentationMsToAudioSeconds(presentationMs, delaySeconds) {
        return Math.max(0, (Math.max(0, Number(presentationMs) || 0) - getDelayMs(delaySeconds)) / 1000);
    }

    function mapContentMsToAudioSeconds(contentMs, leadInMs, delaySeconds) {
        return mapPresentationMsToAudioSeconds(
            getPresentationTimeMs(contentMs, leadInMs),
            delaySeconds
        );
    }

    function mapAudioSecondsToContentMs(audioSeconds, leadInMs, delaySeconds) {
        const audioMs = Math.max(0, Number(audioSeconds) || 0) * 1000;
        return Math.max(0, audioMs + getDelayMs(delaySeconds) - Math.max(0, Number(leadInMs) || 0));
    }

    function getRemainingDelayMs(contentMs, leadInMs, delaySeconds) {
        return Math.max(
            0,
            getDelayMs(delaySeconds) - getPresentationTimeMs(contentMs, leadInMs)
        );
    }

    global.RockRadarMusicTimeline = Object.freeze({
        MAX_DELAY_SECONDS,
        normalizeDelaySeconds,
        getDelayMs,
        getPresentationTimeMs,
        mapPresentationMsToAudioSeconds,
        mapContentMsToAudioSeconds,
        mapAudioSecondsToContentMs,
        getRemainingDelayMs
    });
})(typeof window !== 'undefined' ? window : globalThis);
