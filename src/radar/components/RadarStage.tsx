// The SVG filter uses the original icon's alpha, including its cropped edges.
const independentBondGradient = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <linearGradient id="warm" x1="20%" x2="80%" y2="100%">
      <stop stop-color="#ffc580"/>
      <stop offset="46%" stop-color="#fa8c5a"/>
      <stop offset="88%" stop-color="#ff83ce"/>
    </linearGradient>
    <rect width="32" height="32" fill="url(#warm)"/>
  </svg>`)}`;

export function RadarStage() {
  return (
    <main
      id={"presentationStage"}
      className={"container presentation-stage scene-layer scene-layer--core"}
      data-design-width={"1920"}
      data-design-height={"1080"}
    >
      <svg
        width={0}
        height={0}
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <filter
          id="independent-bond-tint"
          primitiveUnits="objectBoundingBox"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={independentBondGradient}
            x={0}
            y={0}
            width={1}
            height={1}
            preserveAspectRatio="none"
          />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </svg>
      {"\n        "}
      <div className={"main-layout"}>
        {"\n            "}
        <div className={"left-panel"}>
          {"\n                "}
          <canvas id={"radarCanvas"} width={"1600"} height={"1600"}></canvas>
          {"\n            "}
        </div>
        {"\n            "}
        <div className={"right-panel"}>
          {"\n                "}
          <div className={"band-info-box"}>
            {"\n                    "}
            <div className={"band-name-row"}>
              {"\n                        "}
              <div className={"band-name"} id={"bandName"}></div>
              {"\n                        "}
              <img
                className={"expert-badge"}
                id={"expertBadge"}
                src={"/assets/images/专家.png"}
                alt={"专家"}
                hidden={true}
              />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className={"bond-icons"} id={"bondIcons"}></div>
            {"\n                    \n                    "}
            <div className={"band-photo-container"} id={"photoContainer"}>
              {"\n                        "}
              <canvas
                id={"photoFxCanvas"}
                className={"band-photo-fx-layer"}
              ></canvas>
              {"\n                        "}
              <img id={"bandPhoto"} className={"band-photo"} alt={""} />
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className={"band-desc-container"} id={"bandDetailContainer"}>
              {"\n                        "}
              <div
                className={"band-detail-panel band-detail-image-panel"}
                id={"bandAttachmentPanel"}
                aria-hidden={"true"}
              >
                {"\n                            "}
                <div
                  className={"band-equipment-grid"}
                  id={"bandEquipmentGrid"}
                ></div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className={"progress-bar-container"}>
            {"\n                    "}
            <div className={"progress-bar"} id={"progressBar"}></div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </main>
  );
}
