import { useEffect, useRef, useState } from "react";
import { videoPresets, type VideoExportJob, type VideoPreset } from "../../shared/video-export";
import "./video-export.css";

const endpoint = "/api/video-export";
const phaseLabels: Record<VideoExportJob["phase"], string> = {
  preparing: "正在准备素材",
  rendering: "正在渲染画面",
  encoding: "正在生成 MP4",
  cancelling: "正在取消",
  cancelled: "导出已取消",
  done: "导出完成",
  failed: "导出失败",
};

export function VideoExportDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<VideoPreset>("1080p30");
  const [job, setJob] = useState<VideoExportJob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const active = job?.phase === "preparing" || job?.phase === "rendering" || job?.phase === "encoding" || job?.phase === "cancelling";

  useEffect(() => {
    if (!open || submitting) return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(endpoint, { signal: abort.signal });
        if (response.ok) setJob(await response.json());
      } catch {
        // A later poll can reconnect to a running export.
      } finally {
        if (!abort.signal.aborted) timer = setTimeout(refresh, 750);
      }
    }
    void refresh();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [open, submitting]);

  async function submit(cancel: boolean) {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(cancel ? `${endpoint}/${job!.id}/cancel` : endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cancel ? {} : { preset }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || (cancel ? "该导出任务已结束" : "无法开始视频导出"));
      }
      setJob(await response.json());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "无法连接导出服务");
    } finally {
      setSubmitting(false);
    }
  }

  const percent = job?.totalFrames
    ? Math.min(job.phase === "done" ? 100 : 99, Math.floor(100 * job.frames / job.totalFrames))
    : undefined;

  return (
    <>
      <button type="button" className="btn btn-outline" onClick={() => {
        dialog.current?.showModal();
        setOpen(true);
      }}>导出视频</button>
      <dialog ref={dialog} className="video-export-dialog" aria-labelledby="video-export-title" onClose={() => setOpen(false)}>
        <form className="modal-head" method="dialog">
          <h2 id="video-export-title">导出 MP4</h2>
          <button className="btn btn-outline btn-sm" type="submit">关闭</button>
        </form>
        <p>使用已保存的角色和设置在后台逐帧渲染。关闭弹窗后导出会继续。</p>
        <div className="form-group video-export-settings">
          <label htmlFor="video-export-preset">分辨率和帧率</label>
          <select id="video-export-preset" value={active ? job!.preset : preset} disabled={active || submitting}
            onChange={event => setPreset(event.target.value as VideoPreset)}>
            {Object.entries(videoPresets).map(([id, { width, height, fps }]) => (
              <option key={id} value={id}>{width} × {height} / {fps} FPS</option>
            ))}
          </select>
        </div>
        {job && (
          <div className="video-export-status">
            <p role="status">{phaseLabels[job.phase]}{job.phase === "rendering" && percent !== undefined ? ` · ${percent}%` : ""}</p>
            {active && <progress aria-label="视频导出进度" max={100} value={job.phase === "rendering" ? percent : undefined} />}
            {job.error && <p role="alert" className="video-export-error">{job.error}</p>}
            {job.warnings.length > 0 && <ul>{job.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
          </div>
        )}
        {error && <p role="alert" className="video-export-error">{error}</p>}
        <div className="modal-actions">
          {active ? (
            <button type="button" className="btn btn-outline" disabled={submitting || job.phase === "cancelling"}
              onClick={() => void submit(true)}>取消导出</button>
          ) : (
            <>
              <button type="button" className={job?.phase === "done" ? "btn btn-outline" : "btn btn-primary"} disabled={submitting}
                onClick={() => void submit(false)}>开始导出</button>
              {job?.phase === "done" && (
                <a className="btn btn-primary" href={`${endpoint}/${job.id}/download`} download>下载 MP4</a>
              )}
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
