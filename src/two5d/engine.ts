// Minimal 2.5D engine: flat "cut-paper" cards placed in a real 3D space (metres),
// one perspective camera, depth-sorted, with contact shadows and distance haze.
// Everything is sized in real units so a 1.7 m person and a 2.1 m door always agree.

export const W = 1080;
export const H = 1920;

export type Cam = {
  x: number; // metres
  y: number; // eye height, metres
  z: number; // metres (depth axis points away from camera)
  pitch: number; // radians, + looks down
  focal: number; // px per (metre / metre) — 1100 ≈ 35 mm on a 9:16 frame
  cy?: number; // screen y of the optical centre
};

export type Proj = { sx: number; sy: number; s: number; dz: number };

export function project(cam: Cam, X: number, Y: number, Z: number): Proj | null {
  const dx = X - cam.x;
  const dy = Y - cam.y;
  const dz0 = Z - cam.z;
  const c = Math.cos(cam.pitch);
  const s = Math.sin(cam.pitch);
  // rotate around X so a positive pitch tilts the view down
  const yr = dy * c + dz0 * s;
  const dz = -dy * s + dz0 * c;
  if (dz < 0.15) return null;
  const k = cam.focal / dz;
  return { sx: W / 2 + dx * k, sy: (cam.cy ?? H * 0.5) - yr * k, s: k, dz };
}

export type Haze = { color: [number, number, number]; density: number; start: number };

export type Card = {
  x: number;
  z: number;
  y?: number; // base height (default 0 = on the ground)
  w: number; // approximate width in metres (for shadow + culling)
  h: number; // approximate height in metres (for culling)
  shadow?: number; // contact-shadow strength 0..1
  noHaze?: boolean;
  // draw in CENTIMETRES, origin at the card's bottom-centre, +y up is NEGATIVE canvas y
  draw: (ctx: CanvasRenderingContext2D) => void;
  // optional solid box behind the front face: depth in metres + face colours
  box?: { d: number; side: string; top: string };
};

// side + roof faces of a box whose FRONT face is the card (at z), extending back by d
function drawBoxFaces(ctx: CanvasRenderingContext2D, cam: Cam, c: Card) {
  if (!c.box) return;
  const y0 = c.y ?? 0;
  const x0 = c.x - c.w / 2;
  const x1 = c.x + c.w / 2;
  const z0 = c.z;
  const z1 = c.z + c.box.d;
  const top = y0 + c.h;
  const P = (x: number, y: number, z: number) => project(cam, x, y, z);
  const poly = (pts: (Proj | null)[], fill: string) => {
    if (pts.some((q) => !q)) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q!.sx, q!.sy) : ctx.moveTo(q!.sx, q!.sy)));
    ctx.closePath();
    ctx.fill();
  };
  if (cam.x < x0) poly([P(x0, y0, z0), P(x0, top, z0), P(x0, top, z1), P(x0, y0, z1)], c.box.side);
  if (cam.x > x1) poly([P(x1, y0, z0), P(x1, top, z0), P(x1, top, z1), P(x1, y0, z1)], c.box.side);
  if (cam.y > top) poly([P(x0, top, z0), P(x1, top, z0), P(x1, top, z1), P(x0, top, z1)], c.box.top);
  else poly([P(x0, top, z0), P(x1, top, z0), P(x1, top, z1), P(x0, top, z1)], c.box.top);
}

let scratch: OffscreenCanvas | null = null;
function getScratch() {
  if (!scratch) scratch = new OffscreenCanvas(W, H);
  return scratch;
}

