import type * as React from "react";
import type { AdminActions } from "../types";
export function ImageEditor({ actions }: { actions: AdminActions }) {
  return (
    <div className={"modal-backdrop"} id={"imageEditorModal"}>
      {"\n        "}
      <div className={"modal-card"}>
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
              {"图片取景"}
            </h3>
            {"\n                    "}
            <div
              id={"editorImageName"}
              style={
                { fontSize: "0.82rem", color: "#8892b0" } as React.CSSProperties
              }
            ></div>
            {"\n                "}
          </div>
          {"\n                "}
          <button
            className={"btn btn-outline btn-sm"}
            onClick={(event) => {
              actions.current!.closeImageEditor();
            }}
          >
            {"关闭"}
          </button>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"modal-grid"}>
          {"\n                "}
          <div className={"crop-stage"} id={"cropStage"}>
            {"\n                    "}
            <img
              id={"cropPreviewImage"}
              className={"crop-preview-image"}
              alt={""}
            />
            {"\n                    "}
            <div
              className={"crop-visible-window"}
              id={"cropVisibleWindow"}
            ></div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className={"crop-side"}>
            {"\n                    "}
            <div className={"form-group"}>
              {"\n                        "}
              <label>{"显示模式"}</label>
              {"\n                        "}
              <select id={"cropFitMode"}>
                {"\n                            "}
                <option value={"contain"}>{"完整显示"}</option>
                {"\n                            "}
                <option value={"cover"}>{"铺满裁切"}</option>
                {"\n                        "}
              </select>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"range-group"}>
              {"\n                        "}
              <label>{"缩放"}</label>
              {"\n                        "}
              <div className={"range-row"}>
                {"\n                            "}
                <input
                  type={"range"}
                  id={"cropScale"}
                  min={"0.5"}
                  max={"2.5"}
                  step={"0.01"}
                />
                {"\n                            "}
                <output id={"cropScaleOut"}>{"1.00x"}</output>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"range-group"}>
              {"\n                        "}
              <label>{"水平焦点"}</label>
              {"\n                        "}
              <div className={"range-row"}>
                {"\n                            "}
                <input
                  type={"range"}
                  id={"cropX"}
                  min={"0"}
                  max={"100"}
                  step={"0.1"}
                />
                {"\n                            "}
                <output id={"cropXOut"}>{"50%"}</output>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"range-group"}>
              {"\n                        "}
              <label>{"垂直焦点"}</label>
              {"\n                        "}
              <div className={"range-row"}>
                {"\n                            "}
                <input
                  type={"range"}
                  id={"cropY"}
                  min={"0"}
                  max={"100"}
                  step={"0.1"}
                />
                {"\n                            "}
                <output id={"cropYOut"}>{"50%"}</output>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"hint"}>
              {"\n                        拖动预览图可直接选取画面区域。"}
              <br />
              {
                "\n                        改完点“应用取景”，最后再点顶部“保存全部”写入 `data.json`。\n                    "
              }
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"modal-actions"}>
          {"\n                "}
          <button
            className={"btn btn-outline"}
            onClick={(event) => {
              actions.current!.resetImageEditor();
            }}
          >
            {"重置"}
          </button>
          {"\n                "}
          <button
            className={"btn btn-primary"}
            onClick={(event) => {
              actions.current!.saveImageEditor();
            }}
          >
            {"应用取景"}
          </button>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
