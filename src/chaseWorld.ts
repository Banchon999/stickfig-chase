// Set pieces for the chase long take — a Thai soi at 3 a.m. (Canvas 2D).
// Every function draws in WORLD units; the caller sets the layer transform.
import { roundRect } from "./draw";

const TAU = Math.PI * 2;
export const FEET = 1480; // where characters stand
export const SHOP_BASE = 1380; // facade meets sidewalk
export const CURB = 1500;
export const SLOT = 360; // shophouse width

export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const isAlley = (i: number) => i === -1 || ((i % 7) + 7) % 7 === 3;

const FACADES = ["#262C49", "#2C3354", "#232842", "#30375A"];
const SIGNS: [string, string][] = [
  ["ข้าวมันไก่", "#2F6F73"],
  ["ร้านตัดผม", "#4B3F72"],
  ["ซ่อมมือถือ", "#3E5C3A"],
  ["โจ๊กหมู", "#7A6A2E"],
  ["ร้านยา", "#2E5C7A"],
  ["ก๋วยเตี๋ยว", "#6B4E2E"],
  ["ร้านชำ", "#3B4F6B"],
  ["อู่ซ่อมรถ", "#4A4A5C"],
];

// ---------------- sky (screen space) ----------------
export function drawSkyScreen(ctx: CanvasRenderingContext2D, frame: number, lift: number) {
  const g = ctx.createLinearGradient(0, 0, 0, 1920);
  g.addColorStop(0, "#070A1A");
  g.addColorStop(0.6, "#11162E");
  g.addColorStop(1, "#1B2033");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1080, 1920);
  for (let i = 0; i < 70; i++) {
    const x = rnd(i) * 1080;
    const y = ((rnd(i + 300) * 1500 + lift * 0.06) % 1600) + 20;
    ctx.fillStyle = `rgba(220,225,255,${0.25 + 0.5 * Math.abs(Math.sin(frame * 0.05 + i))})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + rnd(i + 90) * 2, 0, TAU);
    ctx.fill();
  }
}

export function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const glow = ctx.createRadialGradient(x, y, 30, x, y, 260);
  glow.addColorStop(0, "rgba(200,210,255,0.25)");
  glow.addColorStop(1, "rgba(200,210,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 260, y - 260, 520, 520);
  ctx.fillStyle = "#E9ECFF";
  ctx.beginPath();
  ctx.arc(x, y, 70, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#11162E";
  ctx.beginPath();
  ctx.arc(x + 32, y - 18, 64, 0, TAU);
  ctx.fill();
  // thin cloud across
  ctx.fillStyle = "rgba(27,32,51,0.85)";
  ctx.beginPath();
  ctx.ellipse(x - 20, y + 40, 190, 26, 0, 0, TAU);
  ctx.fill();
}

// ---------------- skyline (p≈0.2) ----------------
export function drawSkyline(ctx: CanvasRenderingContext2D, x0: number, x1: number, frame: number) {
  const step = 150;
  for (let i = Math.floor(x0 / step) - 1; i <= Math.ceil(x1 / step) + 1; i++) {
    const h = 300 + rnd(i * 3) * 650;
    const w = 110 + rnd(i * 5) * 60;
    const x = i * step;
    const top = 1250 - h;
    ctx.fillStyle = rnd(i) > 0.5 ? "#0E1226" : "#121730";
    ctx.fillRect(x, top, w, h + 200);
    for (let wy = top + 30; wy < 1230; wy += 46) {
      for (let wx = x + 14; wx < x + w - 16; wx += 30) {
        const r = rnd(i * 1000 + wx * 7 + wy);
        if (r > 0.82) {
          ctx.fillStyle = `rgba(255,214,140,${0.35 + 0.3 * r})`;
          ctx.fillRect(wx, wy, 12, 16);
        }
      }
    }
    if (rnd(i * 11) > 0.86) {
      // antenna with a white blink
      ctx.strokeStyle = "#0E1226";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, top);
      ctx.lineTo(x + w / 2, top - 120);
      ctx.stroke();
      const on = Math.sin(frame * 0.2 + i) > 0.6;
      if (on) {
        ctx.fillStyle = "rgba(230,235,255,0.9)";
        ctx.beginPath();
        ctx.arc(x + w / 2, top - 122, 6, 0, TAU);
        ctx.fill();
      }
    }
  }
}

// ---------------- mid layer: far row seen through alleys (p≈0.55) ----------------
export function drawMidRow(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const step = 280;
  for (let i = Math.floor(x0 / step) - 1; i <= Math.ceil(x1 / step) + 1; i++) {
    const x = i * step;
    const h = 520 + rnd(i * 7 + 1) * 380;
    ctx.fillStyle = i % 2 ? "#1A1F38" : "#1D2340";
    ctx.fillRect(x, 1440 - h, step - 6, h);
    for (let f = 0; f < 3; f++) {
      const wy = 1440 - h + 60 + f * 150;
      if (wy > 1300) break;
      const lit = rnd(i * 31 + f) > 0.6;
      ctx.fillStyle = lit ? "rgba(255,200,120,0.55)" : "#141831";
      ctx.fillRect(x + 40, wy, 70, 80);
      ctx.fillRect(x + 160, wy, 70, 80);
    }
  }
  // far street ground
  ctx.fillStyle = "#151A30";
  ctx.fillRect(x0 - 400, 1440, x1 - x0 + 800, 300);
}

export function drawFarLamp(ctx: CanvasRenderingContext2D, x: number, on: number) {
  ctx.strokeStyle = "#0D1022";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(x, 1440);
  ctx.lineTo(x, 900);
  ctx.quadraticCurveTo(x, 860, x + 50, 860);
  ctx.stroke();
  if (on > 0) {
    const cone = ctx.createLinearGradient(0, 870, 0, 1440);
    cone.addColorStop(0, `rgba(255,179,71,${0.45 * on})`);
    cone.addColorStop(1, `rgba(255,179,71,${0.06 * on})`);
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x + 40, 872);
    ctx.lineTo(x + 70, 872);
    ctx.lineTo(x + 200, 1440);
    ctx.lineTo(x - 90, 1440);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(255,200,120,${on})`;
    ctx.beginPath();
    ctx.ellipse(x + 55, 868, 22, 9, 0, 0, TAU);
    ctx.fill();
  }
}

