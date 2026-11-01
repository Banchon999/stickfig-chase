// Scenes for the "Earth stops spinning" clip (Canvas 2D).
import { roundRect } from "./draw";

export const INK = "#1d1b1a";
const TAU = Math.PI * 2;

// deterministic pseudo-random
export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- space ----------
export function drawSpace(ctx: CanvasRenderingContext2D, frame: number) {
  const g = ctx.createLinearGradient(0, 0, 0, 1920);
  g.addColorStop(0, "#0E1233");
  g.addColorStop(1, "#24205A");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);
  for (let i = 0; i < 90; i++) {
    const x = rnd(i) * 1080;
    const y = rnd(i + 500) * 1920;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.08 + i));
    ctx.fillStyle = `rgba(255,255,255,${tw})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rnd(i + 900) * 3, 0, TAU);
    ctx.fill();
  }
  // small planet + moon for depth
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.fillStyle = "#F2A65A";
  ctx.beginPath();
  ctx.arc(900, 1640, 70, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#FFE3B3";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.ellipse(900, 1640, 120, 26, -0.3, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = "#D9D6E8";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(170, 1720, 48, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(29,27,26,0.18)";
  for (const [cx, cy, r] of [[155, 1705, 10], [185, 1735, 7], [190, 1700, 5]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  }
}

// ---------- Earth ----------
const LAND: [number, number, number, number][] = [
  // [x in strip 0..1200, y offset, rx, ry]
  [80, -120, 120, 80], [180, 40, 90, 140], [430, -60, 150, 90], [470, 120, 70, 60],
  [720, -140, 110, 70], [800, 30, 160, 110], [1020, -40, 90, 130], [1100, 170, 80, 50],
];
export function drawEarth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  R: number,
  offset: number, // rotation offset in px of the land strip
  spin: number, // 0..1 how fast (for motion arrows)
  shock: number, // 0..1 face shock
  squash: number, // 1 = round
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(2 - squash, squash);
  // atmosphere glow
  const glow = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 1.25);
  glow.addColorStop(0, "rgba(120,190,255,0.35)");
  glow.addColorStop(1, "rgba(120,190,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.25, 0, TAU);
  ctx.fill();
  // ocean
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fillStyle = "#3E9BE0";
  ctx.fill();
  ctx.clip();
  // land strip, wrapped; x squeezed toward the rim for a sphere feel
  ctx.fillStyle = "#5CBF6A";
  ctx.strokeStyle = "rgba(29,27,26,0.35)";
  ctx.lineWidth = 5;
  for (const [lx, ly, rx, ry] of LAND) {
    for (const k of [-1, 0, 1]) {
      let u = ((lx + offset) % 1200 + 1200) % 1200 + k * 1200 - 600; // -600..600 roughly
      const t = u / 600; // -1..1 across the face
      if (Math.abs(t) > 1.2) continue;
      const sx = Math.sin((t * Math.PI) / 2) * R;
      const shrink = Math.max(0.15, Math.cos((t * Math.PI) / 2));
      ctx.beginPath();
      ctx.ellipse(sx, ly * (R / 320), rx * shrink * (R / 320), ry * (R / 320), 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }
  // ice caps
  ctx.fillStyle = "#F4FBFF";
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.98, R * 0.5, R * 0.16, 0, 0, TAU);
  ctx.ellipse(0, R * 0.98, R * 0.45, R * 0.14, 0, 0, TAU);
  ctx.fill();
  // terminator shading
  const sh = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.2, 0, 0, R * 1.05);
  sh.addColorStop(0, "rgba(255,255,255,0.18)");
  sh.addColorStop(0.7, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(10,10,60,0.35)");
  ctx.fillStyle = sh;
  ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
  ctx.lineWidth = 12;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.stroke();

  // cartoon face
  const eyeR = 26 + shock * 14;
  for (const ex of [-80, 80]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(ex, -40, eyeR, eyeR * 1.2, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + (1 - shock) * 6, -36, 11 - shock * 3, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = 8;
  if (shock > 0.2) {
    ctx.fillStyle = "#5a1f1f";
    ctx.beginPath();
    ctx.ellipse(0, 70, 22 + shock * 10, 14 + shock * 30, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-40, 60);
    ctx.quadraticCurveTo(0, 95, 40, 60);
    ctx.stroke();
  }
  ctx.restore();

  // spin arrows (around, fade when stopping)
  if (spin > 0.02) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = spin;
    ctx.strokeStyle = "#FFE066";
    ctx.fillStyle = "#FFE066";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    for (const s of [0, Math.PI]) {
      const a0 = s + 0.5;
      const a1 = s + 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 1.32, R * 0.42, 0, a0, a1);
      ctx.stroke();
      const ax = Math.cos(a1) * R * 1.32;
      const ay = Math.sin(a1) * R * 0.42;
      const dir = s === 0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(ax + dir * 34, ay - 14 * dir);
      ctx.lineTo(ax - dir * 6, ay + 22 * -dir);
      ctx.lineTo(ax - dir * 24, ay - 18 * dir);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- outdoor street ----------
export function drawSky(ctx: CanvasRenderingContext2D, top: string, bottom: string, h = 1920) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, h);
}

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, stretch = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * stretch, s);
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "rgba(29,27,26,0.25)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(-50, 10, 40, 0, TAU);
  ctx.arc(0, -10, 55, 0, TAU);
  ctx.arc(55, 8, 42, 0, TAU);
  ctx.fill();
  ctx.fillRect(-90, 10, 185, 40);
  ctx.restore();
}

export function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#FFC93C";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + frame * 0.01;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 85, Math.sin(a) * 85);
    ctx.lineTo(Math.cos(a) * 110, Math.sin(a) * 110);
    ctx.stroke();
  }
  ctx.fillStyle = "#FFD84D";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(0, 0, 66, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  base: number,
  w: number,
  h: number,
  wall: string,
  roof: string,
  roofLift = 0, // roof flying off
  roofRot = 0,
) {
  ctx.save();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.lineJoin = "round";
  ctx.fillStyle = wall;
  ctx.fillRect(x, base - h, w, h);
  ctx.strokeRect(x, base - h, w, h);
  // windows + door
  ctx.fillStyle = "#BFE6FF";
  ctx.fillRect(x + w * 0.15, base - h * 0.75, w * 0.25, h * 0.25);
  ctx.strokeRect(x + w * 0.15, base - h * 0.75, w * 0.25, h * 0.25);
  ctx.fillStyle = "#8A5A3B";
  ctx.fillRect(x + w * 0.58, base - h * 0.55, w * 0.24, h * 0.55);
  ctx.strokeRect(x + w * 0.58, base - h * 0.55, w * 0.24, h * 0.55);
  // roof
  ctx.save();
  ctx.translate(x + w / 2 + roofLift, base - h - roofLift * 0.35);
  ctx.rotate(roofRot);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 22, 0);
  ctx.lineTo(0, -h * 0.55);
  ctx.lineTo(w / 2 + 22, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, base: number, s: number, bend: number) {
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.fillStyle = "#8A5A3B";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.quadraticCurveTo(-10 + bend * 30, -90, -8 + bend * 90, -170);
  ctx.lineTo(8 + bend * 90, -170);
  ctx.quadraticCurveTo(10 + bend * 30, -90, 14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4C9A6A";
  ctx.beginPath();
  const cx = bend * 140;
  ctx.ellipse(cx, -220, 95 + bend * 30, 85 - bend * 20, bend * 0.4, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawLampPost(ctx: CanvasRenderingContext2D, x: number, base: number, top: number) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = "#4B5563";
  ctx.lineWidth = 7;
  roundRect(ctx, x - 14, top, 28, base - top, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#374151";
  ctx.fillRect(x - 36, base - 26, 72, 26);
  ctx.strokeRect(x - 36, base - 26, 72, 26);
  // lamp head
  ctx.beginPath();
  ctx.moveTo(x, top + 10);
  ctx.quadraticCurveTo(x + 10, top - 60, x + 90, top - 50);
  ctx.lineWidth = 16;
  ctx.strokeStyle = "#4B5563";
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = "#FDE68A";
  ctx.beginPath();
  ctx.moveTo(x + 60, top - 50);
  ctx.lineTo(x + 130, top - 50);
  ctx.lineTo(x + 115, top - 20);
  ctx.lineTo(x + 75, top - 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawStreet(ctx: CanvasRenderingContext2D, ground: number, laneOffset: number) {
  // sidewalk
  ctx.fillStyle = "#D6D3CC";
  ctx.fillRect(0, ground, 1080, 70);
  ctx.strokeStyle = "rgba(29,27,26,0.25)";
  ctx.lineWidth = 4;
  for (let x = -((laneOffset * 0.5) % 120); x < 1080; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, ground);
    ctx.lineTo(x, ground + 70);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(1080, ground);
  ctx.moveTo(0, ground + 70);
  ctx.lineTo(1080, ground + 70);
  ctx.stroke();
  // road
  ctx.fillStyle = "#5B6170";
  ctx.fillRect(0, ground + 70, 1080, 1920 - ground - 70);
  ctx.fillStyle = "#FFE066";
  for (let x = -((laneOffset % 220) + 220); x < 1180; x += 220) {
    ctx.fillRect(x, ground + 230, 120, 18);
  }
  // grass strip far side
  ctx.fillStyle = "#7CC46F";
  ctx.fillRect(0, ground - 40, 1080, 40);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, ground - 40);
  ctx.lineTo(1080, ground - 40);
  ctx.stroke();
}

export function drawHills(ctx: CanvasRenderingContext2D, y: number, color: string, amp: number, phase: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 1920);
  for (let x = 0; x <= 1080; x += 20) {
    ctx.lineTo(x, y - Math.sin(x * 0.006 + phase) * amp - Math.sin(x * 0.013 + phase * 2) * amp * 0.4);
  }
  ctx.lineTo(1080, 1920);
  ctx.closePath();
  ctx.fill();
}

// flying debris items
export function drawCar(ctx: CanvasRenderingContext2D, color: string) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.fillStyle = color;
  roundRect(ctx, -90, -40, 180, 50, 14);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-50, -40);
  ctx.lineTo(-30, -78);
  ctx.lineTo(35, -78);
  ctx.lineTo(60, -40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#BFE6FF";
  ctx.fillRect(-28, -70, 26, 26);
  ctx.fillRect(6, -70, 30, 26);
  ctx.fillStyle = INK;
  for (const wx of [-50, 50]) {
    ctx.beginPath();
    ctx.arc(wx, 12, 22, 0, TAU);
    ctx.fill();
  }
}
export function drawBin(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillStyle = "#22A06B";
  ctx.beginPath();
  ctx.moveTo(-34, -50);
  ctx.lineTo(34, -50);
  ctx.lineTo(26, 40);
  ctx.lineTo(-26, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-40, -62, 80, 14);
  ctx.strokeRect(-40, -62, 80, 14);
}
export function drawBox(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillStyle = "#D9A066";
  ctx.fillRect(-40, -40, 80, 80);
  ctx.strokeRect(-40, -40, 80, 80);
  ctx.beginPath();
  ctx.moveTo(-40, -6);
  ctx.lineTo(40, -6);
  ctx.stroke();
}
export function drawLeaf(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#4C9A6A";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 10, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}
export function drawCow(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, -70, -40, 140, 70, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(-20, -10, 20, 14, 0.3, 0, TAU);
  ctx.ellipse(35, 5, 14, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.ellipse(-88, -40, 30, 26, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#F9A8D4";
  ctx.beginPath();
  ctx.ellipse(-100, -30, 16, 11, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-84, -50, 5, 0, TAU);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.beginPath();
  for (const lx of [-50, -25, 30, 55]) {
    ctx.moveTo(lx, 30);
    ctx.lineTo(lx + 8, 64);
  }
  ctx.stroke();
}

export function speedLines(ctx: CanvasRenderingContext2D, frame: number, amount: number, dir = 1, n = 22) {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const y = 120 + rnd(i + 40) * 1700;
    const len = 120 + rnd(i + 80) * 260;
    const speed = 60 + rnd(i + 120) * 50;
    const x0 = ((frame * speed + rnd(i) * 3000) % 1700) - 300;
    const x = dir > 0 ? x0 : 1080 - x0;
    ctx.strokeStyle = `rgba(255,255,255,${0.75 * amount})`;
    ctx.lineWidth = 5 + rnd(i + 7) * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dir * len, y);
    ctx.stroke();
  }
  ctx.restore();
}

// plane
export function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(-150, -10);
  ctx.quadraticCurveTo(-160, 20, -120, 22);
  ctx.lineTo(130, 22);
  ctx.quadraticCurveTo(175, 10, 150, -14);
  ctx.lineTo(-110, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3B82F6";
  ctx.beginPath();
  ctx.moveTo(-120, -12);
  ctx.lineTo(-150, -70);
  ctx.lineTo(-110, -70);
  ctx.lineTo(-80, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.lineTo(-60, 70);
  ctx.lineTo(-20, 70);
  ctx.lineTo(40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#BFE6FF";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(-70 + i * 30, 0, 7, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
