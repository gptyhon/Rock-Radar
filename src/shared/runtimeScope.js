/** Owns resources created by a mounted page without changing the original clock. */
export function createRuntimeScope() {
  let active = true;
  const frames = new Set();
  const timers = new Set();
  const cleanups = [];
  const abort = new AbortController();
  const bodyClass = document.body.className;
  const bodyStyle = document.body.getAttribute('style');
  const rootStyle = document.documentElement.getAttribute('style');

  function listen(target, type, handler, options) {
    if (!active) return;
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  }
  function requestAnimationFrame(callback) {
    if (!active) return 0;
    const id = window.requestAnimationFrame((time) => {
      frames.delete(id);
      if (active) callback(time);
    });
    frames.add(id);
    return id;
  }
  function setTimeout(callback, delay, ...args) {
    if (!active) return 0;
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (active) callback(...args);
    }, delay);
    timers.add(id);
    return id;
  }
  function cancelAnimationFrame(id) {
    window.cancelAnimationFrame(id);
    frames.delete(id);
  }
  function clearTimeout(id) {
    window.clearTimeout(id);
    timers.delete(id);
  }
  function Image(...args) {
    const image = new window.Image(...args);
    cleanups.push(() => { image.onload = null; image.onerror = null; });
    return image;
  }
  function Audio(...args) {
    const audio = new window.Audio(...args);
    cleanups.push(() => { audio.pause(); audio.removeAttribute('src'); audio.load(); });
    return audio;
  }
  function dispose() {
    if (!active) return;
    active = false;
    abort.abort();
    frames.forEach((id) => window.cancelAnimationFrame(id));
    timers.forEach((id) => window.clearTimeout(id));
    cleanups.reverse().forEach((cleanup) => cleanup());
    document.querySelectorAll('audio, video').forEach((media) => media.pause());
    document.body.className = bodyClass;
    for (const [element, value] of [[document.body, bodyStyle], [document.documentElement, rootStyle]]) {
      if (value === null) element.removeAttribute('style');
      else element.setAttribute('style', value);
    }
  }
  return {
    get active() { return active; },
    listen, requestAnimationFrame, cancelAnimationFrame, setTimeout, clearTimeout, Image, Audio, dispose,
    onDispose(cleanup) { cleanups.push(cleanup); },
    fetch(input, init) { return window.fetch(input, { ...init, signal: abort.signal }); },
  };
}
