import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Composition, Sequence, continueRender, delayRender, getInputProps, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { basePose } from "../draw";
import { Cam, Card, H, W, drawCards, lerp, project, seg } from "./engine";
import { Person, handPos, personCard } from "./props";
import {
  YardMode, beret, binCard, bubbles, buzzCut, drawShowerFloor, drawTableRoom, drawYardGround, droppedGearCard, mustache,
  scaleCard, showerCards, soapCard, sweat, tableCards, yardCards, yardSky,
} from "./barracks";

const FPS = 30;
export const SM_DUR = 2145; // 71.5 s (VO 70.27 s + tail)
const s2f = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SILENT = Boolean((typeof window === "undefined" ? {} : (getInputProps() as { silent?: boolean })).silent);

// ---------------- script: 25 voice chunks aligned to the pauses ----------------
const LINES: [number, number, string][] = [
  [0.0, 3.16, "คู่มือเอาตัวรอดจากสบู่หล่นในห้องน้ำค่ายทหาร"],
  [3.67, 4.81, "ในชีวิตทหารเกณฑ์"],
  [5.12, 7.36, "มีภัยอันตรายมากมายที่คุณต้องเผชิญ..."],
  [7.83, 8.6, "ทั้งการฝึกหนัก"],
  [8.95, 9.98, "การเข้าเวรกลางดึก"],
  [10.31, 13.15, "และอาหารที่บางครั้งก็ยากจะระบุชนิดของเนื้อสัตว์"],
  [13.67, 17.62, "แต่มีอยู่หนึ่งสถานการณ์... ที่แม้แต่ทหารผ่านศึกก็ยังไม่อยากเผชิญ"],
  [18.07, 18.66, "นั่นคือ..."],
  [19.01, 20.29, "สบู่หล่นในห้องน้ำ!"],
  [20.83, 21.6, "กฎข้อที่หนึ่ง..."],
  [22.03, 22.78, "อย่าตื่นตระหนก!"],
  [23.25, 27.4, "เมื่อสบู่ตกถึงพื้น จงหยุดทุกการเคลื่อนไหว และประเมินสถานการณ์ก่อน"],
  [27.73, 31.5, "เพราะพื้นห้องน้ำค่ายทหาร อาจมีสิ่งที่คุณไม่อยากรู้ว่ามันคืออะไร"],
  [31.98, 32.86, "กฎข้อที่สอง..."],
  [33.19, 35.05, "ห้ามใช้มือเปล่าหยิบโดยไม่จำเป็น!"],
  [35.41, 39.78, "อย่าเอาความกล้าหาญที่สะสมมาจากการฝึกสามเดือน มาเสี่ยงกับสบู่ก้อนเดียว"],
  [40.22, 41.02, "กฎข้อที่สาม..."],
  [41.49, 42.74, "ตรวจสอบพื้นที่โดยรอบ"],
  [43.09, 45.8, "หากมีเพื่อนทหารอยู่ใกล้ ๆ อย่าเพิ่งเรียกกำลังเสริม"],
  [46.14, 50.31, "เพราะบางเรื่อง... ยิ่งมีพยานมากเท่าไหร่ ยิ่งเป็นเรื่องเล่าไปอีกนานเท่านั้น"],
  [50.69, 51.83, "และกฎข้อสุดท้าย..."],
  [52.15, 54.87, "หากสบู่สกปรกหรือปนเปื้อน ให้ทิ้งมันไปซะ!"],
  [55.22, 59.01, "จำไว้ว่า... คุณสามารถซื้อสบู่ก้อนใหม่ได้ในราคาไม่กี่สิบบาท"],
  [59.32, 63.31, "แต่ความทรงจำของเพื่อนร่วมค่าย... อาจอยู่กับคุณไปจนวันปลดประจำการ"],
  [63.73, 66.85, "จงจำไว้... ในสนามรบ คุณอาจเสียอาวุธได้"],
  [66.85, 70.4, "แต่ในห้องน้ำค่ายทหาร... อย่าเสียสติให้กับสบู่!"],
];

