import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Html5Video,
  OffthreadVideo,
  getInputProps,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { basePose, drawFigure, Pose } from "./draw";
import {
  FEET,
  LAMP_STEP,
  LAMP_X0,
  SLOT,
  drawCreature,
  drawFarLamp,
  drawForeground,
  drawGround,
  drawMidRow,
  drawMoon,
  drawPolesAndWires,
  drawProp,
  drawShophouse,
  drawSkyScreen,
  drawSkyline,
  drawStreetLamp,
} from "./chaseWorld";

export const CH = { W: 1080, H: 1920, FPS: 30, DUR: 504 };
const { W, H, DUR } = CH;
const AERIAL_AT = 385; // hidden stitch inside the fog
const TITLE_AT = 476;
// silent mode: no audio, aerial via the browser's own decoder (for machines whose bundled ffmpeg won't run)
const SILENT = Boolean((getInputProps() as { silent?: boolean }).silent);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sm = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
const e = (f: number, a: number, b: number) => sm((f - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------- kinematics (pre-computed once, deterministic) ----------------
const N = DUR + 1;
const protX: number[] = new Array(N);
const phase: number[] = new Array(N);
const runAmt: number[] = new Array(N);
export const STEP_FRAMES: number[] = [];
{
  let x = 60;
  let ph = 0;
  let prevS = 0;
  for (let f = 0; f < N; f++) {
    const r = e(f, 116, 150);
    let v: number;
    if (f < 106) v = 1.6;
    else if (f < 118) v = lerp(1.6, 0.2, e(f, 106, 112));
    else v = lerp(0.2, 21, Math.pow(Math.min(1, (f - 118) / 32), 1.6));
    x += v;
    const period = lerp(38, 18, r);
    if (!(f >= 108 && f < 118)) ph += (Math.PI * 2) / period;
    protX[f] = x;
    phase[f] = ph;
    runAmt[f] = r;
    const s = Math.sin(ph);
    if (f > 118 && f < 372 && Math.sign(s) !== Math.sign(prevS)) STEP_FRAMES.push(f);
    prevS = s;
  }
}
// distance between the protagonist and the creature
function gapAt(f: number) {
  if (f < 219) return interpolate(f, [114, 219], [1400, 1000], clamp);
  return interpolate(f, [219, 260, 345, 390], [1000, 600, 230, 140], clamp);
}
const creatureX = (f: number) => protX[Math.min(f, N - 1)] - gapAt(f);
const CREATURE_H = 1500;

// lamps: die (with a flicker) when the creature reaches them
const LAMP_COUNT = 14;
export const LAMP_OFF: number[] = [];
for (let k = 0; k < LAMP_COUNT; k++) {
  const lx = LAMP_X0 + k * LAMP_STEP;
  let off = Infinity;
  for (let f = 114; f < N; f++)
    if (creatureX(f) + 120 >= lx) {
      off = f;
      break;
    }
  LAMP_OFF.push(off);
}
function lampOn(k: number, f: number) {
  const off = LAMP_OFF[k];
  if (f < off) return 1;
  const d = f - off;
  if (d < 10) return [0.2, 1, 0, 0.8, 0, 0, 0.6, 0, 0, 0][d];
  return 0;
}
// mid-layer far lamp + the silhouette under it (seen in move B)
const FAR_LAMP_X = -200;

// ---------------- the virtual camera ----------------
type Cam = { x: number; y: number; z: number };
function camAt(f: number): Cam {
  const px = protX[Math.min(f, N - 1)];
  const g = gapAt(f);
  const A: Cam = { x: lerp(LAMP_X0 + 60, px - 150, e(f, 0, 45)), y: lerp(580, 1120, e(f, 0, 45)), z: 1.7 };
  const B: Cam = { x: px - 150, y: lerp(1120, 1000, e(f, 45, 110)), z: lerp(1.7, 2.2, e(f, 45, 110)) };
  const C: Cam = { x: px + 140, y: 1010, z: 1.0 };
  const D: Cam = { x: px - g / 2, y: 900, z: 0.78 };
  const E: Cam = { x: px - g * 0.42, y: 1000, z: 0.95 };
  const mix = (a: Cam, b: Cam, t: number): Cam => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });
  let c: Cam;
  if (f < 45) c = A;
  else if (f < 112) c = B;
  else if (f < 219) c = mix(B, C, e(f, 112, 160));
  else if (f < 300) c = mix(C, D, e(f, 219, 262));
  else c = mix(D, E, e(f, 300, 340));
  if (f >= 345) {
    const t = e(f, 345, 388);
    c = { x: c.x - (f - 345) * 6, y: lerp(c.y, -1250, t), z: lerp(c.z, 0.8, t) };
  }
  return c;
}

