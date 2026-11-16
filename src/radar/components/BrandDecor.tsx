export function BrandDecor() {
  return (
    <div id={"brandDecor"} className={"scene-layer scene-layer--ambient"}>
      {"\n        "}
      <div className={"brand-security-pattern"}></div>
      {"\n        "}
      <div className={"brand-emblem"}></div>
      {"\n        "}
      <div className={"brand-scan-badge brand-b3"} aria-hidden={"true"}>
        {"\n            "}
        <div className={"brand-b3-label"} id={"brandLeftTopText"}>
          {"IPC LOCK"}
        </div>
        {"\n            "}
        <div className={"brand-b3-rail brand-b3-rail-main"}></div>
        {"\n            "}
        <div className={"brand-b3-rail brand-b3-rail-sub"}></div>
        {"\n            "}
        <div className={"brand-b3-focus"}></div>
        {"\n            "}
        <div className={"brand-b3-brackets"}>
          <span></span>
        </div>
        {"\n            "}
        <div className={"brand-b3-data"}>{"C-01"}</div>
        {"\n            "}
        <div className={"brand-b3-readout brand-b3-readout-top"}>
          {"TRACE / 88"}
        </div>
        {"\n            "}
        <div className={"brand-b3-readout brand-b3-readout-bottom"}>
          {"SYNC READY"}
        </div>
        {"\n            "}
        <div className={"brand-b3-dots"}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        {"\n        "}
      </div>
      {"\n        "}
      <canvas
        id={"brandDiamondCanvas"}
        className={"brand-diamond-canvas"}
        aria-hidden={"true"}
      ></canvas>
      {"\n        "}
      <div className={"brand-diamond"} aria-hidden={"true"}>
        {"\n            "}
        <svg
          className={"brand-diamond-defs"}
          viewBox={"0 0 0 0"}
          aria-hidden={"true"}
          focusable={"false"}
        >
          {"\n                "}
          <defs>
            {"\n                    "}
            <linearGradient
              id={"brandDiamondCore3d"}
              x1={"0%"}
              y1={"8%"}
              x2={"100%"}
              y2={"92%"}
            >
              {"\n                        "}
              <stop
                offset={"0%"}
                stopColor={"#ffffff"}
                stopOpacity={"0.22"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"18%"}
                stopColor={"#cff5ff"}
                stopOpacity={"0.4"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"46%"}
                stopColor={"#ddd0ff"}
                stopOpacity={"0.28"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"68%"}
                stopColor={"#ffd8f1"}
                stopOpacity={"0.34"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"100%"}
                stopColor={"#b2edff"}
                stopOpacity={"0.18"}
              ></stop>
              {"\n                    "}
            </linearGradient>
            {"\n                    "}
            <linearGradient
              id={"brandFacetCool3d"}
              x1={"0%"}
              y1={"0%"}
              x2={"100%"}
              y2={"100%"}
            >
              {"\n                        "}
              <stop
                offset={"0%"}
                stopColor={"#b9f2ff"}
                stopOpacity={"0.72"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"100%"}
                stopColor={"#ffffff"}
                stopOpacity={"0.16"}
              ></stop>
              {"\n                    "}
            </linearGradient>
            {"\n                    "}
            <linearGradient
              id={"brandFacetWarm3d"}
              x1={"0%"}
              y1={"0%"}
              x2={"100%"}
              y2={"100%"}
            >
              {"\n                        "}
              <stop
                offset={"0%"}
                stopColor={"#ffffff"}
                stopOpacity={"0.3"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"100%"}
                stopColor={"#ffc8f0"}
                stopOpacity={"0.54"}
              ></stop>
              {"\n                    "}
            </linearGradient>
            {"\n                    "}
            <linearGradient
              id={"brandFacetPrism3d"}
              x1={"0%"}
              y1={"10%"}
              x2={"100%"}
              y2={"100%"}
            >
              {"\n                        "}
              <stop
                offset={"0%"}
                stopColor={"#fff7ea"}
                stopOpacity={"0.48"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"52%"}
                stopColor={"#bfe7ff"}
                stopOpacity={"0.26"}
              ></stop>
              {"\n                        "}
              <stop
                offset={"100%"}
                stopColor={"#adfff4"}
                stopOpacity={"0.36"}
              ></stop>
              {"\n                    "}
            </linearGradient>
            {"\n                    "}
            <symbol id={"brandDiamondGem3d"} viewBox={"0 0 240 220"}>
              {"\n                        "}
              <polygon
                className={"brand-diamond-outline"}
                points={"34,88 60,48 94,28 120,20 146,28 180,48 206,88 120,194"}
              ></polygon>
              {"\n\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-cool"}
                points={"34,88 60,48 78,88"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-warm"}
                points={"60,48 94,28 104,88 78,88"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-prism"}
                points={"94,28 120,20 104,88"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-warm"}
                points={"120,20 146,28 136,88"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-cool"}
                points={"146,28 180,48 162,88 136,88"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-prism"}
                points={"180,48 206,88 162,88"}
              ></polygon>
              {"\n\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-prism"}
                points={"34,88 78,88 120,194"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-cool"}
                points={"78,88 104,88 120,194"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-warm"}
                points={"104,88 120,88 120,194"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-prism"}
                points={"120,88 136,88 120,194"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-cool"}
                points={"136,88 162,88 120,194"}
              ></polygon>
              {"\n                        "}
              <polygon
                className={"brand-diamond-facet brand-diamond-facet-warm"}
                points={"162,88 206,88 120,194"}
              ></polygon>
              {"\n\n                        "}
              <path
                className={"brand-diamond-line brand-diamond-line-bright"}
                d={"M34 88 L60 48 L94 28 L120 20 L146 28 L180 48 L206 88"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M34 88 L78 88 L104 88 L120 88 L136 88 L162 88 L206 88"}
              ></path>
              {"\n                        "}
              <path className={"brand-diamond-line"} d={"M60 48 L78 88"}></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M94 28 L104 88"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line brand-diamond-line-bright"}
                d={"M120 20 L120 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M146 28 L136 88"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M180 48 L162 88"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M34 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line brand-diamond-line-bright"}
                d={"M78 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M104 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M136 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line brand-diamond-line-bright"}
                d={"M162 88 L120 194"}
              ></path>
              {"\n                        "}
              <path
                className={"brand-diamond-line"}
                d={"M206 88 L120 194"}
              ></path>
              {"\n\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"60"}
                cy={"48"}
                r={"2.4"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"94"}
                cy={"28"}
                r={"2.2"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"120"}
                cy={"20"}
                r={"2.5"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"146"}
                cy={"28"}
                r={"2.2"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"180"}
                cy={"48"}
                r={"2.4"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"34"}
                cy={"88"}
                r={"2"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"78"}
                cy={"88"}
                r={"1.9"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"104"}
                cy={"88"}
                r={"1.8"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"136"}
                cy={"88"}
                r={"1.8"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"162"}
                cy={"88"}
                r={"1.9"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"206"}
                cy={"88"}
                r={"2"}
              ></circle>
              {"\n                        "}
              <circle
                className={"brand-diamond-node"}
                cx={"120"}
                cy={"194"}
                r={"2.6"}
              ></circle>
              {"\n                    "}
            </symbol>
            {"\n                "}
          </defs>
          {"\n            "}
        </svg>
        {"\n            "}
        <div className={"brand-diamond-aura"}></div>
        {"\n            "}
        <div className={"brand-diamond-shell"}>
          {"\n                "}
          <div className={"brand-diamond-rig"}>
            {"\n                    "}
            <div className={"brand-diamond-face brand-diamond-face-back"}>
              {"\n                        "}
              <svg
                className={"brand-diamond-svg"}
                viewBox={"0 0 240 220"}
                aria-hidden={"true"}
              >
                <use href={"#brandDiamondGem3d"}></use>
              </svg>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"brand-diamond-face brand-diamond-face-mid"}>
              {"\n                        "}
              <svg
                className={"brand-diamond-svg"}
                viewBox={"0 0 240 220"}
                aria-hidden={"true"}
              >
                <use href={"#brandDiamondGem3d"}></use>
              </svg>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"brand-diamond-bridges"}>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-tl"}
              ></span>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-tr"}
              ></span>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-ml"}
              ></span>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-mr"}
              ></span>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-bl"}
              ></span>
              {"\n                        "}
              <span
                className={"brand-diamond-bridge brand-diamond-bridge-br"}
              ></span>
              {"\n                        "}
              <span className={"brand-diamond-spine"}></span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"brand-diamond-shadow"}></div>
            {"\n                    "}
            <div className={"brand-diamond-face brand-diamond-face-front"}>
              {"\n                        "}
              <svg
                className={"brand-diamond-svg"}
                viewBox={"0 0 240 220"}
                aria-hidden={"true"}
              >
                <use href={"#brandDiamondGem3d"}></use>
              </svg>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"brand-diamond-shimmer"}></div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n            "}
        <span className={"brand-diamond-spark brand-diamond-spark-a"}></span>
        {"\n            "}
        <span className={"brand-diamond-spark brand-diamond-spark-b"}></span>
        {"\n            "}
        <span className={"brand-diamond-spark brand-diamond-spark-c"}></span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"brand-watermark"}>
        {"\n            "}
        <span className={"brand-watermark-cn"}>{"货币战争"}</span>
        {"\n            "}
        <span className={"brand-watermark-en"}>{"CURRENCY WAR"}</span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"brand-corner brand-corner-top-right"}></div>
      {"\n        "}
      <div className={"brand-corner brand-corner-bottom-left"}></div>
      {"\n        "}
      <div className={"brand-serial brand-serial-top"}>
        {"HONKAI: STAR RAIL V4.0"}
      </div>
      {"\n        "}
      <div className={"brand-serial brand-serial-bottom"}>
        {"CURRENCY WAR / IPC"}
      </div>
      {"\n    "}
    </div>
  );
}
