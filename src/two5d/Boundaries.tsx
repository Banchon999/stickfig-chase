import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Composition, Sequence, continueRender, delayRender, getInputProps, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { basePose } from "../draw";
import { Cam, Card, H, W, drawCards, drawGround, lerp, project, seg } from "./engine";
import { Person, RoomState, drawFloorLine, drawRoomFloor, mixColor, personCard, roomCards, streetCards } from "./props";

const FPS = 30;
export const B_DUR = 2970; // 99 s (VO 97.7 s + tail)
const s2f = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SILENT = Boolean((typeof window === "undefined" ? {} : (getInputProps() as { silent?: boolean })).silent);

// ---------------- script (Whisper large-v3 timings) ----------------
const LINES: [number, number, string][] = [
  [0.0, 2.52, "บางครั้ง คนที่มึงรักมากที่สุด"],
  [2.98, 5.86, "อาจเป็นคนที่ทำให้มึงค่อย ๆ สูญเสียความเป็นตัวเอง"],
  [5.86, 7.42, "โดยที่มึงไม่รู้ตัว"],
  [8.62, 11.04, "ตอนแรก มึงแค่อยากให้เขามีความสุข"],
  [11.5, 13.32, "เขาอยากไปไหน มึงก็ไป"],
  [13.68, 15.74, "เขาไม่ชอบอะไร มึงก็เลิกทำ"],
  [16.08, 18.48, "เขาไม่พอใจอะไร มึงก็รีบขอโทษ"],
  [18.48, 21.72, "แม้บางครั้ง มึงจะไม่ได้ทำอะไรผิดเลยก็ตาม"],
  [22.56, 26.84, "มึงทำแบบนั้นซ้ำ ๆ จนวันหนึ่ง มึงเริ่มแยกไม่ออกแล้วว่า"],
  [26.84, 29.56, "สิ่งที่มึงทำ เพราะมึงอยากทำจริง ๆ"],
  [29.56, 32.68, "หรือมึงแค่กลัวว่า ถ้าไม่ทำตามใจเขา"],
  [32.68, 36.24, "เขาจะโกรธ เขาจะผิดหวัง หรือเขาจะรักมึงน้อยลง"],
  [36.92, 38.76, "แล้วสิ่งที่น่ากลัวที่สุดคือ"],
  [39.26, 43.58, "เมื่อมึงยอมมาตลอด อีกฝ่ายอาจเริ่มมองการยอมของมึงเป็นเรื่องปกติ"],
  [43.58, 47.36, "จนวันที่มึงพูดว่าไม่ วันที่มึงอยากมีเวลาส่วนตัว"],
  [47.36, 51.32, "หรือวันที่มึงเลือกตัวเองขึ้นมาบ้าง เขาอาจรู้สึกว่ามึงเปลี่ยนไป"],
  [51.32, 54.7, "ทั้งที่จริง ๆ แล้ว มึงแค่เริ่มกลับมาเป็นตัวเอง"],
  [55.44, 56.72, "แต่ต้องเข้าใจอย่างหนึ่งนะ"],
  [57.04, 60.7, "ไม่ใช่ทุกคนที่เคยชินกับการที่มึงยอม จะตั้งใจเอาเปรียบมึง"],
  [60.98, 64.46, "บางคนอาจไม่เคยรู้เลยว่ามึงอึดอัด เพราะมึงไม่เคยพูดออกมา"],
  [64.72, 68.78, "แต่ถ้ามึงสื่อสารความรู้สึกแล้ว อีกฝ่ายยังบังคับให้มึงยอมทุกครั้ง"],
  [68.78, 71.2, "ทำให้มึงรู้สึกผิดทุกครั้งที่ปฏิเสธ"],
  [71.42, 73.48, "นั่นไม่ใช่แค่เรื่องของการตามใจแล้ว"],
  [73.48, 77.04, "แต่มันคือปัญหาเรื่องการเคารพขอบเขตของกันและกัน"],
  [77.66, 78.46, "จำไว้นะมึง"],
  [78.46, 82.14, "ความรักที่ดีไม่ควรทำให้มึงต้องกลัวการเป็นตัวเอง"],
  [82.14, 85.58, "มึงไม่จำเป็นต้องยอมทุกอย่างเพื่อพิสูจน์ว่ามึงรักใคร"],
  [85.82, 90.58, "และมึงก็ไม่จำเป็นต้องทำให้อีกคนมีความสุข ด้วยการทำให้ตัวเองทุกข์อยู่ตลอดเวลา"],
  [91.06, 95.96, "เพราะสุดท้ายแล้ว คนที่มึงไม่ควรสูญเสียไปเพียงเพื่อรักษาความรักเอาไว้"],
  [95.96, 97.6, "ก็คือตัวมึงเอง"],
];

