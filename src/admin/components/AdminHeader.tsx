import type * as React from "react";
import type { AdminActions } from "../types";
import { VideoExportDialog } from "./VideoExportDialog";
export function AdminHeader({ actions }: { actions: AdminActions }) {
  return (
    <div className={"topbar"}>
      {"\n        "}
      <h1>{"⚡ ROCK RADAR 管理面板"}</h1>
      {"\n        "}
      <div className={"topbar-actions"}>
        {"\n            "}
        <a href={"/radar"} target={"_blank"} className={"btn btn-outline"}>
          {"打开雷达展示 ↗"}
        </a>
        <VideoExportDialog />
        {"\n            "}
        <button
          className={"btn btn-primary"}
          onClick={(event) => {
            actions.current!.saveAll();
          }}
        >
          {"💾 保存全部"}
        </button>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
