// Sets + props for "คู่มือเอาตัวรอดจากสบู่หล่น" — barracks shower, parade yard, tabletop.
// World units: metres. Card drawing: centimetres, origin bottom-centre, -y is up.
import { roundRect } from "../draw";
import { Cam, Card, paper, project } from "./engine";

const TAU = Math.PI * 2;
const INK = "#1d1b1a";

// ---------- head accessories (figure units, head centre (0,-78), radius 82) ----------
export const buzzCut = (faceX = 0) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#2B2B2B";
  c.beginPath();
  c.arc(0, -78, 86, Math.PI * 1.08, Math.PI * 1.92);
  c.arc(0, -70, 70, Math.PI * 1.85, Math.PI * 1.15, true);
  c.closePath();
  c.fill();
  c.fillStyle = "rgba(43,43,43,0.35)";
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * (1.15 + (i / 18) * 0.7);
    c.beginPath();
    c.arc(Math.cos(a) * 66, -78 + Math.sin(a) * 58, 3, 0, TAU);
    c.fill();
  }
  void faceX;
};
export const beret = (col = "#7A2E2E") => (c: CanvasRenderingContext2D) => {
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(-12, -150, 92, 34, -0.18, 0, TAU);
  c.fill();
  c.fillStyle = "#D4AF37";
  c.beginPath();
  c.arc(-48, -150, 9, 0, TAU);
  c.fill();
};
export const mustache = (faceX = 0) => (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#3A3A3A";
  c.beginPath();
  c.ellipse(faceX - 16, -52, 20, 8, 0.25, 0, TAU);
  c.ellipse(faceX + 16, -52, 20, 8, -0.25, 0, TAU);
  c.fill();
};
export const sweat = (amt: number) => (c: CanvasRenderingContext2D) => {
  if (amt <= 0) return;
  c.fillStyle = `rgba(120,190,255,${0.9 * amt})`;
  c.beginPath();
  c.moveTo(70, -150);
  c.quadraticCurveTo(84, -122, 70, -116);
  c.quadraticCurveTo(56, -122, 70, -150);
  c.fill();
};

// ---------- small props ----------
export function soapCard(x: number, y: number, z: number, rot = 0, scale = 1): Card {
  return {
    x, y, z, w: 0.12, h: 0.06, shadow: y < 0.03 ? 0.6 : 0,
    draw: (c) => {
      c.save();
      c.rotate(rot);
      c.scale(scale, scale);
      paper(c, (p) => roundRect(p, -5, -4, 10, 4, 1.6), "#FFD54A", "rgba(0,0,0,0.3)", 0.6);
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.fillRect(-3.5, -3.4, 4, 0.8);
      c.restore();
    },
  };
}

