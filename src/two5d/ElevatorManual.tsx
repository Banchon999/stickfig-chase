import React from "react";
import { AbsoluteFill, Audio, Composition, Sequence, getInputProps, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { basePose } from "../draw";
import { Cam, Card, H, W, drawCards, lerp, project, seg } from "./engine";
import { Person, handPos, personCard } from "./props";
import { buzzCut, mustache } from "./barracks";
import {
  INK, bun, carCards, drawCarFloor, drawLobbyFloor, drawShaft, evidenceCard, gasCard, greyHair, helmet, inked,
  lobbyCarBack, lobbyCards, nose, panelCard,
} from "./elevator";
import { FPS, RulePage, Stage, Stamp, Subtitles, Theme, clamp, pill, popAt, s2f, shotLookup, useFonts } from "./ui";

export const EL_DUR = 2010; // 67 s (VO 65.6 s + tail)
const SILENT = Boolean((typeof window === "undefined" ? {} : (getInputProps() as { silent?: boolean })).silent);

// ---------------- script (Whisper large-v3 word timings) ----------------
const LINES: [number, number, string][] = [
  [0.0, 4.45, "ในชีวิตประจำวัน... มนุษย์เราต้องเผชิญกับสถานการณ์ฉุกเฉินมากมาย"],
  [4.48, 7.5, "แต่ไม่มีสถานการณ์ไหนกดดันเท่ากับ..."],
  [7.62, 11.6, "การที่คุณกำลังยืนอยู่ในลิฟต์ และรู้สึกว่ามีบางอย่างกำลังจะออกมา"],
  [12.1, 14.6, "กฎข้อที่หนึ่ง... อย่าตื่นตระหนก!"],
  [14.8, 20.4, "จงรักษาสีหน้าให้เป็นปกติ แม้ว่าร่างกายของคุณกำลังส่งสัญญาณเตือนภัยระดับสูงสุด"],
  [20.76, 23.35, "กฎข้อที่สอง... ประเมินจำนวนผู้โดยสาร!"],
  [23.42, 28.55, "หากในลิฟต์มีคนอยู่เพียงสองคน ความเสี่ยงในการถูกจับได้ถือว่าสูงมาก"],
  [28.64, 31.4, "เพราะคุณไม่มีทางโยนความผิดให้ใครได้ง่าย ๆ"],
  [31.7, 34.6, "กฎข้อที่สาม... อย่าสบตาใครเด็ดขาด!"],
  [34.82, 38.65, "เพราะทันทีที่มีเสียงปริศนาดังขึ้น ทุกคนจะเริ่มมองหน้ากัน"],
  [38.74, 41.7, "และการสบตาอาจกลายเป็นหลักฐานชิ้นสำคัญ"],
  [42.06, 44.45, "กฎข้อที่สี่... อย่าทำตัวมีพิรุธ!"],
  [44.48, 48.8, "การยืนผิวปาก มองเพดาน หรือทำเป็นกดปุ่มลิฟต์อย่างตั้งใจ"],
  [48.88, 50.7, "ไม่ได้ทำให้คุณดูบริสุทธิ์ขึ้นเลย"],
  [51.14, 52.45, "และกฎข้อสุดท้าย..."],
  [52.54, 56.0, "หากประตูลิฟต์เปิดเมื่อไหร่ จงเดินออกไปอย่างสง่างาม!"],
  [56.2, 59.7, "อย่าวิ่ง... เพราะผู้บริสุทธิ์เท่านั้นที่ไม่จำเป็นต้องหนี"],
  [60.08, 62.6, "จำไว้... คุณอาจหลอกคนทั้งลิฟต์ได้"],
  [62.76, 65.7, "แต่คุณไม่มีวันหลอกจมูกของพวกเขาได้!"],
];

type Shot = "lobby" | "car" | "rumble" | "rule" | "calm" | "two" | "blame" | "sound" | "whistle" | "ceiling" | "button" | "sideeye" | "exit" | "walk" | "fooled" | "noses";
const SHOTS: [number, Shot][] = [
  [0, "lobby"], [4.45, "car"], [9.1, "rumble"], [12.0, "rule"], [14.75, "calm"], [20.7, "rule"], [23.38, "two"], [28.6, "blame"],
  [31.6, "rule"], [34.75, "sound"], [42.0, "rule"], [44.45, "whistle"], [45.95, "ceiling"], [47.1, "button"], [48.85, "sideeye"],
  [51.05, "rule"], [52.5, "exit"], [56.15, "walk"], [60.0, "fooled"], [62.7, "noses"],
];
const shotAt = shotLookup(SHOTS, EL_DUR);
const RULES: Record<number, { n: string; text: string }> = {
  3: { n: "กฎข้อที่ 1", text: "อย่าตื่นตระหนก!" },
  5: { n: "กฎข้อที่ 2", text: "ประเมินจำนวน\nผู้โดยสาร!" },
  8: { n: "กฎข้อที่ 3", text: "อย่าสบตาใคร\nเด็ดขาด!" },
  10: { n: "กฎข้อที่ 4", text: "อย่าทำตัวมีพิรุธ!" },
  15: { n: "กฎข้อสุดท้าย", text: "ประตูเปิด =\nเดินออกอย่างสง่างาม" },
};
const THEME: Theme = { page: "#2F4A6B", border: "#1C2E45", head: "#F2C14E", text: "#F2F5F8", edition: "ฉบับลิฟต์" };

// ---------------- cast (same hero as the barracks episode: buzz cut, olive) ----------------
const OLIVE = "#6B7F3A";
const breathe = (f: number, ph = 0) => Math.sin(f * 0.08 + ph) * 0.012;
const HERO: Person = { ...basePose, shirt: OLIVE, faceX: 6, head: buzzCut() };
const hero = (o: Partial<Person> = {}): Person => ({ ...HERO, ...o });
const lady = (o: Partial<Person> = {}, sniff = -1): Person => ({ ...basePose, shirt: "#E86A9A", faceX: -6, ...o, head: (c) => { bun()(c); if (sniff >= 0) nose(o.faceX ?? -6, sniff)(c); } });
const oldman = (o: Partial<Person> = {}, sniff = -1): Person => ({ ...basePose, shirt: "#C9B79A", faceX: 4, ...o, head: (c) => { greyHair(c); mustache(o.faceX ?? 4)(c); if (sniff >= 0) nose(o.faceX ?? 4, sniff)(c); } });
const rider = (o: Partial<Person> = {}, sniff = -1): Person => ({ ...basePose, shirt: "#F28C28", faceX: 0, ...o, head: (c) => { helmet()(c); if (sniff >= 0) nose(o.faceX ?? 0, sniff)(c); } });
const student = (o: Partial<Person> = {}): Person => ({ ...basePose, shirt: "#3E5C8A", faceX: 8, hair: "#2B2B2B", ...o });

const POS = { H: { x: 0.0, z: 0.55 }, L: { x: 0.52, z: 0.72 }, O: { x: -0.5, z: 1.05 }, R: { x: 0.08, z: 1.22 }, S: { x: -0.55, z: 0.55 } };

// ---------------- camera ----------------
function cam(x: number, y: number, z: number, pitch = 0.04, focal = 1150, cy = 900): Cam {
  return { x, y, z, pitch, focal, cy };
}
function camAt(f: number): Cam {
  const { shot, start, end } = shotAt(f);
  const t = seg(f, start, end);
  switch (shot) {
    case "lobby": return cam(lerp(-0.3, 0.1, t), 1.55, lerp(-3.4, -2.6, t), 0.06);
    case "car": return cam(lerp(0.15, 0.0, t), 1.5, lerp(-1.9, -1.2, t), 0.06);
    case "rumble": return cam(0.0, 1.35, lerp(-0.75, -0.55, t), 0.03, 1150, 860);
    case "rule": return cam(0, 1.5, -1.9, 0.06);
    case "calm": return cam(0.02, 1.52, lerp(-0.42, -0.32, t), 0.0, 1150, 820);
    case "two": return cam(lerp(0.0, 0.25, t), 1.45, -1.3, 0.05);
    case "blame": return cam(0.2, 1.45, -1.0, 0.04);
    case "sound": return cam(lerp(-0.05, 0.05, t), 1.5, lerp(-1.6, -1.3, t), 0.06);
    case "whistle": return cam(0.0, 1.5, -0.55, 0.0, 1150, 860);
    case "ceiling": return cam(0.05, 0.75, -0.7, -0.35, 1150, 1050);
    case "button": return cam(lerp(0.8, 0.83, t), 1.24, lerp(-0.12, -0.05, t), 0.0, 1150, 960);
    case "sideeye": return cam(0.0, 1.5, lerp(-1.5, -1.25, t), 0.05);
    case "exit": return cam(0.0, 1.5, lerp(-2.4, -2.0, t), 0.05);
    case "walk": return cam(lerp(-0.6, 2.6, t), 1.4, -1.2, 0.04);
    case "fooled": return cam(0.0, 1.5, lerp(-1.5, -1.2, t), 0.06);
    case "noses": return cam(0.0, 1.52, lerp(-0.25, -0.1, t), 0.0, 1150, 900);
  }
}

// ---------------- frame ----------------
function floorAt(f: number) {
  return Math.max(1, 12 - Math.floor(f / 150));
}

function carScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  drawShaft(ctx, W, H, f);
  drawCarFloor(ctx, c);
  const cards: Card[] = carCards({ frame: f, floor: floorAt(f), light: 1, alarm: 0 });
  const crowded = shot === "car" || shot === "rule" || shot === "sound" || shot === "sideeye" || shot === "rumble" || shot === "calm" || shot === "whistle" || shot === "ceiling";
  const two = shot === "two" || shot === "blame";
  const noHero = shot === "fooled";
  // eye darting during the mystery sound
  const dart = shot === "sound" ? seg(f, s2f(37.0), s2f(37.4)) : 0;
  const dartX = (ph: number) => dart * Math.sin(f * 0.35 + ph) * 7;
  const side = shot === "sideeye" ? seg(f, s2f(49.0), s2f(49.4)) : 0;
  if (crowded || two || noHero) {
    cards.push(personCard(lady({ sway: breathe(f, 1), pupilX: two ? lerp(0, -7, seg(f, s2f(26.0), s2f(26.4))) : dartX(1) - side * 7, faceX: two && shot === "blame" ? -14 : -6, tired: shot === "blame" ? 0.5 : 0, armL: noHero ? [2.25, 1.7] : basePose.armL }, noHero ? seg(f, s2f(61.0), s2f(61.5)) : -1), POS.L.x, POS.L.z, f));
  }
  if (crowded || noHero) {
    cards.push(personCard(oldman({ sway: breathe(f, 2), pupilX: dartX(2) + side * 7 }, -1), POS.O.x, POS.O.z, f));
    cards.push(personCard(rider({ sway: breathe(f, 3), pupilX: dartX(3) - side * 4, armR: [0.4, 1.6] }, -1), POS.R.x, POS.R.z, f));
    if (!noHero) cards.push(personCard(student({ sway: breathe(f, 4), pupilX: dartX(4) + side * 7 }), POS.S.x, POS.S.z, f));
  }
  if (!noHero) {
    let p = hero({ sway: breathe(f) });
    if (shot === "rumble") {
      const shock = seg(f, s2f(10.3), s2f(10.6));
      p = hero({ eyeOpen: 1, yawn: shock * 0.3, tired: shock * 0.4, sway: breathe(f), pupilX: shock * -3 });
    }
    if (shot === "calm") p = hero({ eyeOpen: 1, faceX: 4, tired: 0, head: (cc) => { buzzCut()(cc); } });
    if (shot === "blame") {
      const pt = seg(f, s2f(29.0), s2f(29.3));
      p = hero({ armR: [0.25 + pt * 1.5, 0.1], faceX: 12, pupilX: 6 });
    }
    if (shot === "sound") p = hero({ pupilX: dartX(0), faceX: 2, tired: 0.2 });
    if (shot === "whistle") p = hero({ faceX: 4, yawn: 0.12, headTilt: Math.sin(f * 0.2) * 0.05 });
    if (shot === "ceiling") p = hero({ headTilt: -0.05, pupilX: 3, pupilY: -16, eyeOpen: 1, faceX: 2, yawn: 0.12 });
    if (shot === "sideeye") p = hero({ faceX: 4, pupilX: 3, yawn: 0.12, armR: [0.9, 1.4] });
    cards.push(personCard(p, POS.H.x, POS.H.z, f));
    if (shot === "blame") {
      // pointing at an empty corner: nobody to blame
      const [hx, hy] = handPos(p, 1);
      cards.push({
        x: POS.H.x + hx / 100 + 0.22, y: -hy / 100 + 0.1, z: POS.H.z - 0.02, w: 0.4, h: 0.4, noHaze: true,
        draw: (cc) => {
          if (f < s2f(29.3)) return;
          cc.fillStyle = "#FFFDF8";
          cc.strokeStyle = INK;
          cc.lineWidth = 0.8;
          cc.beginPath();
          cc.arc(0, -10, 9, 0, Math.PI * 2);
          cc.fill();
          cc.stroke();
          cc.fillStyle = INK;
          cc.font = "800 12px Kanit";
          cc.textAlign = "center";
          cc.fillText("?", 0, -5.5);
        },
      });
    }
  }
  // gas: a small hidden puff in the sound shot, a big lingering cloud when the hero has left
  if (shot === "sound") cards.push(gasCard(POS.H.x - 0.1, 0.12, POS.H.z + 0.3, seg(f, s2f(35.9), s2f(37.5)) * 0.32, f));
  if (noHero) cards.push(gasCard(-0.25, 0.35, 1.35, 0.75, f));
  // evidence markers on the floor (eye contact = evidence)
  if (shot === "sound") {
    [[POS.H.x + 0.2, 0.75], [POS.L.x + 0.2, 0.92], [POS.O.x + 0.22, 1.18]].forEach(([x, z], i) => {
      const at = s2f(39.2) + i * 9;
      cards.push(evidenceCard(x, z, i + 1, f < at ? 0 : spring({ frame: f - at, fps: FPS, config: { damping: 9, stiffness: 220 } })));
    });
  }
  if (shot === "button") cards.push(fingerCard(f));
  if (shot === "button") cards.push({ ...panelCard(0.83, 1.0, 0.32, f, Math.floor((f - s2f(47.1)) / 7) % 2 === 0 ? 7 : -1), noHaze: true });
  drawCards(ctx, c, cards, { color: [30, 33, 41], density: 0.02, start: 3 });
  // eye-lines between everyone (dashed, projected head heights)
  if (shot === "sound" && f > s2f(37.1)) {
    const heads = [POS.H, POS.L, POS.O, POS.R, POS.S].map((p) => project(c, p.x, 1.52, p.z));
    const k = seg(f, s2f(37.1), s2f(38.2));
    ctx.save();
    ctx.setLineDash([16, 12]);
    ctx.lineWidth = 6;
    ctx.strokeStyle = `rgba(255,107,61,${0.85 * k})`;
    for (let a = 0; a < heads.length; a++)
      for (let b = a + 1; b < heads.length; b++) {
        const A = heads[a];
        const B = heads[b];
        if (!A || !B) continue;
        ctx.beginPath();
        ctx.moveTo(A.sx, A.sy);
        ctx.lineTo(lerp(A.sx, B.sx, k), lerp(A.sy, B.sy, k));
        ctx.stroke();
      }
    ctx.restore();
  }
}