// ---------------- main layer: shophouses ----------------
export function drawShophouse(ctx: CanvasRenderingContext2D, i: number, frame: number) {
  const x = i * SLOT - 60;
  if (isAlley(i)) {
    // alley: side walls in perspective + darkness
    ctx.fillStyle = "#151A30";
    ctx.beginPath();
    ctx.moveTo(x, 600);
    ctx.lineTo(x + 40, 760);
    ctx.lineTo(x + 40, 1400);
    ctx.lineTo(x, SHOP_BASE);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + SLOT, 600);
    ctx.lineTo(x + SLOT - 40, 760);
    ctx.lineTo(x + SLOT - 40, 1400);
    ctx.lineTo(x + SLOT, SHOP_BASE);
    ctx.closePath();
    ctx.fill();
    // soi sign
    ctx.fillStyle = "#2E4F7A";
    roundRect(ctx, x + SLOT - 150, 1040, 120, 56, 8);
    ctx.fill();
    ctx.fillStyle = "#DCE6FF";
    ctx.font = "500 30px Kanit";
    ctx.textAlign = "center";
    ctx.fillText(`ซอย ${13 + ((i % 9) + 9) % 9}`, x + SLOT - 90, 1078);
    return;
  }
  const col = FACADES[((i % 4) + 4) % 4];
  ctx.fillStyle = col;
  ctx.fillRect(x, 600, SLOT, SHOP_BASE - 600);
  // parapet + pilasters
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x, 600, SLOT, 26);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(x, 600, 14, SHOP_BASE - 600);
  // upper floors: windows with grilles, ACs
  for (let fl = 0; fl < 2; fl++) {
    const wy = 660 + fl * 230;
    for (let k = 0; k < 2; k++) {
      const wx = x + 50 + k * 150;
      const lit = rnd(i * 17 + fl * 3 + k) > 0.66;
      const flick = lit && rnd(i * 5 + fl) > 0.92 ? 0.6 + 0.4 * Math.sin(frame * 0.9) : 1;
      ctx.fillStyle = lit ? `rgba(255,204,128,${0.75 * flick})` : "#161A30";
      ctx.fillRect(wx, wy, 110, 140);
      ctx.strokeStyle = "rgba(10,12,24,0.9)";
      ctx.lineWidth = 4;
      for (let g = 1; g < 5; g++) {
        ctx.beginPath();
        ctx.moveTo(wx + g * 22, wy);
        ctx.lineTo(wx + g * 22, wy + 140);
        ctx.stroke();
      }
      ctx.strokeRect(wx, wy, 110, 140);
    }
    if (rnd(i * 13 + fl) > 0.45) {
      ctx.fillStyle = "#3A4060";
      ctx.fillRect(x + 260, wy + 150, 70, 46);
      ctx.fillStyle = "#23283F";
      ctx.beginPath();
      ctx.arc(x + 295, wy + 173, 15, 0, TAU);
      ctx.fill();
    }
  }
  // signboard
  const [name, sc] = SIGNS[((i % SIGNS.length) + SIGNS.length) % SIGNS.length];
  ctx.fillStyle = sc;
  ctx.fillRect(x + 16, 1080, SLOT - 32, 64);
  ctx.fillStyle = "rgba(235,240,255,0.85)";
  ctx.font = "800 40px Kanit";
  ctx.textAlign = "center";
  ctx.fillText(name, x + SLOT / 2, 1126);
  // rolling shutter
  ctx.fillStyle = "#3B4160";
  ctx.fillRect(x + 16, 1150, SLOT - 32, SHOP_BASE - 1150);
  ctx.strokeStyle = "rgba(10,12,24,0.45)";
  ctx.lineWidth = 3;
  for (let sy = 1160; sy < SHOP_BASE; sy += 14) {
    ctx.beginPath();
    ctx.moveTo(x + 16, sy);
    ctx.lineTo(x + SLOT - 16, sy);
    ctx.stroke();
  }
  // light leaking under one shutter
  if (rnd(i * 23) > 0.7) {
    ctx.fillStyle = "rgba(255,200,120,0.5)";
    ctx.fillRect(x + 16, SHOP_BASE - 10, SLOT - 32, 10);
  }
}

