import type * as React from "react";
import type { AdminActions } from "../types";
export function AdminTabs({ actions }: { actions: AdminActions }) {
  return (
    <div className={"tabs"}>
      {"\n            "}
      <div className={"tab active"} data-tab={"bands"}>
        {"选手管理"}
      </div>
      {"\n            "}
      <div className={"tab"} data-tab={"position"}>
        {"角色位置"}
      </div>
      {"\n            "}
      <div className={"tab"} data-tab={"comparison"}>
        {"角色对比"}
      </div>
      {"\n            "}
      <div className={"tab"} data-tab={"config"}>
        {"全局配置"}
      </div>
      {"\n            "}
      <div className={"tab"} data-tab={"specials"}>
        {"专场管理"}
      </div>
      {"\n            "}
      <div className={"tab"} data-tab={"images"}>
        {"图片管理"}
      </div>
      {"\n        "}
    </div>
  );
}
