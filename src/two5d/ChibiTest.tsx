import React, { useCallback } from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { basePose } from "../draw";
import { Cam, Card, H, W, drawCards, drawGround, paper } from "./engine";
import { personCard, Person } from "./props";
import { beret, buzzCut, sweat } from "./barracks";
import { helmet } from "./elevator";
import { Stage, useFonts } from "./ui";

const IN = typeof window === "undefined" ? {} : (getInputProps() as { close?: boolean });
const HERO = "#F2A73B";

function wall(): Card {
  return {
    x: 0, z: 4.5, w: 9, h: 3.2, noHaze: true,
    draw: (c) => {
      paper(c, (p) => p.rect(-450, -320, 900, 320), "#E8E1D3", "rgba(0,0,0,0.1)", 0);
      c.fillStyle = "rgba(0,0,0,0.04)";
      for (let x = -440; x < 450; x += 60) c.fillRect(x, -320, 28, 320);
      paper(c, (p) => p.rect(-450, -24, 900, 24), "#FFFDF8");
      paper(c, (p) => p.rect(140, -210, 95, 210), "#7A5A44"); // 2.1 m door for scale
    },
  };
}

export const ChibiTest: React.FC = () => {
  const ready = useFonts();
  const draw = useCallback((ctx: CanvasRenderingContext2D, f: number) => {
    const cam: Cam = IN.close ? { x: 0, y: 1.35, z: -1.6, pitch: 0.02, focal: 1250 } : { x: 0, y: 1.1, z: -4.2, pitch: -0.02, focal: 1500, cy: 1100 };
    ctx.fillStyle = "#2A2723";
    ctx.fillRect(0, 0, W, H);
    drawGround(ctx, cam, { near: "#B9A68A", far: "#D8CBB4", x0: -4.5, x1: 4.5, z0: -2, z1: 4.5, lineEvery: 0.6, lineColor: "rgba(70,50,30,0.12)" });
    const P = (o: Partial<Person>): Person => ({ ...basePose, chibi: true, shirt: HERO, ...o });
    const walk = Math.sin(f * 0.25);
    const cards: Card[] = [
      wall(),
      personCard(P({}), IN.close ? 0 : -1.15, 0, f), // idle hero
      personCard(P({ armR: [-2.5, 0.2], armL: [0.2, 0.3], faceX: 10, pupilX: 4 }), 0, IN.close ? 3 : 0, f), // pointing up
      personCard(P({ eyeOpen: 1.5, yawn: 0.5, armL: [2.4, 0.6], armR: [2.4, 0.6], head: sweat(1) }), 1.15, 0, f), // shocked
      personCard(P({ legL: [0.5 * walk, -0.3], legR: [-0.5 * walk, -0.3], armFwd: true, armL: [-0.6 * walk, -0.4], armR: [0.6 * walk, -0.4], faceX: 22, shirt: "#6B7F3A", head: helmet("#556B2F") }), -1.2, 2.2, f),
      personCard(P({ tired: 1, eyeOpen: 0.45, headDrop: 10, shirt: "#5B7DB1", sway: 0.05 }), 0, 2.2, f),
      personCard(P({ shirt: "#6B7F3A", armR: [0.3, 2.2], armL: [0.3, 2.2], head: (c) => { buzzCut()(c); beret()(c); } }), 1.2, 2.2, f),
    ];
    drawCards(ctx, cam, cards, { color: [216, 203, 180], density: 0.04, start: 3 });
  }, []);
  return (
    <AbsoluteFill>
      <Stage ready={ready} draw={draw} />
    </AbsoluteFill>
  );
};

import { Composition } from "remotion";
export const ChibiTestComposition: React.FC = () => <Composition id="ChibiTest" component={ChibiTest} durationInFrames={60} fps={30} width={W} height={H} />;