// a finger pressing the close-door button, inked so it reads at phone size
function fingerCard(f: number): Card {
  const press = (Math.sin((f - s2f(47.1)) * 0.9) + 1) / 2;
  return {
    x: 0.83, y: 1.0, z: 0.29, w: 0.3, h: 0.3, noHaze: true,
    draw: (c) => {
      c.save();
      c.translate(10.6 - (1 - press) * 3, -9.8); // fingertip (-6) lands on the ◀▶ button at x = 4.6
      c.lineCap = "round";
      c.strokeStyle = INK;
      c.lineWidth = 4.2;
      c.beginPath();
      c.moveTo(-40, 6);
      c.lineTo(-6, 0.5);
      c.stroke();
      c.strokeStyle = "#FFFFFF";
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(-38, 5.6);
      c.lineTo(-6, 0.5);
      c.stroke();
      c.restore();
    },
  };
}

function lobbyScene(ctx: CanvasRenderingContext2D, f: number, c: Cam, shot: Shot) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2B2F38");
  g.addColorStop(1, "#1B1E25");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  drawLobbyFloor(ctx, c);
  let open = 0;
  if (shot === "lobby") open = seg(f, s2f(2.6), s2f(3.4));
  if (shot === "exit") open = seg(f, s2f(52.7), s2f(53.5));
  if (shot === "walk") open = 1 - seg(f, s2f(57.5), s2f(58.5));
  const cards: Card[] = lobbyCards(f, open);
  if (open > 0.02) cards.push(lobbyCarBack());
  if (shot === "lobby") {
    const w = seg(f, s2f(3.5), s2f(4.4));
    cards.push(personCard(hero({ legL: w > 0 && w < 1 ? [0.25 * Math.sin(f * 0.4), 0] : undefined, legR: w > 0 && w < 1 ? [-0.25 * Math.sin(f * 0.4), 0] : undefined, armFwd: w > 0 && w < 1, faceX: 0 }), 0.0, lerp(1.6, 3.4, w), f));
    if (open > 0.3) cards.push(personCard(lady({ faceX: 0 }), 0.45, 3.9, f));
  }
  if (shot === "exit") {
    // others stay inside, gasping, holding their noses
    const gasp = seg(f, s2f(54.6), s2f(55.0));
    cards.push(personCard(lady({ armL: [0.25 + gasp * 2.0, 0.1 + gasp * 1.6], yawn: gasp * 0.5, eyeOpen: 1 }), 0.45, 3.85, f));
    cards.push(personCard(oldman({ armL: [0.25 + gasp * 2.0, 0.1 + gasp * 1.6], tired: gasp }), -0.45, 4.1, f));
    cards.push(gasCard(0.0, 0.6, 3.6, seg(f, s2f(53.5), s2f(55.5)) * 1.1, f));
    // the hero strides out slowly, chin up
    const w = seg(f, s2f(54.3), s2f(56.1));
    const step = Math.sin(f * 0.25);
    cards.push(personCard(hero({ headTilt: -0.08, faceX: 0, glow: w * 0.6, legSpread: 1 + Math.abs(step) * 1.5, sway: step * 0.02 }), 0.0, lerp(3.55, 1.9, w), f));
  }
  if (shot === "walk") {
    const t = seg(f, s2f(56.15), s2f(60.0));
    const ph = f * 0.2;
    cards.push(personCard(hero({ legL: [0.22 * Math.sin(ph), -0.2 * Math.max(0, -Math.cos(ph))], legR: [-0.22 * Math.sin(ph), -0.2 * Math.max(0, Math.cos(ph))], armFwd: true, armL: [-0.2 * Math.sin(ph), 0.2], armR: [0.2 * Math.sin(ph), 0.2], faceX: 16, headTilt: -0.06, glow: 0.5 }), lerp(-0.2, 2.9, t), 1.6, f));
  }
  drawCards(ctx, c, cards, { color: [30, 33, 41], density: 0.02, start: 4 });
}

