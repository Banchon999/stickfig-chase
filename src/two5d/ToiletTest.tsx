import React, { useCallback } from "react";
import { AbsoluteFill, Composition, getInputProps } from "remotion";
import { basePose } from "../draw";
import { Cam, H, W, drawCards } from "./engine";
import { personCard, Person } from "./props";
import { Stage, useFonts } from "./ui";
import { drawHallCeiling, drawHallFloor, drawStallWalls, hallCards, hallDefault } from "./toilet";

const IN = typeof window === "undefined" ? {} : (getInputProps() as { v?: number });
const CAMS: Cam[] = [
  { x: 0, y: 1.6, z: -2.6, pitch: 0.06, focal: 1150, cy: 900 },
  { x: 0, y: 1.4, z: 2.35, pitch: 0.24, focal: 1500, cy: 820 },
  { x: 0, y: 1.45, z: 0.6, pitch: 0.05, focal: 1150, cy: 900 },
  { x: -2.25, y: 1.3, z: -0.4, pitch: 0.05, focal: 1150, cy: 900 },
];
export const ToiletTest: React.FC = () => {
  const ready = useFonts();
  const draw = useCallback((ctx: CanvasRenderingContext2D, f: number) => {
    const v = IN.v ?? 0;
    const cam = CAMS[v];
    ctx.fillStyle = "#1E2422";
    ctx.fillRect(0, 0, W, H);
    drawHallCeiling(ctx, cam);
    drawHallFloor(ctx, cam, { puddle: 0.5, prints: 1, hazard: 1, frame: f });
    const s = { ...hallDefault(f), doors: [0, v === 2 ? 0.8 : 0, 0] as [number, number, number], lid: v === 1 ? 1 : 0, plaque: v === 1 ? 1 : 0, tape: v === 2 ? 1 : 0, company: 1, wanted: 1, hazard: 1, broken: v === 0, inside: v === 1 };
    const cards = hallCards(s);
    const P = (o: Partial<Person>): Person => ({ ...basePose, chibi: true, shirt: "#F2A73B", ...o });
    if (v === 0) cards.push(personCard(P({}), 0.4, 1.4, f));
    if (v === 3) cards.push(personCard(P({ armL: [-0.6, -1.4], armR: [-0.6, -1.4] }), -2.25, 1.85, f));
    drawCards(ctx, cam, cards, { color: [30, 36, 34], density: 0.02, start: 3 });
    if (v === 1) drawStallWalls(ctx, cam);
  }, []);
  return (
    <AbsoluteFill>
      <Stage ready={ready} draw={draw} />
    </AbsoluteFill>
  );
};
export const ToiletTestComposition: React.FC = () => <Composition id="ToiletTest" component={ToiletTest} durationInFrames={30} fps={30} width={W} height={H} />;
