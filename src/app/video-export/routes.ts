import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Express } from "express";
import { videoPresets, type VideoExportJob, type VideoPreset } from "../../shared/video-export";
import { renderVideo } from "./render.mjs";

export function registerVideoExport(app: Express, repo: string) {
  const directory = path.join(repo, "workspace", "exports");
  const outputFile = (id: string) => path.join(directory, `rock-radar-${id}.mp4`);
  let latest: VideoExportJob | null = null;
  let active: { abort: AbortController; task: Promise<void> } | null = null;
  let shuttingDown = false;

  app.get("/api/video-export", (_req, res) => {
    res.set("Cache-Control", "no-store").json(latest);
  });

  app.post("/api/video-export", (req, res) => {
    if (!req.is("application/json")) return res.sendStatus(415);
    if (shuttingDown) return res.status(503).json({ error: "服务器正在关闭" });
    if (active) return res.status(409).json({ error: "已有视频正在导出" });
    const preset = req.body?.preset;
    if (typeof preset !== "string" || !Object.hasOwn(videoPresets, preset)) {
      return res.status(400).json({ error: "请选择支持的分辨率和帧率" });
    }
    const key = preset as VideoPreset;
    const job: VideoExportJob = { id: randomUUID(), preset: key, phase: "preparing", frames: 0, totalFrames: 0, warnings: [] };
    latest = job;
    const abort = new AbortController();
    const task = renderVideo({
      origin: `http://127.0.0.1:${req.socket.localPort}`,
      preset: videoPresets[key],
      output: outputFile(job.id),
      signal: abort.signal,
      onProgress: (progress: Partial<VideoExportJob>) => {
        if (!abort.signal.aborted) Object.assign(job, progress);
      },
      warn: (warning: string) => job.warnings.push(warning),
    }).then(() => {
      job.phase = "done";
    }).catch((error: unknown) => {
      job.phase = abort.signal.aborted ? "cancelled" : "failed";
      if (job.phase === "failed") {
        job.error = error instanceof Error ? error.message : String(error);
        console.error("视频导出失败", error);
      }
    }).finally(() => {
      active = null;
    });
    active = { abort, task };
    return res.status(202).json(job);
  });

  app.post("/api/video-export/:id/cancel", (req, res) => {
    if (!req.is("application/json")) return res.sendStatus(415);
    if (!active || latest?.id !== req.params.id) return res.sendStatus(404);
    latest.phase = "cancelling";
    active.abort.abort();
    return res.status(202).json(latest);
  });

  app.get("/api/video-export/:id/download", (req, res, next) => {
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(req.params.id)) return res.sendStatus(404);
    res.download(outputFile(req.params.id), `rock-radar-${req.params.id}.mp4`, error => {
      if (!error) return;
      if (!res.headersSent && "code" in error && error.code === "ENOENT") res.sendStatus(404);
      else next(error);
    });
  });

  return async () => {
    shuttingDown = true;
    active?.abort.abort();
    await active?.task;
  };
}
