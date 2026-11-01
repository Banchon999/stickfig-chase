import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { basePose, drawFigure, drawRoom, Pose } from "./draw";
import {
  INK,
  drawBin,
  drawBox,
  drawCar,
  drawCloud,
  drawCow,
  drawEarth,
  drawHills,
  drawHouse,
  drawLampPost,
  drawLeaf,
  drawPlane,
  drawSky,
  drawSpace,
  drawStreet,
  drawSun,
  drawTree,
  rnd,
  speedLines,
} from "./world";

const FPS = 30;
const W = 1080;
const H = 1920;
const DURATION = 396;

// Scene cuts aligned to the voiceover phrases (frames @30fps)
// P1 0.34-1.0s "คุณเคยสงสัยไหมว่า" | P2 1.37-3.30 "ถ้าวันหนึ่งโลกหยุดหมุนกะทันหัน" | P3 3.49-4.29 "จะเกิดอะไรขึ้น"
// P4 4.86-7.02 "ทุกสิ่งบนพื้นผิวโลกจะพุ่งไปข้างหน้า" | P5 7.27-8.55 "ด้วยความเร็วมหาศาล"
// P6 9.03-12.41 "ส่วนมนุษย์อย่างเราก็เตรียมตัวบินแบบไม่ต้องซื้อตั๋วได้เลย"
const S = { s1: 0, s2: 41, stop: 68, ask: 104, s3: 146, wind: 150, fast: 218, s4: 271, fly: 303, ticket: 325, stamp: 340, exit: 370 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

const useKanit = () => {
  const [handle] = useState(() => delayRender("kanit"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const thai = "U+0E01-0E5B, U+200C-200D, U+25CC";
    const faces = [
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-thai-800-normal.woff2")})`, { weight: "800", unicodeRange: thai }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-thai-500-normal.woff2")})`, { weight: "500", unicodeRange: thai }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-latin-500-normal.woff2")})`, { weight: "500" }),
    ];
    Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
  return ready;
};

const pose = (o: Partial<Pose>): Pose => ({ ...basePose, armL: [...basePose.armL], armR: [...basePose.armR], ...o });

// place a figure so that a point `L` px above the feet (in body space) sits at (px,py)
function placeAt(p: Pose, L: number, px: number, py: number, theta: number): Pose {
  return { ...p, fall: theta, x: px - L * p.scale * Math.sin(theta), y: py + L * p.scale * Math.cos(theta) };
}

