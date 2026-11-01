// Sets and props for the "Boundaries" clip — all sizes in real metres / centimetres.
import { basePose, drawFigure, Pose, roundRect } from "../draw";
import { Cam, Card, project, paper } from "./engine";

export const FIG = 170 / 665; // stick-figure units → a 170 cm person
const TAU = Math.PI * 2;

// ---------- people ----------
export type Person = Pose & { hair?: string; ghost?: number; glow?: number };
export function personCard(p: Person, x: number, z: number, frame: number): Card {
  return {
    x, z, w: 0.7, h: 1.8, shadow: 1,
    draw: (c) => {
      c.save();
      if (p.ghost) c.globalAlpha = 1 - p.ghost;
      if (p.glow) {
        c.shadowColor = `rgba(255,214,120,${0.9 * p.glow})`;
        c.shadowBlur = 40 * p.glow;
      }
      drawFigure(c, { ...p, x: 0, y: 0, scale: FIG }, frame);
      if (p.hair) {
        // a simple fringe so the partner reads differently from the hero
        c.save();
        c.scale(FIG, FIG);
        c.translate(0, -505 + (p.headDrop ?? 0));
        c.rotate(p.headTilt ?? 0);
        c.fillStyle = p.hair;
        c.beginPath();
        c.arc(0, -78, 90, Math.PI * 1.02, Math.PI * 1.98);
        c.quadraticCurveTo(40, -120, -10, -112);
        c.quadraticCurveTo(-60, -104, -88, -70);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.restore();
    },
  };
}

export const mixColor = (a: string, b: string, t: number) => {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = p(a);
  const B = p(b);
  const r = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
};

// identity items fade to a grey "ghost" outline when life → 0
function withLife(c: CanvasRenderingContext2D, life: number, draw: () => void) {
  c.save();
  c.globalAlpha = 0.22 + 0.78 * life;
  c.filter = `grayscale(${(1 - life).toFixed(2)})`;
  draw();
  c.restore();
}

// ---------- the room (a diorama 6.4 m wide, back wall at z = 4) ----------
export type RoomState = {
  guitar: number;
  camera: number;
  painting: number;
  plant: number;
  books: number;
  tally: number; // 0..1 how many "ยอม" marks on the wall
  mirror: number; // 0..1 reflection visible
  heroSelf: number; // for the reflection colour
  night: number;
};

export function roomCards(s: RoomState, frame: number): Card[] {
  const cards: Card[] = [];
  // back wall
  cards.push({
    x: 0, z: 4, w: 7.2, h: 2.8, noHaze: true,
    draw: (c) => {
      paper(c, (p) => p.rect(-360, -280, 720, 280), "#E9DCC7", "rgba(0,0,0,0)", 0);
      // wainscot + skirting
      c.fillStyle = "#DCCBB0";
      c.fillRect(-360, -95, 720, 85);
      c.fillStyle = "#B99B78";
      c.fillRect(-360, -12, 720, 12);
      // window with night sky
      paper(c, (p) => p.rect(-215, -230, 120, 130), "#FFFFFF", "rgba(0,0,0,0.18)", 3);
      const sky = c.createLinearGradient(0, -225, 0, -105);
      sky.addColorStop(0, s.night > 0.5 ? "#1B2550" : "#7FB8F0");
      sky.addColorStop(1, s.night > 0.5 ? "#3B3F7A" : "#CDE6FF");
      c.fillStyle = sky;
      c.fillRect(-209, -224, 108, 118);
      c.fillStyle = "#FFF3C4";
      c.beginPath();
      c.arc(-130, -200, 9, 0, TAU);
      c.fill();
      c.fillStyle = "#FFFFFF";
      c.fillRect(-157, -224, 4, 118);
      c.fillRect(-209, -167, 108, 4);
      // curtain
      paper(c, (p) => {
        p.moveTo(-225, -238);
        p.quadraticCurveTo(-205, -170, -228, -92);
        p.lineTo(-238, -92);
        p.lineTo(-238, -238);
      }, "#C76B5A", "rgba(0,0,0,0.2)", 2);
      // shelf
      paper(c, (p) => p.rect(-60, -158, 130, 8), "#9C7A57", "rgba(0,0,0,0.25)", 3);
      // tally marks of "ยอม"
      const marks = Math.floor(s.tally * 23);
      c.strokeStyle = "rgba(120,60,50,0.75)";
      c.lineWidth = 2.4;
      c.lineCap = "round";
      for (let i = 0; i < marks; i++) {
        const g = Math.floor(i / 5);
        const k = i % 5;
        const gx = 25 + (g % 3) * 34;
        const gy = -248 + Math.floor(g / 3) * 30;
        c.beginPath();
        if (k < 4) {
          c.moveTo(gx + k * 6, gy);
          c.lineTo(gx + k * 6 + 1, gy + 20);
        } else {
          c.moveTo(gx - 3, gy + 16);
          c.lineTo(gx + 24, gy + 4);
        }
        c.stroke();
      }
      if (marks > 0) {
        c.fillStyle = "rgba(120,60,50,0.8)";
        c.font = "800 14px Kanit";
        c.fillText("ยอม", 25, -258);
      }
    },
  });
  // painting (identity) on the wall
  cards.push({
    x: 1.05, z: 3.97, y: 1.25, w: 0.8, h: 0.6, noHaze: true,
    draw: (c) => withLife(c, s.painting, () => {
      paper(c, (p) => p.rect(-40, -60, 80, 60), "#8C6A4A", "rgba(0,0,0,0.25)", 3);
      c.fillStyle = "#F4EBDD";
      c.fillRect(-34, -54, 68, 48);
      c.fillStyle = "#F2A65A";
      c.beginPath();
      c.arc(-10, -34, 9, 0, TAU);
      c.fill();
      c.fillStyle = "#5CA36B";
      c.beginPath();
      c.moveTo(-34, -6);
      c.lineTo(-8, -26);
      c.lineTo(10, -14);
      c.lineTo(34, -30);
      c.lineTo(34, -6);
      c.closePath();
      c.fill();
    }),
  });
  // camera on the shelf
  cards.push({
    x: 0.05, z: 3.94, y: 1.58, w: 0.3, h: 0.2, noHaze: true,
    draw: (c) => withLife(c, s.camera, () => {
      paper(c, (p) => roundRect(p, -15, -16, 30, 16, 3), "#30343F", "rgba(0,0,0,0.3)", 2);
      c.fillStyle = "#9AA4B8";
      c.beginPath();
      c.arc(0, -8, 5.5, 0, TAU);
      c.fill();
      c.fillStyle = "#E86A5A";
      c.fillRect(8, -19, 5, 3);
    }),
  });
  // mirror (reflection appears at the end)
  cards.push({
    x: 2.25, z: 3.96, y: 0.25, w: 0.7, h: 1.6, noHaze: true,
    draw: (c) => {
      paper(c, (p) => roundRect(p, -35, -160, 70, 160, 30), "#B99B78", "rgba(0,0,0,0.25)", 3);
      const g = c.createLinearGradient(-30, -155, 30, 0);
      g.addColorStop(0, "#DDE8F0");
      g.addColorStop(1, "#AFC3D2");
      c.fillStyle = g;
      roundRect(c, -29, -154, 58, 148, 26);
      c.fill();
      if (s.mirror > 0.01) {
        c.save();
        roundRect(c, -29, -154, 58, 148, 26);
        c.clip();
        c.globalAlpha = s.mirror;
        drawFigure(c, { ...basePose, x: 0, y: -4, scale: FIG * 0.82, shirt: mixColor("#9A9A9A", "#F2C14E", s.heroSelf), faceX: -6 }, frame);
        c.restore();
      }
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.beginPath();
      c.moveTo(-18, -140);
      c.lineTo(-8, -140);
      c.lineTo(-24, -60);
      c.lineTo(-30, -70);
      c.closePath();
      c.fill();
    },
  });
  // side walls as boxes so they recede in true perspective
  cards.push({ x: -3.8, z: -1.5, w: 0.4, h: 2.8, noHaze: true, box: { d: 5.5, side: "#D9C9AE", top: "#CBB898" }, draw: (c) => paper(c, (p) => p.rect(-20, -280, 40, 280), "#C8B596", "rgba(0,0,0,0)", 0) });
  cards.push({ x: 3.8, z: -1.5, w: 0.4, h: 2.8, noHaze: true, box: { d: 5.5, side: "#D2C1A4", top: "#CBB898" }, draw: (c) => paper(c, (p) => p.rect(-20, -280, 40, 280), "#C8B596", "rgba(0,0,0,0)", 0) });
  // bookshelf (box) with books (identity)
  cards.push({
    x: 2.75, z: 3.25, w: 0.9, h: 1.9, shadow: 0.6, box: { d: 0.35, side: "#7A5B3E", top: "#9C7A57" },
    draw: (c) => {
      paper(c, (p) => p.rect(-45, -190, 90, 190), "#8E6B4B", "rgba(0,0,0,0.2)", 2);
      c.fillStyle = "#6E5038";
      for (const sy of [-186, -128, -70]) c.fillRect(-40, sy, 80, 52);
      withLife(c, s.books, () => {
        const cols = ["#E86A5A", "#3E7CB1", "#F2C14E", "#5CA36B", "#8B5CF6", "#E89A5A", "#3BA6A6"];
        for (let row = 0; row < 3; row++) {
          let bx = -38;
          let i = row * 3;
          while (bx < 34) {
            const bw = 7 + ((i * 7) % 5);
            const bh = 36 + ((i * 13) % 12);
            c.fillStyle = cols[i % cols.length];
            c.fillRect(bx, -186 + row * 58 + 52 - bh, bw, bh);
            bx += bw + 1;
            i++;
          }
        }
      });
    },
  });
  // sofa (box) + back
  cards.push({
    x: -0.35, z: 3.15, w: 2.2, h: 0.85, shadow: 0.7, box: { d: 0.75, side: "#3F6F8F", top: "#5486A8" },
    draw: (c) => {
      paper(c, (p) => roundRect(p, -110, -85, 220, 45, 12), "#4A7B9C", "rgba(0,0,0,0.2)", 3);
      paper(c, (p) => roundRect(p, -118, -50, 236, 40, 10), "#5486A8", "rgba(0,0,0,0.22)", 3);
      c.fillStyle = "#3A6584";
      c.fillRect(-104, -10, 10, 10);
      c.fillRect(94, -10, 10, 10);
      paper(c, (p) => roundRect(p, -95, -78, 42, 30, 8), "#F2C14E", "rgba(0,0,0,0.2)", 2);
    },
  });
  // guitar leaning by the wall (identity)
  cards.push({
    x: -2.55, z: 3.45, w: 0.45, h: 1.05, shadow: 0.5,
    draw: (c) => withLife(c, s.guitar, () => {
      c.save();
      c.rotate(-0.12);
      paper(c, (p) => p.rect(-3, -102, 6, 60), "#5B4636", "rgba(0,0,0,0.25)", 2);
      paper(c, (p) => roundRect(p, -6, -108, 12, 12, 2), "#3A2C22", "rgba(0,0,0,0.25)", 2);
      paper(c, (p) => {
        p.ellipse(0, -30, 18, 22, 0, 0, TAU);
        p.ellipse(0, -56, 13, 15, 0, 0, TAU);
      }, "#D98C3F", "rgba(0,0,0,0.25)", 3);
      c.fillStyle = "#3A2C22";
      c.beginPath();
      c.arc(0, -46, 5, 0, TAU);
      c.fill();
      c.restore();
    }),
  });
  // plant in the corner (identity)
  cards.push({
    x: -2.9, z: 2.3, w: 0.6, h: 1.2, shadow: 0.6,
    draw: (c) => withLife(c, s.plant, () => {
      paper(c, (p) => {
        p.moveTo(-18, -34);
        p.lineTo(18, -34);
        p.lineTo(13, 0);
        p.lineTo(-13, 0);
      }, "#C76B5A", "rgba(0,0,0,0.25)", 2);
      const sway = Math.sin(frame * 0.03) * 0.03;
      for (const [a, l] of [[-0.6, 60], [-0.2, 85], [0.25, 78], [0.65, 55]] as [number, number][]) {
        c.save();
        c.translate(0, -34);
        c.rotate(a + sway);
        paper(c, (p) => {
          p.moveTo(0, 0);
          p.quadraticCurveTo(16, -l / 2, 0, -l);
          p.quadraticCurveTo(-16, -l / 2, 0, 0);
        }, "#4C9A6A", "rgba(0,0,0,0.2)", 2);
        c.restore();
      }
    }),
  });
  return cards;
}

// floor of the room: warm planks + rug, drawn as projected geometry
export function drawRoomFloor(ctx: CanvasRenderingContext2D, cam: Cam) {
  const P = (x: number, z: number) => project(cam, x, 0, z);
  const quad = (pts: [number, number][], fill: string | CanvasGradient) => {
    const q = pts.map(([x, z]) => P(x, z));
    if (q.some((v) => !v)) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    q.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  };
  const zNear = Math.max(-1.5, cam.z + 0.4);
  quad([[-3.6, 4], [3.6, 4], [3.6, zNear], [-3.6, zNear]], "#C49A6C");
  // diorama slab: the floor's front face, so the set reads as a deliberate stage
  if (zNear <= -1.5) {
    const f = [project(cam, -4.0, 0, -1.5), project(cam, 4.0, 0, -1.5), project(cam, 4.0, -0.35, -1.5), project(cam, -4.0, -0.35, -1.5)];
    if (f.every((v) => v)) {
      ctx.fillStyle = "#7E5E40";
      ctx.beginPath();
      f.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(Math.min(f[0]!.sx, f[3]!.sx), f[0]!.sy, Math.abs(f[1]!.sx - f[0]!.sx), 3);
    }
  }
  ctx.strokeStyle = "rgba(90,60,35,0.22)";
  ctx.lineWidth = 2;
  for (let x = -3.6; x <= 3.6; x += 0.22) {
    const a = P(x, zNear);
    const b = P(x, 4);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  // plank joints staggered in depth
  for (let i = 0; i < 33; i++) {
    const x = -3.6 + i * 0.22;
    for (let z = zNear + ((i * 0.37) % 1.1); z < 4; z += 1.3) {
      const a = P(x, z);
      const b = P(x + 0.22, z);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  }
  // round rug
  const rug: [number, number][] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    rug.push([0.05 + Math.cos(a) * 1.7, 1.75 + Math.sin(a) * 1.1]);
  }
  quad(rug, "#D9C3A0");
  const rug2 = rug.map(([x, z]) => [0.05 + (x - 0.05) * 0.86, 1.75 + (z - 1.75) * 0.86] as [number, number]);
  quad(rug2, "#E7D5B5");
}

// glowing boundary line on the floor between two people
export function drawFloorLine(ctx: CanvasRenderingContext2D, cam: Cam, x: number, z0: number, z1: number, amt: number, frame: number) {
  if (amt <= 0.01) return;
  const zEnd = z0 + (z1 - z0) * amt;
  // a strip of glowing tape lying ON the floor: a projected quad, so it tapers with depth
  const strip = (half: number, col: string) => {
    const q = [project(cam, x - half, 0.004, z0), project(cam, x + half, 0.004, z0), project(cam, x + half, 0.004, zEnd), project(cam, x - half, 0.004, zEnd)];
    if (q.some((v) => !v)) return;
    ctx.fillStyle = col;
    ctx.beginPath();
    q.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  };
  const pulse = 0.9 + 0.1 * Math.sin(frame * 0.2);
  ctx.save();
  ctx.filter = "blur(10px)";
  strip(0.22 * pulse, "rgba(255,206,110,0.35)");
  ctx.filter = "none";
  strip(0.07, "#FFD27A");
  strip(0.025, "#FFF7E3");
  ctx.restore();
}

// ---------- the street (one vignette) ----------
export function streetCards(frame: number): Card[] {
  const cards: Card[] = [];
  const cols = ["#F3D9B1", "#DCE6F2", "#F6D5DC", "#E2EBD3", "#F1E2C6"];
  const signs: [string, string][] = [
    ["คาเฟ่", "#3E7CB1"],
    ["ร้านหมูกระทะ", "#C76B5A"],
    ["โรงหนัง", "#8B5CF6"],
    ["ห้าง", "#3BA6A6"],
    ["ร้านเสื้อผ้า", "#E89A5A"],
  ];
  for (let i = -2; i < 14; i++) {
    const x = i * 4.6;
    const k = ((i % 5) + 5) % 5;
    cards.push({
      x, z: 5, w: 4.4, h: 6.4, shadow: 0.3, box: { d: 6, side: "#B9A98E", top: "#C9B79A" },
      draw: (c) => {
        paper(c, (p) => p.rect(-220, -640, 440, 640), cols[k], "rgba(0,0,0,0)", 0);
        for (const wx of [-170, -40, 90]) {
          paper(c, (p) => p.rect(wx, -560, 80, 110), "#9FC6E8", "rgba(0,0,0,0.15)", 3);
          paper(c, (p) => p.rect(wx, -400, 80, 110), "#9FC6E8", "rgba(0,0,0,0.15)", 3);
        }
        paper(c, (p) => p.rect(-200, -275, 400, 55), signs[k][1], "rgba(0,0,0,0.2)", 3);
        c.fillStyle = "#FFFFFF";
        c.font = "800 34px Kanit";
        c.textAlign = "center";
        c.fillText(signs[k][0], 0, -236);
        paper(c, (p) => p.rect(-170, -215, 340, 215), "#6E7F93", "rgba(0,0,0,0.15)", 3);
        c.fillStyle = "rgba(255,240,200,0.55)";
        c.fillRect(-160, -205, 150, 150);
        paper(c, (p) => p.rect(10, -210, 150, 210), "#4E5D6E", "rgba(0,0,0,0.15)", 2);
        // awning
        paper(c, (p) => {
          p.moveTo(-210, -222);
          p.lineTo(210, -222);
          p.lineTo(230, -190);
          p.lineTo(-230, -190);
        }, signs[k][1], "rgba(0,0,0,0.2)", 3);
      },
    });
  }
  // trees + poles in front of the shops
  for (let i = -1; i < 12; i++) {
    const x = i * 6.1 + 2.2;
    cards.push({
      x, z: 3.6, w: 1.6, h: 4.2, shadow: 0.6,
      draw: (c) => {
        paper(c, (p) => p.rect(-8, -220, 16, 220), "#7A5B3E", "rgba(0,0,0,0.25)", 2);
        const sw = Math.sin(frame * 0.04 + i) * 3;
        paper(c, (p) => {
          p.ellipse(sw, -270, 80, 70, 0, 0, TAU);
          p.ellipse(-50 + sw, -230, 50, 45, 0, 0, TAU);
          p.ellipse(55 + sw, -235, 52, 44, 0, 0, TAU);
        }, "#5CA36B", "rgba(0,0,0,0.2)", 4);
      },
    });
  }
  return cards;
}