export function drawCards(ctx: CanvasRenderingContext2D, cam: Cam, cards: Card[], haze: Haze) {
  const items = cards
    .map((c) => ({ c, p: project(cam, c.x, c.y ?? 0, c.z), sortZ: c.z + (c.box ? c.box.d / 2 : 0) }))
    .filter((i): i is { c: Card; p: Proj; sortZ: number } => !!i.p)
    .sort((a, b) => b.sortZ - a.sortZ);
  const sc = getScratch();
  const sctx = sc.getContext("2d")!;
  for (const { c, p } of items) {
    const k = p.s / 100; // cm → px
    const half = (c.w * 100 * k) / 2 + 40;
    const top = c.h * 100 * k + 40;
    if (!c.box && (p.sx + half < -50 || p.sx - half > W + 50 || p.sy < -50 || p.sy - top > H + 50)) continue;
    // contact shadow on the ground (projected ellipse)
    if (c.shadow && (c.y ?? 0) < 0.05) {
      const pf = project(cam, c.x, 0, c.z - c.w * 0.18);
      const pb = project(cam, c.x, 0, c.z + c.w * 0.18);
      const ry = pf && pb ? Math.max(2, Math.abs(pf.sy - pb.sy) / 2) : 6;
      const rx = (c.w * 100 * k) * 0.55;
      const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, rx);
      g.addColorStop(0, `rgba(0,0,0,${0.45 * c.shadow})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(p.sx, p.sy);
      ctx.scale(1, ry / rx);
      ctx.translate(-p.sx, -p.sy);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const hazeA = c.noHaze ? 0 : Math.min(0.92, 1 - Math.exp(-Math.max(0, p.dz - haze.start) * haze.density));
    if (hazeA < 0.01) {
      drawBoxFaces(ctx, cam, c);
      ctx.save();
      ctx.translate(p.sx, p.sy);
      ctx.scale(k, k);
      c.draw(ctx);
      ctx.restore();
      continue;
    }
    // draw into scratch, tint toward the haze colour, composite
    let l = p.sx - half;
    let r = p.sx + half;
    let t = p.sy - top;
    if (c.box) {
      // the box's back corners can reach past the front card's footprint
      for (const yy of [c.y ?? 0, (c.y ?? 0) + c.h])
        for (const xx of [c.x - c.w / 2, c.x + c.w / 2]) {
          const q = project(cam, xx, yy, c.z + c.box.d);
          if (q) {
            l = Math.min(l, q.sx - 4);
            r = Math.max(r, q.sx + 4);
            t = Math.min(t, q.sy - 4);
          }
        }
    }
    const bx = Math.max(0, Math.floor(l));
    const by = Math.max(0, Math.floor(t));
    const bw = Math.min(W, Math.ceil(r)) - bx;
    const bh = Math.min(H, Math.ceil(p.sy + 40)) - by;
    if (bw <= 0 || bh <= 0) continue;
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(bx, by, bw, bh);
    drawBoxFaces(sctx as unknown as CanvasRenderingContext2D, cam, c);
    sctx.save();
    sctx.translate(p.sx, p.sy);
    sctx.scale(k, k);
    c.draw(sctx as unknown as CanvasRenderingContext2D);
    sctx.restore();
    sctx.globalCompositeOperation = "source-atop";
    sctx.fillStyle = `rgba(${haze.color[0]},${haze.color[1]},${haze.color[2]},${hazeA})`;
    sctx.fillRect(bx, by, bw, bh);
    sctx.globalCompositeOperation = "source-over";
    ctx.drawImage(sc, bx, by, bw, bh, bx, by, bw, bh);
  }
}

// ground plane: a gradient quad from near to far with optional perspective lines
export function drawGround(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  opts: { near: string; far: string; x0: number; x1: number; z0: number; z1: number; lineEvery?: number; lineColor?: string; across?: number },
) {
  const a = project(cam, opts.x0, 0, opts.z1);
  const b = project(cam, opts.x1, 0, opts.z1);
  const zc = Math.max(opts.z0, cam.z + 0.6);
  const c = project(cam, opts.x1, 0, zc);
  const d = project(cam, opts.x0, 0, zc);
  if (!a || !b || !c || !d) return;
  const g = ctx.createLinearGradient(0, a.sy, 0, Math.max(c.sy, a.sy + 1));
  g.addColorStop(0, opts.far);
  g.addColorStop(1, opts.near);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, Math.max(c.sy, H + 200));
  ctx.lineTo(d.sx, Math.max(d.sy, H + 200));
  ctx.closePath();
  ctx.fill();
  if (opts.lineEvery) {
    ctx.strokeStyle = opts.lineColor ?? "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    // lines receding into depth
    for (let x = Math.ceil(opts.x0 / opts.lineEvery) * opts.lineEvery; x <= opts.x1; x += opts.lineEvery) {
      const p1 = project(cam, x, 0, zc);
      const p2 = project(cam, x, 0, opts.z1);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    const acr = opts.across ?? opts.lineEvery;
    for (let z = Math.ceil(zc / acr) * acr; z <= opts.z1; z += acr) {
      const p1 = project(cam, opts.x0, 0, z);
      const p2 = project(cam, opts.x1, 0, z);
      if (!p1 || !p2) continue;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
  }
}

// paper-cut helper: fill a path with a slightly darker offset "thickness" edge
export function paper(ctx: CanvasRenderingContext2D, path: (c: CanvasRenderingContext2D) => void, fill: string, edge = "rgba(0,0,0,0.28)", depth = 4) {
  ctx.save();
  ctx.translate(depth, depth);
  ctx.fillStyle = edge;
  ctx.beginPath();
  path(ctx);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.beginPath();
  path(ctx);
  ctx.fill();
}

export const sm = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
export const seg = (f: number, a: number, b: number) => sm((f - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