// ---------------- scene 1: room, thinking ----------------
function scene1(ctx: CanvasRenderingContext2D, f: number, fps: number) {
  drawRoom(ctx, 1330, 0, f);
  const pop = spring({ frame: f - 2, fps, config: { damping: 9, stiffness: 170 } });
  const think = interpolate(f, [6, 14], [0, 1], clamp);
  const p = pose({
    squash: interpolate(pop, [0, 1], [0.6, 1]),
    scale: basePose.scale * Math.min(pop, 1.08),
    armR: [0.25 + think * 2.0, 0.1 + think * 1.6],
    headTilt: think * 0.12,
    pupilX: think * 5,
    sway: Math.sin(f * 0.08) * 0.015,
  });
  drawFigure(ctx, p, f);
  // thought bubble with "?"
  const b = spring({ frame: f - 10, fps, config: { damping: 8, stiffness: 160 } });
  if (b > 0.01) {
    ctx.save();
    ctx.translate(800, 780);
    ctx.scale(b, b);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    for (const [x, y, r] of [[-150, 150, 14], [-110, 110, 22]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 95, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3B82F6";
    ctx.font = "800 130px Kanit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.rotate(Math.sin(f * 0.25) * 0.1);
    ctx.fillText("?", 0, 8);
    ctx.restore();
    ctx.restore();
  }
}

// ---------------- scene 2: Earth stops ----------------
function earthOffset(f: number) {
  const v = 14;
  const t = f - S.s2;
  const tStop = S.stop - S.s2;
  if (t < tStop) return v * t;
  const k = interpolate(f, [S.stop, S.stop + 8], [0, 1], clamp);
  const settle = f > S.stop + 8 ? -8 * Math.sin(interpolate(f, [S.stop + 8, S.stop + 20], [0, Math.PI], clamp)) : 0;
  return v * tStop + v * 8 * (k - (k * k) / 2) + settle;
}

function scene2(ctx: CanvasRenderingContext2D, f: number, fps: number) {
  drawSpace(ctx, f);
  const cx = 540;
  const cy = 1100;
  const R = 300;
  const enter = spring({ frame: f - S.s2, fps, config: { damping: 12, stiffness: 120 } });
  const shock = spring({ frame: f - S.stop - 2, fps, config: { damping: 10 } });
  const jig = f > S.stop ? 0.07 * Math.exp(-(f - S.stop) * 0.22) * Math.sin((f - S.stop) * 0.9) : 0;
  const spin = interpolate(f, [S.stop - 2, S.stop + 6], [1, 0], clamp);
  const Rr = R * interpolate(enter, [0, 1], [0.4, 1]);

  // tiny people standing on top of the Earth, flung off when it stops
  const people = [-0.55, -0.15, 0.3];
  const drawPeople = () => {
    people.forEach((a, i) => {
      const dt = f - S.stop - 1 - i;
      let px = cx + Math.sin(a) * Rr;
      let py = cy - Math.cos(a) * Rr;
      let th = a;
      if (dt > 0) {
        px += dt * (26 + i * 6);
        py += -dt * (16 - i * 3) + dt * dt * 0.25;
        th = a + dt * 0.35;
      }
      const p = pose({
        scale: 0.17 * enter,
        shirt: ["#F97316", "#22C55E", "#EC4899"][i],
        armL: dt > 0 ? [2.6 + Math.sin(f * 0.9 + i) * 0.4, 0.3] : [0.25, 0.1],
        armR: dt > 0 ? [2.6 + Math.cos(f * 0.9 + i) * 0.4, 0.3] : [0.25, 0.1],
        yawn: dt > 0 ? 0.8 : 0,
        x: px,
        y: py,
        fall: th,
      });
      drawFigure(ctx, p, f);
    });
  };
  drawEarth(ctx, cx, cy, Rr, earthOffset(f), spin * enter, shock, 1 + jig);
  drawPeople();

  // "skid" marks near the rim when braking
  const skid = interpolate(f, [S.stop, S.stop + 3, S.stop + 14], [0, 1, 0], clamp);
  if (skid > 0) {
    ctx.save();
    ctx.globalAlpha = skid;
    ctx.strokeStyle = "#FFE066";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36;
      const r0 = R + 30;
      const r1 = R + 70 + (i % 2) * 25;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------- scene 3: street, wind ----------------
type Debris = { kind: "car" | "bin" | "box" | "cow"; at: number; y: number; vx: number; lift: number; spin: number; s: number; color?: string };
const DEBRIS: Debris[] = [
  { kind: "bin", at: 158, y: 1560, vx: 34, lift: 6, spin: 0.25, s: 1 },
  { kind: "car", at: 166, y: 1700, vx: 30, lift: 9, spin: 0.08, s: 1.15, color: "#EF4444" },
  { kind: "box", at: 176, y: 1250, vx: 38, lift: 3, spin: 0.3, s: 0.9 },
  { kind: "cow", at: 188, y: 1350, vx: 28, lift: 5, spin: 0.12, s: 1 },
  { kind: "car", at: 205, y: 1760, vx: 36, lift: 10, spin: -0.1, s: 1.1, color: "#3B82F6" },
  { kind: "box", at: 225, y: 1450, vx: 40, lift: 4, spin: -0.35, s: 0.7 },
  { kind: "bin", at: 240, y: 1180, vx: 42, lift: 2, spin: 0.3, s: 0.8 },
];

function scene3(ctx: CanvasRenderingContext2D, f: number) {
  const wind = interpolate(f, [S.wind, S.wind + 8], [0, 1], { ...clamp, easing: easeOut });
  const t = Math.max(0, f - S.wind);
  const ground = 1500;
  drawSky(ctx, "#79C8FF", "#D7F0FF", ground);
  drawSun(ctx, 880, 760, f);
  // clouds race to the right once the wind starts
  for (let i = 0; i < 5; i++) {
    const base = 80 + i * 230;
    const x = (((base + t * (28 + i * 6)) % 1500) + 1500) % 1500 - 200;
    drawCloud(ctx, x, 700 + (i % 3) * 110, 0.8 + (i % 2) * 0.3, 1 + wind * 0.5);
  }
  drawHills(ctx, 1330, "#9BD48A", 40, 0.5);
  drawHills(ctx, 1400, "#7CC46F", 30, 2.1);
  // houses (back row), roof of the middle one rips off
  drawHouse(ctx, 40, ground - 40, 200, 170, "#FDE8C8", "#E86A5A");
  const roofT = Math.max(0, f - 176);
  drawHouse(ctx, 330, ground - 40, 230, 200, "#DCEBFF", "#6B7FD7", roofT * 42, roofT * 0.14);
  drawHouse(ctx, 640, ground - 40, 190, 160, "#FFE1EC", "#F59E0B");
  // trees bend with the wind
  const wob = Math.sin(f * 0.8) * 0.08 * wind;
  drawTree(ctx, 290, ground - 40, 0.75, wind * 0.55 + wob);
  drawTree(ctx, 900, ground - 40, 0.95, wind * 0.6 + wob);
  drawStreet(ctx, ground, t * 30);

  // debris flying left→right
  for (const d of DEBRIS) {
    const dt = f - d.at;
    if (dt < 0) continue;
    const x = -200 + d.vx * dt;
    if (x > 1300) continue;
    const y = d.y - d.lift * dt + 0.12 * dt * dt;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(d.spin * dt);
    ctx.scale(d.s, d.s);
    if (d.kind === "car") drawCar(ctx, d.color ?? "#EF4444");
    else if (d.kind === "bin") drawBin(ctx);
    else if (d.kind === "box") drawBox(ctx);
    else drawCow(ctx);
    ctx.restore();
  }

  // lamppost + clinging figure
  const postX = 200;
  drawLampPost(ctx, postX, ground + 10, 900);
  const swing = interpolate(f, [S.wind, S.wind + 10], [0, 1], { ...clamp, easing: easeOut });
  const flap = Math.sin(f * 0.9) * 0.07 * swing;
  const theta = -1.45 * swing + flap;
  const p = placeAt(
    pose({
      scale: 0.75,
      armL: [2.95, 0],
      armR: [2.95, 0],
      eyeOpen: 1,
      yawn: swing * 0.7,
      pupilX: -4 * swing,
      legSpread: 1 + Math.sin(f * 1.1) * 2.5 * swing,
      shirt: "#3B82F6",
    }),
    666,
    postX,
    1010,
    theta,
  );
  drawFigure(ctx, p, f);
  // grip hands
  ctx.fillStyle = INK;
  for (const dy of [-44, 44]) {
    ctx.beginPath();
    ctx.arc(postX, 1010 + dy * (swing > 0.5 ? 1 : 0) + (swing > 0.5 ? 0 : 0), 12, 0, Math.PI * 2);
    ctx.fill();
  }
  speedLines(ctx, f, wind, 1, 24);
  // leaves in front
  for (let i = 0; i < 14; i++) {
    const dt = f - S.wind - i * 4;
    if (dt < 0) continue;
    const x = ((-100 + dt * (45 + rnd(i) * 20)) % 1400) - 100;
    const y = 900 + rnd(i + 3) * 800 + Math.sin(dt * 0.3 + i) * 40;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dt * 0.4 + i);
    drawLeaf(ctx);
    ctx.restore();
  }
}

// ---------------- scene 4: flying ----------------
function scene4(ctx: CanvasRenderingContext2D, f: number, fps: number) {
  const t = f - S.s4;
  drawSky(ctx, "#5DB8F5", "#CDEEFF");
  // far clouds slow, near clouds fast (we are moving right → world moves left)
  for (let i = 0; i < 4; i++) {
    const x = 1300 - (((t * (10 + i * 2) + i * 380) % 1600));
    drawCloud(ctx, x, 620 + i * 140, 0.6, 1);
  }
  // far ground with tiny houses
  drawHills(ctx, 1760, "#9BD48A", 30, t * 0.03);
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const x = 1200 - (((t * 14 + i * 170) % 1400));
    drawHouse(ctx, x, 1800, 60, 45, ["#FDE8C8", "#DCEBFF", "#FFE1EC"][i % 3], ["#E86A5A", "#6B7FD7", "#F59E0B"][i % 3]);
  }
  ctx.restore();
  ctx.fillStyle = "#7CC46F";
  ctx.fillRect(0, 1800, W, 120);
  // plane being overtaken
  drawPlane(ctx, 1250 - t * 9, 1380, 0.9);
  // near clouds
  for (let i = 0; i < 3; i++) {
    const x = 1400 - (((t * (40 + i * 10) + i * 600) % 1900));
    drawCloud(ctx, x, 980 + i * 260, 1.3, 1.6);
  }
  speedLines(ctx, f, 1, -1, 26);

  // flying figure
  const enter = spring({ frame: t, fps, config: { damping: 14, stiffness: 120 } });
  const exit = interpolate(f, [S.exit, DURATION], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const cx = interpolate(enter, [0, 1], [-250, 520]) + exit * 900;
  const cy = 1150 + Math.sin(t * 0.18) * 30 - exit * 200;
  const p = placeAt(
    pose({
      scale: 0.72,
      armL: [2.1 + Math.sin(f * 0.85) * 0.75, 0.4 + Math.sin(f * 0.85 + 1) * 0.5],
      armR: [2.1 + Math.cos(f * 0.85) * 0.75, 0.4 + Math.cos(f * 0.85 + 1) * 0.5],
      legSpread: 1 + Math.sin(f * 0.7) * 3,
      yawn: 0.75,
      eyeOpen: 1,
      shirt: "#3B82F6",
    }),
    330,
    cx,
    cy,
    Math.PI / 2 - 0.35 + Math.sin(t * 0.2) * 0.06,
  );
  drawFigure(ctx, p, f);

  // ticket with stamp X
  const tk = spring({ frame: f - S.ticket, fps, config: { damping: 10, stiffness: 170 } });
  if (tk > 0.01) {
    ctx.save();
    ctx.translate(540, 760);
    ctx.rotate(-0.08);
    ctx.scale(tk, tk);
    ctx.fillStyle = "#FFF7E0";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-210, -95);
    ctx.lineTo(210, -95);
    ctx.lineTo(210, -25);
    ctx.arc(210, 0, 25, -Math.PI / 2, Math.PI / 2, true);
    ctx.lineTo(210, 95);
    ctx.lineTo(-210, 95);
    ctx.lineTo(-210, 25);
    ctx.arc(-210, 0, 25, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([12, 12]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(90, -85);
    ctx.lineTo(90, 85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK;
    ctx.font = "800 50px Kanit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ตั๋วเครื่องบิน", -60, -18);
    ctx.font = "500 40px Kanit";
    ctx.fillText("฿ 4,990", -60, 48);
    ctx.font = "800 70px Kanit";
    ctx.fillText("✈", 150, 4);
    // stamp X
    const st = spring({ frame: f - S.stamp, fps, config: { damping: 9, stiffness: 220 } });
    if (st > 0.01) {
      const sc = interpolate(st, [0, 1], [2.2, 1]);
      ctx.save();
      ctx.globalAlpha = Math.min(1, st * 1.4);
      ctx.scale(sc, sc);
      ctx.strokeStyle = "#E11D48";
      ctx.lineWidth = 30;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-150, -110);
      ctx.lineTo(150, 110);
      ctx.moveTo(150, -110);
      ctx.lineTo(-150, 110);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
}

const Stage: React.FC<{ ready: boolean }> = ({ ready }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (frame < S.s2) scene1(ctx, frame, fps);
    else if (frame < S.s3) scene2(ctx, frame, fps);
    else if (frame < S.s4) scene3(ctx, frame);
    else scene4(ctx, frame, fps);
  }, [frame, fps, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------------- captions ----------------
const pill: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "Kanit",
  fontWeight: 800,
  fontSize: 78,
  lineHeight: 1.3,
  color: INK,
  background: "#FFFDF8",
  border: `8px solid ${INK}`,
  boxShadow: `0 10px 0 ${INK}`,
  borderRadius: 36,
  padding: "8px 36px 18px",
  maxWidth: 940,
};
const Hl: React.FC<{ children: React.ReactNode; c?: string }> = ({ children, c = "#FDE047" }) => (
  <span style={{ background: c, padding: "0 12px", borderRadius: 14 }}>{children}</span>
);

const Cap: React.FC<{ at: number; out: number; top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  out,
  top,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at || frame >= out) return null;
  const s = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 190 } });
  return (
    <div style={{ position: "absolute", top, width: "100%", textAlign: "center", transform: `scale(${s})` }}>
      <span style={{ ...pill, ...style }}>{children}</span>
    </div>
  );
};

const SpeedBadge: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < S.fast || frame >= S.s4) return null;
  const n = Math.round(interpolate(frame, [S.fast, S.fast + 18], [0, 1670], { ...clamp, easing: easeOut }));
  return (
    <>
      <Cap at={S.fast} out={S.s4} top={470} style={{ background: "#DC2626", color: "#fff", fontSize: 96 }}>
        {n.toLocaleString("en-US")} กม./ชม.
      </Cap>
      <Cap at={S.fast + 12} out={S.s4} top={650} style={{ fontSize: 48, fontWeight: 500, boxShadow: "none", border: `6px solid ${INK}` }}>
        เร็วกว่าเครื่องบินโดยสารเกือบ 2 เท่า
      </Cap>
    </>
  );
};