// scene cuts (frames), each on a voice-over line boundary
const SC = { A: 0, B: s2f(8.3), C: s2f(11.4), D: s2f(13.55), E: s2f(22.3), F: s2f(36.6), G: s2f(55.1), H: s2f(77.4) };

// ---------------- character state over time ----------------
const HERO = { x: -0.75, z: 1.5 };
const PART = { x: 0.85, z: 1.9 };

function heroSelf(f: number) {
  return interpolate(
    f,
    [0, s2f(11.5), s2f(14.2), s2f(16.5), s2f(19), s2f(24), s2f(36), s2f(46), s2f(47.6), s2f(52), s2f(55.5), s2f(70), s2f(73.5), s2f(80), s2f(90), s2f(96)],
    [1, 1, 0.82, 0.68, 0.56, 0.45, 0.38, 0.18, 0.32, 0.72, 0.6, 0.42, 0.62, 0.72, 0.88, 1],
    clamp,
  );
}
function itemLife(f: number, goneAt: number, backAt: number) {
  return Math.min(1, Math.max(0, 1 - seg(f, s2f(goneAt), s2f(goneAt) + 24) + seg(f, s2f(backAt), s2f(backAt) + 30)));
}
function roomState(f: number): RoomState {
  return {
    guitar: itemLife(f, 14.3, 80.0),
    camera: itemLife(f, 19.2, 83.0),
    painting: itemLife(f, 40.2, 86.0),
    plant: itemLife(f, 42.0, 88.6),
    books: itemLife(f, 44.6, 91.2),
    tally: seg(f, s2f(39.3), s2f(47)) * (1 - seg(f, s2f(78), s2f(84))),
    mirror: seg(f, s2f(93.6), s2f(95.4)),
    heroSelf: 1,
    night: 1,
  };
}

const idle = (f: number, ph = 0) => Math.sin(f * 0.07 + ph) * 0.012;
const walkLegs = (ph: number, A = 0.32): Partial<Person> => ({
  legL: [A * Math.sin(ph), -0.35 * Math.max(0, -Math.cos(ph))],
  legR: [-A * Math.sin(ph), -0.35 * Math.max(0, Math.cos(ph))],
  armFwd: true,
  armL: [-A * 0.8 * Math.sin(ph), 0.25],
  armR: [A * 0.8 * Math.sin(ph), 0.25],
});

