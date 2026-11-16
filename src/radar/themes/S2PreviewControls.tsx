import { useState } from "react";
import type { createS2Background } from "./s2-background";

export function S2PreviewControls({
  background,
}: {
  background: ReturnType<typeof createS2Background>;
}) {
  const [paused, setPaused] = useState(background.paused);
  const [enhanced, setEnhanced] = useState(true);
  const original = new URL(location.href);
  original.searchParams.set("theme", "original");
  return (
    <aside
      className="s2-preview-controls"
      aria-label="S2 背景预览"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <span>S2 预览</span>
      <select
        aria-label="背景场景"
        defaultValue="reveal"
        onChange={(event) => background.setScene(event.target.value)}
      >
        <option value="reveal">高光揭幕</option>
        <option value="normal">普通展示</option>
      </select>
      <button
        type="button"
        aria-pressed={enhanced}
        onClick={() => {
          background.setEnhanced(!enhanced);
          setEnhanced(!enhanced);
        }}
      >
        动态：{enhanced ? "增强" : "轻微"}
      </button>
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => {
          background.setPaused(!paused);
          setPaused(!paused);
        }}
      >
        {paused ? "继续背景" : "暂停背景"}
      </button>
      <a
        href={original.pathname + original.search}
        target="_blank"
        rel="noreferrer"
      >
        对比原版
      </a>
    </aside>
  );
}
