import { execFile, spawn } from "node:child_process";
import { existsSync, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const run = promisify(execFile);
const captureScript = fileURLToPath(new URL("./capture-clock.js", import.meta.url));
const buildScript = fileURLToPath(new URL("./build-page.mjs", import.meta.url));
const ffmpeg = process.env.RADAR_FFMPEG || "ffmpeg";

function findChrome() {
  return process.env.RADAR_CHROMIUM_PATH || [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);
}

async function getData(origin, signal) {
  const response = await fetch(`${origin}/api/data`, { signal });
  if (!response.ok) throw new Error("无法读取已保存的雷达配置");
  const data = await response.json();
  if (!data.CONFIG || !Array.isArray(data.namelist) || !data.namelist.length) {
    throw new Error("请先保存至少一位角色再导出");
  }
  return { ...data, CONFIG: { ...data.CONFIG, ADAPTIVE_PERF: false } };
}

async function preparePlaylist(tracks, origin, directory, signal, warn) {
  const playlist = [];
  for (const [index, track] of tracks.entries()) {
    signal.throwIfAborted();
    const source = path.join(directory, `source-${index}`);
    const name = `music-${index}.wav`;
    try {
      const url = new URL(track, `${origin}/radar`);
      if (url.origin !== origin) throw new Error("请使用本地音频");
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
      const response = await fetch(url, { signal: requestSignal, redirect: "error" });
      if (!response.ok || !response.body || response.headers.get("content-type")?.includes("text/html")) {
        await response.body?.cancel();
        throw new Error("音频文件不可用");
      }
      await pipeline(response.body, createWriteStream(source), { signal: requestSignal });
      await run(ffmpeg, [
        "-hide_banner", "-loglevel", "error", "-protocol_whitelist", "file,pipe", "-i", source,
        "-map", "0:a:0", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", path.join(directory, name),
      ], { signal, windowsHide: true });
      playlist.push(name);
    } catch {
      signal.throwIfAborted();
      warn(`已跳过无法读取的本地音乐：${track}`);
    } finally {
      await rm(source, { force: true });
    }
  }
  if (!playlist.length) return null;
  if (playlist.length === 1) return path.join(directory, playlist[0]);
  const manifest = path.join(directory, "playlist.ffconcat");
  const output = path.join(directory, "playlist.wav");
  await writeFile(manifest, playlist.map(name => `file '${name}'\n`).join(""));
  await run(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-f", "concat", "-i", manifest, "-c", "copy", output,
  ], { signal, windowsHide: true });
  return output;
}

function startEncoder(output, fps, signal) {
  const child = spawn(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps),
    "-c:v", "mjpeg", "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "veryfast",
    "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
  ], { signal, killSignal: "SIGKILL", stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
  let errorText = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", chunk => { errorText = (errorText + chunk).slice(-4000); });
  child.stdin.on("error", () => {});
  const closed = new Promise(resolve => child.once("close", resolve));
  const done = new Promise((resolve, reject) => {
    child.once("error", reject);
    void closed.then(code => {
      if (code === 0) resolve();
      else reject(new Error(errorText.trim() || `FFmpeg 退出（${code}）`));
    });
  });
  void done.catch(() => {});
  return { child, done, closed };
}

async function buildCapturePage(directory, signal) {
  const outDir = path.join(directory, "app");
  await run(process.execPath, [buildScript, outDir], {
    signal, windowsHide: true, env: { ...process.env, NODE_ENV: "production" },
  });
  const files = new Map([["/radar", path.join(outDir, "radar.html")]]);
  const assets = path.join(outDir, "assets");
  for (const entry of await readdir(assets, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const urlPath = "/" + path.relative(outDir, file).split(path.sep).join("/");
    files.set(urlPath, file);
  }
  return files;
}

async function setupTab(browser, origin, data, preset, files) {
  const { width, height } = preset;
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "no-preference" });
  let pageError;
  page.on("pageerror", error => { pageError = error; });
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (url.pathname === "/api/data") return route.fulfill({ json: data });
    const file = files.get(url.pathname);
    if (file) return route.fulfill({ path: file });
    return route.continue();
  });
  await page.addInitScript({ path: captureScript });
  await page.goto(`${origin}/radar`, { waitUntil: "load" });
  await page.addStyleTag({ content: `
    .s2-preview-controls, .s2-start-button, #globalTimeline,
    .progress-bar-container, .session-timer { display: none !important; }
  ` });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const plan = await page.evaluate(() => window.rockRadarVideoCapture.waitForPlan()).catch(error => {
    throw new Error(pageError ? `雷达演出加载失败：${pageError.message}` : error.message);
  });
  return { page, plan };
}