export function bubbles(x: number, y: number, z: number, frame: number, n = 5): Card {
  return {
    x, y, z, w: 0.2, h: 0.2, noHaze: true,
    draw: (c) => {
      for (let i = 0; i < n; i++) {
        const t = ((frame * 0.02 + i / n) % 1);
        c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - t)})`;
        c.lineWidth = 0.4;
        c.beginPath();
        c.arc(Math.sin(i * 2.1 + frame * 0.05) * 4, -t * 14, 1 + (i % 3) * 0.6, 0, TAU);
        c.stroke();
      }
    },
  };
}

// ---------- shower room (diorama, 5.6 m wide, back wall z = 3.6) ----------
export type ShowerState = { steam: number; frame: number; gross: number };

function tiles(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, size: number, base: string, grout: string) {
  c.fillStyle = base;
  c.fillRect(x0, y0, w, h);
  c.strokeStyle = grout;
  c.lineWidth = 0.6;
  for (let x = x0; x <= x0 + w; x += size) {
    c.beginPath();
    c.moveTo(x, y0);
    c.lineTo(x, y0 + h);
    c.stroke();
  }
  for (let y = y0; y <= y0 + h; y += size) {
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x0 + w, y);
    c.stroke();
  }
}

export function showerCards(s: ShowerState): Card[] {
  const f = s.frame;
  const cards: Card[] = [];
  // back wall: tiles to 1.8 m, painted above, shower heads + pipe
  cards.push({
    x: 0, z: 3.6, w: 6.2, h: 2.8, noHaze: true,
    draw: (c) => {
      c.fillStyle = "#C9D3CF";
      c.fillRect(-310, -280, 620, 280);
      tiles(c, -310, -180, 620, 180, 20, "#E6F0EF", "rgba(80,110,110,0.35)");
      c.fillStyle = "rgba(90,120,70,0.25)"; // grime band
      c.fillRect(-310, -20, 620, 20);
      // pipe
      c.fillStyle = "#8C949B";
      c.fillRect(-300, -222, 600, 5);
      for (const sx of [-190, 0, 190]) {
        c.fillRect(sx - 2.5, -222, 5, 18);
        paper(c, (p) => {
          p.moveTo(sx - 10, -204);
          p.lineTo(sx + 10, -204);
          p.lineTo(sx + 6, -196);
          p.lineTo(sx - 6, -196);
        }, "#A9B1B8", "rgba(0,0,0,0.25)", 1);
        // valve
        c.fillStyle = "#B03A2E";
        c.beginPath();
        c.arc(sx + 22, -120, 4, 0, TAU);
        c.fill();
      }
      // signboard
      paper(c, (p) => p.rect(-70, -262, 140, 30), "#3F5B2E", "rgba(0,0,0,0.3)", 2);
      c.fillStyle = "#F2EBD3";
      c.font = "800 15px Kanit";
      c.textAlign = "center";
      c.fillText("ห้องน้ำ กองร้อย 2", 0, -241);
      // window strip with daylight
      c.fillStyle = "#BFE3F2";
      c.fillRect(-300, -275, 160, 22);
      c.fillRect(140, -275, 160, 22);
    },
  });
  // water falling from the middle shower
  cards.push({
    x: 0, z: 3.4, w: 0.4, h: 2.0, noHaze: true,
    draw: (c) => {
      c.strokeStyle = "rgba(190,225,240,0.55)";
      c.lineWidth = 0.8;
      for (let i = 0; i < 9; i++) {
        const off = ((f * 6 + i * 23) % 40);
        const x = -8 + i * 2;
        c.beginPath();
        c.moveTo(x, -192 + off);
        c.lineTo(x + (i - 4) * 0.8, -150 + off);
        c.stroke();
      }
    },
  });
  // stall partitions (boxes)
  for (const px of [-0.95, 0.95]) {
    cards.push({
      x: px, z: 2.6, w: 0.06, h: 1.8, y: 0.15, box: { d: 1.0, side: "#5F7F6E", top: "#7C9A8A" },
      draw: (c) => paper(c, (p) => p.rect(-3, -180, 6, 180), "#6F8F7E", "rgba(0,0,0,0)", 0),
    });
  }
  // left wall + sinks row with mirror strip
  cards.push({ x: -3.2, z: -1.2, w: 0.3, h: 2.8, noHaze: true, box: { d: 4.8, side: "#D4DDD9", top: "#B9C4C0" }, draw: (c) => paper(c, (p) => p.rect(-15, -280, 30, 280), "#BAC5C1", "rgba(0,0,0,0)", 0) });
  cards.push({ x: 3.2, z: -1.2, w: 0.3, h: 2.8, noHaze: true, box: { d: 4.8, side: "#CDD7D3", top: "#B9C4C0" }, draw: (c) => paper(c, (p) => p.rect(-15, -280, 30, 280), "#BAC5C1", "rgba(0,0,0,0)", 0) });
  for (const z of [0.6, 1.6]) {
    cards.push({
      x: -2.85, z, w: 0.5, h: 0.9, shadow: 0.5, box: { d: 0.5, side: "#D9DEE0", top: "#EEF1F2" },
      draw: (c) => {
        paper(c, (p) => p.rect(-25, -90, 50, 12), "#EEF1F2", "rgba(0,0,0,0.2)", 1.5);
        c.fillStyle = "#9AA3A8";
        c.fillRect(-4, -78, 8, 78);
      },
    });
  }
  // big water tank (โอ่ง/ถัง) with a dipper — Thai barracks staple
  cards.push({
    x: 2.55, z: 2.7, w: 0.9, h: 0.9, shadow: 0.7, box: { d: 0.9, side: "#2F6B8A", top: "#9FD1E6" },
    draw: (c) => {
      paper(c, (p) => p.rect(-45, -90, 90, 90), "#3A7EA1", "rgba(0,0,0,0.25)", 2);
      c.fillStyle = "rgba(255,255,255,0.18)";
      c.fillRect(-38, -82, 10, 70);
      paper(c, (p) => {
        p.ellipse(18, -92, 13, 5, 0, 0, TAU);
      }, "#E86A5A", "rgba(0,0,0,0.25)", 1);
      c.fillStyle = "#E86A5A";
      c.fillRect(28, -96, 22, 3);
    },
  });
  // bench with towels and baskets
  cards.push({
    x: 1.7, z: 0.9, w: 1.4, h: 0.45, shadow: 0.6, box: { d: 0.35, side: "#7A5B3E", top: "#9C7A57" },
    draw: (c) => {
      paper(c, (p) => p.rect(-70, -45, 140, 7), "#9C7A57", "rgba(0,0,0,0.25)", 1.5);
      c.fillStyle = "#7A5B3E";
      c.fillRect(-64, -38, 6, 38);
      c.fillRect(58, -38, 6, 38);
      paper(c, (p) => roundRect(p, -60, -62, 40, 17, 4), "#4F8FC0", "rgba(0,0,0,0.25)", 1.5);
      paper(c, (p) => roundRect(p, -10, -58, 34, 13, 3), "#F2EBD3", "rgba(0,0,0,0.2)", 1);
      paper(c, (p) => roundRect(p, 30, -66, 30, 21, 3), "#E86A5A", "rgba(0,0,0,0.25)", 1.5);
    },
  });
  // fluorescent tube
  cards.push({
    x: 0, y: 2.65, z: 1.8, w: 1.3, h: 0.08, noHaze: true,
    draw: (c) => {
      c.fillStyle = "#F7FBFF";
      c.shadowColor = "rgba(230,245,255,0.9)";
      c.shadowBlur = 18;
      roundRect(c, -60, -5, 120, 5, 2.5);
      c.fill();
      c.shadowBlur = 0;
    },
  });
  // steam puffs
  if (s.steam > 0) {
    for (let i = 0; i < 6; i++) {
      const t = ((f * 0.004 + i / 6) % 1);
      cards.push({
        x: -1.2 + i * 0.5, y: 0.6 + t * 1.6, z: 3.1, w: 0.8, h: 0.8, noHaze: true,
        draw: (c) => {
          const g = c.createRadialGradient(0, -40, 2, 0, -40, 45);
          g.addColorStop(0, `rgba(255,255,255,${0.22 * s.steam * Math.sin(t * Math.PI)})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g;
          c.fillRect(-45, -85, 90, 90);
        },
      });
    }
  }
  // the gross floor detail (shown in the floor POV)
  if (s.gross > 0) {
    // hair clump
    cards.push({
      x: -0.32, z: 1.78, w: 0.12, h: 0.04, noHaze: true,
      draw: (c) => {
        c.globalAlpha = s.gross;
        c.strokeStyle = "#2B2B2B";
        c.lineWidth = 0.25;
        for (let i = 0; i < 14; i++) {
          c.beginPath();
          c.moveTo(-5 + i * 0.7, 0);
          c.quadraticCurveTo(-3 + i, -3 - (i % 4), 2 + i * 0.4, -0.4);
          c.stroke();
        }
        c.globalAlpha = 1;
      },
    });
    // cockroach that wanders
    const bx = 0.28 + Math.sin(f * 0.05) * 0.06;
    cards.push({
      x: bx, z: 1.95, w: 0.06, h: 0.03, noHaze: true,
      draw: (c) => {
        c.globalAlpha = s.gross;
        c.fillStyle = "#5A2E1B";
        c.beginPath();
        c.ellipse(0, -1, 2.6, 1.3, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "#3A1E10";
        c.lineWidth = 0.25;
        for (const k of [-1, 0, 1]) {
          const w = Math.sin(f * 0.9 + k) * 0.6;
          c.beginPath();
          c.moveTo(k * 1.2, -0.5);
          c.lineTo(k * 1.6 + w, 0.3);
          c.stroke();
        }
        c.beginPath();
        c.moveTo(2.4, -1.4);
        c.quadraticCurveTo(5, -4, 6.5, -3);
        c.moveTo(2.4, -1.2);
        c.quadraticCurveTo(5, -3, 7, -1.5);
        c.stroke();
        c.globalAlpha = 1;
      },
    });
  }
  return cards;
}