// layer transform with parallax factor p (1 = main plane)
const REF_Y = 1100;
function layer(ctx: CanvasRenderingContext2D, cam: Cam, p: number) {
  const zl = 1 + (cam.z - 1) * p;
  const cy = cam.y * p + REF_Y * (1 - p);
  ctx.setTransform(zl, 0, 0, zl, W / 2 - cam.x * p * zl, H / 2 - cy * zl);
  // visible world range on this layer
  const half = W / 2 / zl;
  return { x0: cam.x * p - half, x1: cam.x * p + half };
}

// ---------------- protagonist pose ----------------
function heroPose(f: number): Pose {
  const r = runAmt[f];
  const ph = phase[f];
  const s = Math.sin(ph);
  const A = lerp(0.28, 0.78, r);
  const K = lerp(0.25, 1.35, r);
  const freeze = e(f, 106, 112) * (1 - e(f, 114, 120));
  const lookBack = e(f, 222, 236) * (1 - e(f, 300, 318));
  const scream = e(f, 228, 236) * (1 - e(f, 330, 345));
  const bob = -Math.abs(Math.sin(ph)) * 16 * r;
  const p: Pose = {
    ...basePose,
    x: protX[f],
    y: FEET + bob + freeze * 8,
    scale: 1.0,
    shirt: "#F2C14E",
    rim: "rgba(255,196,120,0.9)",
    sway: lerp(0.03, 0.26, r) + freeze * 0.12 - lookBack * 0.06,
    legL: [A * s * (1 - freeze), -K * Math.max(0, -Math.cos(ph)) - freeze * 0.4],
    legR: [-A * s * (1 - freeze), -K * Math.max(0, Math.cos(ph)) - freeze * 0.4],
    armFwd: true,
    armL: [-A * 0.9 * s * (1 - freeze), lerp(0.25, 1.5, r) + freeze * 0.8],
    armR: [A * 0.9 * s * (1 - freeze), lerp(0.25, 1.5, r) + freeze * 0.8],
    faceX: lerp(14, -24, lookBack),
    headTilt: -0.18 * lookBack + 0.05 * r,
    headDrop: freeze * 10,
    eyeOpen: 1,
    tired: 0.55 * (1 - r) * (1 - scream),
    yawn: Math.max(scream, r * (0.32 + 0.08 * Math.sin(f * 0.5))),
    pupilX: interpolate(f, [84, 90, 100, 106], [0, -7, -7, 0], clamp),
  };
  return p;
}

function heroLight(f: number) {
  const x = protX[f];
  let best = 0.25;
  for (let k = 0; k < LAMP_COUNT; k++) {
    const lx = LAMP_X0 + k * LAMP_STEP + 105;
    const d = Math.abs(x - lx);
    best = Math.max(best, lampOn(k, f) * (1 - d / 520));
  }
  return Math.min(1, best);
}

