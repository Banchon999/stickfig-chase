import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, getInputProps, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { basePose } from "../draw";
import { Cam, Card, H, W, drawCards, lerp, project, seg } from "./engine";
import { FIG, Person, handPos, personCard } from "./props";
import { beret, buzzCut, drawYardGround, mustache, sweat, yardCards, yardSky } from "./barracks";
import { INK, evidenceCard, gasCard, helmet, inked, nose } from "./elevator";
import {
  HallState, STALL_X, TOILET_Z, brush, cupCard, drawHallCeiling, drawHallFloor, drawStallWalls, flies, glove, hallCards, hallDefault,
  mosaic, plunger, sprayBottle, stink,
} from "./toilet";
import { FPS, RulePage, Stage, Stamp, Subtitles, Theme, clamp, pill, popAt, s2f, shotLookup, useFonts } from "./ui";
import { LINES, T } from "./toiletScript";

export const TM_DUR = s2f(T.end);
const SILENT = Boolean((typeof window === "undefined" ? {} : (getInputProps() as { silent?: boolean })).silent);
const TAU = Math.PI * 2;

type Shot =
  | "yard" | "hall" | "test" | "door" | "reveal" | "shock" | "title" | "rule"
  | "inspect" | "floor" | "prints" | "smell" | "morning"
  | "touch" | "open" | "found" | "crime" | "nobody"
  | "cape" | "spam" | "overflow" | "broken" | "relief" | "manager"
  | "graceful" | "leftover" | "proper" | "company"
  | "zbowl" | "zfloor" | "zknob" | "zhose" | "clean" | "bare" | "mix"
  | "wash" | "germs"
  | "viewer" | "seconds" | "morale" | "roommates" | "choice" | "legend";

const SHOTS: [number, Shot][] = [
  [0, "yard"], [T.hall, "hall"], [T.test, "test"], [T.door, "door"], [T.shock, "reveal"], [T.shockHero, "shock"], [T.title, "title"],
  [T.r1, "rule"], [T.inspect, "inspect"], [T.floor, "floor"], [T.prints, "prints"], [T.smell, "smell"], [T.morning, "morning"],
  [T.r2, "rule"], [T.touch, "touch"], [T.open, "open"], [T.found, "found"], [T.crime, "crime"], [T.nobody, "nobody"],
  [T.r3, "rule"], [T.cape, "cape"], [T.spam, "spam"], [T.overflow, "overflow"], [T.broken, "broken"], [T.relief, "relief"], [T.manager, "manager"],
  [T.r4, "rule"], [T.graceful, "graceful"], [T.leftover, "leftover"], [T.proper, "proper"], [T.company, "company"],
  [T.r5, "rule"], [T.zbowl, "zbowl"], [T.zfloor, "zfloor"], [T.zknob, "zknob"], [T.zhose, "zhose"], [T.clean, "clean"], [T.bare, "bare"], [T.mix, "mix"],
  [T.r6, "rule"], [T.wash, "wash"], [T.germs, "germs"],
  [T.r7, "rule"], [T.viewer, "viewer"], [T.seconds, "seconds"], [T.morale, "morale"], [T.roommates, "roommates"], [T.choice, "choice"], [T.legend, "legend"],
];
const shotAt = shotLookup(SHOTS, TM_DUR);
const ruleIdx = (t: number) => SHOTS.findIndex(([s]) => s === t);
const RULES: Record<number, { n: string; text: string }> = {
  [ruleIdx(T.r1)]: { n: "กฎข้อที่ 1", text: "ห้ามเปิดฝาส้วม\nด้วยความประมาท!" },
  [ruleIdx(T.r2)]: { n: "กฎข้อที่ 2", text: "เปิดฝาส้วม\nอย่างระมัดระวัง!" },
  [ruleIdx(T.r3)]: { n: "กฎข้อที่ 3", text: "อย่าเป็นฮีโร่\nกดชักโครกทันที!" },
  [ruleIdx(T.r4)]: { n: "กฎข้อที่ 4", text: "อย่าทำตาม\nคนไม่กดชักโครก!" },
  [ruleIdx(T.r5)]: { n: "กฎข้อที่ 5", text: "ตรวจพื้น\nและรอบโถ!" },
  [ruleIdx(T.r6)]: { n: "กฎข้อที่ 6", text: "ล้างมือ\nให้สะอาด!" },
  [ruleIdx(T.r7)]: { n: "กฎข้อสุดท้าย", text: "อย่าสร้างปัญหา\nให้คนอื่น!" },
};
const THEME: Theme = { page: "#2E5E4E", border: "#1B3A30", head: "#F2C14E", text: "#F2F5F2", edition: "ฉบับห้องน้ำ" };

// ---------------- cast: the new chibi hoodie figures ----------------
const HERO_C = "#F2A73B";
const OLIVE = "#6B7F3A";
const breathe = (f: number, ph = 0) => Math.sin(f * 0.08 + ph) * 0.012;
const hero = (o: Partial<Person> = {}): Person => ({ ...basePose, chibi: true, shirt: HERO_C, ...o });
const soldier = (kind: 0 | 1 | 2, o: Partial<Person> = {}): Person => ({
  ...basePose, chibi: true, shirt: [OLIVE, "#7C8B4A", "#5A6B33"][kind], ...o,
  head: (c) => {
    if (kind === 0) helmet("#556B2F")(c);
    else buzzCut()(c);
    if (kind === 2) mustache(o.faceX ?? 0)(c);
    o.head?.(c);
  },
});
const sergeant = (o: Partial<Person> = {}): Person => ({ ...basePose, chibi: true, shirt: "#4E5D2C", ...o, head: (c) => { buzzCut()(c); beret()(c); mustache(o.faceX ?? 0)(c); } });

// walk cycle in profile (toward +x when dir = 1)
function walkPose(f: number, speed = 0.25, amp = 0.32): Partial<Person> {
  const ph = f * speed;
  return {
    legL: [amp * Math.sin(ph), -0.25 * Math.max(0, -Math.cos(ph))],
    legR: [-amp * Math.sin(ph), -0.25 * Math.max(0, Math.cos(ph))],
    armFwd: true, armL: [-0.35 * Math.sin(ph), -0.3], armR: [0.35 * Math.sin(ph), -0.3], faceX: 20,
  };
}

// a prop held in the hand (draw in cm, origin at the hand centre)
function handProp(p: Person, x: number, z: number, side: 1 | -1, draw: (c: CanvasRenderingContext2D) => void, rot = 0, scale = 1): Card {
  const [hx, hy] = handPos(p, side);
  return {
    x: x + hx / 100, y: Math.max(0, -hy / 100), z: z - 0.03, w: 0.3, h: 0.3, noHaze: true,
    draw: (c) => {
      c.save();
      c.translate(0, -Math.max(0, -hy / 100) * 100 - hy);
      c.rotate(rot);
      c.scale(scale, scale);
      draw(c);
      c.restore();
    },
  };
}
const magnifier = (c: CanvasRenderingContext2D) => {
  inked(c, (p) => p.rect(-1.6, 0, 3.2, 14), "#7A5B3E", 0.6);
  c.lineWidth = 2.4;
  c.strokeStyle = INK;
  c.beginPath();
  c.arc(0, -8, 8, 0, TAU);
  c.fillStyle = "rgba(190,230,255,0.55)";
  c.fill();
  c.stroke();
  c.strokeStyle = "#C9D2DA";
  c.lineWidth = 1.2;
  c.stroke();
};
const tissue = (c: CanvasRenderingContext2D) => {
  inked(c, (p) => {
    p.moveTo(-7, -5);
    p.lineTo(7, -7);
    p.lineTo(9, 6);
    p.lineTo(-8, 7);
    p.closePath();
  }, "#FFFFFF", 0.5);
};

