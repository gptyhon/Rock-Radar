import type * as React from "react";
import type { AdminActions } from "../types";
export function RoleComparisonPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel"} id={"panel-comparison"}>
      {"\n            "}
      <div className={"comparison-toolbar"}>
        {"\n                "}
        <div className={"comparison-toolbar-copy"}>
          {"\n                    "}
          <h2>{"角色对比"}</h2>
          {"\n                    "}
          <div className={"hint"}>
            {
              "选择两名角色，在同一雷达图中比较并直接修改双方原始数据。输入后图形会立即更新。"
            }
          </div>
          {"\n                "}
        </div>
        {"\n                "}
        <div className={"comparison-toolbar-actions"}>
          {"\n                    "}
          <div id={"comparisonSaveStatus"} className={"comparison-save-status"}>
            {"尚未修改"}
          </div>
          {"\n                    "}
          <button
            id={"comparisonSaveButton"}
            className={"btn btn-primary"}
            onClick={(event) => {
              actions.current!.saveComparisonChanges();
            }}
            // Avoid a stale React disabled prop suppressing the enabled click.
            ref={(button) => {
              if (button) button.disabled = true;
            }}
          >
            {"💾 保存修改"}
          </button>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div id={"comparisonEmpty"} className={"comparison-empty"}>
        {"\n                至少需要两名角色才能使用对比功能。\n            "}
      </div>
      {"\n            "}
      <div
        id={"comparisonContent"}
        className={"comparison-content"}
        hidden={true}
      >
        {"\n                "}
        <div className={"comparison-layout"}>
          {"\n                    "}
          <div className={"card comparison-chart-card"}>
            {"\n                        "}
            <div
              id={"comparisonChartStage"}
              className={"comparison-chart-stage"}
            >
              {"\n                            "}
              <canvas
                id={"comparisonRadarCanvas"}
                className={"comparison-radar-canvas"}
                aria-label={"双角色雷达图"}
              ></canvas>
              {"\n                        "}
            </div>
            {"\n                        "}
            <div className={"comparison-legend"}>
              {"\n                            "}
              <div className={"comparison-legend-item"}>
                {"\n                                "}
                <span
                  className={"comparison-legend-line"}
                  style={
                    {
                      color: "#ff4d67",
                      background: "#ff4d67",
                    } as React.CSSProperties
                  }
                ></span>
                {"\n                                "}
                <span id={"comparisonLegendA"}>{"角色 A"}</span>
                {"\n                            "}
              </div>
              {"\n                            "}
              <div className={"comparison-legend-item"}>
                {"\n                                "}
                <span
                  className={"comparison-legend-line"}
                  style={
                    {
                      color: "#3d8bff",
                      background: "#3d8bff",
                    } as React.CSSProperties
                  }
                ></span>
                {"\n                                "}
                <span id={"comparisonLegendB"}>{"角色 B"}</span>
                {"\n                            "}
              </div>
              {"\n                        "}
            </div>
            {"\n                        "}
            <section
              className={"comparison-leaders-panel"}
              aria-labelledby={"comparisonLeadersTitle"}
            >
              {"\n                            "}
              <div className={"comparison-leaders-head"}>
                {"\n                                "}
                <div>
                  {"\n                                    "}
                  <h3 id={"comparisonLeadersTitle"}>{"各维度最高分"}</h3>
                  {"\n                                    "}
                  <div className={"comparison-leaders-note"}>
                    {"统计全部角色的基础数据；并列最高分会同时显示。"}
                  </div>
                  {"\n                                "}
                </div>
                {"\n                                "}
                <span className={"comparison-leaders-scope"}>{"全部角色"}</span>
                {"\n                            "}
              </div>
              {"\n                            "}
              <div
                id={"comparisonDimensionLeaders"}
                className={"comparison-leaders-grid"}
              ></div>
              {"\n                        "}
            </section>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div className={"comparison-editors"}>
            {"\n                        "}
            <div
              className={"card comparison-editor-card"}
              style={{ "--comparison-color": "#ff4d67" } as React.CSSProperties}
            >
              {"\n                            "}
              <div className={"comparison-editor-head"}>
                {"\n                                "}
                <div className={"form-group"}>
                  {"\n                                    "}
                  <label htmlFor={"comparisonRoleA"}>{"角色 A"}</label>
                  {"\n                                    "}
                  <select
                    id={"comparisonRoleA"}
                    className={"comparison-role-select"}
                    onChange={(event) => {
                      actions.current!.selectComparisonRole(
                        "a",
                        event.currentTarget.value,
                      );
                    }}
                  ></select>
                  {"\n                                "}
                </div>
                {"\n                                "}
                <span className={"comparison-side-badge"}>{"红色数据"}</span>
                {"\n                            "}
              </div>
              {"\n                            "}
              <div
                id={"comparisonFieldsA"}
                className={"comparison-points-grid"}
              ></div>
              {"\n                            "}
              <div className={"comparison-range-note"}>
                {
                  "数据不限制量程，最多保留两位小数；超过满分时图形会越过最外圈。"
                }
              </div>
              {"\n                        "}
            </div>
            {"\n                        "}
            <div
              className={"card comparison-editor-card"}
              style={{ "--comparison-color": "#3d8bff" } as React.CSSProperties}
            >
              {"\n                            "}
              <div className={"comparison-editor-head"}>
                {"\n                                "}
                <div className={"form-group"}>
                  {"\n                                    "}
                  <label htmlFor={"comparisonRoleB"}>{"角色 B"}</label>
                  {"\n                                    "}
                  <select
                    id={"comparisonRoleB"}
                    className={"comparison-role-select"}
                    onChange={(event) => {
                      actions.current!.selectComparisonRole(
                        "b",
                        event.currentTarget.value,
                      );
                    }}
                  ></select>
                  {"\n                                "}
                </div>
                {"\n                                "}
                <span className={"comparison-side-badge"}>{"蓝色数据"}</span>
                {"\n                            "}
              </div>
              {"\n                            "}
              <div
                id={"comparisonFieldsB"}
                className={"comparison-points-grid"}
              ></div>
              {"\n                            "}
              <div className={"comparison-range-note"}>
                {"空值和非数字不会覆盖原数据；修正无效输入后才能保存。"}
              </div>
              {"\n                        "}
            </div>
            {"\n                    "}
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n        "}
    </div>
  );
}