// ---------------- the frame ----------------
function drawFrame(ctx: CanvasRenderingContext2D, f: number) {
  const cam = camAt(f);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "none";
  drawSkyScreen(ctx, f, -cam.y);

  // moon (p 0.05)
  layer(ctx, cam, 0.05);
  drawMoon(ctx, 780 + cam.x * 0.05, 420);

  // skyline (p 0.2)
  ctx.filter = "blur(2px)";
  let v = layer(ctx, cam, 0.2);
  drawSkyline(ctx, v.x0, v.x1, f);

  // mid row + far lamp + silhouette (p 0.55), rack focus
  const focus = f < 112 ? interpolate(f, [0, 70, 88, 100, 112], [7, 7, 0, 0, 7], clamp) : 3;
  ctx.filter = focus > 0.2 ? `blur(${focus.toFixed(1)}px)` : "none";
  v = layer(ctx, cam, 0.55);
  drawMidRow(ctx, v.x0, v.x1);
  drawFarLamp(ctx, FAR_LAMP_X, f < 98 ? 1 : interpolate(f, [98, 99, 101, 102, 104], [1, 0, 0.7, 0, 0], clamp));
  const silA = interpolate(f, [30, 60, 98, 104], [0, 1, 1, 0], clamp);
  drawCreature(ctx, FAR_LAMP_X - 60, 1440, 720, f, 0.05, silA);
  // ground fog far
  ctx.filter = "none";
  const fogFar = ctx.createLinearGradient(0, 1250, 0, 1460);
  fogFar.addColorStop(0, "rgba(120,130,190,0)");
  fogFar.addColorStop(1, "rgba(120,130,190,0.16)");
  ctx.fillStyle = fogFar;
  ctx.fillRect(v.x0 - 200, 1250, v.x1 - v.x0 + 400, 210);

  // main plane
  v = layer(ctx, cam, 1);
  const i0 = Math.floor((v.x0 + 60) / SLOT) - 1;
  const i1 = Math.ceil((v.x1 + 60) / SLOT) + 1;
  for (let i = i0; i <= i1; i++) drawShophouse(ctx, i, f);
  drawGround(ctx, v.x0 - 200, v.x1 + 200);
  for (let i = i0; i <= i1; i++) drawProp(ctx, i);
  for (let k = 0; k < LAMP_COUNT; k++) {
    const lx = LAMP_X0 + k * LAMP_STEP;
    if (lx < v.x0 - 500 || lx > v.x1 + 300) continue;
    drawStreetLamp(ctx, lx, lampOn(k, f));
  }
  drawPolesAndWires(ctx, v.x0, v.x1);

  // creature (main plane) — enters after the reveal begins
  if (f >= 200) {
    const reach = e(f, 262, 330);
    drawCreature(ctx, creatureX(f), FEET + 20, CREATURE_H, f, reach, 1);
  }

  // protagonist, lit by the nearest live lamp
  const light = heroLight(f);
  ctx.filter = `brightness(${(0.5 + 0.55 * light).toFixed(2)})`;
  drawFigure(ctx, heroPose(f), f);
  ctx.filter = "none";

  // low ground fog in front
  const t = f * 1.4;
  for (let k = 0; k < 7; k++) {
    const fx = v.x0 + ((k * 420 + t * (0.6 + k * 0.1)) % (v.x1 - v.x0 + 800)) - 400;
    const fg = ctx.createRadialGradient(fx, FEET + 10, 10, fx, FEET + 10, 420);
    fg.addColorStop(0, "rgba(150,160,215,0.10)");
    fg.addColorStop(1, "rgba(150,160,215,0)");
    ctx.fillStyle = fg;
    ctx.fillRect(fx - 420, FEET - 200, 840, 420);
  }

  // high fog / cloud bank the crane rises into
  if (f > 330) {
    for (let k = 0; k < 9; k++) {
      const cx = v.x0 + ((k * 260 + f * 3) % (v.x1 - v.x0 + 600)) - 300;
      const cy = -300 - k * 110;
      const cg = ctx.createRadialGradient(cx, cy, 20, cx, cy, 520);
      cg.addColorStop(0, "rgba(27,32,51,0.85)");
      cg.addColorStop(1, "rgba(27,32,51,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(cx - 520, cy - 520, 1040, 1040);
    }
  }

  // foreground (p 1.45), out of focus
  ctx.filter = "blur(7px)";
  v = layer(ctx, cam, 1.45);
  drawForeground(ctx, v.x0, v.x1);
  ctx.filter = "none";

  // screen-space grading
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // darkness creeping from the left while he runs
  const creep = e(f, 140, 219) * (1 - e(f, 222, 250));
  if (creep > 0) {
    const g = ctx.createLinearGradient(0, 0, 520, 0);
    g.addColorStop(0, `rgba(3,3,8,${0.85 * creep})`);
    g.addColorStop(1, "rgba(3,3,8,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 520, H);
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1250);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // fog that closes the frame for the stitch
  const fogA = e(f, 352, 384);
  if (fogA > 0) {
    ctx.fillStyle = `rgba(27,32,51,${fogA})`;
    ctx.fillRect(0, 0, W, H);
  }
}

const Stage: React.FC<{ ready: boolean }> = ({ ready }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawFrame(ctx, Math.min(frame, AERIAL_AT));
  }, [frame, ready]);
  if (frame >= AERIAL_AT) return null;
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

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
    Promise.all(faces.map((x) => x.load().then((ff) => document.fonts.add(ff))))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);
  return ready;
};

