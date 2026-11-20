import "./s2-gacha.css";

export function S2GachaOverlay() {
  return (
    <div id="gachaOverlay" className="scene-layer scene-layer--overlay gacha-wipe">
      <div className="gacha-wipe-exit-clip">
        <div className="gacha-wipe-layers">
          <div className="gacha-wipe-band gacha-wipe-band-first" />
          <div className="gacha-wipe-band gacha-wipe-band-second" />
          <div className="gacha-wipe-band gacha-wipe-band-third" />
          <div className="gacha-wipe-window">
            <div className="gacha-wipe-card">
              <div className="gacha-wipe-art">
                <img id="gachaBgImg" alt="" />
              </div>
              <div className="gacha-wipe-title">
                <span id="gachaMvp" hidden>MVP</span>
                <span id="gachaName" className="gacha-wipe-name" />
              </div>
            </div>
          </div>
          <div className="gacha-wipe-hatches" />
          <div className="gacha-wipe-band gacha-wipe-return-band" />
        </div>
      </div>
    </div>
  );
}