function heroPose(f: number): Person {
  const self = heroSelf(f);
  const p: Person = {
    ...basePose,
    shirt: mixColor("#9A9A9A", "#F2C14E", self),
    rim: undefined,
    sway: idle(f),
    tired: Math.max(0, 0.75 - self) * 0.9,
    faceX: 8,
    glow: f > SC.H ? seg(f, s2f(88), s2f(97)) * 0.8 : 0,
  };
  // A: glance at partner
  if (f < SC.B) p.faceX = 12;
  // B: offering — arm out
  if (f >= SC.B && f < SC.C) {
    const a = seg(f, SC.B + 6, SC.B + 18);
    p.armR = [0.25 + a * 1.05, 0.1 + a * 0.5];
    p.faceX = 14;
  }
  // D: bowing apologies
  if (f >= SC.D && f < SC.E) {
    const down = seg(f, s2f(14.2), s2f(14.8)) * (1 - seg(f, s2f(15.6), s2f(16.0)));
    p.headDrop = down * 14;
    p.pupilX = -4 * down;
    for (const b of [16.4, 17.6, 19.0, 20.3]) {
      const k = seg(f, s2f(b), s2f(b) + 6) * (1 - seg(f, s2f(b) + 14, s2f(b) + 22));
      p.headDrop = Math.max(p.headDrop ?? 0, k * 26);
      p.headTilt = (p.headTilt ?? 0) + k * 0.12;
      p.armL = [0.12, 0.05];
      p.armR = [0.12, 0.05];
    }
  }
  // E: confusion — eyes dart, head tilts
  if (f >= SC.E && f < SC.F) {
    p.pupilX = Math.sin(f * 0.05) * 5;
    p.headTilt = Math.sin(f * 0.02) * 0.08;
    p.faceX = 0;
  }
  // F: "ไม่" — palm up
  if (f >= SC.F && f < SC.G) {
    const no = seg(f, s2f(43.7), s2f(44.1)) * (1 - seg(f, s2f(46.6), s2f(47.2)));
    p.armR = [0.25 + no * 2.2, 0.1 + no * 0.2];
    p.faceX = 10;
  }
  // G: hand over mouth (never said it) → speaks → guilt slump → stands tall at the boundary
  if (f >= SC.G && f < SC.H) {
    const mouth = seg(f, s2f(61.2), s2f(61.7)) * (1 - seg(f, s2f(64.2), s2f(64.6)));
    p.armL = [0.25 + mouth * 2.0, 0.1 + mouth * 1.6];
    const speak = seg(f, s2f(64.8), s2f(65.2)) * (1 - seg(f, s2f(66.4), s2f(66.8)));
    p.armR = [0.25 + speak * 1.0, 0.1 + speak * 0.8];
    p.yawn = speak * 0.35 * (0.6 + 0.4 * Math.sin(f * 0.8));
    const guilt = seg(f, s2f(68.9), s2f(69.4)) * (1 - seg(f, s2f(71.5), s2f(72.2)));
    p.headDrop = guilt * 24;
    p.sway = idle(f) + guilt * 0.05;
    p.faceX = 10;
  }
  // H: walk to the mirror
  if (f >= SC.H) {
    const w = seg(f, s2f(91.2), s2f(93.8));
    if (w > 0 && w < 1) Object.assign(p, walkLegs(f * 0.33));
    p.faceX = lerp(8, 18, w);
  }
  return p;
}
function heroPos(f: number) {
  const w = seg(f, s2f(91.2), s2f(93.8));
  return { x: lerp(HERO.x, 1.45, w), z: lerp(HERO.z, 3.25, w) };
}

function partnerPose(f: number): Person {
  const p: Person = { ...basePose, shirt: "#8B5CF6", hair: "#2A2140", sway: idle(f, 1.3), faceX: -10 };
  if (f >= SC.B && f < SC.C) {
    p.faceX = -12;
    p.armL = [0.25 + seg(f, SC.B + 20, SC.B + 32) * 0.7, 0.4];
  }
  if (f >= SC.D && f < SC.E) {
    const annoyed = seg(f, s2f(13.9), s2f(14.3));
    p.tired = 0.55 * annoyed + 0.5 * seg(f, s2f(16.1), s2f(16.5));
    p.armL = [0.6 * annoyed + 0.25, 2.2 * annoyed + 0.1];
    p.armR = [0.6 * annoyed + 0.25, 2.2 * annoyed + 0.1];
  }
  if (f >= SC.F && f < SC.G) {
    const shocked = seg(f, s2f(47.6), s2f(48.0));
    p.eyeOpen = 1;
    p.yawn = shocked * 0.35;
    p.tired = 0.4 * seg(f, s2f(48.5), s2f(50));
  }
  if (f >= SC.G && f < SC.H) {
    const puzzled = seg(f, s2f(57.2), s2f(57.6)) * (1 - seg(f, s2f(64.3), s2f(64.7)));
    p.headTilt = puzzled * 0.15;
    p.armR = [0.25 + puzzled * 1.9, 0.1 + puzzled * 1.9];
    const push = seg(f, s2f(66.6), s2f(67.0)) * (1 - seg(f, s2f(71.4), s2f(71.8)));
    p.armL = [0.25 + push * 1.3, 0.1];
    p.tired = push * 0.6;
  }
  return p;
}
function partnerPos(f: number) {
  if (f >= SC.E && f < SC.F) return { x: 0.75, z: 2.55 }; // nearer the wall: big shadow
  return PART;
}