// whisper caption (typewriter) and end title
const Whisper: React.FC = () => {
  const f = useCurrentFrame();
  if (f < 16 || f > 112) return null;
  const text = "อย่าหันกลับไป...";
  const chars = Array.from(text);
  const n = Math.round(interpolate(f, [18, 58], [0, chars.length], clamp));
  const a = interpolate(f, [16, 26, 98, 112], [0, 1, 1, 0], clamp) * (0.82 + 0.18 * Math.sin(f * 0.7));
  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        width: "100%",
        textAlign: "center",
        fontFamily: "Kanit",
        fontWeight: 500,
        fontSize: 66,
        letterSpacing: 6,
        color: `rgba(225,230,255,${a})`,
        textShadow: "0 0 24px rgba(160,170,255,0.55)",
        transform: `translateY(${-(f - 16) * 0.3}px)`,
      }}
    >
      {chars.slice(0, n).join("")}
    </div>
  );
};

const Title: React.FC = () => {
  const f = useCurrentFrame();
  const black = interpolate(f, [466, TITLE_AT], [0, 1], clamp);
  if (black <= 0) return null;
  const tA = interpolate(f, [TITLE_AT + 2, TITLE_AT + 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${black})`, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity: tA,
          fontFamily: "Kanit",
          fontWeight: 800,
          fontSize: 120,
          color: "#FF2D2D",
          textShadow: "0 0 40px rgba(255,45,45,0.6)",
          letterSpacing: 4,
          transform: `scale(${1 + (f - TITLE_AT) * 0.0015})`,
        }}
      >
        อย่าหันกลับไป
      </div>
    </AbsoluteFill>
  );
};

// ---------------- sound ----------------
type Cue = { at: number; file: string; vol: number };
function buildCues(): Cue[] {
  const c: Cue[] = [];
  c.push({ at: 0, file: "drone", vol: 0.55 });
  c.push({ at: 0, file: "buzz", vol: 0.35 });
  // heartbeat accelerating 20→114
  let hb = 20;
  while (hb < 112) {
    c.push({ at: Math.round(hb), file: "heart", vol: interpolate(hb, [20, 110], [0.45, 0.8], clamp) });
    hb += interpolate(hb, [20, 110], [28, 15], clamp);
  }
  for (const s of STEP_FRAMES) c.push({ at: s, file: "step", vol: s < 345 ? 0.4 : interpolate(s, [345, 372], [0.4, 0.05], clamp) });
  LAMP_OFF.forEach((off, k) => {
    if (off < AERIAL_AT) c.push({ at: off, file: "clunk", vol: off >= 219 ? 0.55 : 0.22 });
    void k;
  });
  c.push({ at: 238, file: "stinger", vol: 0.75 });
  c.push({ at: 343, file: "rise", vol: 0.6 });
  // aerial: lamps going out in a wave, then the city
  for (let k = 0; k < 6; k++) c.push({ at: AERIAL_AT + 22 + k * 6, file: "clunk", vol: 0.25 });
  c.push({ at: AERIAL_AT + 54, file: "clunk", vol: 0.6 });
  c.push({ at: AERIAL_AT + 60, file: "boom", vol: 0.95 });
  return c;
}
export const CUES = buildCues();

export const Chase: React.FC = () => {
  const ready = useKanit();
  return (
    <AbsoluteFill style={{ background: "#1B2033" }}>
      <Sequence from={AERIAL_AT} durationInFrames={DUR - AERIAL_AT}>
        {SILENT ? (
          <Html5Video src={staticFile("mgx/aerial.webm")} muted />
        ) : (
          <OffthreadVideo src={staticFile("mgx/aerial.mp4")} muted />
        )}
      </Sequence>
      <Stage ready={ready} />
      <Whisper />
      <Title />
      {!SILENT && <Audio src={staticFile("vo/vo2.mp3")} />}
      {!SILENT &&
        CUES.map((s, i) => (
          <Sequence key={i} from={s.at} layout="none">
            <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const ChaseComposition = () => (
  <Composition id="Chase" component={Chase} durationInFrames={DUR} fps={CH.FPS} width={W} height={H} />
);
