import type * as React from "react";
import { DEFAULT_GACHA_WIPE_COLORS } from "../../shared/gacha-wipe";
import type { AdminActions } from "../types";
export function ConfigPanel({ actions }: { actions: AdminActions }) {
  return (
    <div className={"panel"} id={"panel-config"}>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"雷达图设置"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"缩放比例"}</label>
            <input
              type={"number"}
              id={"cfg-RADAR_SCALE"}
              step={"0.1"}
              min={"0.1"}
            />
          </div>
          {"\n                    "}
          <div
            className={"checkbox-row"}
            style={{ marginTop: "18px" } as React.CSSProperties}
          >
            <input type={"checkbox"} id={"cfg-RADAR_AUTO_OFFSET"} />
            <label>{"按形状自动平移中心"}</label>
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"网格层数"}</label>
            <input
              type={"number"}
              id={"cfg-RADAR_GRID_LEVELS"}
              min={"1"}
              max={"20"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"网格线宽"}</label>
            <input
              type={"number"}
              id={"cfg-RADAR_GRID_LINE_WIDTH"}
              step={"0.5"}
              min={"0.5"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"网格透明度"}</label>
            <input
              type={"number"}
              id={"cfg-RADAR_GRID_LINE_OPACITY"}
              step={"0.05"}
              min={"0"}
              max={"1"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"顶点数"}</label>
            <input
              type={"number"}
              id={"cfg-VERTEX_COUNT"}
              min={"6"}
              max={"8"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"标签边距"}</label>
            <input type={"number"} id={"cfg-LABEL_MARGIN"} min={"0"} />
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"动画 & 时间"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"数值动画时长(ms)"}</label>
            <input type={"number"} id={"cfg-ANIM_DURATION"} step={"100"} />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"默认展示时长(ms)"}</label>
            <input type={"number"} id={"cfg-DEFAULT_DURATION"} step={"500"} />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"蓝色前奏(ms)"}</label>
            <input type={"number"} id={"cfg-INTRO_WAIT_TIME"} step={"100"} />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"音乐音量(0-1)"}</label>
            <input
              type={"number"}
              id={"cfg-MUSIC_VOLUME"}
              step={"0.01"}
              min={"0"}
              max={"1"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"音乐延迟（秒）"}</label>
            <input
              type={"number"}
              id={"cfg-MUSIC_DELAY_SECONDS"}
              step={"0.1"}
              min={"0"}
              max={"60"}
            />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "340px" } as React.CSSProperties}
          >
            <label>{"音乐列表（逗号分隔）"}</label>
            <input
              type={"text"}
              id={"cfg-MUSIC_TRACKS"}
              placeholder={"/assets/audio/music.mp3,/assets/audio/music2.mp3"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"图片缩放"}</label>
            <input
              type={"number"}
              id={"cfg-IMAGE_SCALE"}
              step={"0.1"}
              min={"0.1"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"主体显示倍率"}</label>
            <input
              type={"number"}
              id={"cfg-PRESENTATION_SCALE"}
              step={"0.05"}
              min={"0.8"}
              max={"1.6"}
            />
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"粒子效果"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"背景特效"}</label>
            {"\n                        "}
            <select
              id={"cfg-BG_EFFECT_MODE"}
              onChange={(event) => {
                actions.current!.renderBackgroundEffectConfigFields();
              }}
            ></select>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            id={"bgEffectConfigFields"}
            className={"background-effect-fields"}
          ></div>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"雷达音频动效"}</label>
            {"\n                        "}
            <select id={"cfg-RADAR_AUDIO_FX_MODE"}>
              {"\n                            "}
              <option value={"tech"}>{"科技音频环"}</option>
              {"\n                            "}
              <option value={"pulse"}>{"脉冲波纹"}</option>
              {"\n                            "}
              <option value={"orbit"}>{"轨道点阵"}</option>
              {"\n                            "}
              <option value={"off"}>{"关闭"}</option>
              {"\n                        "}
            </select>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"性能档位"}</label>
            {"\n                        "}
            <select id={"cfg-PERFORMANCE_MODE"}>
              {"\n                            "}
              <option value={"high"}>{"高画质"}</option>
              {"\n                            "}
              <option value={"balanced"}>{"均衡"}</option>
              {"\n                            "}
              <option value={"smooth"}>{"流畅"}</option>
              {"\n                        "}
            </select>
            {"\n                    "}
          </div>
          {"\n                    "}
          <div
            className={"checkbox-row"}
            style={{ marginTop: "18px" } as React.CSSProperties}
          >
            <input type={"checkbox"} id={"cfg-ADAPTIVE_PERF"} />
            <label>{"动态降级"}</label>
          </div>
          {"\n                    "}
          <div
            className={"checkbox-row"}
            style={{ marginTop: "18px" } as React.CSSProperties}
          >
            <input type={"checkbox"} id={"cfg-PHOTO_FX_ENABLED"} />
            <label htmlFor="cfg-PHOTO_FX_ENABLED">{"人物框内特效（含 S2 分格、辉光）"}</label>
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label htmlFor="cfg-PHOTO_FX_INTENSITY">{"人物框内特效强度"}</label>
            {"\n                        "}
            <select id={"cfg-PHOTO_FX_INTENSITY"}>
              {"\n                            "}
              <option value={"0.75"}>{"低"}</option>
              {"\n                            "}
              <option value={"1"}>{"中"}</option>
              {"\n                            "}
              <option value={"1.35"}>{"高"}</option>
              {"\n                        "}
            </select>
            {"\n                    "}
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"显示选项"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"checkbox-row"}>
            <input type={"checkbox"} id={"cfg-SHOW_DESC"} />
            <label>{"显示羁绊图标/标签"}</label>
          </div>
          {"\n                    "}
          <div className={"checkbox-row"}>
            <input type={"checkbox"} id={"cfg-ENABLE_SPECIAL_FORMAT"} />
            <label>{"启用 10+ 特殊格式"}</label>
          </div>
          {"\n                    "}
          <div className={"checkbox-row"}>
            <input type={"checkbox"} id={"cfg-USE_AUTO_PRECISION"} />
            <label>{"自动精度控制"}</label>
          </div>
          {"\n                    "}
          <div className={"checkbox-row"}>
            <input type={"checkbox"} id={"cfg-SHOW_SCORE_UNDER_NAME"} />
            <label>{"分数显示在名称下方"}</label>
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"品牌文案"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"右上角文案"}</label>
            <input type={"text"} id={"cfg-BRAND_TOP_RIGHT_TEXT"} />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"左下角文案"}</label>
            <input type={"text"} id={"cfg-BRAND_BOTTOM_LEFT_TEXT"} />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"背景主标题"}</label>
            <input type={"text"} id={"cfg-BRAND_WATERMARK_CN"} />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"背景英文小字"}</label>
            <input type={"text"} id={"cfg-BRAND_WATERMARK_EN"} />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"开场主标题"}</label>
            <input type={"text"} id={"cfg-INTRO_TITLE_MAIN"} />
          </div>
          {"\n                    "}
          <div
            className={"form-group"}
            style={{ minWidth: "260px" } as React.CSSProperties}
          >
            <label>{"开场英文小字"}</label>
            <input type={"text"} id={"cfg-INTRO_TITLE_SUB"} />
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"Best 标记"}</h3>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"颜色"}</label>
            <input
              type={"color"}
              id={"cfg-BEST_COLOR"}
              style={
                {
                  width: "60px",
                  height: "36px",
                  padding: "2px",
                } as React.CSSProperties
              }
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"字体 CSS"}</label>
            <input
              type={"text"}
              id={"cfg-BEST_FONT"}
              style={{ width: "350px" } as React.CSSProperties}
            />
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"抽卡出金动画"}</h3>
        <div className="form-row">
          {DEFAULT_GACHA_WIPE_COLORS.map((color, index) => {
            const id = `cfg-gacha-wipe-color-${index + 1}`;
            return (
              <div className="form-group" key={id}>
                <label htmlFor={id}>S2 色带 {index + 1}</label>
                <input id={id} type="color" defaultValue={color} />
              </div>
            );
          })}
        </div>
        {"\n                "}
        <div className={"form-row"}>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"动画时长(ms)"}</label>
            <input
              type={"number"}
              id={"cfg-GACHA_ANIM_DURATION"}
              step={"100"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"原版 Logo 出现时间(ms)"}</label>
            <input
              type={"number"}
              id={"cfg-GACHA_LOGO_ON_TIME"}
              step={"10"}
              min={"0"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            <label>{"原版 Logo 停留时长(ms)"}</label>
            <input
              type={"number"}
              id={"cfg-GACHA_LOGO_DURATION"}
              step={"10"}
              min={"0"}
            />
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"动画风格"}</label>
            {"\n                        "}
            <input
              type={"text"}
              defaultValue={"S2 多层斜切 / 原版 故障神启"}
              disabled={true}
              style={{ width: "224px", opacity: "0.8" } as React.CSSProperties}
            />
            {"\n                    "}
          </div>
          {"\n                    "}
          <div className={"form-group"}>
            {"\n                        "}
            <label>{"原版艺术字风格"}</label>
            {"\n                        "}
            <select id={"cfg-GACHA_FONT_STYLE"}>
              {"\n                            "}
              <option value={"0"}>{"0 - 金色辉光"}</option>
              {"\n                            "}
              <option value={"1"}>{"1 - 白蓝渐变"}</option>
              {"\n                            "}
              <option value={"2"}>{"2 - 霓虹灯"}</option>
              {"\n                            "}
              <option value={"3"}>{"3 - 故障效果"}</option>
              {"\n                        "}
            </select>
            {"\n                    "}
          </div>
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"维度设置"}</h3>
        {"\n                "}
        <div id={"dimSettings"}></div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"MVP 列表"}</h3>
        {"\n                "}
        <div className={"form-group"}>
          {"\n                    "}
          <label>{"MVP 名称（逗号分隔）"}</label>
          {"\n                    "}
          <input
            type={"text"}
            id={"cfg-mvplist"}
            style={{ width: "100%" } as React.CSSProperties}
          />
          {"\n                "}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"专家列表"}</h3>
        {"\n                "}
        <div className={"form-group"}>
          {"\n                    "}
          <label>{"专家名称（英文逗号分隔）"}</label>
          {"\n                    "}
          <input
            type={"text"}
            id={"cfg-expertlist"}
            style={{ width: "100%" } as React.CSSProperties}
          />
          {"\n                "}
        </div>
        {"\n                "}
        <div className={"hint"}>
          {"角色名称精确匹配时，雷达展示页会在名称右侧显示专家图标。"}
        </div>
        {"\n            "}
      </div>
      {"\n            "}
      <div className={"card"}>
        {"\n                "}
        <h3>{"五种固定配色"}</h3>
        {"\n                "}
        <div
          className={"hint"}
          style={{ marginBottom: "12px" } as React.CSSProperties}
        >
          {
            "这里修改固定配色的名称、主色和两层背景色。选手管理中的配色卡片会实时读取这五项。"
          }
        </div>
        {"\n                "}
        <div id={"fixedColorList"} className={"fixed-color-grid"}></div>
        {"\n            "}
      </div>
      {"\n        "}
    </div>
  );
}
