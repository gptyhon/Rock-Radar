export function GachaOverlay() {
  return (
    <div id={"gachaOverlay"} className={"scene-layer scene-layer--overlay"}>
      {"\n        "}
      <div className={"gacha-flash"} id={"gachaFlash"}></div>
      {"\n        "}
      <div className={"gacha-diagonal-line"} id={"gachaDiagonalLine"}></div>
      {"\n        "}
      <div className={"gacha-line-lock"} id={"gachaLineLock"}></div>
      {"\n        "}
      <div
        className={"gacha-filmstrip gacha-filmstrip-a"}
        id={"gachaFilmstripA"}
      >
        {"\n            "}
        <div className={"filmstrip-core"}></div>
        {"\n            "}
        <div className={"filmstrip-glare"}></div>
        {"\n        "}
      </div>
      {"\n        "}
      <div
        className={"gacha-filmstrip gacha-filmstrip-b"}
        id={"gachaFilmstripB"}
      >
        {"\n            "}
        <div className={"filmstrip-core"}></div>
        {"\n            "}
        <div className={"filmstrip-glare"}></div>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"gacha-rings"} id={"gachaRings"}></div>
      {"\n        "}
      <div className={"gacha-impact-burst"} id={"gachaImpactBurst"}></div>
      {"\n        "}
      <div className={"gacha-logo-halo"} id={"gachaLogoHalo"}></div>
      {"\n        "}
      <div className={"gacha-logo-cross"} id={"gachaLogoCross"}></div>
      {"\n        "}
      <div className={"gacha-logo-wings"} id={"gachaLogoWings"}></div>
      {"\n        "}
      <div className={"gacha-rays"} id={"gachaRays"}>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"gacha-shards"} id={"gachaShards"}>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"gacha-logo-sparks"} id={"gachaLogoSparks"}>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n            "}
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"gacha-noise"} id={"gachaNoise"}></div>
      {"\n        "}
      <div className={"gacha-scanlines"} id={"gachaScanlines"}></div>
      {"\n        "}
      <div className={"gacha-bg"}>
        {"\n            "}
        <img id={"gachaBgImg"} alt={""} />
        {"\n            "}
        <div className={"gacha-bg-glow"} id={"gachaBgGlow"}></div>
        {"\n            "}
        <div className={"gacha-bg-streaks"} id={"gachaBgStreaks"}></div>
        {"\n            "}
        <div className={"gacha-bg-slices"} id={"gachaBgSlices"}></div>
        {"\n            "}
        <div className={"gacha-bg-orbs"} id={"gachaBgOrbs"}>
          {"\n                "}
          <span></span>
          <span></span>
          <span></span>
          {"\n                "}
          <span></span>
          <span></span>
          <span></span>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n        "}
      <div className={"gacha-vignette"} id={"gachaVignette"}></div>
      {"\n        "}
      <div className={"gacha-panel gacha-panel-top"} id={"gachaPanelTop"}></div>
      {"\n        "}
      <div
        className={"gacha-panel gacha-panel-bottom"}
        id={"gachaPanelBottom"}
      ></div>
      {"\n        "}
      <img
        className={"gacha-logo"}
        id={"gachaLogo"}
        src={"/assets/images/hsr_logo.webp"}
        alt={""}
      />
      {"\n        "}
      <div className={"gacha-name"} id={"gachaName"}></div>
      {"\n    "}
    </div>
  );
}
