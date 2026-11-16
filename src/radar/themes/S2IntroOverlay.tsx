import "./s2-intro.css";

export function S2IntroOverlay() {
  return (
    <div id="introOverlay" className="scene-layer scene-layer--overlay s2-intro">
      <div className="s2-opening-stage">
        <section className="s2-opening-hero" aria-label="货币战争 S2 开幕">
          <h1 id="introTitleMain">货币战争雷达图</h1>
          <p className="s2-opening-subtitle">入画奇航</p>
          <button className="s2-start-button" type="button" onKeyDown={(event) => {
            if (event.key === " ") event.stopPropagation();
          }} onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }))}>
            按空格开始
          </button>
        </section>
        <section className="s2-average-scene" aria-label="全员平均数据">
          <h2 className="s2-average-title">平均值</h2>
          <div className="s2-chart-wrap">
            <svg id="introRadarSvg" viewBox="0 0 760 640" role="img" aria-label="全员平均雷达图" />
            <div id="introGuideLabels" />
          </div>
        </section>
      </div>
    </div>
  );
}
