export function OutroOverlay() {
  return (
    <div
      id={"outroOverlay"}
      className={"scene-layer scene-layer--overlay"}
      aria-hidden={"true"}
    >
      {"\n        "}
      <video
        id={"outroVideo"}
        className={"outro-video"}
        playsInline={true}
        muted={true}
        preload={"metadata"}
      ></video>
      {"\n        "}
      <div className={"outro-fallback"}></div>
      {"\n        "}
      <div id={"outroThanks"} className={"outro-thanks"}>
        {"感谢观看"}
      </div>
      {"\n    "}
    </div>
  );
}