// ---------------- shots ----------------
type Shot = "title" | "lineup" | "pushup" | "guard" | "tray" | "veteran" | "drop" | "rule" | "freeze" | "floor" | "scale" | "scan" | "witness" | "kick" | "shop" | "party" | "field" | "final";
const SHOTS: [number, Shot][] = [
  [0, "title"], [3.4, "lineup"], [7.6, "pushup"], [8.8, "guard"], [10.15, "tray"], [13.45, "veteran"], [18.85, "drop"],
  [20.6, "rule"], [23.1, "freeze"], [27.6, "floor"], [31.8, "rule"], [35.3, "scale"], [40.05, "rule"], [43.0, "scan"],
  [46.0, "witness"], [50.5, "rule"], [52.1, "kick"], [55.1, "shop"], [59.2, "party"], [63.6, "field"], [66.85, "final"],
];
function shotAt(f: number): { shot: Shot; start: number; end: number; idx: number } {
  let i = 0;
  for (let k = 0; k < SHOTS.length; k++) if (f >= s2f(SHOTS[k][0])) i = k;
  return { shot: SHOTS[i][1], start: s2f(SHOTS[i][0]), end: i + 1 < SHOTS.length ? s2f(SHOTS[i + 1][0]) : SM_DUR, idx: i };
}
const RULES: Record<number, { n: string; text: string }> = {
  7: { n: "กฎข้อที่ 1", text: "อย่าตื่นตระหนก!" },
  10: { n: "กฎข้อที่ 2", text: "ห้ามใช้มือเปล่าหยิบ\nโดยไม่จำเป็น!" },
  12: { n: "กฎข้อที่ 3", text: "ตรวจสอบพื้นที่โดยรอบ" },
  15: { n: "กฎข้อสุดท้าย", text: "ปนเปื้อน = ทิ้งมันไปซะ!" },
};

// ---------------- cast ----------------
const OLIVE = "#6B7F3A";
const hero = (o: Partial<Person> = {}): Person => ({ ...basePose, shirt: OLIVE, faceX: o.faceX ?? 8, head: buzzCut(), ...o });
const buddy = (shirt: string, o: Partial<Person> = {}): Person => ({ ...basePose, shirt, head: buzzCut(), ...o });
const veteran = (o: Partial<Person> = {}): Person => {
  const fx = o.faceX ?? 0;
  return { ...basePose, shirt: "#8A8F7A", ...o, head: (c) => { buzzCut()(c); mustache(fx)(c); sweat(o.tired ?? 0)(c); } };
};
const sergeant = (o: Partial<Person> = {}): Person => {
  const fx = o.faceX ?? -10;
  return { ...basePose, shirt: "#B59A6A", faceX: fx, ...o, head: (c) => { beret()(c); mustache(fx)(c); } };
};
const breathe = (f: number, ph = 0) => Math.sin(f * 0.08 + ph) * 0.012;

// soap path in the drop: hand → floor at (0.05, 0, 1.8), slow-mo with a bounce
const HERO_SHOWER = { x: 0.0, z: 2.25 };
function droppedSoap(f: number) {
  const a = s2f(19.0);
  const b = s2f(19.75);
  const t = seg(f, a, b);
  const p = hero({ armR: [1.0, 0.9] });
  const [hx, hy] = handPos(p, 1);
  const startX = HERO_SHOWER.x + hx / 100;
  const startY = -hy / 100;
  const g = t * t;
  const bounce = f > b ? Math.abs(Math.sin((f - b) * 0.45)) * Math.exp(-(f - b) * 0.18) * 0.06 : 0;
  return { x: lerp(startX, 0.05, t), y: lerp(startY, 0.0, g) + bounce, z: lerp(HERO_SHOWER.z - 0.15, 1.8, t), rot: t * 5 + (f > b ? 5 : 0) };
}