// ---------------- camera ----------------
const FOCAL = 1150;
const CY = 880;
function cam(x: number, y: number, z: number, pitch = 0.04): Cam {
  return { x, y, z, pitch, focal: FOCAL, cy: CY };
}
function camAt(f: number): Cam {
  const e = (a: number, b: number) => seg(f, a, b);
  if (f < SC.B) {
    const t = e(0, SC.B);
    return cam(lerp(0.2, -0.05, t), lerp(1.45, 1.3, t), lerp(-5.2, -2.7, t), lerp(0.07, 0.04, t));
  }
  if (f < SC.C) {
    const t = e(SC.B, SC.C);
    return cam(lerp(-0.05, 0.15, t), 1.3, lerp(-2.6, -2.3, t));
  }
  if (f < SC.D) {
    const wx = streetWalkerX(f);
    return cam(wx + 0.9, 1.45, -3.6, 0.03);
  }
  if (f < SC.E) {
    const t = e(s2f(16), s2f(22));
    return cam(lerp(0.05, -0.45, t), lerp(1.3, 1.25, t), lerp(-2.4, -1.4, t));
  }
  if (f < SC.F) {
    const t = e(SC.E, SC.F);
    return cam(lerp(0.4, -0.55, t), lerp(1.55, 1.3, t), lerp(-3.4, -1.0, t), lerp(0.06, 0.03, t));
  }
  if (f < SC.G) {
    const t = e(SC.F, s2f(44));
    const t2 = e(s2f(46), s2f(54.5));
    return cam(lerp(0, 0.05, t2), lerp(1.5, 1.3, t2), lerp(-4.8, -3.6, t) + t2 * 1.4, lerp(0.07, 0.04, t2));
  }
  if (f < SC.H) {
    if (f < s2f(60.9)) {
      const t = e(SC.G, s2f(60.9));
      return cam(lerp(0.75, 0.85, t), 1.32, lerp(-0.9, -0.5, t)); // on the partner
    }
    if (f < s2f(71.3)) {
      const t = e(s2f(60.9), s2f(71.3));
      return cam(lerp(-0.6, -0.1, t), 1.28, lerp(-0.9, -1.9, t)); // on the hero, opening to the 2-shot
    }
    const t = e(s2f(71.3), s2f(73.6));
    return cam(0.05, lerp(1.28, 3.4, t), lerp(-1.9, -2.4, t), lerp(0.04, 0.5, t)); // crane up to see the floor line
  }
  // H
  if (f < s2f(91)) {
    const t = e(SC.H, s2f(85));
    const t2 = e(s2f(85), s2f(91));
    return cam(lerp(-0.6, -0.1, t2), lerp(1.28, 1.35, t2), lerp(-0.8, -2.6, t2) + (1 - t) * -0.6, 0.04);
  }
  const t = e(s2f(91), s2f(95));
  return cam(lerp(-0.1, 1.85, t), lerp(1.35, 1.3, t), lerp(-2.6, 0.9, t), 0.04);
}

// street vignette walker
function streetWalkerX(f: number) {
  return -1.5 + (f - SC.C) * 0.045;
}

