import type * as React from "react";
import type { AdminActions } from "../types";
export function ImagesPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel"} id={"panel-images"}>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"抽卡开门图片"}</h3>
        {"\n                "}
        <div
          className={"hint"}
          style={{ marginBottom: "12px" } as React.CSSProperties}
        >
          {
            "这里管理开门动画左右两边的图片。上传后可直接点“取景”，最后点顶部“保存全部”。"
          }
        </div>
        {"\n                "}
        <div className={"special-image-grid"} id={"specialImageGrid"}></div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"上传图片"}</h3>
        {"\n                "}
        <div
          className={"form-row"}
          style={{ marginBottom: "12px" } as React.CSSProperties}
        >
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"文件名（含扩展名）"}</label>
            {"\n                        "}
            <input
              type={"text"}
              id={"uploadFilename"}
              placeholder={"例: castorice.webp"}
              style={{ width: "250px" } as React.CSSProperties}
            />
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            style={{ fontSize: "0.8rem", color: "#888" } as React.CSSProperties}
          >
            {"支持中文；不写扩展名时会自动保留原扩展名"}
          </div>
          {"\n                "}
        </div>
        {"\n                "}
        <div
          className={"upload-zone"}
          id={"uploadZone"}
          onClick={(event) => {
            document.getElementById("fileInput")!.click();
          }}
        >
          {"\n                    "}
          <input
            type={"file"}
            id={"fileInput"}
            accept={"image/*"}
            onChange={(event) => {
              actions.current!.uploadFile(event.currentTarget.files?.[0]);
            }}
          />
          {"\n                    "}
          <p>{"📁 点击选择或拖拽图片到此处"}</p>
          {"\n                    "}
          <p
            style={
              {
                fontSize: "0.8rem",
                color: "#666",
                marginTop: "8px",
              } as React.CSSProperties
            }
          >
            {"支持 jpg / png / webp / gif / svg，最大 20MB"}
          </p>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"已有图片"}</h3>
        {"\n                "}
        <div className={"image-grid"} id={"imageGrid"}></div>
        {"\n            "}
      </div>
      {"\n        "}
    </div>
  );
}