// ---------------- camera per shot ----------------
function cam(x: number, y: number, z: number, pitch = 0.04, focal = 1150, cy = 900): Cam {
  return { x, y, z, pitch, focal, cy };
}
function camAt(f: number): Cam {
  const { shot, start, end } = shotAt(f);
  const t = seg(f, start, end);
  switch (shot) {
    case "title": return cam(lerp(-0.4, 0.2, t), 1.6, lerp(-4.2, -3.3, t), 0.1);
    case "lineup": return cam(lerp(-2.2, 1.2, t), 1.45, -3.2, 0.03);
    case "pushup": return cam(lerp(0.15, 0.35, t), 0.55, -1.9, -0.02);
    case "guard": return cam(0.7, 1.4, lerp(-1.7, -1.3, t), 0.03);
    case "tray": return cam(0.02, lerp(1.2, 1.12, t), lerp(-0.12, -0.02, t), 0.78, 1150, 960);
    case "veteran": return cam(0.3, 1.45, lerp(-1.2, 0.35, t), 0.04);
    case "drop": {
      // dolly zoom: pull back while zooming in, the face keeps its size, the room stretches
      const k = seg(f, s2f(19.0), s2f(20.3));
      const d0 = 1.15;
      const d = lerp(d0, 3.4, k);
      return cam(0, 1.52, HERO_SHOWER.z - d, 0.0, 1150 * (d / d0), 780);
    }
    case "rule": return cam(0, 1.6, -3.6, 0.1);
    case "freeze": return cam(lerp(-1.3, 1.3, t), 1.3, -0.4, 0.05);
    case "floor": return cam(0.05, 0.13, lerp(1.12, 1.3, t), 0.05, 1150, 1050);
    case "scale": return cam(lerp(1.5, 1.62, t), 0.95, lerp(-0.05, 0.12, t), 0.1);
    case "scan": return cam(lerp(-2.3, 0.6, t), 1.55, -0.8, 0.03);
    case "witness": return cam(lerp(-0.3, 0.0, t), 1.45, lerp(-2.6, -2.2, t), 0.05);
    case "kick": return cam(0.45, 0.9, -0.6, 0.12);
    case "shop": return cam(0.0, 1.12, lerp(-0.3, -0.18, t), 0.62, 1150, 960);
    case "party": return cam(lerp(-0.4, 0.2, t), 1.4, lerp(-2.6, -2.1, t), 0.03);
    case "field": return cam(0.4, 0.55, lerp(-2.4, -2.0, t), -0.06);
    case "final": return cam(0.0, 0.95, lerp(-1.3, -0.75, t), -0.1, 1150, 1020);
  }
}