const Overlays: React.FC = () => (
  <AbsoluteFill>
    <Cap at={6} out={S.s2} top={260}>
      คุณเคย<Hl>สงสัย</Hl>ไหม?
    </Cap>
    <Cap at={S.s2 + 3} out={S.s3} top={240}>
      ถ้าโลก<Hl>หยุดหมุน</Hl>
      <br />
      กะทันหัน
    </Cap>
    <Cap at={S.ask} out={S.s3} top={540} style={{ background: "#3B82F6", color: "#fff" }}>
      จะเกิดอะไรขึ้น?
    </Cap>
    <Cap at={S.s3 + 3} out={S.s4} top={240}>
      ทุกสิ่ง<Hl>พุ่งไปข้างหน้า</Hl>
    </Cap>
    <SpeedBadge />
    <Cap at={S.s4 + 3} out={DURATION} top={240}>
      ส่วนมนุษย์อย่างเรา...
    </Cap>
    <Cap at={S.fly} out={DURATION} top={420} style={{ fontSize: 88 }}>
      <Hl c="#86EFAC">บินฟรี</Hl> ไม่ต้องซื้อตั๋ว!
    </Cap>
  </AbsoluteFill>
);

// ---------------- sound ----------------
const SFX: { at: number; file: string; vol: number }[] = [
  { at: 6, file: "pop", vol: 0.5 },
  { at: 10, file: "boing", vol: 0.3 },
  { at: S.s2, file: "whoosh", vol: 0.45 },
  { at: S.s2 + 3, file: "pop", vol: 0.45 },
  { at: S.stop - 3, file: "screech", vol: 0.55 },
  { at: S.stop + 1, file: "rumble", vol: 0.9 },
  { at: S.stop + 4, file: "boing", vol: 0.35 },
  { at: S.ask, file: "pop", vol: 0.45 },
  { at: S.s3, file: "whoosh", vol: 0.45 },
  { at: S.wind, file: "wind", vol: 0.55 },
  { at: 166, file: "whoosh", vol: 0.3 },
  { at: 176, file: "pop", vol: 0.3 },
  { at: 188, file: "boing", vol: 0.3 },
  { at: S.fast, file: "ding", vol: 0.45 },
  { at: S.s4, file: "whoosh", vol: 0.5 },
  { at: S.s4 + 3, file: "pop", vol: 0.4 },
  { at: S.fly, file: "pop", vol: 0.45 },
  { at: S.ticket, file: "pop", vol: 0.45 },
  { at: S.stamp, file: "stamp", vol: 0.75 },
  { at: S.exit, file: "whoosh", vol: 0.5 },
];

export const EarthStop: React.FC = () => {
  const ready = useKanit();
  return (
    <AbsoluteFill style={{ background: "#F4F1EA", overflow: "hidden" }}>
      <Stage ready={ready} />
      <Overlays />
      <Audio src={staticFile("vo/vo.mp3")} />
      {SFX.map((s, i) => (
        <Sequence key={i} from={s.at} layout="none">
          <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const EarthStopComposition = () => (
  <Composition id="EarthStop" component={EarthStop} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
