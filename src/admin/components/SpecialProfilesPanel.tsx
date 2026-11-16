import type * as React from "react";
import type { AdminActions } from "../types";
export function SpecialProfilesPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel"} id={"panel-specials"}>
      {"\n            "}
      <div className={"special-toolbar"}>
        {"\n                "}
        <div>
          {"\n                    "}
          <h2
            style={
              {
                color: "var(--accent)",
                marginBottom: "6px",
              } as React.CSSProperties
            }
          >
            {"角色专场"}
          </h2>
          {"\n                    "}
          <div className={"hint"}>
            {
              "集中管理角色独立主题、转场、抽卡风格和素材覆盖。普通角色不绑定专场时保持默认效果。"
            }
          </div>
          {"\n                "}
        </div>
        {"\n                "}
        <button
          className={"btn btn-success"}
          onClick={(event) => {
            actions.current!.addSpecialProfile();
          }}
        >
          {"＋ 新建专场"}
        </button>
        {"\n            "}
      </div>
      {"\n            "}
      <div
        className={"card"}
        style={{ marginBottom: "14px" } as React.CSSProperties}
      >
        {"\n                "}
        <div
          className={"form-group"}
          style={{ margin: "0", maxWidth: "420px" } as React.CSSProperties}
        >
          {"\n                    "}
          <label>{"搜索专场（名称 / 简介 / 绑定角色）"}</label>
          {"\n                    "}
          <input
            type={"text"}
            id={"specialProfileSearch"}
            placeholder={"输入关键词"}
            onInput={(event) => {
              actions.current!.renderSpecialProfiles();
            }}
          />
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div id={"specialProfileList"} className={"special-profile-list"}></div>
      {"\n        "}
    </div>
  );
}