// sidewalk, curb, street (main layer)
export function drawGround(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  ctx.fillStyle = "#262A40";
  ctx.fillRect(x0, SHOP_BASE, x1 - x0, CURB - SHOP_BASE);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, SHOP_BASE);
    ctx.lineTo(x - 30, CURB);
    ctx.stroke();
  }
  ctx.fillStyle = "#3A3F5A";
  ctx.fillRect(x0, CURB, x1 - x0, 22);
  ctx.fillStyle = "#151829";
  ctx.fillRect(x0, CURB + 22, x1 - x0, 1400);
  ctx.fillStyle = "rgba(230,200,120,0.25)";
  for (let x = Math.floor(x0 / 260) * 260; x < x1; x += 260) ctx.fillRect(x, 1780, 140, 14);
}

// small props on the sidewalk, one per slot
export function drawProp(ctx: CanvasRenderingContext2D, i: number) {
  if (isAlley(i)) return;
  const x = i * SLOT - 60 + 60 + rnd(i * 41) * 160;
  const kind = Math.floor(rnd(i * 37) * 5);
  ctx.save();
  ctx.lineJoin = "round";
  if (i === 1 || kind === 0) {
    // spirit house (ศาลพระภูมิ)
    ctx.fillStyle = "#4A4F6E";
    ctx.fillRect(x - 10, 1170, 20, SHOP_BASE - 1170);
    ctx.fillStyle = "#B8963E";
    ctx.fillRect(x - 60, 1150, 120, 22);
    ctx.fillStyle = "#8C6A2A";
    ctx.fillRect(x - 40, 1080, 80, 70);
    ctx.fillStyle = "#B8963E";
    for (const [w, y] of [[110, 1080], [80, 1045]] as [number, number][]) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y);
      ctx.lineTo(x, y - 48);
      ctx.lineTo(x + w / 2, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,190,110,0.7)"; // candle glow
    ctx.beginPath();
    ctx.arc(x, 1135, 7, 0, TAU);
    ctx.fill();
  } else if (kind === 1) {
    // parked motorbike
    ctx.fillStyle = "#0E1122";
    ctx.beginPath();
    ctx.arc(x - 55, 1450, 30, 0, TAU);
    ctx.arc(x + 60, 1450, 30, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2D3557";
    roundRect(ctx, x - 70, 1385, 150, 50, 20);
    ctx.fill();
    ctx.fillRect(x + 50, 1350, 12, 50);
    ctx.fillStyle = "#1B2038";
    roundRect(ctx, x - 50, 1370, 70, 22, 10);
    ctx.fill();
  } else if (kind === 2) {
    // plastic stools + potted plant
    for (const dx of [-40, 30]) {
      ctx.fillStyle = "#2F5E8A";
      ctx.fillRect(x + dx, 1420, 50, 12);
      ctx.fillRect(x + dx + 6, 1430, 8, 50);
      ctx.fillRect(x + dx + 36, 1430, 8, 50);
    }
    ctx.fillStyle = "#3E5A3A";
    ctx.beginPath();
    ctx.ellipse(x + 130, 1400, 46, 60, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#5A4636";
    ctx.fillRect(x + 105, 1430, 50, 50);
  } else if (kind === 3) {
    // trash bags
    ctx.fillStyle = "#0F1222";
    ctx.beginPath();
    ctx.ellipse(x, 1450, 46, 34, 0, 0, TAU);
    ctx.ellipse(x + 60, 1455, 40, 30, 0, 0, TAU);
    ctx.ellipse(x + 30, 1420, 34, 26, 0, 0, TAU);
    ctx.fill();
  } else {
    // electrical cabinet
    ctx.fillStyle = "#3F4766";
    ctx.fillRect(x - 40, 1290, 90, 170);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 40, 1290, 90, 170);
    ctx.beginPath();
    ctx.moveTo(x + 5, 1290);
    ctx.lineTo(x + 5, 1460);
    ctx.stroke();
  }
  ctx.restore();
}