// cape behind the hero (cm, card at the hero's feet)
function capeCard(x: number, z: number, f: number): Card {
  return {
    x, z: z + 0.04, w: 0.8, h: 1.2, noHaze: true,
    draw: (c) => {
      const wv = Math.sin(f * 0.3) * 6;
      inked(c, (p) => {
        p.moveTo(-20, -104);
        p.lineTo(20, -104);
        p.quadraticCurveTo(46 + wv, -60, 52 + wv, -22);
        p.lineTo(-30 + wv * 0.5, -26);
        p.quadraticCurveTo(-34, -70, -20, -104);
        p.closePath();
      }, "#D63A2F", 1);
    },
  };
}

// sparkles (cm)
function sparkleCard(x: number, y: number, z: number, f: number, amt: number, spread = 40): Card {
  return {
    x, y, z, w: 0.6, h: 0.6, noHaze: true,
    draw: (c) => {
      if (amt <= 0.01) return;
      for (let i = 0; i < 6; i++) {
        const t = (f * 0.05 + i / 6) % 1;
        const a = (i * TAU) / 6 + f * 0.02;
        const px = Math.cos(a) * spread * (0.5 + t * 0.5);
        const py = -spread - Math.sin(a) * spread * 0.6 - t * 10;
        const r = 5 * Math.sin(t * Math.PI) * amt;
        c.fillStyle = "#FFE27A";
        c.strokeStyle = INK;
        c.lineWidth = 0.6;
        c.beginPath();
        for (let k = 0; k < 8; k++) {
          const rr = k % 2 ? r * 0.35 : r;
          const aa = (k * Math.PI) / 4;
          if (k === 0) c.moveTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr);
          else c.lineTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr);
        }
        c.closePath();
        c.fill();
        c.stroke();
      }
    },
  };
}

// see-through ninja germs (cm)
function germCard(x: number, y: number, z: number, f: number, ph: number, amt: number): Card {
  return {
    x, y, z, w: 0.2, h: 0.2, noHaze: true,
    draw: (c) => {
      if (amt <= 0.01) return;
      c.save();
      c.globalAlpha = 0.6 * amt;
      c.translate(Math.sin(f * 0.15 + ph) * 3, Math.cos(f * 0.12 + ph) * 2);
      c.beginPath();
      for (let k = 0; k <= 20; k++) {
        const a = (k / 20) * TAU;
        const r = 6 + Math.sin(a * 6 + f * 0.3 + ph) * 1.2;
        if (k === 0) c.moveTo(Math.cos(a) * r, -8 + Math.sin(a) * r);
        else c.lineTo(Math.cos(a) * r, -8 + Math.sin(a) * r);
      }
      c.closePath();
      c.fillStyle = "#8BC34A";
      c.fill();
      c.setLineDash([1.6, 1.2]);
      c.strokeStyle = INK;
      c.lineWidth = 0.6;
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#2A2A2A";
      c.fillRect(-6.5, -10, 13, 3.6);
      c.fillStyle = "#FFFFFF";
      c.fillRect(-3.6, -9.2, 2.2, 1.6);
      c.fillRect(1.4, -9.2, 2.2, 1.6);
      c.restore();
    },
  };
}

// ---------------- camera ----------------
function cam(x: number, y: number, z: number, pitch = 0.05, focal = 1150, cy = 900): Cam {
  return { x, y, z, pitch, focal, cy };
}
const INSIDE = (t: number, push = 0.12): Cam => cam(0, 1.4, lerp(2.35, 2.35 + push, t), 0.24, 1500, 820);
function camAt(f: number): Cam {
  const { shot, start, end } = shotAt(f);
  const t = seg(f, start, end);
  switch (shot) {
    case "yard": return cam(lerp(-1.2, 0.4, t), 1.6, lerp(-3.4, -2.6, t), 0.04, 1150, 900);
    case "hall": return cam(0, lerp(2.3, 1.6, t), lerp(-2.0, -1.2, t), lerp(0.2, 0.06, t));
    case "test": return cam(lerp(-0.4, 0.4, t), 1.55, -0.9, 0.06);
    case "door": return cam(-0.15, 1.45, lerp(0.1, 0.4, t), 0.06);
    case "reveal": return INSIDE(t, 0.25);
    case "shock": return cam(-0.05, 1.5, lerp(1.0, 1.2, t), 0.03, 1150, 860);
    case "title": return cam(0, 1.6, -1.5, 0.06);
    case "rule": return cam(0, 1.6, -1.6, 0.06);
    case "inspect": return cam(0.05, 1.45, lerp(0.3, 0.5, t), 0.08);
    case "floor": return cam(lerp(-0.2, 0.15, t), 0.55, 1.7, 0.3, 1150, 760);
    case "prints": return cam(0.3, 1.9, lerp(-0.6, -0.3, t), 0.42, 1150, 700);
    case "smell": return INSIDE(t);
    case "morning": return cam(0.0, 1.5, lerp(1.0, 1.15, t), 0.03, 1150, 860);
    case "touch": return cam(0, 1.15, lerp(2.95, 3.05, t), 0.42, 1500, 760);
    case "open": return cam(0.1, 1.45, lerp(0.8, 1.0, t), 0.08);
    case "found": return INSIDE(t, 0.2);
    case "crime": return cam(lerp(-0.55, -0.2, t), 1.5, 0.2, 0.07);
    case "nobody": return cam(lerp(0.2, -0.1, t), 1.5, -1.4, 0.06);
    case "cape": return cam(0.0, 1.45, lerp(0.5, 0.7, t), 0.06);
    case "spam": return cam(-0.12, 1.2, lerp(2.9, 3.0, t), 0.35, 1500, 760);
    case "overflow": return INSIDE(t, -0.15);
    case "broken": return cam(lerp(0.0, 0.6, t), 1.55, -0.9, 0.06);
    case "relief": return cam(0, 1.5, lerp(0.95, 1.15, t), 0.03, 1150, 860);
    case "manager": return cam(0.1, 1.45, lerp(0.6, 0.8, t), 0.06);
    case "graceful": { const w = seg(f, s2f(T.graceful + 0.8), s2f(T.leftover)); return cam(lerp(-1.1, 0.4, w) - 0.1, 1.5, -0.1, 0.06); }
    case "leftover": return cam(-0.6, 1.5, lerp(0.5, 0.7, t), 0.06);
    case "proper": return INSIDE(t);
    case "company": return cam(0, 1.6, lerp(0.3, 0.1, t), 0.08);
    case "zbowl": return INSIDE(1 - t, 0.35);
    case "zfloor": return cam(0.05, 0.6, lerp(1.6, 1.8, t), 0.32, 1150, 760);
    case "zknob": return cam(0.27, 0.95, lerp(2.15, 2.3, t), 0.0, 1150, 960);
    case "zhose": return cam(0.36, 0.95, lerp(3.35, 3.45, t), 0.02, 1150, 980);
    case "clean": return cam(0.1, 1.4, lerp(0.2, 0.4, t), 0.06);
    case "bare": return cam(0.0, 0.85, lerp(2.0, 2.15, t), 0.25, 1300, 800);
    case "mix": return cam(-1.9, 1.25, lerp(0.55, 0.65, t), 0.18, 1500, 900);
    case "wash": return cam(-2.2, 1.3, lerp(0.35, 0.55, t), 0.06, 1250, 900);
    case "germs": return cam(-2.25, 1.15, lerp(0.45, 0.55, t), 0.04, 1400, 960);
    case "viewer": return INSIDE(t, 0.15);
    case "seconds": return INSIDE(t);
    case "morale": return cam(lerp(-1.0, 1.0, t), 1.6, -3.0, 0.04);
    case "roommates": return cam(0, 1.6, lerp(-1.6, -1.2, t), 0.06);
    case "choice": return cam(0, 1.5, lerp(0.95, 1.15, t), 0.03, 1150, 860);
    case "legend": return cam(lerp(-0.3, -0.6, t), 1.5, lerp(0.0, 0.4, t), 0.06);
  }
}