export function drawShowerFloor(ctx: CanvasRenderingContext2D, cam: Cam, gross: number) {
  const P = (x: number, z: number) => project(cam, x, 0, z);
  const poly = (pts: [number, number][], fill: string) => {
    const q = pts.map(([x, z]) => P(x, z));
    if (q.some((v) => !v)) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    q.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  };
  const zN = Math.max(-1.2, cam.z + 0.12);
  poly([[-3.05, 3.6], [3.05, 3.6], [3.05, zN], [-3.05, zN]], "#9FB2AE");
  ctx.strokeStyle = "rgba(60,80,80,0.28)";
  ctx.lineWidth = 1.5;
  for (let x = -3.0; x <= 3.0; x += 0.2) {
    const a = P(x, zN);
    const b = P(x, 3.6);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  for (let z = Math.ceil(zN / 0.2) * 0.2; z <= 3.6; z += 0.2) {
    const a = P(-3.05, z);
    const b = P(3.05, z);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  // puddles with a sheen
  const puddle = (cx: number, cz: number, rx: number, rz: number, col: string) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      pts.push([cx + Math.cos(a) * rx * (1 + 0.15 * Math.sin(a * 3)), cz + Math.sin(a) * rz]);
    }
    poly(pts, col);
  };
  puddle(0.1, 2.3, 0.8, 0.5, "rgba(200,230,240,0.45)");
  puddle(-1.1, 1.2, 0.5, 0.3, "rgba(200,230,240,0.35)");
  if (gross > 0) puddle(0.55, 1.75, 0.13, 0.07, `rgba(120,150,60,${0.75 * gross})`); // the green mystery
  // drain grate
  const d = [P(-0.1, 2.0), P(0.1, 2.0), P(0.1, 2.2), P(-0.1, 2.2)];
  if (d.every((v) => v)) {
    ctx.fillStyle = "#59666B";
    ctx.beginPath();
    d.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  }
  // floor slab front face
  if (zN <= -1.2) {
    const f = [project(cam, -3.4, 0, -1.2), project(cam, 3.4, 0, -1.2), project(cam, 3.4, -0.3, -1.2), project(cam, -3.4, -0.3, -1.2)];
    if (f.every((v) => v)) {
      ctx.fillStyle = "#5E6E6B";
      ctx.beginPath();
      f.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------- parade yard (day / night / dusk battlefield / discharge day) ----------
export type YardMode = "day" | "night" | "dusk" | "party";
export function yardSky(ctx: CanvasRenderingContext2D, mode: YardMode, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  const cols: Record<YardMode, [string, string]> = {
    day: ["#7EC3F0", "#DCEFFB"],
    party: ["#7EC3F0", "#DCEFFB"],
    night: ["#0E1430", "#2A3360"],
    dusk: ["#5B4A7A", "#F2A65A"],
  };
  g.addColorStop(0, cols[mode][0]);
  g.addColorStop(1, cols[mode][1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (mode === "night") {
    ctx.fillStyle = "#FFF6D5";
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.16, 46, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect((i * 197) % W, (i * 331) % (H * 0.5), 2, 2);
    }
  }
}

export function yardCards(mode: YardMode, frame: number): Card[] {
  const cards: Card[] = [];
  const dark = mode === "night";
  // barracks buildings (boxes) along the back
  for (let i = -2; i < 6; i++) {
    cards.push({
      x: i * 9.5, z: 16, w: 8.6, h: 4.6, shadow: 0.3, box: { d: 7, side: dark ? "#3B3F2E" : "#B8A77E", top: dark ? "#2A2D22" : "#8C3B2E" },
      draw: (c) => {
        paper(c, (p) => p.rect(-430, -460, 860, 460), dark ? "#4A4F3A" : "#E3D3A8", "rgba(0,0,0,0)", 0);
        paper(c, (p) => {
          p.moveTo(-470, -460);
          p.lineTo(470, -460);
          p.lineTo(400, -560);
          p.lineTo(-400, -560);
        }, dark ? "#2A2D22" : "#9C4434", "rgba(0,0,0,0.25)", 4);
        for (let k = 0; k < 6; k++) {
          const wx = -380 + k * 140;
          paper(c, (p) => p.rect(wx, -330, 80, 110), dark ? (k % 3 === 0 ? "#FFD27A" : "#22263A") : "#7FA8C9", "rgba(0,0,0,0.2)", 3);
        }
        paper(c, (p) => p.rect(-60, -220, 120, 220), dark ? "#2A2D22" : "#7A5B3E", "rgba(0,0,0,0.2)", 3);
      },
    });
  }
  // trees
  for (let i = -3; i < 8; i++) {
    cards.push({
      x: i * 7 + 3, z: 11, w: 3, h: 6, shadow: 0.4,
      draw: (c) => {
        paper(c, (p) => p.rect(-12, -320, 24, 320), "#6B4E32", "rgba(0,0,0,0.25)", 3);
        paper(c, (p) => {
          p.ellipse(0, -420, 150, 130, 0, 0, TAU);
          p.ellipse(-100, -330, 90, 70, 0, 0, TAU);
          p.ellipse(100, -340, 95, 72, 0, 0, TAU);
        }, dark ? "#1F3A2A" : mode === "dusk" ? "#4C6B3A" : "#4C9A5A", "rgba(0,0,0,0.2)", 6);
      },
    });
  }
  // flagpole (plain flag, no national emblem detail)
  cards.push({
    x: -3.5, z: 8, w: 1.4, h: 9, shadow: 0.4,
    draw: (c) => {
      paper(c, (p) => p.rect(-5, -900, 10, 900), "#C9CED2", "rgba(0,0,0,0.25)", 2);
      const wv = Math.sin(frame * 0.12) * 6;
      paper(c, (p) => {
        p.moveTo(5, -890);
        p.quadraticCurveTo(60, -890 + wv, 120, -885);
        p.lineTo(120, -810);
        p.quadraticCurveTo(60, -815 + wv, 5, -815);
      }, "#3F5B2E", "rgba(0,0,0,0.2)", 2);
    },
  });
  if (mode === "party") {
    cards.push({
      x: 0.5, z: 5.5, w: 6, h: 3.5, shadow: 0.3,
      draw: (c) => {
        paper(c, (p) => p.rect(-290, -340, 8, 340), "#7A5B3E", "rgba(0,0,0,0.2)", 2);
        paper(c, (p) => p.rect(282, -340, 8, 340), "#7A5B3E", "rgba(0,0,0,0.2)", 2);
        paper(c, (p) => p.rect(-280, -340, 560, 70), "#F2EBD3", "rgba(0,0,0,0.25)", 4);
        c.fillStyle = "#3F5B2E";
        c.font = "800 44px Kanit";
        c.textAlign = "center";
        c.fillText("ยินดีด้วย! วันปลดประจำการ", 0, -290);
        for (let k = 0; k < 9; k++) {
          c.fillStyle = ["#E86A5A", "#F2C14E", "#4F8FC0"][k % 3];
          c.beginPath();
          c.moveTo(-270 + k * 68, -270);
          c.lineTo(-240 + k * 68, -270);
          c.lineTo(-255 + k * 68, -240);
          c.fill();
        }
      },
    });
  }
  if (mode === "dusk") {
    // sandbag wall
    cards.push({
      x: 0.3, z: 3.4, w: 4.2, h: 1.0, shadow: 0.6,
      draw: (c) => {
        for (let row = 0; row < 3; row++)
          for (let k = 0; k < 7 - row; k++)
            paper(c, (p) => p.ellipse(-180 + row * 30 + k * 60, -16 - row * 30, 32, 17, 0, 0, TAU), "#B59A6A", "rgba(0,0,0,0.3)", 3);
      },
    });
    // smoke column far away
    cards.push({
      x: 6, z: 14, w: 3, h: 7, noHaze: true,
      draw: (c) => {
        for (let i = 0; i < 6; i++) {
          const t = ((frame * 0.01 + i / 6) % 1);
          c.fillStyle = `rgba(80,70,90,${0.35 * (1 - t)})`;
          c.beginPath();
          c.arc(Math.sin(i + frame * 0.02) * 30, -t * 650, 60 + t * 90, 0, TAU);
          c.fill();
        }
      },
    });
  }
  if (mode === "night") {
    // guard booth
    cards.push({
      x: 1.6, z: 3.2, w: 1.4, h: 2.6, shadow: 0.6, box: { d: 1.4, side: "#3A4A2E", top: "#C0392B" },
      draw: (c) => {
        paper(c, (p) => p.rect(-70, -230, 140, 230), "#4F6A3A", "rgba(0,0,0,0.2)", 3);
        for (let k = 0; k < 7; k++) {
          c.fillStyle = k % 2 ? "#F2EBD3" : "#C0392B";
          c.fillRect(-70 + k * 20, -250, 20, 20);
        }
        c.fillStyle = "#FFE7A8";
        c.fillRect(-50, -200, 100, 70);
      },
    });
  }
  return cards;
}

export function drawYardGround(ctx: CanvasRenderingContext2D, cam: Cam, mode: YardMode) {
  const near = mode === "night" ? "#3A3A30" : mode === "dusk" ? "#8A6E4E" : "#C9B48A";
  const far = mode === "night" ? "#2A2A24" : mode === "dusk" ? "#B08A60" : "#DCCB9E";
  const g = [project(cam, -60, 0, 30), project(cam, 60, 0, 30)];
  if (!g[0] || !g[1]) return;
  const grad = ctx.createLinearGradient(0, g[0].sy, 0, 1920);
  grad.addColorStop(0, far);
  grad.addColorStop(1, near);
  ctx.fillStyle = grad;
  ctx.fillRect(0, g[0].sy, 1080, 1920 - g[0].sy);
  // parade lines painted on the ground
  ctx.strokeStyle = mode === "night" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.35)";
  ctx.lineWidth = 3;
  for (let x = -12; x <= 12; x += 2) {
    const a = project(cam, x, 0, Math.max(cam.z + 0.5, -2));
    const b = project(cam, x, 0, 9);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
}

// ---------- tabletop inserts ----------
export type TableKind = "tray" | "shop";
export function tableCards(kind: TableKind, frame: number, poke: number): Card[] {
  const cards: Card[] = [];
  // table top as a box
  cards.push({
    x: 0, z: 0.0, w: 1.2, h: 0.75, shadow: 0.5, box: { d: 0.8, side: "#6E5038", top: kind === "tray" ? "#8C6A4B" : "#C9B79A" },
    draw: (c) => paper(c, (p) => p.rect(-60, -75, 120, 75), "#7A5B3E", "rgba(0,0,0,0.2)", 2),
  });
  if (kind === "tray") {
    cards.push({
      x: 0, y: 0.75, z: 0.35, w: 0.45, h: 0.06, noHaze: true,
      draw: (c) => {
        paper(c, (p) => roundRect(p, -22, -3, 44, 3, 1), "#C9CED2", "rgba(0,0,0,0.25)", 0.6);
        paper(c, (p) => p.ellipse(-10, -4, 8, 3, 0, 0, TAU), "#FFFFFF", "rgba(0,0,0,0.15)", 0.4); // rice
        // the mystery meat
        const w = Math.sin(frame * 0.6) * 0.3 * poke;
        paper(c, (p) => {
          p.ellipse(9 + w, -4.5, 6.5, 3.4, 0.1, 0, TAU);
        }, "#8A8279", "rgba(0,0,0,0.25)", 0.5);
        c.fillStyle = "#6E665E";
        c.beginPath();
        c.arc(7 + w, -5, 1, 0, TAU);
        c.arc(11 + w, -4, 0.8, 0, TAU);
        c.fill();
        // spoon
        c.save();
        c.translate(20, -12 + poke * 6);
        c.rotate(-0.9);
        paper(c, (p) => {
          p.rect(-0.6, -10, 1.2, 10);
          p.ellipse(0, 1.5, 1.6, 2.4, 0, 0, TAU);
        }, "#D9DDE0", "rgba(0,0,0,0.25)", 0.4);
        c.restore();
      },
    });
  } else {
    // canteen counter: soap packs + price tag + coins
    for (let k = 0; k < 3; k++) {
      cards.push({
        x: -0.25 + k * 0.17, y: 0.75, z: 0.3 - k * 0.02, w: 0.12, h: 0.08, noHaze: true,
        draw: (c) => {
          paper(c, (p) => roundRect(p, -6, -7, 12, 7, 1), ["#4F8FC0", "#E86A5A", "#5CA36B"][k], "rgba(0,0,0,0.3)", 0.6);
          c.fillStyle = "#FFFFFF";
          c.font = "800 2.6px Kanit";
          c.textAlign = "center";
          c.fillText("สบู่", 0, -2.6);
        },
      });
    }
    cards.push({
      x: 0.27, y: 0.75, z: 0.22, w: 0.1, h: 0.05, noHaze: true,
      draw: (c) => {
        for (let k = 0; k < 4; k++) {
          paper(c, (p) => p.ellipse(k * 1.2 - 2, -0.8 - k * 0.6, 2.2, 0.7, 0, 0, TAU), "#D4AF37", "rgba(0,0,0,0.3)", 0.3);
        }
      },
    });
  }
  return cards;
}

export function drawTableRoom(ctx: CanvasRenderingContext2D, W: number, H: number, kind: TableKind) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, kind === "tray" ? "#5B5146" : "#3F5B2E");
  g.addColorStop(1, kind === "tray" ? "#2E2822" : "#24331B");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // soft lamp pool behind
  const r = ctx.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, 900);
  r.addColorStop(0, "rgba(255,230,180,0.35)");
  r.addColorStop(1, "rgba(255,230,180,0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (kind === "tray") {
    // mess-hall menu board + wall tiles
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y < H * 0.55; y += 60) ctx.fillRect(0, y, W, 2);
    ctx.fillStyle = "#2F3A2A";
    ctx.fillRect(250, 140, 580, 300);
    ctx.strokeStyle = "#8C6A3E";
    ctx.lineWidth = 14;
    ctx.strokeRect(250, 140, 580, 300);
    ctx.fillStyle = "#EDE6D0";
    ctx.font = "800 46px Kanit";
    ctx.textAlign = "center";
    ctx.fillText("เมนูวันนี้", 540, 215);
    ctx.font = "500 38px Kanit";
    ctx.fillText("ข้าว + ผัด ???", 540, 290);
    ctx.fillText("แกงจืด (เนื้อ?)", 540, 350);
    ctx.fillText("น้ำ", 540, 405);
  } else {
    // canteen shelves stocked with goods
    ctx.fillStyle = "#F2EBD3";
    ctx.fillRect(220, 70, 640, 90);
    ctx.fillStyle = "#3F5B2E";
    ctx.font = "800 54px Kanit";
    ctx.textAlign = "center";
    ctx.fillText("ร้านค้าสวัสดิการ", 540, 135);
    const cols = ["#E86A5A", "#4F8FC0", "#F2C14E", "#5CA36B", "#EDEDED", "#8B5CF6"];
    for (let row = 0; row < 3; row++) {
      const y = 260 + row * 170;
      ctx.fillStyle = "#6E5038";
      ctx.fillRect(60, y + 120, 960, 16);
      for (let k = 0; k < 11; k++) {
        ctx.fillStyle = cols[(k * 7 + row * 3) % cols.length];
        const h = 70 + ((k * 13 + row * 5) % 40);
        ctx.fillRect(80 + k * 86, y + 120 - h, 66, h);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(86 + k * 86, y + 128 - h, 18, 8);
      }
    }
    ctx.fillStyle = "rgba(20,30,14,0.35)";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  void INK;
}

// ---------- balance scale (courage vs soap) ----------
export function scaleCard(x: number, z: number, tilt: number): Card {
  return {
    x, z, y: 0.45, w: 0.8, h: 0.6, shadow: 0, noHaze: true,
    draw: (c) => {
      paper(c, (p) => p.rect(-2, -50, 4, 50), "#B08D57", "rgba(0,0,0,0.25)", 1);
      paper(c, (p) => p.rect(-14, -3, 28, 3), "#8C6A3E", "rgba(0,0,0,0.25)", 1);
      c.save();
      c.translate(0, -50);
      c.rotate(tilt);
      paper(c, (p) => p.rect(-34, -2, 68, 3), "#B08D57", "rgba(0,0,0,0.25)", 1);
      for (const [sx, label] of [[-30, "medal"], [30, "soap"]] as [number, string][]) {
        c.save();
        c.translate(sx, 0);
        c.rotate(-tilt);
        c.strokeStyle = "#8C6A3E";
        c.lineWidth = 0.5;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-8, 16);
        c.moveTo(0, 0);
        c.lineTo(8, 16);
        c.stroke();
        paper(c, (p) => p.ellipse(0, 17, 10, 2.5, 0, 0, TAU), "#C9A86A", "rgba(0,0,0,0.25)", 0.8);
        if (label === "medal") {
          paper(c, (p) => p.rect(-2, 4, 4, 6), "#3F5B2E", "rgba(0,0,0,0.2)", 0.4);
          paper(c, (p) => p.arc(0, 12, 3.5, 0, TAU), "#D4AF37", "rgba(0,0,0,0.25)", 0.5);
        } else {
          paper(c, (p) => roundRect(p, -5, 11, 10, 4.5, 1.5), "#FFD54A", "rgba(0,0,0,0.3)", 0.5);
        }
        c.restore();
      }
      c.restore();
    },
  };
}

