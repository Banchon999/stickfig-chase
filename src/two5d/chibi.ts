// Chibi hoodie figure (series v2): big glossy sphere head, deadpan line eyes, hoodie with
// drawstrings + kangaroo pocket, thick white outlined tube limbs, mitten hands, round feet.
// Same Pose fields and the same unit box as the old stick figure (feet at 0, top at about -665),
// so FIG still maps it to a 1.7 m person and every set stays in scale.
import type { Pose } from "../draw";

const INK = "#1d1b1a";
const O = 9; // outline width
const LW = 44; // limb width
const HIP = -200;
const NECK = -418;
const SH = -392; // shoulder y
const R = 126; // head radius
const HC = -114; // head centre relative to the neck pivot
const A1 = 92, A2 = 80; // arm segments
const L1 = 96, L2 = 86; // leg segments

export const CHIBI = { HIP, NECK, SH, R, HC };

type Pt = [number, number];
function limbPts(sx: number, sy: number, side: number, a1: number, a2: number, l1: number, l2: number): [Pt, Pt, Pt] {
  const ex = sx + side * Math.sin(a1) * l1;
  const ey = sy + Math.cos(a1) * l1;
  const hx = ex + side * Math.sin(a1 + a2) * l2;
  const hy = ey + Math.cos(a1 + a2) * l2;
  return [[sx, sy], [ex, ey], [hx, hy]];
}
function tube(c: CanvasRenderingContext2D, pts: Pt[], fill: string, w = LW) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = INK;
  c.lineWidth = w + O * 2;
  c.stroke();
  c.strokeStyle = fill;
  c.lineWidth = w;
  c.stroke();
}
function blob(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number, fill: string) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = O;
  c.strokeStyle = INK;
  c.stroke();
}
const shade = (hex: string, k: number) => {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = n.map((v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
};

function torsoPath(c: CanvasRenderingContext2D) {
  c.beginPath();
  c.moveTo(-70, -430);
  c.lineTo(70, -430);
  c.quadraticCurveTo(100, -426, 102, -392);
  c.lineTo(110, -206);
  c.quadraticCurveTo(110, -184, 90, -184);
  c.lineTo(-90, -184);
  c.quadraticCurveTo(-110, -184, -110, -206);
  c.lineTo(-102, -392);
  c.quadraticCurveTo(-100, -426, -70, -430);
  c.closePath();
}

export function drawChibi(ctx: CanvasRenderingContext2D, p: Pose, frame: number) {
  const hood = p.shirt;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.fall);
  ctx.scale(p.scale * (2 - p.squash), p.scale * p.squash);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (p.rim) {
    ctx.shadowColor = p.rim;
    ctx.shadowBlur = 18;
  }
  const profile = !!(p.legL && p.legR);

  // ---- legs + feet ----
  const lg = profile
    ? [limbPts(-12, HIP, 1, p.legL![0], p.legL![1], L1, L2), limbPts(12, HIP, 1, p.legR![0], p.legR![1], L1, L2)]
    : [limbPts(-40, HIP, -1, 0.06 * p.legSpread, -0.06, L1, L2), limbPts(40, HIP, 1, 0.06 * p.legSpread, -0.06, L1, L2)];
  lg.forEach((pts, i) => {
    tube(ctx, pts, "#FFFFFF");
    const [fx, fy] = pts[2];
    const dir = profile ? 1 : i === 0 ? -1 : 1;
    blob(ctx, fx + dir * 14, fy + 2, 42, 24, 0, "#FFFFFF");
  });

  // ---- upper body (sways around the hip) ----
  ctx.save();
  ctx.translate(0, HIP);
  ctx.rotate(p.sway);
  ctx.translate(0, -HIP);

  const armR = p.armFwd ? limbPts(14, SH, 1, p.armR[0], p.armR[1], A1, A2) : limbPts(88, SH, 1, p.armR[0], p.armR[1], A1, A2);
  const armL = p.armFwd ? limbPts(-14, SH, 1, p.armL[0], p.armL[1], A1, A2) : limbPts(-88, SH, -1, p.armL[0], p.armL[1], A1, A2);
  const arm = (pts: [Pt, Pt, Pt]) => {
    tube(ctx, pts, "#FFFFFF");
    blob(ctx, pts[2][0], pts[2][1], 30, 28, 0, "#FFFFFF");
  };
  if (p.armFwd) arm(armL); // far arm behind the body in profile

  // hood bunched behind the neck
  blob(ctx, 0, NECK - 6, 96, 40, 0, shade(hood, -0.22));

  // hoodie body
  torsoPath(ctx);
  ctx.fillStyle = hood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.13)";
  ctx.fillRect(48, -440, 80, 270);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(-92, -440, 26, 270);
  ctx.fillStyle = shade(hood, -0.18); // ribbed hem
  ctx.fillRect(-120, -214, 240, 40);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 3;
  for (let x = -100; x <= 100; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, -212);
    ctx.lineTo(x, -186);
    ctx.stroke();
  }
  ctx.restore();
  // kangaroo pocket
  ctx.beginPath();
  ctx.moveTo(-58, -300);
  ctx.lineTo(58, -300);
  ctx.lineTo(80, -226);
  ctx.lineTo(-80, -226);
  ctx.closePath();
  ctx.fillStyle = shade(hood, -0.07);
  ctx.fill();
  ctx.strokeStyle = shade(hood, -0.45);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-58, -300);
  ctx.quadraticCurveTo(-62, -262, -80, -226);
  ctx.moveTo(58, -300);
  ctx.quadraticCurveTo(62, -262, 80, -226);
  ctx.strokeStyle = shade(hood, -0.5);
  ctx.lineWidth = 7;
  ctx.stroke();
  // outline
  torsoPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = O;
  ctx.stroke();
  // drawstrings (swing a little with the sway)
  const sw = Math.sin(frame * 0.12) * 3 + p.sway * 40;
  for (const s of [-1, 1]) {
    const x0 = s * 24;
    ctx.beginPath();
    ctx.moveTo(x0, -424);
    ctx.quadraticCurveTo(x0 + s * 4 + sw * 0.5, -380, x0 + s * 2 + sw, -342);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 5;
    ctx.stroke();
    blob(ctx, x0 + s * 2 + sw, -336, 6, 10, 0, "#FFFFFF");
  }

  arm(armR);
  if (!p.armFwd) arm(armL);

  // ---- head ----
  ctx.save();
  ctx.translate(0, NECK + p.headDrop);
  ctx.rotate(p.headTilt);
  ctx.beginPath();
  ctx.arc(0, HC, R, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.clip();
  const g = ctx.createRadialGradient(-38, HC - 48, 12, -10, HC - 10, R * 1.22);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.55, "rgba(200,208,222,0.10)");
  g.addColorStop(1, "rgba(104,116,142,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(-R, HC - R, R * 2, R * 2);
  ctx.restore();
  ctx.save();
  ctx.translate(-50, HC - 64);
  ctx.rotate(-0.6);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(0, HC, R, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = O + 1;
  ctx.stroke();

  // face
  ctx.translate((p.faceX ?? 0) * 1.4, 0);
  const ey = HC + 4 + (p.pupilY ?? 0);
  const open = Math.max(0, p.eyeOpen);
  if (p.tired > 0.01) {
    ctx.save();
    ctx.globalAlpha = p.tired;
    ctx.strokeStyle = "#8C7AB0";
    ctx.lineWidth = 5;
    for (const ex of [-36, 36]) {
      ctx.beginPath();
      ctx.arc(ex, ey + 6, 18, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  for (const ex0 of [-36, 36]) {
    const ex = ex0 + p.pupilX;
    if (open < 0.12) {
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(ex - 14, ey);
      ctx.quadraticCurveTo(ex, ey + 8, ex + 14, ey);
      ctx.stroke();
    } else if (open > 1.12) {
      // shocked: round eyes with a glint
      ctx.beginPath();
      ctx.arc(ex, ey, 14 * Math.min(1.6, open), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(ex - 4, ey - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
    } else {
      const h = 15 * open;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(ex, ey - h);
      ctx.lineTo(ex, ey + h);
      ctx.stroke();
      if (p.tired > 0.3) {
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(ex - 15, ey - 16);
        ctx.lineTo(ex + 15, ey - 14);
        ctx.stroke();
      }
    }
  }
  const my = HC + 46;
  ctx.lineWidth = 7;
  if (p.yawn > 0.05) {
    ctx.beginPath();
    ctx.ellipse(0, my + 4, 12 + 6 * p.yawn, 5 + 22 * p.yawn, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#5a1f1f";
    ctx.fill();
    ctx.stroke();
  } else {
    const smile = 1 - p.tired * 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, my);
    ctx.quadraticCurveTo(0, my + 9 * smile, 12, my);
    ctx.stroke();
  }
  ctx.restore(); // head
  ctx.restore(); // upper body
  ctx.restore(); // figure
}

// Map the old head-space (centre (0,-78), radius 82) onto the chibi head so the old
// accessories (buzzCut, beret, helmet, nose, sweat…) still fit. Call after the neck transform.
export function chibiHeadSpace(c: CanvasRenderingContext2D) {
  const k = R / 82;
  c.translate(0, HC);
  c.scale(k, k);
  c.translate(0, 78);
}

// hand centre in figure units relative to the feet (sway ignored)
export function chibiHandUnits(p: Pose, side: 1 | -1): [number, number] {
  const [a1, a2] = side === 1 ? p.armR : p.armL;
  const pts = p.armFwd ? limbPts(side * 14, SH, 1, a1, a2, A1, A2) : limbPts(side * 88, SH, side, a1, a2, A1, A2);
  return pts[2];
}
