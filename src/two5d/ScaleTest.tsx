import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Composition, useCurrentFrame } from "remotion";
import { basePose, drawFigure } from "../draw";
import { Card, Cam, H, W, drawCards, drawGround, paper } from "./engine";

const FIG = 170 / 665; // stick figure is 665 units tall at scale 1 → 170 cm

function person(x: number, z: number, shirt: string): Card {
  return {
    x, z, w: 0.6, h: 1.8, shadow: 1,
    draw: (c) => drawFigure(c, { ...basePose, x: 0, y: 0, scale: FIG, shirt }, 0),
  };
}
function shophouse(x: number, z: number, col: string): Card {
  return {
    x, z, w: 4.2, h: 7, shadow: 0.4,
    draw: (c) => {
      paper(c, (p) => p.rect(-210, -650, 420, 650), col);
      paper(c, (p) => p.rect(-60, -210, 120, 210), "#5b4636"); // 2.1 m door
      for (const wx of [-160, 60]) paper(c, (p) => p.rect(wx, -560, 100, 140), "#ffd27a");
      paper(c, (p) => p.rect(-200, -330, 400, 50), "#2f6f73");
    },
  };
}
function lamp(x: number, z: number): Card {
  return {
    x, z, w: 1.2, h: 6.2, shadow: 0.5,
    draw: (c) => {
      paper(c, (p) => p.rect(-8, -600, 16, 600), "#2b2f45");
      paper(c, (p) => p.rect(-8, -610, 90, 14), "#2b2f45");
      paper(c, (p) => p.ellipse(70, -594, 26, 8, 0, 0, Math.PI * 2), "#ffe3a3");
    },
  };
}

export const ScaleTest: React.FC = () => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext("2d")!;
    const cam: Cam = { x: 0.6 + f * 0.01, y: 1.5, z: -4, pitch: 0.04, focal: 1250 };
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#8ec5ff");
    sky.addColorStop(1, "#e8f2ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawGround(ctx, cam, { near: "#c9b79a", far: "#e3d8c4", x0: -30, x1: 30, z0: -4, z1: 80, lineEvery: 1.5, across: 1.5, lineColor: "rgba(80,60,40,0.12)" });
    const cards: Card[] = [];
    for (let i = 0; i < 12; i++) cards.push(shophouse(-6.3 + i * 4.3, 6, ["#e9d8b8", "#d9c3a0", "#efe0c6"][i % 3]));
    for (let i = 0; i < 8; i++) cards.push(lamp(-2 + i * 8, 2.5));
    cards.push(person(0, 0, "#3B82F6"));
    cards.push(person(-1.2, 3, "#F97316"));
    cards.push(person(2.5, 12, "#22C55E"));
    drawCards(ctx, cam, cards, { color: [200, 220, 240], density: 0.05, start: 4 });
  }, [f]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} />
    </AbsoluteFill>
  );
};
export const ScaleTestComposition = () => <Composition id="ScaleTest" component={ScaleTest} durationInFrames={30} fps={30} width={W} height={H} />;