export async function renderVideo({ origin, preset, output, signal, onProgress, warn }) {
  try {
    await run(ffmpeg, ["-version"], { signal, windowsHide: true });
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("未找到 FFmpeg，请先安装并加入 PATH");
    throw error;
  }
  const data = await getData(origin, signal);
  const outputDir = path.dirname(output);
  await mkdir(outputDir, { recursive: true });
  const directory = await mkdtemp(path.join(outputDir, ".render-"));
  const silent = path.join(directory, "video.mp4");
  let browser;
  let encoder;
  const closeBrowser = () => { void browser?.close().catch(() => {}); };
  signal.addEventListener("abort", closeBrowser, { once: true });
  try {
    const files = await buildCapturePage(directory, signal);
    signal.throwIfAborted();
    try {
      browser = await chromium.launch({ executablePath: findChrome(), headless: true });
    } catch (error) {
      throw new Error(`无法启动 Chromium。请安装 Chrome 或运行 npx playwright install chromium。${error.message}`);
    }
    signal.throwIfAborted();
    const { page, plan } = await setupTab(browser, origin, data, preset, files);
    if (!(plan.durationMs > 0)) throw new Error("角色演出的总时长需要大于零");
    const audio = plan.musicVolume > 0
      ? await preparePlaylist(plan.tracks, origin, directory, signal, warn)
      : null;
    const { fps } = preset;
    const nominalLength = (plan.leadInMs + plan.durationMs + plan.outroTransitionMs + 1500) / 1000;
    await page.evaluate(() => window.rockRadarVideoCapture.advance(6));
    await page.keyboard.press("Space");
    let frames = 0;
    let totalFrames = Math.ceil(nominalLength * fps);
    let status = await page.evaluate(() => window.rockRadarVideoCapture.advance(0));
    onProgress({ phase: "rendering", frames, totalFrames });
    encoder = startEncoder(silent, fps, signal);
    do {
      signal.throwIfAborted();
      const jpeg = await page.screenshot({ type: "jpeg", quality: 96, scale: "css", timeout: 15_000 });
      try {
        await new Promise((resolve, reject) => encoder.child.stdin.write(jpeg, error => error ? reject(error) : resolve()));
      } catch (error) {
        // Get FFmpeg's diagnostic instead of exposing a broken pipe.
        await encoder.done;
        throw error;
      }
      frames++;
      status = await page.evaluate(steps => window.rockRadarVideoCapture.advance(steps), 60 / fps);
      totalFrames = Math.ceil((nominalLength + status.outroSeconds) * fps);
      if (frames % fps === 0) onProgress({ frames, totalFrames });
      if (frames > totalFrames + 5 * fps && !status.finished) {
        throw new Error("演出时间轴未到达片尾，导出已停止");
      }
    } while (!status.finished);
    if (status.outroFallback) warn("未找到可播放的片尾视频，已使用感谢观看页");
    onProgress({ phase: "encoding", frames, totalFrames: frames });
    encoder.child.stdin.end();
    await encoder.done;
    await browser.close();
    browser = null;

    let result = silent;
    const duration = frames / fps;
    if (audio && plan.musicDelayMs < duration * 1000) {
      result = path.join(directory, "combined.mp4");
      await run(ffmpeg, [
        "-hide_banner", "-loglevel", "error", "-i", silent, "-stream_loop", "-1", "-i", audio,
        "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-af", `volume=${plan.musicVolume},adelay=${plan.musicDelayMs}:all=1`,
        "-t", String(duration), "-movflags", "+faststart", result,
      ], { signal, windowsHide: true });
    }
    signal.throwIfAborted();
    await rename(result, output);
  } finally {
    signal.removeEventListener("abort", closeBrowser);
    if (encoder) {
      encoder.child.stdin.destroy();
      if (encoder.child.exitCode === null && encoder.child.signalCode === null) encoder.child.kill("SIGKILL");
      await encoder.closed;
    }
    await browser?.close().catch(() => {});
    await rm(directory, { recursive: true, force: true });
  }
}
