const assert = require('assert');
const fs = require('fs');

const source = fs.readFileSync('index.html', 'utf8');

const cameraAnimationIndex = source.indexOf('#gachaOverlay.gacha-type-2.active {');
const fadeOverrideIndex = source.indexOf('#gachaOverlay.active.gacha-fadeout {');
const playStart = source.indexOf('function playGachaAnimation(');
const updateStart = source.indexOf('function updateUI(');
const transitionStart = source.indexOf('function performTransition(');
const timelineClickStart = source.indexOf('function updateGlobalTimeFromClick(');

assert.ok(cameraAnimationIndex >= 0, 'type-2 camera animation should exist');
assert.ok(
    fadeOverrideIndex > cameraAnimationIndex,
    'the fade-out override must follow and supersede the type-2 camera animation'
);
assert.match(
    source.slice(fadeOverrideIndex, fadeOverrideIndex + 160),
    /animation:\s*gachaFadeOut 0\.8s ease forwards/,
    'the effective overlay fade should retain the approved 800ms duration'
);
assert.match(
    source,
    /function syncBandPhotoVariant\(\) \{\s*if \(gachaPlaying\) return;/,
    'role photo synchronization must remain suspended throughout the gacha animation'
);

assert.ok(playStart >= 0, 'playGachaAnimation should exist');
assert.ok(updateStart > playStart, 'updateUI should follow playGachaAnimation');
assert.ok(transitionStart > updateStart, 'performTransition should follow updateUI');

const playSource = source.slice(playStart, updateStart);
const updateSource = source.slice(updateStart, transitionStart);
const fadeOutIndex = playSource.indexOf("overlay.classList.add('gacha-fadeout')");
const resetIndex = playSource.indexOf('resetGachaOverlayState();', fadeOutIndex);
const resolveIndex = playSource.indexOf('resolve();', resetIndex);

assert.ok(fadeOutIndex >= 0, 'the gacha overlay should retain its fade-out stage');
assert.ok(
    resetIndex > fadeOutIndex && resolveIndex > resetIndex,
    'the gacha promise should resolve only after the fading overlay is fully reset'
);
assert.doesNotMatch(
    playSource,
    /prepareReveal|prepareGachaTarget/,
    'the target radar page must not be prepared while the gacha overlay is fading'
);
assert.match(
    updateSource,
    /const gachaTargetBand = band;[\s\S]*const gachaTargetIndex = currentIndex;/,
    'the gacha handoff should capture its target role and index'
);
assert.match(
    updateSource,
    /playGachaAnimation\(gachaTargetBand\)\.then\(\(\) => \{[\s\S]*currentIndex = gachaTargetIndex;[\s\S]*performTransition\(gachaTargetBand/,
    'the captured target should render only after the gacha overlay promise completes'
);
assert.doesNotMatch(
    updateSource,
    /getTimeSegmentAt\(globalCurrentTime/,
    'the handoff must not replace the captured target with a live timeline lookup'
);

assert.ok(timelineClickStart > transitionStart, 'timeline click handler should exist');
const timelineClickSource = source.slice(timelineClickStart, source.indexOf('\n        globalTimeline.addEventListener', timelineClickStart));
assert.match(
    timelineClickSource,
    /clickedSegment && shouldPlayGachaForBand\(clickedBand, clickedSegment\.bandIndex, false\)[\s\S]*\? clickedSegment\.start[\s\S]*: clickedTime/,
    'timeline clicks should start gacha roles at the beginning of their segment'
);

console.log('gacha-handoff tests passed');
