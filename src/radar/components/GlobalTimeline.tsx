export function GlobalTimeline() {
  return (
    <div
      className={"global-timeline-container scene-layer scene-layer--hud"}
      id={"globalTimeline"}
    >
      {"\n        "}
      <div className={"global-timeline-bar"} id={"globalBar"}></div>
      {"\n        "}
      <div className={"timeline-tooltip"} id={"timelineTooltip"}>
        {"00:00"}
      </div>
      {"\n    "}
    </div>
  );
}