function nosesScene(ctx: CanvasRenderingContext2D, f: number, c: Cam) {
  drawShaft(ctx, W, H, f);
  const cards: Card[] = carCards({ frame: f, floor: floorAt(f), light: 1, alarm: 0 });
  const w = seg(f, s2f(63.9), s2f(64.3));
  const tw = Math.sin(f * 1.2) * 0.3 * w;
  cards.push(personCard(lady({ eyeOpen: 1, faceX: 0, tired: w * 0.7, headTilt: tw * 0.05 }, w), -0.36, 0.95, f));
  cards.push(personCard(oldman({ eyeOpen: 1, faceX: 0, tired: w * 0.7, headTilt: -tw * 0.05 }, w), 0.0, 0.95, f));
  cards.push(personCard(rider({ eyeOpen: 1, faceX: 0, tired: w * 0.7, headTilt: tw * 0.04 }, w), 0.36, 0.95, f));
  cards.push(gasCard(0.0, 0.6, 1.45, 0.55, f));
  drawCards(ctx, c, cards, { color: [30, 33, 41], density: 0.0, start: 99 });
  // sniff lines around the noses
  if (w > 0) {
    for (const x of [-0.36, 0, 0.36]) {
      const p = project(c, x + 0.02, 1.5, 0.94);
      if (!p) continue;
      ctx.strokeStyle = `rgba(94,138,30,${w})`;
      ctx.lineWidth = 6;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(p.sx + s * 70, p.sy, 26 + 6 * Math.sin(f * 0.6), s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6);
        ctx.stroke();
      }
    }
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, f: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  const { shot, start } = shotAt(f);
  const c = camAt(f);
  if (shot === "lobby" || shot === "exit" || shot === "walk") lobbyScene(ctx, f, c, shot);
  else if (shot === "noses") nosesScene(ctx, f, c);
  else carScene(ctx, f, c, shot);
  if (shot === "rule") {
    ctx.fillStyle = "rgba(8,12,20,0.55)";
    ctx.fillRect(0, 0, W, H);
  }
  // red alarm pulse while the body "sends its highest warning"
  if (shot === "calm") {
    const a = seg(f, s2f(16.7), s2f(20.0)) * (0.5 + 0.5 * Math.sin(f * 0.5));
    const g = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1100);
    g.addColorStop(0, "rgba(255,40,40,0)");
    g.addColorStop(1, `rgba(255,40,40,${0.45 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const vg = ctx.createRadialGradient(W / 2, H * 0.45, 420, W / 2, H * 0.45, 1250);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  const d = f - start;
  if (start > 0 && d < 4) {
    ctx.fillStyle = `rgba(10,10,14,${(1 - d / 4) * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------- overlays ----------------
const Gauge: React.FC<{ k: number }> = ({ k }) => {
  const a = -90 + 180 * k;
  return (
    <div style={{ position: "absolute", top: 210, width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#FFFDF8", border: `6px solid ${INK}`, borderRadius: 28, padding: "18px 40px 10px", boxShadow: "0 10px 0 rgba(0,0,0,0.4)", textAlign: "center" }}>
        <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 40, color: INK }}>ระดับเตือนภัยร่างกาย</div>
        <svg width="420" height="230" viewBox="-210 -210 420 230">
          {[["#5CA36B", -180, -120], ["#F2C14E", -120, -60], ["#C0392B", -60, 0]].map(([col, a0, a1], i) => {
            const r = 180;
            const p0 = [Math.cos(((a0 as number) * Math.PI) / 180) * r, Math.sin(((a0 as number) * Math.PI) / 180) * r];
            const p1 = [Math.cos(((a1 as number) * Math.PI) / 180) * r, Math.sin(((a1 as number) * Math.PI) / 180) * r];
            return <path key={i} d={`M0 0 L${p0[0]} ${p0[1]} A${r} ${r} 0 0 1 ${p1[0]} ${p1[1]} Z`} fill={col as string} stroke={INK} strokeWidth={5} />;
          })}
          <line x1={0} y1={0} x2={Math.sin((a * Math.PI) / 180) * 165} y2={-Math.cos((a * Math.PI) / 180) * 165} stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <circle r={18} fill={INK} />
          <text x={-150} y={14} fontFamily="Kanit" fontWeight={800} fontSize={30} fill={INK}>ปกติ</text>
          <text x={100} y={14} fontFamily="Kanit" fontWeight={800} fontSize={30} fill="#C0392B">สูงสุด!</text>
        </svg>
      </div>
    </div>
  );
};

const Overlay: React.FC = () => {
  const f = useCurrentFrame();
  const { shot, start, end, idx } = shotAt(f);
  const n: React.ReactNode[] = [];
  if (shot === "lobby") {
    const s = spring({ frame: f, fps: FPS, config: { damping: 12, stiffness: 150 } });
    n.push(
      <div key="title" style={{ position: "absolute", top: 220, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${s}) rotate(-2deg)` }}>
        <div style={{ width: 900, background: "#D9C18A", border: `8px solid #8C6A3E`, borderRadius: 14, padding: "24px 36px 34px", boxShadow: "0 16px 0 rgba(0,0,0,0.45)", textAlign: "center", position: "relative" }}>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 40, color: "#2F4A6B", letterSpacing: 8 }}>ELEVATOR SURVIVAL</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 92, color: INK, lineHeight: 1.1, marginTop: 6 }}>คู่มือเอาตัวรอด</div>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 60, color: "#2F4A6B", marginTop: 4 }}>จากการตดในลิฟต์</div>
          <div style={{ position: "absolute", right: -16, bottom: -40 }}>
            <Stamp text="ลับมาก" at={s2f(1.0)} size={50} />
          </div>
        </div>
      </div>,
    );
  }
  if (RULES[idx]) n.push(<RulePage key={`r${idx}`} n={RULES[idx].n} text={RULES[idx].text} at={start} out={end} theme={THEME} />);
  n.push(popAt(f, 10.4, 12.0, <span style={pill("#FECACA", 80)}>!!!</span>, "bang", 1260));
  if (shot === "calm") n.push(<Gauge key="g" k={interpolate(f, [s2f(14.9), s2f(16.7), s2f(20.0)], [0.12, 0.25, 1], clamp) + (f > s2f(20) ? Math.sin(f * 1.3) * 0.01 : 0)} />);
  n.push(popAt(f, 15.2, 20.6, <span style={pill("#FFFDF8", 54)}>หน้า: ปกติ ^_^</span>, "face", 1340));
  if (shot === "two") {
    n.push(popAt(f, 23.6, 28.6, <span style={pill("#FFFDF8", 62)}>ผู้โดยสาร: 2 คน</span>, "cnt", 250));
    if (f > s2f(26.0)) {
      const k = seg(f, s2f(26.0), s2f(27.0));
      n.push(
        <div key="risk" style={{ position: "absolute", top: 1250, left: 190, width: 700 }}>
          <div style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 44, color: "#FFFFFF", textAlign: "center", textShadow: "0 4px 0 #000" }}>ความเสี่ยงถูกจับได้</div>
          <div style={{ marginTop: 8, height: 46, border: `6px solid ${INK}`, borderRadius: 24, background: "#FFFDF8", overflow: "hidden" }}>
            <div style={{ width: `${k * 96}%`, height: "100%", background: "#C0392B" }} />
          </div>
        </div>,
      );
    }
  }
  n.push(popAt(f, 29.4, 31.5, <span style={pill("#FDE68A", 58)}>โยนความผิดให้ใคร?</span>, "blame", 260));
  n.push(popAt(f, 35.8, 37.4, <span style={{ fontFamily: "Kanit", fontWeight: 800, fontSize: 120, color: "#9CCB4A", WebkitTextStroke: `6px ${INK}`, display: "inline-block", transform: "rotate(-6deg)" }}>ปู๊ด...</span>, "toot", 1180));
  n.push(popAt(f, 39.4, 41.9, <span style={pill("#FDE68A", 56)}>หลักฐานชิ้นสำคัญ</span>, "evid", 260));
  n.push(popAt(f, 44.6, 45.95, <span style={{ ...pill("#FFFDF8", 64) }}>♪ ฟี้ว ~ ♫</span>, "whis", 1250));
  n.push(popAt(f, 49.2, 51.05, <Stamp text="พิรุธ!" at={s2f(49.2)} size={110} />, "sus", 260));
  n.push(popAt(f, 56.3, 57.8, <span style={pill("#FECACA", 60)}>ห้ามวิ่ง ✗</span>, "norun", 260));
  n.push(popAt(f, 57.0, 60.0, <span style={pill("#FDE68A", 54)}>ผู้บริสุทธิ์ไม่ต้องหนี</span>, "inno", 400));
  if (f >= s2f(64.2)) n.push(<div key="end" style={{ position: "absolute", top: 1300, width: "100%", textAlign: "center" }}><Stamp text="จมูกไม่เคยโกหก!" at={s2f(64.2)} size={86} rot={-6} bg="#FFFDF8" /></div>);
  return <AbsoluteFill>{n}</AbsoluteFill>;
};

// ---------------- sound ----------------
export function buildElevatorCues() {
  const c: { at: number; file: string; vol: number }[] = [{ at: 0, file: "muzak", vol: 0.24 }];
  c.push({ at: s2f(1.0), file: "stamp", vol: 0.55 });
  c.push({ at: s2f(2.5), file: "ding", vol: 0.5 });
  for (let k = 1; k < SHOTS.length; k++) c.push({ at: s2f(SHOTS[k][0]), file: "whoosh", vol: 0.14 });
  for (const k of Object.keys(RULES).map(Number)) {
    c.push({ at: s2f(SHOTS[k][0]), file: "dundun", vol: 0.42 });
    c.push({ at: s2f(SHOTS[k][0]) + 10, file: "stamp", vol: 0.45 });
  }
  c.push({ at: s2f(9.9), file: "rumble", vol: 0.35 });
  c.push({ at: s2f(10.4), file: "pop", vol: 0.3 });
  for (let i = 0; i < 8; i++) c.push({ at: s2f(16.7) + i * 12, file: "beep", vol: 0.25 });
  c.push({ at: s2f(23.6), file: "pop", vol: 0.28 });
  c.push({ at: s2f(29.4), file: "pop", vol: 0.28 });
  c.push({ at: s2f(35.8), file: "mystery", vol: 0.55 });
  for (let i = 0; i < 3; i++) c.push({ at: s2f(39.2) + i * 9, file: "pop", vol: 0.3 });
  c.push({ at: s2f(44.5), file: "whistle", vol: 0.45 });
  for (let i = 0; i < 6; i++) c.push({ at: s2f(47.1) + i * 7, file: "tick", vol: 0.45 });
  c.push({ at: s2f(49.2), file: "stamp", vol: 0.55 });
  c.push({ at: s2f(52.6), file: "ding", vol: 0.55 });
  c.push({ at: s2f(56.3), file: "pop", vol: 0.28 });
  c.push({ at: s2f(63.9), file: "sniff", vol: 0.6 });
  c.push({ at: s2f(64.2), file: "stamp", vol: 0.6 });
  return c;
}
export const EL_CUES = buildElevatorCues();

export const ElevatorManual: React.FC = () => {
  const ready = useFonts();
  return (
    <AbsoluteFill style={{ background: "#15171D" }}>
      <Stage ready={ready} draw={drawFrame} />
      <Overlay />
      <Subtitles lines={LINES} from={4.45} />
      {!SILENT && <Audio src={staticFile("vo/vo5.mp3")} />}
      {!SILENT &&
        EL_CUES.map((s, i) => (
          <Sequence key={i} from={s.at} layout="none">
            <Audio src={staticFile(`sfx/${s.file}.wav`)} volume={s.vol} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

export const ElevatorManualComposition = () => <Composition id="ElevatorManual" component={ElevatorManual} durationInFrames={EL_DUR} fps={FPS} width={W} height={H} />;

void inked;
