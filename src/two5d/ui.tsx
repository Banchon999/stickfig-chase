// Shared UI for the survival-manual series: stamps, chips, manual pages, subtitles, fonts, canvas stage.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { H, W, lerp } from "./engine";

export const FPS = 30;
export const INK = "#1d1b1a";
export const s2f = (s: number) => Math.round(s * FPS);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const pill = (bg: string, size = 56): React.CSSProperties => ({
  display: "inline-block", background: bg, color: INK, fontFamily: "Kanit", fontWeight: 800, fontSize: size,
  padding: "6px 30px 12px", borderRadius: 999, border: `5px solid ${INK}`, boxShadow: "0 8px 0 rgba(0,0,0,0.35)", whiteSpace: "nowrap",
});

export const Stamp: React.FC<{ text: string; at: number; size?: number; color?: string; rot?: number; bg?: string }> = ({ text, at, size = 60, color = "#C0392B", rot = -8, bg = "rgba(255,255,255,0.06)" }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 9, stiffness: 260 } });
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rot}deg) scale(${lerp(2.2, 1, s)})`, opacity: Math.min(1, s * 1.5), border: `6px solid ${color}`, color, fontFamily: "Kanit", fontWeight: 800, fontSize: size, padding: "0 22px 6px", borderRadius: 10, letterSpacing: 4, background: bg, whiteSpace: "nowrap" }}>{text}</span>
  );
};

export type Theme = { page: string; border: string; head: string; text: string; edition: string };
export const RulePage: React.FC<{ n: string; text: string; at: number; out: number; theme: Theme }> = ({ n, text, at, out, theme }) => {
  const f = useCurrentFrame();
  if (f < at || f >= out) return null;
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 12, stiffness: 170 } });
  const fade = interpolate(f, [out - 5, out], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 560, width: "100%", display: "flex", justifyContent: "center", opacity: fade, transform: `translateY(${(1 - s) * 120}px) rotate(${(1 - s) * -6 - 1.5}deg)` }}>
      <div style={{ width: 860, background: theme.page, border: `8px solid ${theme.border}`, borderRadius: 18, padding: "34px 40px 46px", boxShadow: "0 16px 0 rgba(0,0,0,0.45)", textAlign: "center", position: "relative" }}>
        <div style={{ fontFamily: "Kanit", fontWeight: 500, fontSize: 30, color: theme.text, opacity: 0.8, letterSpacing: 6 }}>คู่มือเอาตัวรอด · {theme.edition}</div>
        <div style={{ height: 4, background: theme.text, opacity: 0.35, margin: "14px 0 18px" }} />
        <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 64, color: theme.head }}>{n}</div>
        <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 84, lineHeight: 1.25, color: theme.text, whiteSpace: "pre-line", marginTop: 6 }}>{text}</div>
        <div style={{ position: "absolute", right: 26, bottom: -30 }}>
          <Stamp text="ลับมาก" at={at + 10} size={46} />
        </div>
      </div>
    </div>
  );
};

// pop-in helper: returns a positioned element or null
export function popAt(f: number, at: number, out: number, node: React.ReactNode, key: string, top = 250): React.ReactNode {
  const a = s2f(at);
  const b = s2f(out);
  if (f < a || f >= b) return null;
  const s = spring({ frame: f - a, fps: FPS, config: { damping: 11, stiffness: 190 } });
  return (
    <div key={key} style={{ position: "absolute", top, width: "100%", textAlign: "center", transform: `scale(${s})`, opacity: interpolate(f, [b - 5, b], [1, 0], clamp) }}>
      {node}
    </div>
  );
}

export const Subtitles: React.FC<{ lines: [number, number, string][]; from?: number }> = ({ lines, from = 0 }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = lines.find(([a, b]) => t >= a && t < b + 0.2);
  if (!line || t < from) return null;
  return (
    <div style={{ position: "absolute", top: 1580, width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 950, background: "rgba(10,10,14,0.75)", borderRadius: 22, padding: "12px 34px 18px", fontFamily: "Kanit", fontWeight: 500, fontSize: 52, lineHeight: 1.35, color: "#FFFFFF", textAlign: "center" }}>{line[2]}</div>
    </div>
  );
};

export const useFonts = () => {
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

export const Stage: React.FC<{ ready: boolean; draw: (ctx: CanvasRenderingContext2D, f: number) => void }> = ({ ready, draw }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) draw(ctx, f);
  }, [f, ready, draw]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// shot table helper: [startSeconds, id][] → current shot
export function shotLookup<T extends string>(shots: [number, T][], dur: number) {
  return (f: number) => {
    let i = 0;
    for (let k = 0; k < shots.length; k++) if (f >= s2f(shots[k][0])) i = k;
    return { shot: shots[i][1], start: s2f(shots[i][0]), end: i + 1 < shots.length ? s2f(shots[i + 1][0]) : dur, idx: i };
  };
}
