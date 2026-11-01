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
import {
  basePose,
  drawClock,
  drawFigure,
  drawRoom,
  drawHallucinations,
  drawShadow,
  drawZzz,
  Pose,
} from "./draw";

const FPS = 30;
const DURATION = 400;
const W = 1080;
const H = 1920;

// ---------- timeline (frames) ----------
const T = {
  hook: 0,
  h24: 78,
  h48: 168,
  h72: 262,
  fallStart: 312,
  fallLand: 330,
  end: 345,
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.33, 0, 0.2, 1);

// ---------- font loading ----------
const useKanit = () => {
  const [handle] = useState(() => delayRender("kanit"));
  useEffect(() => {
    const faces = [
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-thai-800-normal.woff2")})`, { weight: "800", unicodeRange: "U+0E01-0E5B, U+200C-200D, U+25CC" }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-thai-500-normal.woff2")})`, { weight: "500", unicodeRange: "U+0E01-0E5B, U+200C-200D, U+25CC" }),
      new FontFace("Kanit", `url(${staticFile("fonts/kanit-latin-500-normal.woff2")})`, { weight: "500" }),
    ];
    Promise.all(faces.map((f) => f.load().then((ff) => document.fonts.add(ff))))
      .then(() => continueRender(handle))
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
  }, [handle]);
};

// ---------- pose over time ----------
function poseAt(f: number, fps: number): Pose {
  const p: Pose = { ...basePose, armL: [...basePose.armL], armR: [...basePose.armR] };

  // pop in
  const pop = spring({ frame: f - 8, fps, config: { damping: 9, stiffness: 160 } });
  p.squash = interpolate(pop, [0, 1], [0.6, 1]);
  p.scale = basePose.scale * Math.min(pop, 1.08);

  // idle breathing
  p.sway = Math.sin(f * 0.08) * 0.015;

  // blinking while fresh
  const blink = [40, 64].some((b) => f >= b && f < b + 4);
  p.eyeOpen = blink ? 0.05 : 1;

  // hook: wave hand
  if (f < T.h24) {
    const w = interpolate(f, [14, 24, 60, 70], [0, 1, 1, 0], clamp);
    p.armR = [0.25 + w * 2.4, 0.1 + w * (0.5 + Math.sin(f * 0.6) * 0.35)];
  }

  // 24h: tired, yawn
  const tired = interpolate(f, [T.h24, T.h24 + 20, T.h48, T.h72], [0, 0.45, 0.75, 1], clamp);
  p.tired = tired;
  if (f >= T.h24) {
    p.eyeOpen = interpolate(f, [T.h24, T.h24 + 20, T.h48, T.h72], [1, 0.72, 0.5, 0.35], clamp);
    const yawn = interpolate(f, [108, 116, 138, 146], [0, 1, 1, 0], clamp);
    p.yawn = yawn;
    p.eyeOpen *= 1 - yawn * 0.9;
    p.armL = [0.25 + yawn * 2.0, 0.1 + yawn * 1.6]; // hand to mouth
    p.headTilt = yawn * -0.12;
    p.sway = Math.sin(f * 0.07) * interpolate(f, [T.h24, T.h72], [0.015, 0.035], clamp);
  }

  // 48h: coffee + microsleep nods
  if (f >= T.h48 - 6 && f < T.h72 + 20) {
    p.cup = interpolate(f, [T.h48 - 6, T.h48 + 4, T.h72 + 10, T.h72 + 20], [0, 1, 1, 0], clamp);
    p.cupShake = interpolate(f, [T.h48, T.h72], [0.15, 0.4], clamp);
    const sip = interpolate(f, [176, 184, 196, 204], [0, 1, 1, 0], clamp);
    p.armR = [0.25 + 0.5 + sip * 0.4, 1.9 + sip * 0.6];
    for (const n of [214, 240]) {
      const nod = interpolate(f, [n, n + 9, n + 13, n + 16], [0, 1, 1, 0], {
        ...clamp,
        easing: ease,
      });
      p.headDrop += nod * 28;
      p.headTilt += nod * 0.18;
      if (nod > 0.3) p.eyeOpen = 0.05;
      p.armR = [p.armR[0] - nod * 0.4, p.armR[1] - nod * 0.8];
    }
  }

  // 72h: heavy sway, hallucinations, then fall
  if (f >= T.h72) {
    p.sway = Math.sin(f * 0.11) * interpolate(f, [T.h72, T.fallStart], [0.03, 0.07], clamp);
    p.pupilX = Math.sin(f * 0.15) * 2;
    p.armL = [0.4 + Math.sin(f * 0.1) * 0.15, 0.2];
  }
  if (f >= T.fallStart) {
    const t = interpolate(f, [T.fallStart, T.fallLand], [0, 1], clamp);
    const g = t * t; // gravity-ish
    // small bounce after landing
    const bounce =
      f > T.fallLand ? Math.exp(-(f - T.fallLand) * 0.35) * Math.sin((f - T.fallLand) * 0.9) * 0.05 : 0;
    p.fall = g * (Math.PI / 2) - bounce;
    p.x = interpolate(g, [0, 1], [540, 220]);
    p.y = basePose.y - g * 72;
    p.sway = p.sway * (1 - g);
    p.eyeOpen = 0.05;
    p.armL = [0.4 - g * 0.3, 0.2 - g * 0.15];
    p.armR = [0.25 - g * 0.15, 0.3 - g * 0.2];
    p.tired = 1;
    p.headTilt = 0.1;
  }
  return p;
}

// ---------- canvas layer ----------
const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const p = poseAt(frame, fps);

    const night = interpolate(frame, [0, T.h24, T.h48, T.h72], [0, 0.35, 0.7, 1], clamp);
    drawRoom(ctx, basePose.y - 130, night, frame);
    drawShadow(ctx, p);

    // alarm clock during 24h segment
    const clockIn = spring({ frame: frame - T.h24 - 4, fps, config: { damping: 11 } });
    const clockOut = interpolate(frame, [T.h48 - 8, T.h48], [1, 0], clamp);
    const wob = Math.sin(frame * 1.7) * 0.03;
    drawClock(ctx, 860 + wob * 40, 760, clockIn * clockOut, frame * 3);

    const hall = interpolate(frame, [T.h72 + 6, T.h72 + 22, T.fallStart, T.fallLand], [0, 1, 1, 0], clamp);
    drawHallucinations(ctx, 540, 900, hall, frame);

    drawFigure(ctx, p, frame);

    if (frame > T.fallLand + 4) {
      drawZzz(ctx, 720, 1230, frame - T.fallLand - 4);
    }
  }, [frame, fps]);

  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------- text overlays ----------
const Pop: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; out?: number }> = ({
  at,
  children,
  style,
  out,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - at, fps, config: { damping: 10, stiffness: 180 } });
  const o = out !== undefined ? interpolate(frame, [out - 6, out], [1, 0], clamp) : 1;
  if (frame < at) return null;
  return (
    <div style={{ transform: `scale(${s})`, opacity: o * Math.min(1, s * 1.5), ...style }}>{children}</div>
  );
};

const HourTag: React.FC<{ at: number; out: number; hours: number; prev: number; color: string; line: string }> = ({
  at,
  out,
  hours,
  prev,
  color,
  line,
}) => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [at, at + 14], [prev, hours], { ...clamp, easing: ease }));
  return (
    <>
      <Pop at={at} out={out} style={{ position: "absolute", top: 210, width: "100%", textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            background: color,
            color: "#fff",
            fontFamily: "Kanit",
            fontWeight: 800,
            fontSize: 96,
            padding: "6px 44px 14px",
            borderRadius: 999,
            border: "8px solid #1d1b1a",
            boxShadow: "0 10px 0 #1d1b1a",
          }}
        >
          ชั่วโมงที่ {n}
        </span>
      </Pop>
      <Pop at={at + 8} out={out} style={{ position: "absolute", top: 420, width: "100%", textAlign: "center" }}>
        <span style={captionStyle}>{line}</span>
      </Pop>
    </>
  );
};

const captionStyle: React.CSSProperties = {
  fontFamily: "Kanit",
  fontWeight: 800,
  fontSize: 70,
  color: "#1d1b1a",
  lineHeight: 1.35,
  display: "inline-block",
  maxWidth: 920,
};

const Overlays: React.FC = () => {
  const frame = useCurrentFrame();
  const endBg = interpolate(frame, [T.end, T.end + 10], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {/* hook */}
      <Pop at={4} out={T.h24} style={{ position: "absolute", top: 230, width: "100%", textAlign: "center" }}>
        <div style={{ ...captionStyle, fontSize: 92 }}>
          ถ้าคุณ<span style={{ background: "#FDE047", padding: "0 14px", borderRadius: 14 }}>ไม่นอนเลย</span>
          <br />
          72 ชั่วโมง?
        </div>
      </Pop>

      <HourTag at={T.h24} out={T.h48} hours={24} prev={0} color="#3B82F6" line="สมองช้าพอ ๆ กับคนเมา" />
      <HourTag at={T.h48} out={T.h72} hours={48} prev={24} color="#F97316" line="หลับวูบไปไม่กี่วินาที โดยไม่รู้ตัว" />
      <HourTag at={T.h72} out={T.end} hours={72} prev={48} color="#DC2626" line="เริ่มเห็นภาพหลอน" />

      {/* end card */}
      <AbsoluteFill style={{ background: `rgba(244,241,234,${endBg * 0.45})` }} />
      <Pop at={T.end + 4} style={{ position: "absolute", top: 300, width: "100%", textAlign: "center" }}>
        <div style={{ ...captionStyle, fontSize: 84 }}>
          เมื่อคืนคุณนอน
          <br />
          <span style={{ background: "#FDE047", padding: "0 18px", borderRadius: 14 }}>กี่ชั่วโมง?</span>
        </div>
      </Pop>
      <Pop at={T.end + 20} style={{ position: "absolute", top: 600, width: "100%", textAlign: "center" }}>
        <span style={{ ...captionStyle, fontWeight: 500, fontSize: 52, color: "#1d1b1a", background: "#FFFDF8", padding: "4px 30px 10px", borderRadius: 999, border: "6px solid #1d1b1a" }}>คอมเมนต์บอกหน่อย 👇</span>
      </Pop>
    </AbsoluteFill>
  );
};

// ---------- sound design ----------
const SFX: { at: number; file: string; vol?: number }[] = [
  { at: 4, file: "pop" },
  { at: 8, file: "boing", vol: 0.6 },
  { at: T.h24, file: "whoosh", vol: 0.7 },
  { at: T.h24 + 4, file: "pop" },
  ...[90, 96, 102, 120, 126, 132, 150, 156].map((at) => ({ at, file: "tick", vol: 0.6 })),
  { at: 108, file: "yawn", vol: 0.9 },
  { at: T.h48, file: "whoosh", vol: 0.7 },
  { at: T.h48 + 2, file: "pop" },
  { at: 180, file: "sip" },
  { at: 223, file: "pop", vol: 0.5 },
  { at: 249, file: "pop", vol: 0.5 },
  { at: T.h72, file: "whoosh", vol: 0.7 },
  { at: T.h72 + 2, file: "pop" },
  { at: T.h72 + 6, file: "eerie", vol: 0.8 },
  { at: T.fallStart, file: "whoosh", vol: 0.9 },
  { at: T.fallLand, file: "thud", vol: 1 },
  { at: T.end + 4, file: "ding", vol: 0.8 },
  { at: T.end + 10, file: "snore", vol: 0.8 },
  { at: T.end + 40, file: "snore", vol: 0.8 },
];

const Sounds: React.FC = () => (
  <>
    {SFX.map((s, i) => (
      <Sequence key={i} from={s.at} layout="none">
        <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol ?? 1} />
      </Sequence>
    ))}
  </>
);

// ---------- root component ----------
export const MyComponent: React.FC = () => {
  useKanit();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#F4F1EA", overflow: "hidden" }}>
      <AbsoluteFill>
        <Stage />
      </AbsoluteFill>
      <AbsoluteFill>
        <Overlays />
      </AbsoluteFill>
      <Sounds />
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="SleepWhatIf"
      component={MyComponent}
      durationInFrames={DURATION}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};