// ---------------- scene builders ----------------
function showerScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  const gross = shot === "floor" || shot === "freeze" ? 1 : 0;
  drawShowerFloor(ctx, c, gross);
  const cards: Card[] = showerCards({ steam: 1, frame: f, gross });
  const friends = shot === "scan" || shot === "witness" || shot === "title" || shot === "rule" || shot === "kick" || shot === "freeze" || shot === "floor";
  if (shot === "veteran") {
    const fear = seg(f, s2f(15.4), s2f(16.2));
    cards.push(personCard(veteran({ faceX: lerp(0, -6, fear), tired: fear, eyeOpen: 1, sway: breathe(f), pupilX: -3 * fear, yawn: fear * 0.25 }), 0.3, 2.0, f));
  }
  if (friends) {
    const look = (at: number) => seg(f, s2f(at), s2f(at) + 8);
    const w = shot === "witness";
    // brushing teeth: hand at the mouth, small scrub; showering: one hand scrubbing the head
    const brushing = (ph: number) => [2.2 + Math.sin(f * 0.9 + ph) * 0.06, 1.75] as [number, number];
    const scrub = [2.75 + Math.sin(f * 0.7) * 0.12, 1.25] as [number, number];
    cards.push(personCard(buddy("#EDEDED", { faceX: w ? lerp(-12, 14, look(46.5)) : -12, armL: brushing(0), sway: breathe(f, 1), eyeOpen: 1 }), -2.35, 0.75, f));
    cards.push(personCard(buddy("#B59A6A", { faceX: w ? lerp(-12, 14, look(47.3)) : -12, armR: brushing(1.3), sway: breathe(f, 2) }), -2.4, 1.75, f));
    cards.push(personCard(buddy("#55663A", { faceX: w ? lerp(0, 12, look(48.1)) : 0, armL: scrub, sway: breathe(f, 3) }), -1.9, 3.05, f));
    if (w && f > s2f(48.8)) {
      cards.push(bubbles(-1.9, 1.95, 3.0, f, 6));
    }
  }
  // hero
  if (shot !== "veteran") {
    let p = hero({ sway: breathe(f) });
    let pos = { ...HERO_SHOWER };
    if (shot === "drop") {
      const slip = seg(f, s2f(19.0), s2f(19.3));
      p = hero({ armR: [1.0 + slip * 0.6, 0.9 - slip * 0.6], eyeOpen: 1, yawn: seg(f, s2f(19.4), s2f(19.7)) * 0.6, faceX: 6, pupilX: 0 });
      p.headDrop = slip * 6;
    }
    if (shot === "freeze") p = hero({ armL: [1.25, 0.1], armR: [1.25, 0.1], eyeOpen: 1, faceX: 0, pupilX: Math.sin(f * 0.2) * 5 });
    if (shot === "floor") p = hero({ eyeOpen: 1 });
    if (shot === "scan") {
      const call = seg(f, s2f(44.0), s2f(44.3)) * (1 - seg(f, s2f(45.0), s2f(45.3)));
      p = hero({ faceX: lerp(-14, 14, seg(f, s2f(43.0), s2f(44.0))), armR: [0.25 + call * 2.3, 0.1], yawn: call * 0.5 });
    }
    if (shot === "witness") p = hero({ faceX: 0, tired: seg(f, s2f(47), s2f(48)) * 0.6, headDrop: seg(f, s2f(48.5), s2f(49.2)) * 16 });
    if (shot === "kick") {
      const k = seg(f, s2f(52.4), s2f(52.6)) * (1 - seg(f, s2f(53.0), s2f(53.4)));
      p = hero({ legL: [0, 0], legR: [k * 1.0, -k * 0.2], armFwd: false, faceX: 12, sway: -k * 0.08 });
      pos = { x: -0.25, z: 2.0 };
    }
    if (shot === "rule" || shot === "title") p = hero({ sway: breathe(f), faceX: 6 });
    if (shot === "final") {
      const s = seg(f, s2f(67.6), s2f(68.0));
      p = hero({ armR: [0.25 + s * 2.3, 0.1 + s * 1.85], armL: [0.6, 1.4], glow: seg(f, s2f(67), s2f(69)) * 0.9, faceX: 4 });
      pos = { x: 0.0, z: 1.2 };
    }
    cards.push(personCard(p, pos.x, pos.z, f));
    // soap in the hand / falling / on the floor
    if (shot === "drop") {
      if (f < s2f(19.0)) {
        const [hx, hy] = handPos(p, 1);
        cards.push(soapCard(pos.x + hx / 100, -hy / 100, pos.z - 0.12, 0.2));
        cards.push(bubbles(pos.x + hx / 100, -hy / 100 + 0.05, pos.z - 0.13, f, 4));
      } else {
        const s = droppedSoap(f);
        cards.push(soapCard(s.x, s.y, s.z, s.rot));
      }
    }
    if (shot === "freeze" || shot === "floor" || shot === "scan" || shot === "witness" || shot === "scale") cards.push(soapCard(0.05, 0, 1.8, 0.35));
    if (shot === "kick") {
      const t = seg(f, s2f(52.6), s2f(53.3));
      const x = lerp(0.05, 1.0, t);
      const y = t > 0 ? Math.sin(t * Math.PI) * 0.7 + (t > 0.85 ? 0.45 : 0) * seg(t, 0.85, 1) : 0;
      if (t < 0.98) cards.push(soapCard(x, y, lerp(1.8, 1.72, t), t * 9));
      cards.push(binCard(1.0, 1.7, seg(f, s2f(52.4), s2f(52.6)) * (1 - seg(f, s2f(53.35), s2f(53.6)))));
    }
    if (shot === "final") cards.push(bubbles(0.35, 1.15, 1.15, f, 6));
  }
  if (shot === "scale") {
    const tilt = interpolate(f, [s2f(36.2), s2f(37.2), s2f(38.4), s2f(39.2)], [-0.12, 0.08, 0.08, 0.22], clamp);
    cards.push(scaleCard(1.7, 0.9, tilt));
    cards.push(personCard(hero({ faceX: 16, headTilt: 0.08 }), 0.75, 1.45, f));
  }
  drawCards(ctx, c, cards, { color: [210, 225, 225], density: 0.03, start: 3 });
  // golden finale grade
  if (shot === "final") {
    const g = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, 1100);
    g.addColorStop(0, `rgba(255,214,120,${0.35 * seg(f, s2f(67), s2f(68.5))})`);
    g.addColorStop(1, "rgba(255,214,120,0)");
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
  }
}

function yardScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  const mode: YardMode = shot === "guard" ? "night" : shot === "field" ? "dusk" : shot === "party" ? "party" : "day";
  yardSky(ctx, mode, W, H);
  drawYardGround(ctx, c, mode);
  const cards = yardCards(mode, f);
  if (shot === "lineup") {
    for (const [i, x] of [-1.4, 0, 1.4].entries()) {
      const p = i === 1 ? hero({ armL: [0.06, 0], armR: [0.06, 0], faceX: 0 }) : buddy(i ? "#EDEDED" : "#55663A", { armL: [0.06, 0], armR: [0.06, 0], faceX: 0 });
      cards.push(personCard(p, x, 3.0, f));
    }
    cards.push(personCard(sergeant({ armR: [0.25 + seg(f, s2f(5.2), s2f(5.5)) * 1.6, 0.2], faceX: -12 }), 2.9, 2.2, f));
  }
  if (shot === "pushup") {
    const up = (Math.sin((f - s2f(7.6)) * 0.35) + 1) / 2;
    const fall = lerp(1.32, 1.18, up);
    // body rotated ~70° about the feet; arms reach straight to the ground
    const lift = lerp(0.0, 0.1, up);
    cards.push({ ...personCard(hero({ fall, armFwd: true, armL: [fall - 0.05, 0.0], armR: [fall + 0.05, 0.0], sway: 0, faceX: 14, tired: 0.6 }), -1.0, 2.2, f), y: lift * 0.2 });
    cards.push(personCard(sergeant({ armR: [2.2, 0.3], yawn: 0.4 + 0.3 * Math.sin(f * 0.9) }), 1.5, 3.0, f));
  }
  if (shot === "guard") {
    cards.push(personCard(hero({ yawn: seg(f, s2f(9.2), s2f(9.5)) * 0.9, eyeOpen: 0.4, armR: [1.2, 0.4], tired: 0.8 }), 0.55, 2.9, f));
  }
  if (shot === "party") {
    const laugh = (ph: number) => ({ yawn: 0.5 + 0.3 * Math.sin(f * 0.8 + ph), sway: Math.sin(f * 0.5 + ph) * 0.06, armR: [2.0, 0.6] as [number, number] });
    cards.push(personCard(buddy("#EDEDED", { ...laugh(0), faceX: 14 }), -1.2, 2.3, f));
    cards.push(personCard(buddy("#B59A6A", { ...laugh(1), faceX: -14 }), 1.2, 2.3, f));
    cards.push(personCard(buddy("#55663A", { ...laugh(2), faceX: 10 }), -0.6, 3.1, f));
    cards.push(personCard(hero({ armL: [2.2, 1.7], headDrop: 10, tired: 0.5, faceX: 0 }), 0.15, 2.0, f));
  }
  if (shot === "field") {
    cards.push(droppedGearCard(0.9, 2.1));
    const shrug = seg(f, s2f(65.2), s2f(65.6));
    cards.push(personCard(hero({ armL: [0.25 + shrug * 1.2, 0.1 - shrug * 1.5], armR: [0.25 + shrug * 1.2, 0.1 - shrug * 1.5], headTilt: shrug * 0.1, faceX: 6 }), 0.0, 2.6, f));
  }
  drawCards(ctx, c, cards, { color: mode === "night" ? [20, 26, 50] : mode === "dusk" ? [242, 166, 90] : [220, 239, 251], density: 0.04, start: 6 });
  if (shot === "guard") {
    // flashlight cone from the hand
    const p = project(c, 0.75, 1.1, 2.85);
    const q = project(c, 1.9, 0, 1.6);
    if (p && q) {
      const g = ctx.createLinearGradient(p.sx, p.sy, q.sx, q.sy);
      g.addColorStop(0, "rgba(255,240,180,0.55)");
      g.addColorStop(1, "rgba(255,240,180,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(q.sx - 260, q.sy);
      ctx.lineTo(q.sx + 260, q.sy);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function tableScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  const kind = shot === "tray" ? "tray" : "shop";
  drawTableRoom(ctx, W, H, kind);
  const poke = shot === "tray" ? (Math.sin(f * 0.5) > 0.3 ? 1 : 0) * seg(f, s2f(11.0), s2f(11.3)) : 0;
  drawCards(ctx, c, tableCards(kind, f, poke), { color: [40, 34, 28], density: 0.0, start: 99 });
}

function drawFrame(ctx: CanvasRenderingContext2D, f: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.fillStyle = "#14161C";
  ctx.fillRect(0, 0, W, H);
  const { shot, start } = shotAt(f);
  const c = camAt(f);
  if (shot === "lineup" || shot === "pushup" || shot === "guard" || shot === "party" || shot === "field") yardScene(ctx, f, c, shot);
  else if (shot === "tray" || shot === "shop") tableScene(ctx, f, c, shot);
  else showerScene(ctx, f, c, shot);
  // rule pages sit on a dimmed, softened scene
  if (shot === "rule") {
    ctx.fillStyle = "rgba(10,14,8,0.55)";
    ctx.fillRect(0, 0, W, H);
  }
  // vignette + a 4-frame dip at each cut
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, 420, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const d = f - start;
  if (start > 0 && d < 4) {
    ctx.fillStyle = `rgba(10,10,14,${(1 - d / 4) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------- overlays ----------------
const INK = "#1d1b1a";
const pill = (bg: string, size = 56): React.CSSProperties => ({ display: "inline-block", background: bg, color: INK, fontFamily: "Kanit", fontWeight: 800, fontSize: size, padding: "6px 30px 12px", borderRadius: 999, border: `5px solid ${INK}`, boxShadow: "0 8px 0 rgba(0,0,0,0.35)", whiteSpace: "nowrap" });

const Stamp: React.FC<{ text: string; at: number; size?: number; color?: string; rot?: number }> = ({ text, at, size = 60, color = "#C0392B", rot = -8 }) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 9, stiffness: 260 } });
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rot}deg) scale(${lerp(2.2, 1, s)})`, opacity: Math.min(1, s * 1.5), border: `6px solid ${color}`, color, fontFamily: "Kanit", fontWeight: 800, fontSize: size, padding: "0 22px 6px", borderRadius: 10, letterSpacing: 4, background: "rgba(255,255,255,0.05)" }}>{text}</span>
  );
};

