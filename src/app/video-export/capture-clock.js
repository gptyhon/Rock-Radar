// Injected into the export tab before the page starts. The live tab keeps its native clock.
(() => {
  const realTimeout = window.setTimeout.bind(window);
  const clearRealTimeout = window.clearTimeout.bind(window);
  const epoch = Date.now();
  const frames = new Map();
  const timers = new Map();
  const animationStarts = new WeakMap();
  let nextId = 0;
  let ticks = 0;
  let now = 100;
  let resolvePlan;
  const planReady = new Promise(resolve => { resolvePlan = resolve; });
  let finishOutro;
  let completedAt;
  let video;
  let videoStartedAt;
  let outroFallback;
  let outroReady;
  const outroReadyPromise = new Promise(resolve => { outroReady = resolve; });

  function installClock() {
    Date.now = () => Math.floor(epoch + now);
    performance.now = () => now;
    window.requestAnimationFrame = callback => {
      frames.set(++nextId, callback);
      return nextId;
    };
    window.cancelAnimationFrame = id => { frames.delete(id); };
    window.setTimeout = (callback, delay = 0, ...args) => {
      timers.set(++nextId, { at: now + Math.max(0, Number(delay) || 0), callback, args });
      return nextId;
    };
    window.clearTimeout = id => { timers.delete(id); };

    // The soundtrack is muxed later. Native audio stays paused to leave tick() on the frame clock.
    HTMLMediaElement.prototype.play = function () {
      if (this.id === "outroVideo") {
        video = this;
        videoStartedAt ??= now;
      }
      return Promise.resolve();
    };
  }

  function withTimeout(promise, message) {
    let timer;
    const limit = new Promise((_, reject) => {
      timer = realTimeout(() => reject(new Error(message)), 15_000);
    });
    return Promise.race([promise, limit]).finally(() => clearRealTimeout(timer));
  }

  // Wait for app-initiated image loads even if rendering is much faster than live playback.
  const pendingImages = new Set();
  const imageSource = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  const loadingImages = new WeakMap();
  Object.defineProperty(HTMLImageElement.prototype, "src", {
    ...imageSource,
    set(source) {
      if (this.getAttribute("src") === String(source)) return;
      loadingImages.get(this)?.();
      let finish;
      const loaded = new Promise(resolve => {
        finish = () => {
          this.removeEventListener("load", finish);
          this.removeEventListener("error", finish);
          loadingImages.delete(this);
          resolve();
        };
        this.addEventListener("load", finish);
        this.addEventListener("error", finish);
      });
      loadingImages.set(this, finish);
      pendingImages.add(loaded);
      void loaded.then(() => pendingImages.delete(loaded));
      imageSource.set.call(this, source);
      if (this.complete) finish();
    },
  });

  function syncAnimations() {
    for (const animation of document.getAnimations()) {
      if (!animationStarts.has(animation)) animationStarts.set(animation, now);
      animation.pause();
      animation.currentTime = now - animationStarts.get(animation);
    }
  }

  async function waitForImages() {
    while (pendingImages.size) await Promise.all([...pendingImages]);
  }

  function completeOutro() {
    finishOutro();
    completedAt = now;
  }

  async function updateOutro() {
    if (completedAt !== undefined || !document.body.classList.contains("outro-mode")) return;
    await withTimeout(outroReadyPromise, "片尾素材加载超时");
    if (outroFallback && document.getElementById("outroOverlay").classList.contains("video-ready")) {
      completeOutro();
    }
    if (!video) return;
    const position = (now - videoStartedAt) / 1000;
    if (!Number.isFinite(video.duration)) throw new Error("片尾视频需要有确定的时长");
    if (position >= video.duration) {
      completeOutro();
      return;
    }
    if (Math.abs(video.currentTime - position) < 0.00001) return;
    const seeked = new Promise(resolve => video.addEventListener("seeked", resolve, { once: true }));
    video.currentTime = position;
    await withTimeout(seeked, "片尾视频定位超时");
  }

  window.rockRadarVideoCapture = {
    installClock,
    configure(metadata, onFinishOutro) {
      finishOutro = onFinishOutro;
      resolvePlan(metadata);
    },
    waitForPlan: () => withTimeout(planReady, "雷达演出加载超时"),
    markOutroReady(fallback) {
      outroFallback = fallback;
      outroReady();
    },
    async advance(steps) {
      syncAnimations();
      for (let step = 0; step < steps; step++) {
        now = 100 + (++ticks * 1000) / 60;
        const due = [...timers].filter(([, timer]) => timer.at <= now + 1e-6);
        due.sort(([, left], [, right]) => left.at - right.at);
        for (const [id, { callback, args }] of due) {
          if (timers.delete(id)) callback(...args);
        }
        syncAnimations();
        for (const [id, callback] of [...frames]) {
          if (frames.delete(id)) callback(now);
        }
        if (pendingImages.size) await withTimeout(waitForImages(), "图片素材加载超时");
        await updateOutro();
        syncAnimations();
      }
      return {
        outroSeconds: Number.isFinite(video?.duration) ? video.duration : 0,
        outroFallback,
        finished: completedAt !== undefined && now - completedAt >= 1500,
      };
    },
  };
})();
