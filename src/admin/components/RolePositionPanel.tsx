import type * as React from "react";
import type { AdminActions } from "../types";
export function RolePositionPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel"} id={"panel-position"}>
      {"\n            "}
      <div className={"role-position-toolbar"}>
        {"\n                "}
        <div>
          {"\n                    "}
          <h2>{"角色位置"}</h2>
          {"\n                    "}
          <div className={"hint"}>
            {"拖动任意名称卡片调整角色播放顺序。全部角色一次显示，不分页。"}
          </div>
          {"\n                "}
        </div>
        {"\n                "}
        <div className={"role-position-actions"}>
          {"\n                    "}
          <div id={"rolePositionStatus"} className={"role-position-status"}>
            {"尚未修改"}
          </div>
          {"\n                    "}
          <button
            id={"rolePositionSaveButton"}
            className={"btn btn-primary"}
            onClick={(event) => {
              actions.current!.saveRolePositionOrder();
            }}
            // The controller owns this button's enabled state after edits.
            ref={(button) => {
              if (button) button.disabled = true;
            }}
          >
            {"💾 保存顺序"}
          </button>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <div className={"role-position-summary"}>
          {"\n                    "}
          <div className={"hint"}>
            {"拖到卡片左/右侧可插入其前后；靠近页面上下边缘会自动滚动。"}
          </div>
          {"\n                    "}
          <div className={"role-position-counts"}>
            {"\n                        "}
            <span>
              {"全部 "}
              <strong id={"rolePositionCount"}>{"0"}</strong>
            </span>
            {"\n                        "}
            <span className={"role-position-best-count"}>
              {"Best "}
              <strong id={"rolePositionBestCount"}>{"0"}</strong>
            </span>
            {"\n                    "}
          </div>
          {"\n                "}
        </div>
        {"\n                "}
        <div id={"rolePositionEmpty"} className={"role-position-empty"}>
          {"当前没有可排序的角色。"}
        </div>
        {"\n                "}
        <div
          id={"rolePositionGrid"}
          className={"role-position-grid"}
          aria-label={"全部角色排序网格"}
        ></div>
        {"\n            "}
      </div>
      {"\n        "}
    </div>
  );
}