const RulePage: React.FC<{ n: string; text: string; at: number; out: number }> = ({ n, text, at, out }) => {
  const f = useCurrentFrame();
  if (f < at || f >= out) return null;
  const s = spring({ frame: f - at, fps: FPS, config: { damping: 12, stiffness: 170 } });
  const fade = interpolate(f, [out - 5, out], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", top: 560, width: "100%", display: "flex", justifyContent: "center", opacity: fade, transform: `translateY(${(1 - s) * 120}px) rotate(${(1 - s) * -6 - 1.5}deg)` }}>
      <div style={{ width: 860, background: "#4E5F2C", border: `8px solid #2F3A1A`, borderRadius: 18, padding: "34px 40px 46px", boxShadow: "0 16px 0 rgba(0,0,0,0.45)", textAlign: "center", position: "relative" }}>
        <div style={{ fontFamily: "Kanit", fontWeight: 500, fontSize: 30, color: "#D8D2B4", letterSpacing: 6 }}>คู่มือเอาตัวรอด · ฉบับทหารเกณฑ์</div>
        <div style={{ height: 4, background: "#D8D2B4", opacity: 0.4, margin: "14px 0 18px" }} />
        <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 64, color: "#F2C14E" }}>{n}</div>
        <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 84, lineHeight: 1.25, color: "#F6F1DE", whiteSpace: "pre-line", marginTop: 6 }}>{text}</div>
        <div style={{ position: "absolute", right: 26, bottom: -30 }}>
          <Stamp text="ลับมาก" at={at + 10} size={46} />
        </div>
      </div>
    </div>
  );
};

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const { shot, start, end, idx } = shotAt(f);
  const n: React.ReactNode[] = [];
  const pop = (at: number, out: number, node: React.ReactNode, key: string, top = 250) => {
    const a = s2f(at);
    const b = s2f(out);
    if (f < a || f >= b) return;
    const s = spring({ frame: f - a, fps: FPS, config: { damping: 11, stiffness: 190 } });
    n.push(<div key={key} style={{ position: "absolute", top, width: "100%", textAlign: "center", transform: `scale(${s})`, opacity: interpolate(f, [b - 5, b], [1, 0], clamp) }}>{node}</div>);
  };
  // title dossier
  if (shot === "title") {
    const s = spring({ frame: f, fps: FPS, config: { damping: 12, stiffness: 150 } });
    n.push(
      <div key="title" style={{ position: "absolute", top: 230, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${s}) rotate(-2deg)` }}>
        <div style={{ width: 900, background: "#D9C18A", border: `8px solid #8C6A3E`, borderRadius: 14, padding: "26px 36px 36px", boxShadow: "0 16px 0 rgba(0,0,0,0.45)", textAlign: "center", position: "relative" }}>
          <div style={{ fontFamily: "Kanit", fontWeight: 500, fontSize: 30, color: "#5B4426", letterSpacing: 6 }}>แฟ้มข้อมูล · ทบ. ห้องน้ำ</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 96, color: INK, lineHeight: 1.1, marginTop: 8 }}>คู่มือเอาตัวรอด</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 52, color: "#3F5B2E", marginTop: 6 }}>จากสบู่หล่นในห้องน้ำค่ายทหาร</div>
          <div style={{ position: "absolute", right: 20, top: -34 }}>
            <Stamp text="ลับมาก" at={s2f(1.1)} size={50} />
          </div>
        </div>
      </div>,
    );
  }
  if (RULES[idx]) n.push(<RulePage key={`r${idx}`} n={RULES[idx].n} text={RULES[idx].text} at={start} out={end} />);
  pop(5.15, 7.5, <span style={pill("#FECACA")}>ภัยอันตรายรอบตัว</span>, "danger");
  pop(7.8, 8.8, <span style={pill("#FFFDF8")}>หนึ่ง! สอง!</span>, "count", 300);
  pop(10.6, 13.4, <span style={pill("#FFFDF8", 62)}>เนื้ออะไร?</span>, "meat", 520);
  pop(19.15, 20.6, <Stamp text="สบู่หล่น!" at={s2f(19.15)} size={120} />, "drop", 1180);
  if (shot === "freeze") {
    // HUD brackets + scan bar
    const k = seg(f, s2f(24.0), s2f(27.2));
    n.push(
      <div key="hud" style={{ position: "absolute", inset: 0 }}>
        {[[140, 420], [800, 420], [140, 1380], [800, 1380]].map(([x, y], i) => (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 140, height: 140, borderLeft: i % 2 === 0 ? "8px solid #9BE15D" : "none", borderRight: i % 2 ? "8px solid #9BE15D" : "none", borderTop: i < 2 ? "8px solid #9BE15D" : "none", borderBottom: i >= 2 ? "8px solid #9BE15D" : "none" }} />
        ))}
        <div style={{ position: "absolute", top: 260, width: "100%", textAlign: "center", fontFamily: "Kanit", fontWeight: 800, fontSize: 52, color: "#9BE15D", textShadow: "0 0 18px rgba(155,225,93,0.6)" }}>กำลังประเมินสถานการณ์... {Math.round(k * 100)}%</div>
        <div style={{ position: "absolute", top: 340, left: 190, width: 700, height: 18, border: "4px solid #9BE15D", borderRadius: 9 }}>
          <div style={{ width: `${k * 100}%`, height: "100%", background: "#9BE15D" }} />
        </div>
      </div>,
    );
  }
  if (shot === "floor") {
    const c = camAt(f);
    for (const [x, z, label, at, lift] of [[-0.32, 1.78, "ผม?", 28.4, 90], [0.28 + Math.sin(f * 0.05) * 0.06, 1.95, "แมลง!", 29.0, 300], [0.55, 1.75, "???", 29.6, 90]] as [number, number, string, number, number][]) {
      const p = project(c, x, 0.05, z);
      if (!p || f < s2f(at)) continue;
      const s = spring({ frame: f - s2f(at), fps: FPS, config: { damping: 10, stiffness: 200 } });
      n.push(<div key={label} style={{ position: "absolute", left: Math.min(900, Math.max(180, p.sx)), top: p.sy - lift, transform: `translate(-50%,-100%) scale(${s})` }}><span style={pill("#FDE68A", 48)}>{label}</span></div>);
    }
  }
  pop(36.3, 39.9, <span style={pill("#FFFDF8", 50)}>ฝึก 3 เดือน  vs  สบู่ 1 ก้อน</span>, "scale", 300);
  pop(44.0, 45.4, <span style={pill("#FFFDF8")}>เฮ้ย มาช่วย—</span>, "call", 330);
  if (shot === "witness") {
    const w = (f >= s2f(46.6) ? 1 : 0) + (f >= s2f(47.4) ? 1 : 0) + (f >= s2f(48.2) ? 1 : 0);
    if (w > 0) n.push(<div key="wit" style={{ position: "absolute", top: 270, width: "100%", textAlign: "center" }}><span style={pill("#FECACA", 64)}>พยาน: {w} คน</span></div>);
    pop(48.9, 50.4, <span style={pill("#FFFDF8", 58)}>เรื่องนี้เล่าอีก 10 ปี</span>, "legend", 400);
  }
  pop(55.6, 59.1, <span style={pill("#FDE68A", 62)}>สบู่ใหม่ = ไม่กี่สิบบาท</span>, "price", 1260);
  pop(60.4, 63.5, <span style={pill("#FFFDF8", 64)}>"สบู่!!" 555</span>, "laugh", 300);
  pop(64.6, 66.85, <span style={pill("#FFFDF8", 56)}>ในสนามรบ: เสียอาวุธได้</span>, "field");
  if (f >= s2f(68.2)) n.push(<div key="end" style={{ position: "absolute", top: 260, width: "100%", textAlign: "center" }}><Stamp text="อย่าเสียสติให้กับสบู่!" at={s2f(68.2)} size={74} rot={-6} /></div>);
  return <AbsoluteFill>{n}</AbsoluteFill>;
};