// street lamp on the curb; `on` 0..1 (flicker handled by caller)
export const LAMP_X0 = 120;
export const LAMP_STEP = 620;
export function drawStreetLamp(ctx: CanvasRenderingContext2D, x: number, on: number) {
  // light cone first (behind pole)
  if (on > 0.02) {
    const cone = ctx.createLinearGradient(0, 740, 0, CURB);
    cone.addColorStop(0, `rgba(255,179,71,${0.4 * on})`);
    cone.addColorStop(1, `rgba(255,179,71,${0.07 * on})`);
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x + 70, 745);
    ctx.lineTo(x + 140, 745);
    ctx.lineTo(x + 420, CURB);
    ctx.lineTo(x - 210, CURB);
    ctx.closePath();
    ctx.fill();
    const pool = ctx.createRadialGradient(x + 105, CURB - 20, 10, x + 105, CURB - 20, 330);
    pool.addColorStop(0, `rgba(255,190,100,${0.35 * on})`);
    pool.addColorStop(1, "rgba(255,190,100,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.ellipse(x + 105, CURB - 10, 330, 70, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "#0B0E1C";
  ctx.lineCap = "round";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(x, CURB + 10);
  ctx.lineTo(x, 790);
  ctx.quadraticCurveTo(x, 720, x + 90, 722);
  ctx.stroke();
  ctx.fillStyle = "#0B0E1C";
  roundRect(ctx, x + 60, 712, 96, 30, 12);
  ctx.fill();
  ctx.fillStyle = on > 0.02 ? `rgba(255,214,150,${0.35 + 0.65 * on})` : "#1A1E33";
  ctx.beginPath();
  ctx.ellipse(x + 108, 744, 40, 10, 0, 0, TAU);
  ctx.fill();
  if (on > 0.02) {
    const halo = ctx.createRadialGradient(x + 108, 744, 4, x + 108, 744, 120);
    halo.addColorStop(0, `rgba(255,214,150,${0.5 * on})`);
    halo.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(x - 20, 620, 260, 260);
  }
}

// concrete power poles with sagging Thai-style cable bundles
export const POLE_X0 = 420;
export const POLE_STEP = 900;
export function drawPolesAndWires(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const first = Math.floor((x0 - POLE_X0) / POLE_STEP) - 1;
  const last = Math.ceil((x1 - POLE_X0) / POLE_STEP) + 1;
  ctx.lineCap = "round";
  for (let k = first; k <= last; k++) {
    const x = POLE_X0 + k * POLE_STEP;
    const nx = x + POLE_STEP;
    // wires to next pole
    for (let w = 0; w < 6; w++) {
      const y = 470 + w * 26;
      const sag = 90 + w * 18 + rnd(k * 7 + w) * 40;
      ctx.strokeStyle = `rgba(6,8,18,${0.85 - w * 0.06})`;
      ctx.lineWidth = w < 2 ? 5 : 3.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo((x + nx) / 2, y + sag * 2, nx, y);
      ctx.stroke();
    }
    // a tangled loop
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + 60, 640, 40, 26, 0.3, 0, TAU);
    ctx.stroke();
    // pole
    ctx.fillStyle = "#0E1120";
    ctx.fillRect(x - 15, 430, 30, CURB + 10 - 430);
    ctx.fillRect(x - 70, 470, 140, 12);
    ctx.fillRect(x - 55, 520, 110, 10);
    if (((k % 3) + 3) % 3 === 0) {
      ctx.fillStyle = "#1A1F36";
      ctx.fillRect(x + 18, 560, 54, 90); // transformer
    }
  }
}

