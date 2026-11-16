export function IntroOverlay() {
  return (
    <div id={"introOverlay"} className={"scene-layer scene-layer--overlay"}>
      {"\n        "}
      <div className={"intro-sequence"} aria-hidden={"true"}>
        {"\n            "}
        <div className={"intro-title-banner"}>
          {"\n                "}
          <div className={"intro-title-main"} id={"introTitleMain"}>
            {"货币战争雷达图 V4.0"}
          </div>
          {"\n                "}
          <div className={"intro-title-sub"} id={"introTitleSub"}>
            {"Currency War Radar System"}
          </div>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"intro-guide-wrap"}>
          {"\n                "}
          <div className={"intro-guide-panel"}>
            {"\n                    "}
            <div className={"intro-guide-radar"}>
              {"\n                        "}
              <svg
                id={"introRadarSvg"}
                viewBox={"0 0 600 600"}
                aria-hidden={"true"}
              ></svg>
              {"\n                        "}
              <div
                id={"introGuideLabels"}
                className={"intro-guide-labels"}
              ></div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"intro-exit-wipe"}></div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
