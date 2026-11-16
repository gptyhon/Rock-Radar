import type * as React from "react";
import type { AdminActions } from "../types";
export function BandsPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel active"} id={"panel-bands"}>
      {"\n            "}
      <div
        style={
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          } as React.CSSProperties
        }
      >
        {"\n                "}
        <h2 style={{ color: "var(--accent)" } as React.CSSProperties}>
          {"选手列表"}
        </h2>
        {"\n                "}
        <div
          style={
            {
              display: "flex",
              gap: "8px",
              alignItems: "center",
            } as React.CSSProperties
          }
        >
          {"\n                    "}
          <button
            className={"btn btn-outline"}
            onClick={(event) => {
              actions.current!.openBandSortModal();
            }}
          >
            {"拖拽排序"}
          </button>
          {"\n                    "}
          <button
            className={"btn btn-outline"}
            onClick={(event) => {
              actions.current!.exportBandsCsv();
            }}
          >
            {"导出 CSV"}
          </button>
          {"\n                    "}
          <button
            className={"btn btn-outline"}
            onClick={(event) => {
              actions.current!.triggerImportBandsCsv();
            }}
          >
            {"导入 CSV"}
          </button>
          {"\n                    "}
          <button
            className={"btn btn-success"}
            onClick={(event) => {
              actions.current!.addBand();
            }}
          >
            {"＋ 添加选手"}
          </button>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <input
        type={"file"}
        id={"bandCsvFile"}
        accept={".csv,text/csv"}
        style={{ display: "none" } as React.CSSProperties}
      />
      {"\n            "}
      <div
        className={"card"}
        style={{ marginBottom: "14px" } as React.CSSProperties}
      >
        {"\n                "}
        <div
          className={"form-row"}
          style={{ alignItems: "flex-end" } as React.CSSProperties}
        >
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            {"\n                        "}
            <label>{"搜索（名称/描述）"}</label>
            {"\n                        "}
            <input
              type={"text"}
              id={"bandSearch"}
              placeholder={"输入关键词快速定位"}
            />
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            className={"checkbox-row"}
            style={{ marginTop: "18px" } as React.CSSProperties}
          >
            {"\n                        "}
            <input type={"checkbox"} id={"bandOnlyGacha"} />
            {"\n                        "}
            <label>{"仅显示抽卡出金"}</label>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "120px" } as React.CSSProperties}
          >
            {"\n                        "}
            <label>{"每页条数"}</label>
            {"\n                        "}
            <select id={"bandPageSize"} defaultValue={"20"}>
              {"\n                            "}
              <option value={"10"}>{"10"}</option>
              {"\n                            "}
              <option value={"20"}>{"20"}</option>
              {"\n                            "}
              <option value={"50"}>{"50"}</option>
              {"\n                            "}
              <option value={"100"}>{"100"}</option>
              {"\n                        "}
            </select>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "220px" } as React.CSSProperties}
          >
            {"\n                        "}
            <label>{"筛选统计"}</label>
            {"\n                        "}
            <div
              id={"bandCount"}
              style={
                {
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  border: "1px solid #30363d",
                  borderRadius: "6px",
                  background: "#0d1117",
                  color: "#9fb6ff",
                } as React.CSSProperties
              }
            >
              {"共 0 条"}
            </div>
            {"\n                    "}
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div id={"bandList"}></div>
      {"\n            "}
      <div
        id={"bandPager"}
        style={{ marginTop: "14px" } as React.CSSProperties}
      ></div>
      {"\n        "}
    </div>
  );
}