// ---------------- the creature ----------------
export function drawCreature(
  ctx: CanvasRenderingContext2D,
  x: number,
  feetY: number,
  H: number,
  frame: number,
  reach: number, // 0..1 arm forward
  alpha = 1,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const top = feetY - H;
  const sway = Math.sin(frame * 0.12) * 0.04;
  ctx.translate(x, feetY);
  ctx.rotate(0.12 + sway); // leans into the chase
  ctx.translate(-x, -feetY);
  // smoke trail behind
  for (let i = 0; i < 9; i++) {
    const t = (frame * 0.06 + i / 9) % 1;
    ctx.fillStyle = `rgba(7,7,15,${0.35 * (1 - t)})`;
    ctx.beginPath();
    ctx.arc(x - 120 - t * 520, feetY - 120 - i * 40 - t * 60, 90 + t * 120, 0, TAU);
    ctx.fill();
  }
  // body silhouette with a ragged, moving edge
  ctx.shadowColor = "rgba(120,110,255,0.45)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#07070F";
  ctx.beginPath();
  const pts: [number, number][] = [];
  const N = 22;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const y = top + H * 0.14 + t * H * 0.86;
    const w = (0.11 + 0.08 * Math.sin(t * Math.PI) + 0.05 * t) * H;
    const j = Math.sin(frame * 0.5 + k * 1.7) * 14 + Math.sin(frame * 0.23 + k) * 10;
    pts.push([x + w * 0.55 + j, y]);
  }
  for (let k = N; k >= 0; k--) {
    const t = k / N;
    const y = top + H * 0.14 + t * H * 0.86;
    const w = (0.11 + 0.08 * Math.sin(t * Math.PI) + 0.05 * t) * H;
    const j = Math.sin(frame * 0.47 + k * 2.1) * 16;
    pts.push([x - w * 0.75 + j - t * 120, y]);
  }
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  // base dissolves into smoke (no hard bottom edge)
  ctx.shadowBlur = 0;
  for (let k = 0; k < 10; k++) {
    const sx = x - H * 0.16 + k * H * 0.035 + Math.sin(frame * 0.3 + k) * 12;
    const sy = feetY - H * 0.04 + Math.cos(frame * 0.25 + k * 2) * 10;
    const r = H * (0.05 + 0.03 * Math.sin(k * 1.9 + frame * 0.2));
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 1.6);
    sg.addColorStop(0, "rgba(7,7,15,0.95)");
    sg.addColorStop(1, "rgba(7,7,15,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.6, 0, TAU);
    ctx.fill();
  }
  ctx.shadowColor = "rgba(120,110,255,0.45)";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#07070F";
  // head
  ctx.beginPath();
  ctx.ellipse(x + 10, top + H * 0.09, H * 0.075, H * 0.1, 0.15, 0, TAU);
  ctx.fill();
  // arms: long, thin, reaching forward
  const sh = top + H * 0.24;
  ctx.strokeStyle = "#07070F";
  ctx.lineCap = "round";
  for (const [off, ph] of [[0, 0], [-30, 1.4]] as [number, number][]) {
    const a1 = 0.5 + reach * 0.95 + Math.sin(frame * 0.18 + ph) * 0.08; // from down, + = forward
    const L1 = H * 0.3;
    const L2 = H * 0.3;
    const ex = x + off + Math.sin(a1) * L1;
    const ey = sh + Math.cos(a1) * L1;
    const a2 = a1 + 0.25 + Math.sin(frame * 0.21 + ph) * 0.1;
    const hx = ex + Math.sin(a2) * L2;
    const hy = ey + Math.cos(a2) * L2;
    ctx.lineWidth = 34;
    ctx.beginPath();
    ctx.moveTo(x + off, sh);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    // fingers
    ctx.lineWidth = 8;
    for (let fi = -2; fi <= 2; fi++) {
      const fa = a2 + fi * 0.18;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(hx + Math.sin(fa) * 60, hy + Math.cos(fa) * 60, hx + Math.sin(fa + 0.3) * 110, hy + Math.cos(fa + 0.3) * 110);
      ctx.stroke();
    }
  }
  // eyes — the only red in the film
  ctx.shadowColor = "rgba(255,45,45,0.95)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#FF2D2D";
  for (const ex of [-0.032, 0.04]) {
    ctx.beginPath();
    ctx.ellipse(x + 18 + ex * H, top + H * 0.085, H * 0.022, H * 0.011, 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// foreground: blurred dark poles / bollards close to camera
export function drawForeground(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
  const step = 1150;
  for (let k = Math.floor(x0 / step) - 1; k <= Math.ceil(x1 / step) + 1; k++) {
    const x = k * step + 900;
    ctx.fillStyle = "#05060D";
    if (((k % 2) + 2) % 2 === 0) {
      ctx.fillRect(x, -1200, 70, 4000); // utility pole
      ctx.fillRect(x - 40, 300, 150, 22);
    } else {
      ctx.beginPath();
      ctx.ellipse(x, 2050, 260, 200, 0, 0, TAU); // parked car roof
      ctx.fill();
      ctx.fillRect(x + 380, 1700, 46, 700); // bollard
    }
  }
}
