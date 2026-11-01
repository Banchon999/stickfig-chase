// Canvas 2D drawing helpers for the stick-figure character and props.

export type Pose = {
  x: number; // feet x on canvas
  y: number; // ground y on canvas
  scale: number;
  fall: number; // whole-body rotation around feet (radians, + = fall right)
  sway: number; // upper body rotation around hip
  headTilt: number;
  headDrop: number; // px the head sinks (nod)
  eyeOpen: number; // 0..1
  tired: number; // 0..1 eye bags + droop
  yawn: number; // 0..1 mouth open
  armL: [number, number]; // upper, fore (radians from straight down, outward +)
  armR: [number, number];
  legSpread: number;
  shirt: string;
  cup: number; // 0..1 cup visibility in right hand
  cupShake: number;
  pupilX: number;
  squash: number; // pop-in squash/stretch, 1 = normal
  // optional side-view (profile) controls — angles signed, + = toward +x
  legL?: [number, number];
  legR?: [number, number];
  armFwd?: boolean;
  faceX?: number; // shift eyes+mouth inside the head (look direction)
  rim?: string; // rim-light glow colour for night scenes
};

export const basePose: Pose = {
  x: 540,
  y: 1460,
  scale: 1.1,
  fall: 0,
  sway: 0,
  headTilt: 0,
  headDrop: 0,
  eyeOpen: 1,
  tired: 0,
  yawn: 0,
  armL: [0.25, 0.1],
  armR: [0.25, 0.1],
  legSpread: 1,
  shirt: "#3B82F6",
  cup: 0,
  cupShake: 0,
  pupilX: 0,
  squash: 1,
};

const INK = "#1d1b1a";
const LINE = 11;