// ---------------- scene state per shot ----------------
const at = (f: number, s: number, d = 0.4) => seg(f, s2f(s), s2f(s + d));

function hallState(f: number, shot: Shot): HallState {
  const s = hallDefault(f);
  s.locked = [false, false, false];
  if (shot === "test") s.gloom = at(f, T.testDark, 0.6);
  if (shot === "door") s.doors = [0, at(f, T.door + 0.6, 0.8), 0];
  if (shot === "reveal") { s.inside = true; s.lid = 1; s.plaque = at(f, T.shock + 0.4, 0.4); }
  if (shot === "shock" || shot === "morning" || shot === "relief" || shot === "choice") { s.doors = [0, 1, 0]; s.lid = 1; }
  if (shot === "inspect") s.doors = [0, 1, 0];
  if (shot === "floor" || shot === "prints" || shot === "zfloor" || shot === "zknob") s.doors = [0, shot === "zknob" ? 0 : 1, 0];
  if (shot === "smell" || shot === "touch" || shot === "zbowl") { s.inside = true; s.lid = 0; s.mess = shot === "zbowl" ? 0 : 1; }
  if (shot === "open") { s.doors = [0, 1, 0]; s.lid = at(f, T.open + 0.5, 1.4); }
  if (shot === "found" || shot === "viewer") { s.inside = true; s.lid = 1; s.plaque = shot === "viewer" ? 1 : 0; }
  if (shot === "crime") { s.doors = [0, 1, 0]; s.lid = 1; s.tape = at(f, T.crime + 0.3, 0.6); }
  if (shot === "nobody") { s.doors = [0, 1, 0]; s.tape = 1; }
  if (shot === "cape") { s.doors = [0, 1, 0]; s.lid = 1; }
  if (shot === "spam" || shot === "overflow") {
    s.inside = true;
    s.lid = 1;
    const base = shot === "spam" ? T.spam : T.overflow;
    const presses = Math.max(0, Math.floor((f - s2f(base + 0.4)) / 7));
    s.lever = shot === "spam" ? (f > s2f(base + 0.4) ? ((f - s2f(base + 0.4)) % 7 < 3 ? 1 : 0) : 0) : 0;
    s.water = shot === "spam" ? Math.min(0.95, presses * 0.08) : 0.95 + at(f, T.overflow + 0.3, 2.2) * 1.0;
    s.flush = s.lever;
  }
  if (shot === "broken") { s.broken = true; s.locked = [true, true, false]; s.doors = [0, 0, at(f, T.broken + 2.2, 0.6)]; }
  if (shot === "manager") { s.doors = [0, 1, 0]; s.lid = 1; s.water = 1.6; }
  if (shot === "graceful") { s.doors = [at(f, T.graceful + 0.2, 0.7), 0, 0]; s.mess = 0; }
  if (shot === "leftover") { s.doors = [1, 0, 0]; }
  if (shot === "proper" || shot === "seconds") {
    s.inside = true;
    s.lid = 1;
    const p0 = shot === "proper" ? T.properPress : T.secondsPress;
    s.lever = at(f, p0, 0.15) - at(f, p0 + 0.5, 0.2);
    s.flush = seg(f, s2f(p0 + 0.1), s2f(p0 + 2.2));
    s.mess = 1 - seg(f, s2f(p0 + 0.6), s2f(p0 + 1.8));
  }
  if (shot === "company") s.company = at(f, T.companySign, 0.5);
  if (shot === "zfloor" || shot === "zknob" || shot === "zhose") s.hazard = at(f, (shot === "zfloor" ? T.zfloor : shot === "zknob" ? T.zknob : T.zhose) + 0.2, 0.4);
  if (shot === "zknob") s.hazardOn = "knob";
  if (shot === "zhose") s.hazardOn = "hose";
  if (shot === "zhose") { s.inside = false; s.doors = [0, 1, 0]; }
  if (shot === "clean" || shot === "bare") { s.doors = [0, 1, 0]; }
  if (shot === "roommates") s.doors = [0, 0, 0];
  if (shot === "legend") { s.wanted = at(f, T.legendPoster, 0.5); s.doors = [0, 0, 0]; }
  return s;
}

function hallScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  ctx.fillStyle = "#1E2422";
  ctx.fillRect(0, 0, W, H);
  const s = hallState(f, shot);
  drawHallCeiling(ctx, c);
  const puddle = shot === "floor" || shot === "zfloor" ? 0.6 : shot === "overflow" ? at(f, T.overflow + 1, 2) : shot === "manager" ? 1 : shot === "clean" ? 0.6 : shot === "bare" ? 0.6 : 0.2;
  drawHallFloor(ctx, c, { puddle, prints: shot === "prints" || shot === "crime" ? 1 : 0, hazard: shot === "zfloor" ? s.hazard : 0, frame: f });
  const cards = hallCards(s);
  const HZ = 1.5; // hero mark in the hall
  switch (shot) {
    case "hall": {
      const w = seg(f, s2f(T.hall + 0.4), s2f(T.test));
      cards.push(personCard(soldier(1, { ...walkPose(f), faceX: 20 }), lerp(-2.6, -1.2, w), 2.0, f));
      cards.push(personCard(soldier(0, { armR: [0.6, 1.8], faceX: -10, sway: breathe(f) }), 1.9, 1.0, f));
      break;
    }
    case "test": {
      const k = at(f, T.testDark, 0.6);
      cards.push(personCard(hero({ eyeOpen: k > 0.5 ? 1.3 : 1, tired: k * 0.5, faceX: 0, sway: breathe(f), head: sweat(k) }), 0.0, HZ, f));
      if (k < 0.5) cards.push(sparkleCard(0, 1.2, 2.5, f, 1 - k * 2, 60));
      break;
    }
    case "door": {
      const p = hero({ armR: [-0.9, -0.4], faceX: 10, pupilX: 4, eyeOpen: 1 });
      cards.push(personCard(p, -0.5, 2.4, f));
      break;
    }
    case "shock":
    case "morning":
    case "relief":
    case "choice": {
      const k = shot === "shock" ? at(f, T.shockHero + 0.1, 0.25) : 0;
      let p = hero({ eyeOpen: 1 + k * 0.5, yawn: k * 0.7, armL: [0.25 + k * 2.2, 0.4], armR: [0.25 + k * 2.2, 0.4], head: sweat(k), faceX: 0 });
      if (shot === "morning") p = hero({ tired: 0.9, eyeOpen: 0.5, headDrop: 8, faceX: 0, sway: breathe(f) * 2 });
      if (shot === "relief") p = hero({ eyeOpen: 0.08, faceX: 0, armL: [0.4, 0.2], armR: [0.4, 0.2], sway: breathe(f) });
      if (shot === "choice") p = hero({ eyeOpen: 1, faceX: 0, armR: [2.1, 0.5], glow: at(f, T.choice + 0.6, 0.6) * 0.8 });
      cards.push(personCard(p, 0.0, 2.6, f));
      if (shot === "choice") cards.push(sparkleCard(0, 1.25, 2.55, f, at(f, T.choice + 0.6, 0.6), 75));
      break;
    }
    case "inspect": {
      const sniffK = at(f, T.inspectSniff, 0.3);
      const p = hero({ faceX: lerp(-14, 14, (Math.sin(f * 0.07) + 1) / 2), pupilX: Math.sin(f * 0.07) * 4, armR: [-0.3, -1.6], eyeOpen: 1 + sniffK * 0.3, head: sweat(sniffK) });
      cards.push(personCard(p, -0.05, 2.55, f));
      cards.push(handProp(p, -0.05, 2.55, 1, magnifier, 0.2));
      cards.push({ x: 0.0, y: 0.4, z: TOILET_Z - 0.02, w: 0.5, h: 0.6, noHaze: true, draw: (cc) => stink(cc, 0, -6, sniffK, f, 10, 26) });
      break;
    }
    case "floor":
    case "zfloor":
      break;
    case "prints":
      if (shot === "prints") [[0.12, 2.33], [0.3, 1.69], [0.2, 2.01]].forEach(([x, z], i) => {
        const a = s2f(T.prints + 0.4) + i * 8;
        cards.push(evidenceCard(x + 0.12, z, i + 1, f < a ? 0 : spring({ frame: f - a, fps: FPS, config: { damping: 9, stiffness: 220 } })));
      });
      break;
    case "touch":
    case "smell":
    case "zbowl":
      break;
    case "open": {
      const lean = at(f, T.open + 0.3, 0.6);
      const p = hero({ faceX: 6, armR: [-0.4 + lean * -0.4, -1.3], eyeOpen: 0.7 + at(f, T.open + 1.6, 0.3) * 0.6, sway: -lean * 0.12, pupilY: 6 });
      cards.push(personCard(p, -0.3, 2.55, f));
      cards.push(handProp(p, -0.3, 2.55, 1, tissue));
      break;
    }
    case "crime": {
      [[-0.3, 3.4], [0.25, 3.3], [0.05, 2.7]].forEach(([x, z], i) => {
        const a = s2f(T.crime + 1.0) + i * 8;
        cards.push(evidenceCard(x, z, i + 1, f < a ? 0 : spring({ frame: f - a, fps: FPS, config: { damping: 9, stiffness: 220 } })));
      });
      cards.push(personCard(hero({ faceX: 10, armR: [1.2, 0.5], eyeOpen: 1.2, head: sweat(1) }), -0.95, 2.2, f));
      break;
    }
    case "nobody": {
      [-1.1, 0, 1.1].forEach((x, i) => {
        const shake = Math.sin(f * 0.5 + i) * 0.08 * at(f, T.nobody + 0.5 + i * 0.25, 0.3);
        cards.push(personCard(soldier(i as 0 | 1 | 2, { headTilt: shake, faceX: shake * 120, armL: [0.25, 0.1], armR: [0.25, 0.1], sway: breathe(f, i) }), x, 1.6, f));
      });
      break;
    }
    case "cape": {
      const p = hero({ faceX: 0, armR: [2.6, 0.2], armL: [0.6, 1.9], headTilt: -0.05, eyeOpen: 1 });
      cards.push(capeCard(0.0, 2.45, f));
      cards.push(personCard(p, 0.0, 2.45, f));
      break;
    }
    case "broken": {
      const w = seg(f, s2f(T.broken + 0.6), s2f(T.broken + 2.4));
      const walking = w > 0 && w < 1;
      cards.push(personCard(hero({ ...(walking ? walkPose(f) : { faceX: 10 }), }), lerp(0.0, 1.1, w), lerp(1.5, 2.4, w), f));
      const tell = at(f, T.brokenTell, 0.3);
      cards.push(personCard(sergeant({ faceX: -14, armR: [0.3 + tell * 0.9, 1.2], sway: breathe(f, 2) }), 1.75, 2.0, f));
      break;
    }
    case "manager": {
      const p = hero({ faceX: 0, armR: [1.1, 0.6], armL: [0.3, 0.2], head: helmet("#F2C14E"), tired: 0.4 });
      cards.push(personCard(p, -0.35, 2.45, f));
      cards.push(handProp(p, -0.35, 2.45, 1, plunger, 0.3));
      cards.push({ x: 0.0, y: 0.45, z: TOILET_Z - 0.05, w: 0.6, h: 0.6, noHaze: true, draw: (cc) => fountain(cc, f) });
      break;
    }
    case "graceful": {
      const w = seg(f, s2f(T.graceful + 0.8), s2f(T.leftover));
      const p = soldier(2, { ...walkPose(f, 0.16, 0.22), headTilt: -0.12, faceX: 20, glow: 0.7 });
      cards.push(personCard(p, lerp(-1.1, 0.4, w), lerp(3.0, 1.8, Math.min(1, w * 2)), f));
      cards.push(sparkleCard(lerp(-1.1, 0.4, w), 1.0, lerp(3.0, 1.8, Math.min(1, w * 2)) - 0.05, f, 1, 55));
      break;
    }
    case "leftover": {
      cards.push(gasCard(-1.1, 0.5, 3.4, at(f, T.leftover + 0.2, 1.2) * 1.0, f));
      const g = at(f, T.leftover + 1.4, 0.3);
      cards.push(personCard(hero({ faceX: -10, eyeOpen: 1 + g * 0.4, yawn: g * 0.4, armL: [0.25 + g * 2.0, 0.1 + g * 1.6], head: sweat(g) }), -0.35, 2.2, f));
      break;
    }
    case "company": {
      const nod = at(f, T.company + 0.5, 0.5);
      cards.push(personCard(soldier(1, { faceX: 14, pupilX: 4, armR: [0.5 + nod * 0.6, 1.4], armL: [0.6, 1.6], headTilt: -nod * 0.08, eyeOpen: 0.5 }), -0.85, 2.3, f));
      break;
    }
    case "zknob":
    case "zhose":
      break;
    case "clean": {
      const p = hero({ faceX: 0, armL: [0.6, 1.2], armR: [0.9, 0.9], eyeOpen: 1 });
      cards.push(personCard(p, -0.05, 2.15, f));
      cards.push(handProp(p, -0.05, 2.15, -1, glove));
      cards.push(handProp(p, -0.05, 2.15, 1, (cc) => { glove(cc); cc.translate(4, -6); sprayBottle(cc); }));
      cards.push({ x: 0.6, z: 2.0, w: 0.3, h: 1.2, shadow: 0.5, draw: (cc) => { inked(cc, (q) => q.rect(-1.5, -118, 3, 110), "#9C7A57", 0.5); inked(cc, (q) => { q.moveTo(-14, 0); q.lineTo(14, 0); q.lineTo(9, -10); q.lineTo(-9, -10); q.closePath(); }, "#5DADE2", 0.6); } });
      break;
    }
    case "bare": {
      // a bare mitten hand reaching for the stain
      const r = at(f, T.bare + 0.2, 0.8);
      cards.push({
        x: lerp(0.5, 0.18, r), y: 0.12, z: 3.15, w: 0.4, h: 0.3, noHaze: true,
        draw: (cc) => {
          cc.lineCap = "round";
          cc.strokeStyle = INK;
          cc.lineWidth = 9;
          cc.beginPath();
          cc.moveTo(50, -30);
          cc.lineTo(6, -6);
          cc.stroke();
          cc.strokeStyle = "#FFFFFF";
          cc.lineWidth = 6.6;
          cc.stroke();
          inked(cc, (q) => q.ellipse(4, -5, 7.5, 7, 0, 0, TAU), "#FFFFFF", 1.1);
        },
      });
      cards.push({ x: 0.1, z: 3.2, w: 0.3, h: 0.1, noHaze: true, draw: (cc) => { cc.fillStyle = "rgba(120,80,40,0.75)"; cc.beginPath(); cc.ellipse(0, -0.5, 9, 2.5, 0, 0, TAU); cc.fill(); } });
      break;
    }
    case "wash":
    case "germs":
    case "mix": {
      const rub = Math.sin(f * 0.5);
      const p = hero({ faceX: 0, armL: [-0.6, -1.4 + rub * 0.2], armR: [-0.6, -1.4 - rub * 0.2], eyeOpen: shot === "germs" ? 1.2 : 1, pupilY: 8 });
      cards.push(personCard(p, -2.25, 1.9, f));
      if (shot !== "mix") {
        // water stream + foam at the hands
        cards.push({
          x: -2.25, y: 0.86, z: 1.3, w: 0.4, h: 0.5, noHaze: true,
          draw: (cc) => {
            cc.fillStyle = "rgba(170,215,235,0.8)";
            cc.fillRect(1, -18, 2.2, 18);
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * TAU + f * 0.08;
              const r = 2.2 + ((i * 7) % 3);
              cc.fillStyle = "#FFFFFF";
              cc.strokeStyle = "rgba(29,27,26,0.5)";
              cc.lineWidth = 0.4;
              cc.beginPath();
              cc.arc(Math.cos(a) * 7 + rub, -26 + Math.sin(a) * 4, r, 0, TAU);
              cc.fill();
              cc.stroke();
            }
          },
        });
      }
      if (shot === "germs") {
        const k = at(f, T.germs + 0.4, 0.8);
        [[-0.17, 0.8], [0.15, 0.86], [0.03, 0.72], [-0.06, 0.95]].forEach(([dx, y], i) => cards.push(germCard(-2.25 + dx, y, 1.55, f, i * 1.7, k * (1 - at(f, T.germsGone, 0.6)))));
      }
      if (shot === "mix") cards.push(cupCard(-1.85, 0.88, 1.45, at(f, T.mix + 0.8, 0.7)));
      break;
    }
    case "roommates": {
      cards.push(personCard(soldier(0, { faceX: 10, sway: breathe(f) }), -1.4, 2.0, f));
      cards.push(personCard(soldier(2, { faceX: -6, yawn: 0.3 + 0.2 * Math.sin(f * 0.3), sway: breathe(f, 1) }), 1.3, 1.9, f));
      cards.push(personCard(hero({ faceX: 0, sway: breathe(f, 2) }), 0.0, 1.2, f));
      cards.push(personCard(soldier(1, { faceX: -16, armR: [0.4, 1.9], sway: breathe(f, 3) }), 0.7, 3.0, f));
      break;
    }
    case "legend": {
      const k = at(f, T.legendCrowd, 0.4);
      [0.05, 0.7, 1.35].forEach((x, i) => cards.push(personCard(soldier(i as 0 | 1 | 2, { faceX: -16, pupilX: -4, tired: k, armR: [0.3 + k * 2.2, 0.4 + Math.sin(f * 0.6 + i) * 0.4 * k], sway: breathe(f, i) }), x, 2.0 + i * 0.2, f)));
      break;
    }
  }
  // flies over an open, unflushed toilet
  if (s.lid > 0.5 && s.mess > 0.3 && !s.inside) cards.push({ x: 0, y: 0.5, z: TOILET_Z - 0.03, w: 0.4, h: 0.4, noHaze: true, draw: (cc) => flies(cc, 0, -6, 9, 3, f, 0.8) });
  if (s.inside && s.lid < 0.5 && (shot === "smell")) {
    const k = at(f, T.smell + 0.4, 0.8);
    cards.push({ x: 0, y: 0.45, z: TOILET_Z - 0.04, w: 0.4, h: 0.5, noHaze: true, draw: (cc) => { stink(cc, 0, -2, k, f, 12, 30); flies(cc, 0, -14, 10, 2, f, 0.8 * k); } });
  }
  if (s.inside && s.lid > 0.5 && s.mess > 0.3) cards.push({ x: 0, y: 0.47, z: TOILET_Z - 0.03, w: 0.4, h: 0.4, noHaze: true, draw: (cc) => { flies(cc, 0, -6, 10, 3, f, 0.8); stink(cc, 0, -2, 0.7, f, 10, 22); } });
  if (s.inside && (shot === "spam" || shot === "proper" || shot === "seconds")) {
    const press = s.lever;
    cards.push({
      x: -0.21, y: 0.74, z: TOILET_Z - 0.06, w: 0.4, h: 0.3, noHaze: true,
      draw: (cc) => {
        cc.save();
        cc.translate(-14, -2 + press * 6);
        cc.lineCap = "round";
        cc.strokeStyle = INK;
        cc.lineWidth = 9;
        cc.beginPath();
        cc.moveTo(-40, -30);
        cc.lineTo(0, -6);
        cc.stroke();
        cc.strokeStyle = "#FFFFFF";
        cc.lineWidth = 6.6;
        cc.stroke();
        inked(cc, (q) => q.ellipse(0, -5, 7, 6.5, 0, 0, TAU), "#FFFFFF", 1.1);
        cc.restore();
      },
    });
  }
  if (shot === "overflow") cards.push({ x: 0, y: 0.43, z: TOILET_Z - 0.05, w: 0.5, h: 0.5, noHaze: true, draw: (cc) => splashDrops(cc, f, at(f, T.overflow + 0.6, 0.4)) });
  // the toilet-touch insert: a hand with tissue on the lid edge + zones
  if (shot === "touch") {
    const r = at(f, T.touchHand, 0.6);
    cards.push({
      x: lerp(0.35, 0.05, r), y: 0.42, z: TOILET_Z - 0.12, w: 0.4, h: 0.3, noHaze: true,
      draw: (cc) => {
        cc.lineCap = "round";
        cc.strokeStyle = INK;
        cc.lineWidth = 9;
        cc.beginPath();
        cc.moveTo(40, -40);
        cc.lineTo(4, -6);
        cc.stroke();
        cc.strokeStyle = "#FFFFFF";
        cc.lineWidth = 6.6;
        cc.stroke();
        inked(cc, (q) => q.ellipse(2, -4, 7.5, 7, 0, 0, TAU), "#FFFFFF", 1.1);
        cc.save();
        cc.translate(-1, 0);
        tissue(cc);
        cc.restore();
      },
    });
  }
  drawCards(ctx, c, cards, { color: [30, 36, 34], density: 0.02, start: 3 });
  if (s.inside) drawStallWalls(ctx, c);
  // spotlight on the masterpiece
  if (shot === "reveal" || shot === "viewer" || shot === "found") {
    const p = project(c, 0, 0.42, TOILET_Z);
    if (p) {
      const k = 1;
      if (k > 0) {
        const g = ctx.createRadialGradient(p.sx, p.sy - 60, 40, p.sx, p.sy - 60, 520);
        g.addColorStop(0, "rgba(255,240,190,0.0)");
        g.addColorStop(1, "rgba(10,12,16,0.55)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }
  if (s.gloom > 0.01) {
    ctx.fillStyle = `rgba(20,30,40,${0.45 * s.gloom})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function fountain(c: CanvasRenderingContext2D, f: number) {
  c.fillStyle = "rgba(143,184,201,0.9)";
  c.strokeStyle = INK;
  c.lineWidth = 0.5;
  for (let i = 0; i < 9; i++) {
    const t = ((f * 0.05 + i / 9) % 1);
    const a = -Math.PI / 2 + (i - 4) * 0.22;
    const r = t * 34;
    c.beginPath();
    c.arc(Math.cos(a) * r, -6 + Math.sin(a) * r + t * t * 30, 2.2 * (1 - t * 0.5), 0, TAU);
    c.fill();
    c.stroke();
  }
}
function splashDrops(c: CanvasRenderingContext2D, f: number, k: number) {
  if (k <= 0) return;
  for (let i = 0; i < 7; i++) {
    const t = ((f * 0.06 + i / 7) % 1);
    const dir = (i - 3) * 0.5;
    c.fillStyle = "rgba(143,184,201,0.95)";
    c.beginPath();
    c.ellipse(dir * 22 * t, -6 - 26 * t + 40 * t * t, 1.8, 2.6, 0, 0, TAU);
    c.fill();
  }
}

function yardScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  yardSky(ctx, "day", W, H);
  // warm morning wash
  ctx.fillStyle = "rgba(255,190,120,0.18)";
  ctx.fillRect(0, 0, W, H);
  drawYardGround(ctx, c, "day");
  const cards = yardCards("day", f);
  const gloom = shot === "morale" ? at(f, T.morale + 0.4, 0.8) : 0;
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++) {
      const x = -2.4 + i * 1.2 + r * 0.6;
      const z = 2.6 + r * 1.3;
      const kind = ((i + r) % 3) as 0 | 1 | 2;
      const isHero = r === 0 && i === 2 && shot === "yard";
      const p = isHero ? hero({ faceX: 0, armL: [0.06, 0], armR: [0.06, 0], sway: breathe(f) }) : soldier(kind, { faceX: 0, armL: [0.06, 0], armR: [0.06, 0], tired: gloom * 0.9, eyeOpen: 1 - gloom * 0.4, headDrop: gloom * 10, sway: breathe(f, i + r * 3) });
      cards.push(personCard(p, x, z, f));
    }
  if (gloom > 0) cards.push(gasCard(0.2, 1.2, 3.6, gloom * 1.6, f));
  drawCards(ctx, c, cards, { color: [236, 214, 196], density: 0.04, start: 6 });
}

function drawFrame(ctx: CanvasRenderingContext2D, f: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  const { shot, start } = shotAt(f);
  const c = camAt(f);
  if (shot === "yard" || shot === "morale") yardScene(ctx, f, c, shot);
  else hallScene(ctx, f, c, shot);
  if (shot === "rule" || shot === "title") {
    ctx.fillStyle = "rgba(8,14,12,0.55)";
    ctx.fillRect(0, 0, W, H);
  }
  // magnifier inset: the bowl seen from above (censored)
  if (shot === "found") {
    const k = spring({ frame: f - s2f(T.found + 0.3), fps: FPS, config: { damping: 12, stiffness: 180 } });
    if (f > s2f(T.found + 0.3)) bowlInset(ctx, f, 540, 560, 250 * k);
  }
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, 420, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const d = f - start;
  if (start > 0 && d < 4) {
    ctx.fillStyle = `rgba(10,10,14,${(1 - d / 4) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function bowlInset(ctx: CanvasRenderingContext2D, f: number, cx: number, cy: number, r: number) {
  if (r < 4) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = "#E9EEF1";
  ctx.fill();
  ctx.clip();
  // bowl from above
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, r * 0.82, r * 0.95, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#A9D4E4";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 30, r * 0.55, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(29,27,26,0.4)";
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy + 30);
  const sc = r / 100;
  ctx.scale(sc * 3.2, sc * 3.2);
  mosaic(ctx, 0, 0, 14, 9, 2.6, f);
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc * 2.2, sc * 2.2);
  flies(ctx, 0, -10, 30, 4, f, 1.6);
  ctx.restore();
  ctx.restore();
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#C9D2DA";
  ctx.stroke();
  // handle
  ctx.save();
  ctx.translate(cx + r * 0.72, cy + r * 0.72);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = "#7A5B3E";
  ctx.fillRect(-18, 0, 36, r * 0.7);
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.strokeRect(-18, 0, 36, r * 0.7);
  ctx.restore();
}

// ---------------- overlays ----------------
const Check: React.FC<{ items: [number, string][]; top?: number }> = ({ items, top = 230 }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", top, left: 90, width: 900, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
      {items.map(([t, txt], i) => {
        if (f < s2f(t)) return null;
        const s = spring({ frame: f - s2f(t), fps: FPS, config: { damping: 12, stiffness: 200 } });
        return (
          <div key={i} style={{ ...pill("#FFFDF8", 50), transform: `translateX(${(1 - s) * -200}px)`, opacity: s }}>
            <span style={{ color: "#3E9B5C" }}>✓</span> {txt}
          </div>
        );
      })}
    </div>
  );
};

const Countdown: React.FC<{ from: number; secs: number }> = ({ from, secs }) => {
  const f = useCurrentFrame();
  if (f < s2f(from)) return null;
  const el = (f - s2f(from)) / FPS;
  const k = Math.min(1, el / secs);
  const shown = Math.max(0, Math.ceil(20 - k * 20));
  const r = 120;
  const a = k * TAU;
  return (
    <div style={{ position: "absolute", top: 220, right: 70 }}>
      <svg width={300} height={300} viewBox="-150 -150 300 300">
        <circle r={r + 14} fill="#FFFDF8" stroke={INK} strokeWidth={8} />
        <path d={`M0 0 L0 ${-r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${Math.sin(a) * r} ${-Math.cos(a) * r} Z`} fill="#5DADE2" />
        <text y={26} textAnchor="middle" fontFamily="Kanit" fontWeight={800} fontSize={86} fill={INK}>{shown}</text>
        <text y={80} textAnchor="middle" fontFamily="Kanit" fontWeight={800} fontSize={30} fill={INK}>วินาที</text>
      </svg>
    </div>
  );
};

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const { shot, start, end, idx } = shotAt(f);
  const n: React.ReactNode[] = [];
  if (shot === "yard") n.push(popAt(f, T.yardChip, T.hall, <span style={pill("#FFFDF8", 54)}>ทุกนายต้องเผชิญ...</span>, "y1", 250));
  if (shot === "hall") n.push(popAt(f, T.hall + 0.3, T.test, <span style={pill("#F2C14E", 66)}>ห้องน้ำส่วนกลาง</span>, "h1", 250));
  if (shot === "test") {
    n.push(popAt(f, T.test + 0.2, T.testDark, <span style={pill("#D6F5E3", 58)}>✨ พื้นที่แห่งความสะอาด?</span>, "t1", 250));
    n.push(popAt(f, T.testDark, T.door, <Stamp text="สนามทดสอบจิตใจ" at={s2f(T.testDark)} size={78} bg="#FFFDF8" />, "t2", 250));
  }
  if (shot === "reveal") n.push(popAt(f, T.shock + 0.3, T.shockHero, <span style={pill("#F2C14E", 62)}>ผลงานชิ้นเอก...</span>, "s1", 250));
  if (shot === "shock") n.push(popAt(f, T.shockNoFlush, T.title, <span style={pill("#FECACA", 60)}>ไม่กดชักโครก!</span>, "s2", 250));
  if (shot === "title") {
    const s = spring({ frame: f - start, fps: FPS, config: { damping: 12, stiffness: 150 } });
    n.push(
      <div key="title" style={{ position: "absolute", top: 520, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${s}) rotate(-2deg)` }}>
        <div style={{ width: 920, background: "#D9C18A", border: `8px solid #8C6A3E`, borderRadius: 14, padding: "24px 36px 34px", boxShadow: "0 16px 0 rgba(0,0,0,0.45)", textAlign: "center", position: "relative" }}>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 38, color: "#2E5E4E", letterSpacing: 6 }}>THE TOILET SURVIVAL GUIDE</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 92, color: INK, lineHeight: 1.1, marginTop: 6 }}>คู่มือเอาตัวรอด</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 52, color: "#2E5E4E", marginTop: 4 }}>จากมรดกตกทอดในห้องน้ำค่ายทหาร</div>
          <div style={{ position: "absolute", right: -16, bottom: -40 }}>
            <Stamp text="ลับมาก" at={start + 12} size={50} />
          </div>
        </div>
      </div>,
    );
  }
  if (RULES[idx]) n.push(<RulePage key={`r${idx}`} n={RULES[idx].n} text={RULES[idx].text} at={start} out={end} theme={THEME} />);
  // rule 1 checklist (shown across the three inspection shots)
  if (shot === "inspect" || shot === "floor" || shot === "prints") n.push(<Check key="c1" items={[[T.inspectSniff, "กลิ่นผิดปกติ?"], [T.floor + 0.2, "น้ำกระเด็นบนพื้น?"], [T.prints + 0.3, "ร่องรอยคนก่อนหน้า?"]]} />);
  if (shot === "smell") n.push(popAt(f, T.smell + 0.8, T.morning, <span style={pill("#D9F2B4", 58)}>ยังไม่เปิด... ก็ได้กลิ่นแล้ว</span>, "sm", 250));
  if (shot === "morning") n.push(popAt(f, T.morning + 0.5, T.r2, <span style={pill("#FDE68A", 58)}>☀ 05:30 น. เช้าวันใหม่</span>, "mo", 250));
  if (shot === "touch") {
    n.push(popAt(f, T.touch + 0.3, T.open, <span style={pill("#FECACA", 52)}>✗ ส่วนที่เปียก / สกปรก</span>, "z1", 250));
    n.push(popAt(f, T.touchHand, T.open, <span style={pill("#D6F5E3", 52)}>✓ จับขอบฝาแบบมีกระดาษ</span>, "z2", 360));
  }
  if (shot === "open") n.push(popAt(f, T.open + 1.8, T.found, <span style={pill("#FFFDF8", 56)}>ประเมินสถานการณ์...</span>, "op", 250));
  if (shot === "found") n.push(popAt(f, T.foundStamp, T.crime, <Stamp text="อย่าเพิ่งใช้งาน!" at={s2f(T.foundStamp)} size={80} bg="#FFFDF8" />, "fd", 1080));
  if (shot === "crime") n.push(popAt(f, T.crime + 0.5, T.nobody, <span style={pill("#F2C14E", 54)}>หลักฐานอาชญากรรมทางสุขอนามัย</span>, "cr", 250));
  if (shot === "nobody") {
    n.push(popAt(f, T.nobody + 0.3, T.r3, <span style={pill("#FFFDF8", 56)}>เจ้าของคือใคร?</span>, "nb", 250));
    ["ไม่ใช่ผม", "ไม่ใช่ผม", "ผมเปล่านะ"].forEach((t, i) => {
      const a = s2f(T.nobody + 0.6 + i * 0.3);
      if (f < a) return;
      const k = spring({ frame: f - a, fps: FPS, config: { damping: 11, stiffness: 200 } });
      n.push(<div key={`nb${i}`} style={{ position: "absolute", top: 560 + (i % 2) * 60, left: [60, 400, 720][i], transform: `scale(${k})` }}><span style={pill("#FFFFFF", 40)}>{t}</span></div>);
    });
  }
  if (shot === "cape") n.push(<Check key="c3" items={[[T.cape + 1.2, "โถไม่อุดตัน"], [T.capeSystem, "ระบบชักโครกปกติ"]]} />);
  if (shot === "spam") {
    const presses = Math.max(0, Math.floor((f - s2f(T.spam + 0.4)) / 7));
    n.push(popAt(f, T.spam + 0.4, T.overflow, <span style={pill("#FECACA", 60)}>กด x{presses}</span>, "sp", 250));
  }
  if (shot === "overflow") n.push(popAt(f, T.overflow + 0.6, T.broken, <Stamp text="น้ำล้น!" at={s2f(T.overflow + 0.6)} size={96} bg="#FFFDF8" />, "ov", 250));
  if (shot === "broken") {
    n.push(popAt(f, T.broken + 0.4, T.relief, <span style={pill("#FFFDF8", 52)}>ใช้ห้องอื่น →</span>, "b1", 250));
    n.push(popAt(f, T.brokenTell, T.relief, <span style={pill("#FFFFFF", 42)}>ห้อง 2 เสียครับ!</span>, "b2", 620));
  }
  if (shot === "relief") n.push(popAt(f, T.relief + 0.3, T.manager, <span style={pill("#D6F5E3", 60)}>มาเพื่อ "ปลดทุกข์"</span>, "rl", 250));
  if (shot === "manager") {
    n.push(popAt(f, T.manager + 0.3, T.r4, <span style={pill("#FDE68A", 46)}>ผู้จัดการวิกฤตระบบประปา</span>, "mg", 250));
    n.push(popAt(f, T.managerNo, T.r4, <Stamp text="ไม่ใช่หน้าที่คุณ!" at={s2f(T.managerNo)} size={76} bg="#FFFDF8" />, "mg2", 1100));
  }
  if (shot === "graceful") n.push(popAt(f, T.graceful + 1.0, T.leftover, <span style={pill("#FFFDF8", 56)}>เดินออกอย่างสง่างาม ✨</span>, "gr", 250));
  if (shot === "leftover") n.push(popAt(f, T.leftover + 0.6, T.proper, <span style={pill("#D9F2B4", 52)}>ภาระของคนที่มาทีหลัง</span>, "lo", 250));
  if (shot === "proper") n.push(<Check key="c4" items={[[T.proper + 0.4, "รักษาสุขอนามัยตัวเอง"], [T.properMid, "ใช้ห้องน้ำอย่างรับผิดชอบ"], [T.properPress, "กดชักโครกทุกครั้ง"]]} />);
  if (shot === "company") n.push(popAt(f, T.companyNo, T.r5, <Stamp text="ไม่ใช่!" at={s2f(T.companyNo)} size={130} bg="#FFFDF8" />, "co", 1150));
  if (shot === "zbowl") n.push(popAt(f, T.zbowl + 0.3, T.zfloor, <span style={pill("#FFFDF8", 54)}>ภัยไม่ได้อยู่แค่ในโถ...</span>, "zb", 250));
  if (shot === "zfloor") n.push(popAt(f, T.zfloor + 0.2, T.zknob, <span style={pill("#FECACA", 64)}>⚠ พื้น</span>, "zf", 250));
  if (shot === "zknob") n.push(popAt(f, T.zknob + 0.2, T.zhose, <span style={pill("#FECACA", 64)}>⚠ ลูกบิดประตู</span>, "zk", 250));
  if (shot === "zhose") n.push(popAt(f, T.zhose + 0.2, T.clean, <span style={pill("#FECACA", 64)}>⚠ สายฉีดชำระ</span>, "zh", 250));
  if (shot === "clean") n.push(<Check key="c5" items={[[T.clean + 0.6, "เลี่ยงการสัมผัสตรง"], [T.cleanTools, "แจ้งผู้ดูแล / ใช้อุปกรณ์"]]} />);
  if (shot === "bare") n.push(popAt(f, T.bare + 0.9, T.mix, <Stamp text="ห้ามมือเปล่า!" at={s2f(T.bare + 0.9)} size={88} bg="#FFFDF8" />, "ba", 300));
  if (shot === "mix") n.push(popAt(f, T.mixX, T.r6, <Stamp text="ห้ามปะปน!" at={s2f(T.mixX)} size={96} bg="#FFFDF8" />, "mx", 300));
  if (shot === "wash") {
    n.push(<Countdown key="cd" from={T.wash + 0.3} secs={Math.max(3, T.germs - T.wash - 0.4)} />);
    n.push(<Check key="c6" top={560} items={[[T.washSteps[0], "ฝ่ามือ"], [T.washSteps[1], "หลังมือ"], [T.washSteps[2], "ซอกนิ้ว"], [T.washSteps[3], "ปลายนิ้ว"]]} />);
  }
  if (shot === "germs") {
    n.push(popAt(f, T.germs + 0.3, T.r7, <span style={pill("#FFFDF8", 50)}>ไม่มีกลิ่น · ไม่มีเสียง · มองไม่เห็น</span>, "gm", 250));
  }
  if (shot === "viewer") {
    n.push(popAt(f, T.viewer + 0.4, T.viewer2, <span style={pill("#FECACA", 56)}>ใช้แล้ว... ไม่กด</span>, "vw0", 250));
    n.push(popAt(f, T.viewer2 + 0.3, T.seconds, <span style={pill("#FFFDF8", 54)}>ผู้ชมไม่ได้สมัครใจ</span>, "vw", 250));
  }
  if (shot === "seconds") n.push(popAt(f, T.seconds + 0.2, T.morale, <span style={pill("#D6F5E3", 66)}>⏱ แค่ 3 วินาที</span>, "sc", 250));
  if (shot === "morale") n.push(popAt(f, T.morale + 0.6, T.roommates, <span style={pill("#FECACA", 54)}>เช้านี้พังทั้งกองร้อย</span>, "ml", 250));
  if (shot === "roommates") n.push(popAt(f, T.roommates + 0.6, T.choice, <span style={pill("#FFFDF8", 52)}>เลือกเพื่อนร่วมห้องไม่ได้...</span>, "rm", 250));
  if (shot === "choice") n.push(popAt(f, T.choice + 0.6, T.legend, <span style={pill("#D6F5E3", 60)}>แต่เลือก "กด" ได้</span>, "ch", 250));
  if (shot === "legend") {
    n.push(popAt(f, T.legendPoster + 0.3, T.end, <span style={pill("#F2C14E", 56)}>ตำนานที่ถูกสาปแช่ง</span>, "lg", 250));
    if (f >= s2f(T.endStamp)) n.push(<div key="end" style={{ position: "absolute", top: 1240, width: "100%", textAlign: "center" }}><Stamp text="กดชักโครกทุกครั้ง!" at={s2f(T.endStamp)} size={84} rot={-6} bg="#FFFDF8" /></div>);
  }
  return <AbsoluteFill>{n}</AbsoluteFill>;
};

// ---------------- sound ----------------
export function buildToiletCues() {
  const c: { at: number; file: string; vol: number }[] = [{ at: 0, file: "docbed", vol: 0.22 }];
  for (let k = 1; k < SHOTS.length; k++) c.push({ at: s2f(SHOTS[k][0]), file: "whoosh", vol: 0.12 });
  for (const k of Object.keys(RULES).map(Number)) {
    c.push({ at: s2f(SHOTS[k][0]), file: "dundun", vol: 0.42 });
    c.push({ at: s2f(SHOTS[k][0]) + 10, file: "stamp", vol: 0.45 });
  }
  const add = (t: number, file: string, vol: number) => c.push({ at: s2f(t), file, vol });
  add(T.title + 0.4, "stamp", 0.5);
  add(T.testDark, "stinger", 0.35);
  add(T.door + 0.6, "creak", 0.45);
  add(T.shock + 0.3, "stinger", 0.45);
  add(T.shockHero + 0.2, "pop", 0.35);
  add(T.inspectSniff, "sniff", 0.5);
  add(T.floor + 0.3, "plop", 0.35);
  for (let i = 0; i < 3; i++) c.push({ at: s2f(T.prints + 0.4) + i * 8, file: "pop", vol: 0.3 });
  add(T.smell + 0.4, "buzz", 0.25);
  add(T.touchHand, "squeak", 0.3);
  add(T.open + 0.5, "creak", 0.35);
  add(T.open + 1.8, "lid", 0.5);
  add(T.found + 0.3, "buzz", 0.3);
  add(T.foundStamp, "stamp", 0.5);
  for (let i = 0; i < 3; i++) c.push({ at: s2f(T.crime + 1.0) + i * 8, file: "pop", vol: 0.3 });
  add(T.cape + 0.1, "fanfare", 0.35);
  for (let i = 0; i < 8; i++) c.push({ at: s2f(T.spam + 0.4) + i * 7, file: "clunk", vol: 0.3 });
  add(T.overflow + 0.3, "gurgle", 0.5);
  add(T.overflow + 0.6, "splash", 0.5);
  add(T.broken + 0.4, "pop", 0.3);
  add(T.managerNo, "stamp", 0.55);
  add(T.graceful + 0.2, "creak", 0.4);
  add(T.graceful + 0.9, "shimmer", 0.35);
  add(T.leftover + 1.4, "sniff", 0.5);
  add(T.properPress, "clunk", 0.4);
  add(T.properPress + 0.1, "flush", 0.55);
  add(T.companySign, "pop", 0.35);
  add(T.companyNo, "stamp", 0.6);
  add(T.zfloor + 0.2, "beep", 0.3);
  add(T.zknob + 0.2, "beep", 0.3);
  add(T.zhose + 0.2, "beep", 0.3);
  add(T.bare + 0.9, "stamp", 0.5);
  add(T.mixX, "stamp", 0.5);
  add(T.wash + 0.2, "tap", 0.4);
  add(T.wash + 1.0, "scrub", 0.35);
  add(T.wash + 4.0, "scrub", 0.35);
  add(T.germs + 0.3, "mystery", 0.35);
  add(T.secondsPress, "clunk", 0.4);
  add(T.secondsPress + 0.1, "flush", 0.55);
  add(T.morale + 0.4, "heart", 0.35);
  add(T.choice + 0.6, "shimmer", 0.35);
  add(T.legendPoster, "stinger", 0.4);
  add(T.endStamp, "stamp", 0.6);
  return c;
}
export const TM_CUES = buildToiletCues();

export const ToiletManual: React.FC = () => {
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: "#15171D" }}>
      <Stage ready={ready} draw={drawFrame} />
      <Overlay />
      <Subtitles lines={LINES} />
      {!SILENT && <Audio src={staticFile("vo/vo6.mp3")} />}
      {!SILENT &&
        TM_CUES.map((s, i) => (
          <Sequence key={i} from={s.at} layout="none">
            <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const ToiletManualComposition = () => <Composition id="ToiletManual" component={ToiletManual} durationInFrames={TM_DUR} fps={FPS} width={W} height={H} />;

void [interpolate, clamp, FIG, STALL_X, brush, cupCard, germCard, nose];
