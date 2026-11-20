import { useLayoutEffect, useMemo } from "react";
import { startRadar } from "./engine";
import { createS2Background } from "./themes/s2-background";
import { S2PreviewControls } from "./themes/S2PreviewControls";
import "./themes/s2-preview.css";

import { BackgroundMusic } from "./components/BackgroundMusic";
import { OutroOverlay } from "./components/OutroOverlay";
import { IntroOverlay } from "./components/IntroOverlay";
import { S2IntroOverlay } from "./themes/S2IntroOverlay";
import { S2GachaOverlay } from "./themes/S2GachaOverlay";
import { BrandDecor } from "./components/BrandDecor";
import { MvpBgContainer } from "./components/MvpBgContainer";
import { SpecialSceneOverlay } from "./components/SpecialSceneOverlay";
import { GachaOverlay } from "./components/GachaOverlay";
import { CoverBgLayer } from "./components/CoverBgLayer";
import { LivingFieldFallback } from "./components/LivingFieldFallback";
import { LivingFieldCanvas } from "./components/LivingFieldCanvas";
import { ParticlesCanvas } from "./components/ParticlesCanvas";
import { RadarBgCleaner } from "./components/RadarBgCleaner";
import { BrandTextLayer } from "./components/BrandTextLayer";
import { SessionTimer } from "./components/SessionTimer";
import { SpecialPreviewBadge } from "./components/SpecialPreviewBadge";
import { RadarStage } from "./components/RadarStage";
import { GlobalTimeline } from "./components/GlobalTimeline";
export default function RadarPage() {
  const s2Background = useMemo(
    () =>
      new URLSearchParams(location.search).get("theme") !== "original"
        ? createS2Background()
        : null,
    [],
  );
  useLayoutEffect(() => {
    document.title = "Rock Radar - 战力雷达图";
    if (s2Background) document.body.classList.add("s2-preview");
    const dispose = startRadar({ backgroundEffect: s2Background });
    return () => {
      dispose();
      document.body.classList.remove("s2-preview");
    };
  }, [s2Background]);
  return (
    <>
      <BackgroundMusic />
      <OutroOverlay />
      {s2Background ? <S2IntroOverlay /> : <IntroOverlay />}
      <BrandDecor />
      <MvpBgContainer />
      <SpecialSceneOverlay />
      {s2Background ? <S2GachaOverlay /> : <GachaOverlay />}
      <CoverBgLayer />
      <LivingFieldFallback />
      <LivingFieldCanvas />
      <ParticlesCanvas />
      <RadarBgCleaner />
      <BrandTextLayer />
      <SessionTimer />
      <SpecialPreviewBadge />
      <RadarStage />
      <GlobalTimeline />
      {s2Background && <S2PreviewControls background={s2Background} />}
    </>
  );
}
