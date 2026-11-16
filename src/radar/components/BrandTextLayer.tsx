export function BrandTextLayer() {
  return (
    <div
      id={"brandTextLayer"}
      className={"scene-layer scene-layer--ambient"}
      aria-hidden={"true"}
    >
      {"\n        "}
      <div className={"bg-brand-watermark"}>
        {"\n            "}
        <span className={"bg-brand-watermark-cn"} id={"brandWatermarkCn"}>
          {"货币战争"}
        </span>
        <span className="bg-brand-watermark-cn s2-brand-subtitle">
          入画奇航
        </span>
        {"\n            "}
        <span className={"bg-brand-watermark-en"} id={"brandWatermarkEn"}>
          {"CURRENCY WAR"}
        </span>
        {"\n        "}
      </div>
      {"\n        "}
      <div
        className={"bg-brand-serial bg-brand-serial-top"}
        id={"brandTopRightText"}
      >
        {"HONKAI: STAR RAIL V4.2"}
      </div>
      {"\n        "}
      <div
        className={"bg-brand-serial bg-brand-serial-bottom"}
        id={"brandBottomLeftText"}
      >
        {"CURRENCY WAR / IPC"}
      </div>
      {"\n    "}
    </div>
  );
}