const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = LINES.find(([a, b]) => t >= a && t < b + 0.2);
  if (!line || t < 3.4) return null; // the title card carries the first line
  return (
    <div style={{ position: "absolute", top: 1580, width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 950, background: "rgba(10,10,14,0.75)", borderRadius: 22, padding: "12px 34px 18px", fontFamily: "Kanit", fontWeight: 500, fontSize: 52, lineHeight: 1.35, color: "#FFFFFF", textAlign: "center" }}>{line[2]}</div>
    </div>
  );
};

// ---------------- sound ----------------
export function buildSoapCues() {
  const c: { at: number; file: string; vol: number }[] = [{ at: 0, file: "march", vol: 0.22 }];
  c.push({ at: s2f(1.1), file: "stamp", vol: 0.6 });
  for (let k = 1; k < SHOTS.length; k++) c.push({ at: s2f(SHOTS[k][0]), file: "whoosh", vol: 0.16 });
  for (const k of Object.keys(RULES).map(Number)) {
    c.push({ at: s2f(SHOTS[k][0]), file: "dundun", vol: 0.45 });
    c.push({ at: s2f(SHOTS[k][0]) + 10, file: "stamp", vol: 0.5 });
  }
  c.push({ at: s2f(19.0), file: "squeak", vol: 0.5 });
  c.push({ at: s2f(19.15), file: "stinger", vol: 0.45 });
  c.push({ at: s2f(19.75), file: "plop", vol: 0.7 });
  for (let i = 0; i < 6; i++) c.push({ at: s2f(24.0) + i * 16, file: "tick", vol: 0.35 });
  for (const s of [28.4, 29.0, 29.6, 36.3, 44.0, 46.6, 47.4, 48.2, 48.9, 55.6, 60.4, 64.6]) c.push({ at: s2f(s), file: "pop", vol: 0.28 });
  c.push({ at: s2f(52.6), file: "whoosh", vol: 0.35 });
  c.push({ at: s2f(53.35), file: "clang", vol: 0.6 });
  c.push({ at: s2f(56.0), file: "ding", vol: 0.4 });
  c.push({ at: s2f(67.0), file: "fanfare", vol: 0.5 });
  c.push({ at: s2f(68.2), file: "stamp", vol: 0.6 });
  return c;
}
export const SM_CUES = buildSoapCues();

// ---------------- composition ----------------
const useFonts = () => {
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

const Stage: React.FC<{ ready: boolean }> = ({ ready }) => {
  const f = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawFrame(ctx, f);
  }, [f, ready]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

export const SoapManual: React.FC = () => {
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: "#14161C" }}>
      <Stage ready={ready} />
      <Overlay />
      <Subtitles />
      {!SILENT && <Audio src={staticFile("vo/vo4.mp3")} />}
      {!SILENT &&
        SM_CUES.map((s, i) => (
          <Sequence key={i} from={s.at} layout="none">
            <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const SoapManualComposition = () => <Composition id="SoapManual" component={SoapManual} durationInFrames={SM_DUR} fps={FPS} width={W} height={H} />;