// ---------------- frame ----------------
function backdrop(ctx: CanvasRenderingContext2D, f: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#151622");
  g.addColorStop(0.55, "#1D1F2E");
  g.addColorStop(1, "#141520");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    const x = ((i * 271.3 + f * (0.2 + (i % 5) * 0.05)) % W);
    const y = ((i * 523.7 + f * 0.15 * (1 + (i % 3))) % H);
    ctx.fillStyle = `rgba(255,236,200,${0.05 + 0.05 * Math.sin(f * 0.05 + i)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

let silCanvas: OffscreenCanvas | null = null;
function drawSilhouette(ctx: CanvasRenderingContext2D, p: Person, f: number) {
  if (!silCanvas) silCanvas = new OffscreenCanvas(400, 600);
  const s = silCanvas.getContext("2d")!;
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = "source-over";
  s.clearRect(0, 0, 400, 600);
  s.translate(200, 560);
  s.scale(2.5, 2.5);
  personCard(p, 0, 0, f).draw(s as unknown as CanvasRenderingContext2D);
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = "source-in";
  s.fillStyle = "#0B0C14";
  s.fillRect(0, 0, 400, 600);
  ctx.drawImage(silCanvas, -80, -224, 160, 240);
}

function drawRoomScene(ctx: CanvasRenderingContext2D, f: number, c: Cam) {
  const rs = roomState(f);
  rs.heroSelf = heroSelf(f);
  drawRoomFloor(ctx, c);
  const cards: Card[] = roomCards(rs, f);
  const hp = heroPos(f);
  const pp = partnerPos(f);
  // the partner's huge shadow on the wall during the confusion beat (light from front-right)
  if (f >= SC.E && f < SC.F) {
    const a = seg(f, SC.E, SC.E + 30);
    const sx = pp.x - 0.7;
    cards.push({
      x: sx, z: 3.95, w: 2.4, h: 2.8, noHaze: true,
      draw: (cc) => {
        cc.save();
        cc.beginPath();
        cc.rect((-3.6 - sx) * 100, -280, 720, 280); // only on the wall
        cc.clip();
        cc.globalAlpha = 0.5 * a;
        cc.filter = "blur(4px)";
        cc.scale(1.9, 1.9);
        const p = partnerPose(f);
        drawSilhouette(cc, p, f);
        cc.restore();
      },
    });
  }
  // the hero's "self" drifting out (hook)
  if (f > s2f(3.0) && f < s2f(8.3)) {
    const t = seg(f, s2f(3.0), s2f(7.6));
    const ghost = heroPose(f);
    cards.push({ ...personCard({ ...ghost, shirt: "#F2C14E", ghost: 0.3 + 0.7 * t }, hp.x - 0.05, hp.z + 0.02, f), y: t * 0.55, shadow: 0 });
  }
  cards.push(personCard(heroPose(f), hp.x, hp.z, f));
  cards.push(personCard(partnerPose(f), pp.x, pp.z, f));
  // boundary line under everything that stands on the floor
  if (f >= s2f(71.4) && f < SC.H + 30) {
    const amt = seg(f, s2f(71.6), s2f(73.4)) * (1 - seg(f, SC.H, SC.H + 30));
    drawFloorLine(ctx, c, 0.05, 0.2, 3.3, amt, f);
  }
  drawCards(ctx, c, cards, { color: [29, 31, 46], density: 0.02, start: 6 });
  // grade: cooler and greyer as the hero loses themself
  const self = heroSelf(f);
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgba(${Math.round(lerp(120, 255, self))},${Math.round(lerp(130, 245, self))},${Math.round(lerp(170, 235, self))},1)`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // warm lamp glow returns at the end
  const warm = f > SC.H ? seg(f, s2f(84), s2f(96)) : 0;
  if (warm > 0) {
    const p = project(c, -1.0, 1.4, 3.0);
    if (p) {
      const g = ctx.createRadialGradient(p.sx, p.sy, 10, p.sx, p.sy, 900);
      g.addColorStop(0, `rgba(255,200,120,${0.28 * warm})`);
      g.addColorStop(1, "rgba(255,200,120,0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
  }
}

function drawStreetScene(ctx: CanvasRenderingContext2D, f: number, c: Cam) {
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, "#F6C79A");
  sky.addColorStop(1, "#FCE6CF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  drawGround(ctx, c, { near: "#B9B2A6", far: "#D8D1C4", x0: -30, x1: 80, z0: -4, z1: 5, lineEvery: 1.2, across: 1.2, lineColor: "rgba(70,60,50,0.14)" });
  const cards = streetCards(f);
  const wx = streetWalkerX(f);
  const ph = f * 0.36;
  const lead: Person = { ...basePose, shirt: "#8B5CF6", hair: "#2A2140", ...walkLegs(ph), faceX: 14 };
  lead.armR = [2.1, 0.2]; // pointing ahead
  const self = heroSelf(f);
  const follow: Person = { ...basePose, shirt: mixColor("#9A9A9A", "#F2C14E", self), ...walkLegs(ph + 1.2), faceX: 14, tired: 0.2 };
  cards.push(personCard(lead, wx + 1.3, 1.4, f));
  cards.push(personCard(follow, wx - 0.2, 1.8, f));
  drawCards(ctx, c, cards, { color: [252, 230, 207], density: 0.045, start: 5 });
}

function drawFrame(ctx: CanvasRenderingContext2D, f: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  backdrop(ctx, f);
  const c = camAt(f);
  if (f >= SC.C && f < SC.D) drawStreetScene(ctx, f, c);
  else drawRoomScene(ctx, f, c);
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, 420, W / 2, H * 0.46, 1200);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // short dip at each cut so the edit breathes
  for (const cut of [SC.B, SC.C, SC.D, SC.E, SC.F, SC.G, SC.H]) {
    const d = Math.abs(f - cut);
    if (d < 5) {
      ctx.fillStyle = `rgba(20,21,32,${(1 - d / 5) * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ---------------- overlays ----------------
const INK = "#1d1b1a";
type Over = { at: number; out: number; kind: "card" | "bubble" | "chips" | "title"; text: string | string[]; who?: "hero" | "partner"; tone?: string };
const OVERS: Over[] = [
  { at: 16.3, out: 17.4, kind: "bubble", who: "hero", text: "ขอโทษ" },
  { at: 17.6, out: 18.8, kind: "bubble", who: "hero", text: "ขอโทษนะ" },
  { at: 19.0, out: 20.2, kind: "bubble", who: "hero", text: "ขอโทษ…" },
  { at: 20.3, out: 21.9, kind: "card", text: "ทั้งที่ไม่ได้ทำผิด", tone: "#FDE68A" },
  { at: 26.9, out: 29.5, kind: "bubble", who: "hero", text: "อยากทำจริง?" },
  { at: 29.6, out: 32.6, kind: "bubble", who: "hero", text: "หรือแค่กลัว?" },
  { at: 32.7, out: 36.4, kind: "chips", text: ["เขาจะโกรธ", "เขาจะผิดหวัง", "รักน้อยลง"] },
  { at: 40.6, out: 43.5, kind: "card", text: "การยอม = เรื่องปกติ", tone: "#FECACA" },
  { at: 43.7, out: 46.8, kind: "bubble", who: "hero", text: "ไม่" },
  { at: 48.0, out: 51.2, kind: "bubble", who: "partner", text: "เปลี่ยนไปนะ" },
  { at: 51.4, out: 54.9, kind: "card", text: "แค่กลับมาเป็นตัวเอง", tone: "#FDE68A" },
  { at: 57.2, out: 60.8, kind: "bubble", who: "partner", text: "?" },
  { at: 64.8, out: 66.5, kind: "bubble", who: "hero", text: "เราอึดอัดนะ" },
  { at: 66.7, out: 69.0, kind: "bubble", who: "partner", text: "ก็ยอมหน่อยสิ" },
  { at: 69.0, out: 71.3, kind: "card", text: "รู้สึกผิดทุกครั้งที่ปฏิเสธ", tone: "#FECACA" },
  { at: 73.6, out: 77.3, kind: "card", text: "ขอบเขตของกันและกัน", tone: "#FDE68A" },
  { at: 78.6, out: 82.0, kind: "card", text: "ความรักที่ดี\nไม่ทำให้กลัวการเป็นตัวเอง", tone: "#FFFFFF" },
  { at: 82.2, out: 85.6, kind: "card", text: "ไม่ต้องยอมทุกอย่าง\nเพื่อพิสูจน์ว่ารัก", tone: "#FFFFFF" },
  { at: 85.9, out: 90.6, kind: "card", text: "ไม่ต้องทุกข์\nเพื่อให้อีกคนสุข", tone: "#FFFFFF" },
  { at: 95.96, out: 99, kind: "title", text: "ตัวมึงเอง" },
];

function headScreen(f: number, who: "hero" | "partner") {
  const c = camAt(f);
  const pos = who === "hero" ? heroPos(f) : partnerPos(f);
  return project(c, pos.x, 1.95, pos.z);
}

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const nodes: React.ReactNode[] = [];
  OVERS.forEach((o, i) => {
    const a = s2f(o.at);
    const b = s2f(o.out);
    if (f < a || f >= b) return;
    const s = spring({ frame: f - a, fps: FPS, config: { damping: 11, stiffness: 190 } });
    const fade = interpolate(f, [b - 6, b], [1, 0], clamp);
    if (o.kind === "bubble" && o.who) {
      const p = headScreen(f, o.who);
      if (!p) return;
      const bx = Math.min(840, Math.max(240, p.sx));
      nodes.push(
        <div key={i} style={{ position: "absolute", left: bx, top: Math.max(150, p.sy - 30), transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: "50% 100%", opacity: fade }}>
          <div style={{ background: "#FFFDF8", border: `5px solid ${INK}`, borderRadius: 34, padding: "6px 28px 12px", fontFamily: "Kanit", fontWeight: 800, fontSize: 52, color: INK, whiteSpace: "nowrap", boxShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>{o.text}</div>
        </div>,
      );
    } else if (o.kind === "chips") {
      (o.text as string[]).forEach((t, k) => {
        const sk = spring({ frame: f - a - k * 14, fps: FPS, config: { damping: 11, stiffness: 190 } });
        if (f < a + k * 14) return;
        nodes.push(
          <div key={`${i}-${k}`} style={{ position: "absolute", top: 250 + k * 110, width: "100%", textAlign: "center", transform: `scale(${sk})`, opacity: fade }}>
            <span style={{ display: "inline-block", background: "#FFFDF8", color: INK, fontFamily: "Kanit", fontWeight: 800, fontSize: 56, padding: "4px 30px 10px", borderRadius: 999, border: `5px solid ${INK}`, transform: `rotate(${(k - 1) * 2}deg)` }}>{t}</span>
          </div>,
        );
      });
    } else if (o.kind === "title") {
      nodes.push(
        <div key={i} style={{ position: "absolute", top: 300, width: "100%", textAlign: "center", transform: `scale(${s})`, opacity: fade }}>
          <span style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 150, color: "#FDE68A", textShadow: "0 0 40px rgba(255,200,120,0.6), 0 8px 0 rgba(0,0,0,0.4)" }}>{o.text as string}</span>
        </div>,
      );
    } else {
      nodes.push(
        <div key={i} style={{ position: "absolute", top: 270, width: "100%", textAlign: "center", transform: `scale(${s}) rotate(-1.5deg)`, opacity: fade }}>
          <span style={{ display: "inline-block", background: o.tone ?? "#FFFDF8", color: INK, fontFamily: "Kanit", fontWeight: 800, fontSize: 62, lineHeight: 1.3, padding: "10px 40px 16px", borderRadius: 18, border: `6px solid ${INK}`, boxShadow: "0 10px 0 rgba(0,0,0,0.4)", whiteSpace: "pre-line", maxWidth: 940 }}>{o.text as string}</span>
        </div>,
      );
    }
  });
  return <AbsoluteFill>{nodes}</AbsoluteFill>;
};

const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const line = LINES.find(([a, b]) => t >= a && t < b + 0.25);
  if (!line) return null;
  const k = interpolate(t, [line[0], line[0] + 0.15], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 1560, width: "100%", display: "flex", justifyContent: "center", opacity: k }}>
      <div style={{ maxWidth: 940, background: "rgba(10,10,18,0.72)", borderRadius: 22, padding: "12px 34px 18px", fontFamily: "Kanit", fontWeight: 500, fontSize: 54, lineHeight: 1.35, color: "#FFFFFF", textAlign: "center" }}>{line[2]}</div>
    </div>
  );
};

// ---------------- sound cues ----------------
export function buildBoundariesCues() {
  const c: { at: number; file: string; vol: number }[] = [{ at: 0, file: "bed", vol: 0.32 }];
  for (const o of OVERS) c.push({ at: s2f(o.at), file: o.kind === "title" ? "ding" : "pop", vol: o.kind === "title" ? 0.5 : 0.28 });
  for (const s of [14.3, 19.2, 40.2, 42.0, 44.6]) c.push({ at: s2f(s), file: "fadeout", vol: 0.4 });
  for (const s of [80.0, 83.0, 86.0, 88.6, 91.2]) c.push({ at: s2f(s), file: "ding", vol: 0.22 });
  c.push({ at: s2f(71.6), file: "shimmer", vol: 0.4 });
  c.push({ at: s2f(69.0), file: "thud", vol: 0.35 });
  for (const cut of [SC.C, SC.D]) c.push({ at: cut, file: "whoosh", vol: 0.25 });
  return c;
}
export const B_CUES = buildBoundariesCues();

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

export const Boundaries: React.FC = () => {
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: "#151622" }}>
      <Stage ready={ready} />
      <Overlay />
      <Subtitles />
      {!SILENT && <Audio src={staticFile("vo/vo3.mp3")} />}
      {!SILENT &&
        B_CUES.map((s, i) => (
          <Sequence key={i} from={s.at} layout="none">
            <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const BoundariesComposition = () => <Composition id="Boundaries" component={Boundaries} durationInFrames={B_DUR} fps={FPS} width={W} height={H} />;