// trash bin with lid
export function binCard(x: number, z: number, lidOpen: number): Card {
  return {
    x, z, w: 0.45, h: 0.6, shadow: 0.6,
    draw: (c) => {
      paper(c, (p) => {
        p.moveTo(-20, -55);
        p.lineTo(20, -55);
        p.lineTo(16, 0);
        p.lineTo(-16, 0);
      }, "#3F6F4A", "rgba(0,0,0,0.25)", 1.5);
      c.save();
      c.translate(-22, -56);
      c.rotate(-lidOpen * 1.2);
      paper(c, (p) => roundRect(p, 0, -5, 44, 5, 2), "#2F5A3A", "rgba(0,0,0,0.25)", 1);
      c.restore();
    },
  };
}

// dropped rifle (simple silhouette) + helmet
export function droppedGearCard(x: number, z: number): Card {
  return {
    x, z, w: 1.1, h: 0.3, shadow: 0.5,
    draw: (c) => {
      c.save();
      c.rotate(0.06);
      paper(c, (p) => {
        p.rect(-50, -6, 70, 5);
        p.rect(18, -8, 30, 8);
        p.rect(-10, -1, 6, 8);
      }, "#3A3A34", "rgba(0,0,0,0.3)", 1);
      c.restore();
      paper(c, (p) => p.arc(-70, 0, 13, Math.PI, 0), "#4F6A3A", "rgba(0,0,0,0.3)", 1.5);
    },
  };
}