function limb(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  side: number,
  a1: number,
  a2: number,
  l1: number,
  l2: number,
) {
  const ex = sx + side * Math.sin(a1) * l1;
  const ey = sy + Math.cos(a1) * l1;
  const a = a1 + a2;
  const hx = ex + side * Math.sin(a) * l2;
  const hy = ey + Math.cos(a) * l2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  return { hx, hy, ang: a };
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawShadow(ctx: CanvasRenderingContext2D, p: Pose) {
  const w = 120 + Math.abs(Math.sin(p.fall)) * 260;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.beginPath();
  const cx = p.x + Math.sin(p.fall) * 300 * p.scale;
  ctx.ellipse(cx, p.y + 6, w * p.scale, 22 * p.scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawFigure(ctx: CanvasRenderingContext2D, p: Pose, frame: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.fall);
  ctx.scale(p.scale * (2 - p.squash), p.scale * p.squash);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  if (p.rim) {
    ctx.shadowColor = p.rim;
    ctx.shadowBlur = 16;
  }

  // legs
  const hipY = -255;
  const side = !!(p.legL && p.legR);
  const fl = side
    ? limb(ctx, -6, hipY, 1, p.legL![0], p.legL![1], 130, 128)
    : limb(ctx, -18, hipY, -1, 0.12 * p.legSpread, -0.08, 130, 128);
  const fr = side
    ? limb(ctx, 6, hipY, 1, p.legR![0], p.legR![1], 130, 128)
    : limb(ctx, 18, hipY, 1, 0.12 * p.legSpread, -0.08, 130, 128);
  // feet (attached to the leg ends)
  ctx.beginPath();
  ctx.moveTo(fl.hx, fl.hy);
  ctx.lineTo(fl.hx + (side ? 26 : -24), fl.hy);
  ctx.moveTo(fr.hx, fr.hy);
  ctx.lineTo(fr.hx + (side ? 26 : 24), fr.hy);
  ctx.stroke();

  // upper body (sways around hip)
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(p.sway);
  ctx.translate(0, -hipY);

  // shirt
  roundRect(ctx, -64, -480, 128, 240, 34);
  ctx.fillStyle = p.shirt;
  ctx.fill();
  ctx.stroke();
  // shirt shading stripe
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(22, -480, 60, 240);
  ctx.restore();
  roundRect(ctx, -64, -480, 128, 240, 34);
  ctx.stroke();

  // arms
  const sY = -450;
  if (p.armFwd) limb(ctx, -10, sY, 1, p.armL[0], p.armL[1], 115, 105);
  else limb(ctx, -58, sY, -1, p.armL[0], p.armL[1], 115, 105);
  const r = p.armFwd
    ? limb(ctx, 10, sY, 1, p.armR[0], p.armR[1], 115, 105)
    : limb(ctx, 58, sY, 1, p.armR[0], p.armR[1], 115, 105);
  // hands
  ctx.fillStyle = INK;

  // coffee cup in right hand
  if (p.cup > 0.01) {
    ctx.save();
    const shake = Math.sin(frame * 2.3) * 4 * p.cupShake;
    ctx.translate(r.hx + 6 + shake, r.hy - 30);
    ctx.scale(p.cup, p.cup);
    ctx.lineWidth = 8;
    roundRect(ctx, -30, -40, 60, 78, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8B5A2B";
    ctx.fillRect(-26, -10, 52, 18);
    ctx.beginPath();
    ctx.arc(36, 0, 16, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // steam
    ctx.strokeStyle = "rgba(29,27,26,0.45)";
    ctx.lineWidth = 6;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      const off = (frame * 1.5 + i * 12) % 30;
      ctx.moveTo(i * 16, -52 - off);
      ctx.quadraticCurveTo(i * 16 + 10, -68 - off, i * 16, -84 - off);
      ctx.stroke();
    }
    ctx.restore();
  }

  // neck
  ctx.beginPath();
  ctx.moveTo(0, -480);
  ctx.lineTo(0, -500 + p.headDrop * 0.4);
  ctx.stroke();

  // head
  ctx.save();
  ctx.translate(0, -505 + p.headDrop);
  ctx.rotate(p.headTilt);
  const hy = -78;
  ctx.beginPath();
  ctx.arc(0, hy, 82, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = LINE;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.translate(p.faceX ?? 0, 0);

  // eye bags
  if (p.tired > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.tired;
    ctx.strokeStyle = "#7c5ca8";
    ctx.lineWidth = 5;
    for (const ex of [-30, 30]) {
      ctx.beginPath();
      ctx.arc(ex, hy - 2, 20, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // eyes
  ctx.fillStyle = INK;
  const open = Math.max(0, Math.min(1, p.eyeOpen));
  for (const ex of [-30, 30]) {
    if (open < 0.12) {
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(ex - 13, hy - 10);
      ctx.quadraticCurveTo(ex, hy - 4, ex + 13, hy - 10);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(ex + p.pupilX, hy - 12 + (1 - open) * 6, 10, 15 * open, 0, 0, Math.PI * 2);
      ctx.fill();
      // droopy lid
      if (p.tired > 0.3) {
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex - 16, hy - 24 + (1 - open) * 10);
        ctx.lineTo(ex + 16, hy - 22 + (1 - open) * 10);
        ctx.stroke();
      }
    }
  }

  // mouth
  ctx.lineWidth = 7;
  if (p.yawn > 0.05) {
    ctx.beginPath();
    ctx.ellipse(0, hy + 36, 16 + 6 * p.yawn, 6 + 26 * p.yawn, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5a1f1f";
    ctx.fill();
    ctx.stroke();
  } else {
    const smile = 1 - p.tired * 1.6; // smile -> frown when tired
    ctx.beginPath();
    ctx.moveTo(-20, hy + 34);
    ctx.quadraticCurveTo(0, hy + 34 + 16 * smile, 20, hy + 34);
    ctx.stroke();
  }
  ctx.restore(); // head
  ctx.restore(); // upper body
  ctx.restore(); // figure
}

export function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, frame: number) {
  if (s <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // bells
  ctx.fillStyle = "#F59E0B";
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * 62, -82, 26, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // ticks
  ctx.lineWidth = 6;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.sin(a) * 70, -Math.cos(a) * 70);
    ctx.lineTo(Math.sin(a) * 80, -Math.cos(a) * 80);
    ctx.stroke();
  }
  const m = frame * 0.5;
  const h = frame * 0.04;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.sin(h) * 42, -Math.cos(h) * 42);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#EF4444";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.sin(m) * 64, -Math.cos(m) * 64);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const BLOB_COLORS = ["#F472B6", "#34D399", "#A78BFA", "#FBBF24"];

export function drawHallucinations(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  amount: number,
  frame: number,
) {
  if (amount <= 0.01) return;
  for (let i = 0; i < 4; i++) {
    const a = frame * 0.045 + (i * Math.PI) / 2;
    const rad = 250 + Math.sin(frame * 0.07 + i) * 40;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad * 0.55;
    ctx.save();
    ctx.globalAlpha = amount * 0.9;
    ctx.translate(x, y);
    ctx.rotate(Math.sin(frame * 0.1 + i) * 0.3);
    ctx.fillStyle = BLOB_COLORS[i];
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    const R = 46;
    for (let k = 0; k <= 24; k++) {
      const t = (k / 24) * Math.PI * 2;
      const rr = R + Math.sin(t * 3 + frame * 0.2 + i) * 7;
      const px = Math.cos(t) * rr;
      const py = Math.sin(t) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // googly eyes
    for (const ex of [-14, 14]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex, -6, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(ex + Math.sin(frame * 0.3 + i) * 4, -6 + Math.cos(frame * 0.25 + i) * 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawZzz(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  if (t <= 0) return;
  ctx.save();
  ctx.fillStyle = "#1d1b1a";
  ctx.textAlign = "center";
  for (let i = 0; i < 3; i++) {
    const local = (t - i * 14) / 60;
    if (local <= 0) continue;
    const ph = local % 1;
    ctx.globalAlpha = Math.sin(ph * Math.PI);
    ctx.font = `800 ${50 + i * 18}px Kanit`;
    ctx.fillText("Z", x + ph * 70 + i * 30, y - ph * 170 - i * 20);
  }
  ctx.restore();
}

export function drawFloor(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(29,27,26,0.18)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(90, y + 8);
  ctx.lineTo(990, y + 8);
  ctx.stroke();
  ctx.restore();
}

// ---------- room background ----------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixHex(c1: string, c2: string, t: number) {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const a = p(c1);
  const b = p(c2);
  const r = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
// keyframed colour: stops = [[t, hex], ...] with t in 0..1
function ramp(stops: [number, string][], t: number) {
  if (t <= stops[0][0]) return mixHex(stops[0][1], stops[0][1], 0);
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (t <= t1) return mixHex(c0, c1, (t - t0) / (t1 - t0));
  }
  return mixHex(stops[stops.length - 1][1], stops[stops.length - 1][1], 0);
}

// night: 0 = sunny day, 1 = deep night
export function drawRoom(ctx: CanvasRenderingContext2D, floorY: number, night: number, frame: number) {
  const W = 1080;
  const H = 1920;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // wall + faint vertical stripes
  ctx.fillStyle = ramp([[0, "#F3E9D8"], [0.5, "#E6D8C6"], [1, "#C9BCD0"]], night);
  ctx.fillRect(0, 0, W, floorY);
  ctx.fillStyle = "rgba(29,27,26,0.035)";
  for (let x = 30; x < W; x += 90) ctx.fillRect(x, 0, 34, floorY);

  // floor: wood planks
  ctx.fillStyle = ramp([[0, "#D9B48A"], [1, "#A88A74"]], night);
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = "rgba(29,27,26,0.12)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) {
    const y = floorY + 40 + i * 75;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    const off = (i % 2) * 180;
    for (let x = 120 + off; x < W; x += 360) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 75);
      ctx.stroke();
    }
  }
  // baseboard
  ctx.fillStyle = "#FFFDF8";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.fillRect(0, floorY - 26, W, 34);
  ctx.beginPath();
  ctx.moveTo(0, floorY - 26);
  ctx.lineTo(W, floorY - 26);
  ctx.moveTo(0, floorY + 8);
  ctx.lineTo(W, floorY + 8);
  ctx.stroke();

  // rug
  ctx.fillStyle = ramp([[0, "#E86A5A"], [1, "#9C5A6A"]], night);
  ctx.beginPath();
  ctx.ellipse(540, floorY + 150, 420, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.ellipse(540, floorY + 150, 380, 70, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // ---- window (sky shows time passing) ----
  const wx = 80, wy = 600, ww = 290, wh = 300;
  ctx.fillStyle = ramp([[0, "#8FD3FF"], [0.35, "#FFB48A"], [0.6, "#3B3F8F"], [1, "#151A3D"]], night);
  ctx.fillRect(wx, wy, ww, wh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(wx, wy, ww, wh);
  ctx.clip();
  // sun sets, moon rises
  const sunY = lerp(wy + 90, wy + wh + 80, Math.min(1, night / 0.45));
  ctx.fillStyle = "#FFD84D";
  ctx.beginPath();
  ctx.arc(wx + 200, sunY, 42, 0, Math.PI * 2);
  ctx.fill();
  if (night > 0.45) {
    const m = (night - 0.45) / 0.55;
    ctx.globalAlpha = Math.min(1, m * 2);
    for (let i = 0; i < 9; i++) {
      const sx = wx + 25 + ((i * 97) % (ww - 40));
      const sy = wy + 30 + ((i * 61) % (wh - 120));
      const tw = 0.6 + 0.4 * Math.sin(frame * 0.15 + i);
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#FFF6D5";
    ctx.beginPath();
    ctx.arc(wx + 90, lerp(wy + wh + 60, wy + 90, Math.min(1, m * 1.5)), 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // city silhouette
  ctx.fillStyle = ramp([[0, "#7FA7C9"], [0.6, "#262A5C"], [1, "#0E1230"]], night);
  const bld = [[0, 70], [45, 120], [100, 90], [150, 150], [210, 80], [250, 110]];
  for (const [bx, bh] of bld) ctx.fillRect(wx + bx, wy + wh - bh, 46, bh);
  // lit windows at night
  if (night > 0.5) {
    ctx.fillStyle = `rgba(255,214,102,${Math.min(1, (night - 0.5) * 3)})`;
    for (const [bx, bh] of bld)
      for (let k = 0; k < Math.floor(bh / 34); k++) ctx.fillRect(wx + bx + 12, wy + wh - bh + 14 + k * 34, 10, 12);
  }
  ctx.restore();
  // frame + cross bars + sill
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();
  ctx.fillStyle = "#FFFDF8";
  ctx.lineWidth = 7;
  ctx.fillRect(wx - 22, wy + wh, ww + 44, 22);
  ctx.strokeRect(wx - 22, wy + wh, ww + 44, 22);
  // curtains
  ctx.fillStyle = "#5BA88F";
  for (const side of [-1, 1]) {
    const cx = side < 0 ? wx - 30 : wx + ww + 30;
    ctx.beginPath();
    ctx.moveTo(cx - 34 * side * -1, wy - 30);
    ctx.lineTo(cx + 40 * side * -1, wy - 30);
    ctx.quadraticCurveTo(cx + 10 * side * -1, wy + wh / 2, cx + 30 * side * -1, wy + wh + 40);
    ctx.lineTo(cx - 34 * side * -1, wy + wh + 40);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  // curtain rod
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(wx - 80, wy - 32);
  ctx.lineTo(wx + ww + 80, wy - 32);
  ctx.stroke();

  // ---- desk with lamp + laptop (left, under window) ----
  const dy = floorY - 250;
  ctx.fillStyle = "#B07A4F";
  ctx.lineWidth = 8;
  roundRect(ctx, 40, dy, 380, 30, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(75, dy + 30);
  ctx.lineTo(75, floorY - 26);
  ctx.moveTo(385, dy + 30);
  ctx.lineTo(385, floorY - 26);
  ctx.stroke();
  // laptop
  ctx.fillStyle = "#D7DCE2";
  roundRect(ctx, 210, dy - 120, 160, 110, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = night > 0.5 ? "#9FD8FF" : "#4B5563";
  ctx.fillRect(222, dy - 108, 136, 86);
  ctx.fillStyle = "#D7DCE2";
  ctx.beginPath();
  ctx.moveTo(190, dy);
  ctx.lineTo(390, dy);
  ctx.lineTo(370, dy - 10);
  ctx.lineTo(210, dy - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lamp
  ctx.beginPath();
  ctx.moveTo(110, dy);
  ctx.lineTo(110, dy - 80);
  ctx.lineTo(150, dy - 115);
  ctx.stroke();
  ctx.fillStyle = "#F59E0B";
  ctx.beginPath();
  ctx.moveTo(128, dy - 138);
  ctx.lineTo(190, dy - 112);
  ctx.lineTo(168, dy - 72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // lamp glow at night
  if (night > 0.4) {
    const g = ctx.createRadialGradient(185, dy - 120, 10, 185, dy - 60, 260);
    g.addColorStop(0, `rgba(255,214,102,${0.45 * Math.min(1, (night - 0.4) * 3)})`);
    g.addColorStop(1, "rgba(255,214,102,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, dy - 330, 460, 520);
  }

  // ---- plant (right floor) ----
  ctx.fillStyle = "#E07A5F";
  ctx.beginPath();
  ctx.moveTo(900, floorY - 150);
  ctx.lineTo(1020, floorY - 150);
  ctx.lineTo(1000, floorY - 24);
  ctx.lineTo(920, floorY - 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4C9A6A";
  const sw = Math.sin(frame * 0.05) * 0.03;
  for (const [a, len] of [[-0.6, 170], [-0.2, 230], [0.25, 210], [0.65, 160]] as [number, number][]) {
    ctx.save();
    ctx.translate(960, floorY - 150);
    ctx.rotate(a + sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(38, -len * 0.5, 0, -len);
    ctx.quadraticCurveTo(-38, -len * 0.5, 0, 0);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }

  // night tint over whole room
  ctx.fillStyle = `rgba(40,30,90,${0.18 * night})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
