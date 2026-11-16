import type * as React from "react";
import type { AdminActions } from "../types";
export function BandSortModal({ actions }: { actions: AdminActions }) {
  return (
    <div className={"modal-backdrop"} id={"bandSortModal"}>
      {"\n        "}
      <div className={"modal-card sort-modal-card"}>
        {"\n            "}
        <div className={"modal-head"}>
          {"\n                "}
          <div>
            {"\n                    "}
            <h3
              style={
                {
                  color: "var(--accent)",
                  marginBottom: "4px",
                } as React.CSSProperties
              }
            >
              {"拖拽排序"}
            </h3>
            {"\n                    "}
            <div className={"hint"}>
              {
                "\n                        这里专门调整全部角色的顺序。拖动左侧手柄即可重新排序，改完后再点顶部“保存全部”写入 `data.json`。\n                    "
              }
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div
            style={
              {
                display: "flex",
                alignItems: "center",
                gap: "10px",
              } as React.CSSProperties
            }
          >
            {"\n                    "}
            <div
              id={"bandSortSummary"}
              style={
                { fontSize: "0.82rem", color: "#9fb6ff" } as React.CSSProperties
              }
            ></div>
            {"\n                    "}
            <button
              className={"btn btn-outline btn-sm"}
              onClick={(event) => {
                actions.current!.closeBandSortModal();
              }}
            >
              {"关闭"}
            </button>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"sort-table-shell"}>
          {"\n                "}
          <div className={"sort-table-head"}>
            {"\n                    "}
            <div>{"拖动"}</div>
            {"\n                    "}
            <div>{"顺位"}</div>
            {"\n                    "}
            <div>{"角色"}</div>
            {"\n                    "}
            <div className={"sort-col-desc"}>{"说明"}</div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className={"sort-table-body"} id={"bandSortTable"}></div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
