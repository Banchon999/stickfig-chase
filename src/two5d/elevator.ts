// Sets + props for "ELEVATOR SURVIVAL — คู่มือเอาตัวรอดจากการตดในลิฟต์".
// Metres in the world, centimetres inside cards. Every hero prop is INKED (outline + highlight)
// so it reads clearly at phone size — Max's note on the soap clip.
import { roundRect } from "../draw";
import { Cam, Card, project } from "./engine";

const TAU = Math.PI * 2;
export const INK = "#1d1b1a";

// fill + ink outline + optional top highlight (cm units; lw scales with the card)
export function inked(c: CanvasRenderingContext2D, path: (p: CanvasRenderingContext2D) => void, fill: string, lw = 0.8, hi = true) {
  c.save();
  c.beginPath();
  path(c);
  c.fillStyle = fill;
  c.fill();
  if (hi) {
    // crisp inner rim light on the upper-left edge
    c.save();
    c.clip();
    c.translate(lw * 0.9, lw * 0.9);
    c.beginPath();
    path(c);
    c.lineWidth = lw * 1.4;
    c.strokeStyle = "rgba(255,255,255,0.45)";
    c.stroke();
    c.restore();
    c.beginPath();
    path(c);
  }
  c.lineWidth = lw;
  c.strokeStyle = INK;
  c.lineJoin = "round";
  c.stroke();
  c.restore();
}

// ---------- head accessories ----------
export const bun = (col = "#2A2140") => (c: CanvasRenderingContext2D) => {
  c.fillStyle = col;
  c.beginPath();
  c.arc(0, -78, 88, Math.PI * 1.05, Math.PI * 1.95);
  c.quadraticCurveTo(30, -125, -20, -118);
  c.quadraticCurveTo(-70, -108, -88, -72);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(0, -178, 34, 0, TAU);
  c.fill();
  c.lineWidth = 8;
  c.strokeStyle = INK;
  c.stroke();
};
export const greyHair = (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#C9C9C9";
  for (const s of [-1, 1]) {
    c.beginPath();
    c.ellipse(s * 74, -96, 18, 30, s * 0.3, 0, TAU);
    c.fill();
  }
};
export const helmet = (col = "#F28C28") => (c: CanvasRenderingContext2D) => {
  c.fillStyle = col;
  c.beginPath();
  c.arc(0, -84, 92, Math.PI * 1.0, Math.PI * 2.0);
  c.closePath();
  c.fill();
  c.lineWidth = 9;
  c.strokeStyle = INK;
  c.stroke();
  c.fillStyle = "rgba(255,255,255,0.35)";
  c.fillRect(-50, -150, 40, 12);
};
// a nose that appears for the sniff gags; wrinkle 0..1
export const nose = (faceX: number, wrinkle: number) => (c: CanvasRenderingContext2D) => {
  // a clear cartoon nose: filled bump + nostril, wrinkles when the smell arrives
  c.fillStyle = "#FFE4D1";
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(faceX - 4, -84);
  c.quadraticCurveTo(faceX + 26, -58, faceX + 6, -46);
  c.quadraticCurveTo(faceX - 10, -46, faceX - 8, -56);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.beginPath();
  c.arc(faceX + 4, -52, 3.5, 0, TAU);
  c.fill();
  if (wrinkle > 0.05) {
    c.lineWidth = 6;
    c.lineCap = "round";
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(faceX + s * 14, -90);
      c.lineTo(faceX + s * 26, -100 - wrinkle * 8);
      c.stroke();
    }
  }
};

// ---------- the elevator car: 1.8 m wide, 1.5 m deep, 2.4 m high; open side faces the camera ----------
export type CarState = { frame: number; floor: number; light: number; alarm: number };

export function carCards(s: CarState): Card[] {
  const cards: Card[] = [];
  // back wall: brushed steel, mirror, handrail, floor display
  cards.push({
    x: 0, z: 1.5, w: 1.8, h: 2.4, noHaze: true,
    draw: (c) => {
      const g = c.createLinearGradient(-90, 0, 90, 0);
      g.addColorStop(0, "#AEB6BE");
      g.addColorStop(0.5, "#D5DBE0");
      g.addColorStop(1, "#A3ABB3");
      c.fillStyle = g;
      c.fillRect(-90, -240, 180, 240);
      c.strokeStyle = "rgba(60,70,80,0.18)";
      c.lineWidth = 0.4;
      for (let x = -88; x < 90; x += 3) {
        c.beginPath();
        c.moveTo(x, -240);
        c.lineTo(x, 0);
        c.stroke();
      }
      // mirror band
      c.fillStyle = "#C6D9E6";
      c.fillRect(-80, -205, 160, 95);
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.beginPath();
      c.moveTo(-60, -205);
      c.lineTo(-35, -205);
      c.lineTo(-75, -110);
      c.lineTo(-80, -110);
      c.lineTo(-80, -160);
      c.closePath();
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 1.2;
      c.strokeRect(-80, -205, 160, 95);
      // handrail
      c.fillStyle = "#7E8790";
      roundRect(c, -85, -94, 170, 5, 2.5);
      c.fill();
      c.lineWidth = 0.8;
      c.stroke();
      // floor display (inked) — big digits so it reads at phone size
      c.fillStyle = "#111418";
      roundRect(c, -24, -236, 48, 24, 3);
      c.fill();
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = "#FF6B3D";
      c.font = "800 17px Kanit";
      c.textAlign = "center";
      c.fillText(`▼ ${s.floor}`, 0, -218);
      // kick plate
      c.fillStyle = "#7E8790";
      c.fillRect(-90, -14, 180, 14);
    },
  });
  // side walls (boxes recede in perspective)
  cards.push({ x: -0.95, z: 0, w: 0.1, h: 2.4, noHaze: true, box: { d: 1.5, side: "#B8C0C7", top: "#9AA2AA" }, draw: (c) => inked(c, (p) => p.rect(-5, -240, 10, 240), "#8F98A1", 0.8, false) });
  cards.push({ x: 0.95, z: 0, w: 0.1, h: 2.4, noHaze: true, box: { d: 1.5, side: "#B1B9C0", top: "#9AA2AA" }, draw: (c) => inked(c, (p) => p.rect(-5, -240, 10, 240), "#8F98A1", 0.8, false) });
  // ceiling with the light panel
  cards.push({
    x: 0, y: 2.4, z: 0, w: 1.9, h: 0.04, noHaze: true, box: { d: 1.5, side: "#8F98A1", top: `rgba(${Math.round(255 * s.light)},${Math.round(250 * s.light)},${Math.round(230 * s.light)},1)` },
    draw: (c) => inked(c, (p) => p.rect(-95, -4, 190, 4), "#8F98A1", 0.6, false),
  });
  // button panel (on the right wall near the door)
  cards.push({ ...panelCard(0.83, 1.0, 0.32, s.frame, -1), noHaze: true });
  return cards;
}

// the button panel: buttons 4 cm, readable in an insert; pressed = index of the lit button
export function panelCard(x: number, y: number, z: number, frame: number, pressed: number): Card {
  return {
    x, y, z, w: 0.22, h: 0.5,
    draw: (c) => {
      inked(c, (p) => roundRect(p, -11, -50, 22, 50, 2), "#C3CAD1", 0.7, false);
      c.fillStyle = "#111418";
      roundRect(c, -8, -47, 16, 7, 1);
      c.fill();
      c.fillStyle = "#FF6B3D";
      c.font = "800 4.6px Kanit";
      c.textAlign = "center";
      c.fillText("12", 0, -42);
      const labels = ["12", "11", "10", "9", "8", "7", "G", "◀▶"];
      labels.forEach((l, i) => {
        const bx = i % 2 === 0 ? -4.6 : 4.6;
        const by = -35 + Math.floor(i / 2) * 8.4;
        const lit = i === pressed && Math.floor(frame / 3) % 2 === 0;
        c.beginPath();
        c.arc(bx, by, 2.6, 0, TAU);
        c.fillStyle = lit ? "#FFD27A" : "#E9EDF0";
        c.fill();
        c.lineWidth = 0.4;
        c.strokeStyle = INK;
        c.stroke();
        c.fillStyle = INK;
        c.font = "800 2.2px Kanit";
        c.fillText(l, bx, by + 0.8);
      });
      // alarm bell
      c.beginPath();
      c.arc(0, -4, 2.4, 0, TAU);
      c.fillStyle = "#E8C547";
      c.fill();
      c.stroke();
    },
  };
}

export function drawCarFloor(ctx: CanvasRenderingContext2D, cam: Cam) {
  const P = (x: number, z: number) => project(cam, x, 0, z);
  const pts = [P(-0.9, 1.5), P(0.9, 1.5), P(0.9, 0), P(-0.9, 0)];
  if (pts.some((v) => !v)) return;
  ctx.fillStyle = "#5C5550";
  ctx.beginPath();
  pts.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let z = 0.3; z < 1.5; z += 0.3) {
    const a = P(-0.9, z);
    const b = P(0.9, z);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  // door sill at the front edge
  const s = [P(-0.9, 0), P(0.9, 0), P(0.9, -0.08), P(-0.9, -0.08)];
  if (s.every((v) => v)) {
    ctx.fillStyle = "#B5BDC4";
    ctx.beginPath();
    s.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  }
}

// the dark shaft around the car (so the car reads as a box hanging in a shaft)
export function drawShaft(ctx: CanvasRenderingContext2D, W: number, H: number, frame: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#15171D");
  g.addColorStop(1, "#1E2129");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // moving cables/rails suggest travel
  ctx.strokeStyle = "rgba(160,170,185,0.18)";
  ctx.lineWidth = 6;
  for (const x of [150, 930]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(160,170,185,0.12)";
  for (let i = 0; i < 6; i++) {
    const y = ((i * 380 + frame * 6) % (H + 200)) - 100;
    ctx.fillRect(120, y, 60, 14);
    ctx.fillRect(900, y + 140, 60, 14);
  }
}

// ---------- the smell (green comic cloud + stink lines) ----------
export function gasCard(x: number, y: number, z: number, amt: number, frame: number): Card {
  return {
    x, y, z, w: 1.4, h: 1.2, noHaze: true,
    draw: (c) => {
      if (amt <= 0.01) return;
      c.save();
      c.globalAlpha = Math.min(1, amt) * 0.75;
      const r = 18 + amt * 42;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + frame * 0.01;
        const px = Math.cos(a) * r * 0.9;
        const py = -r - Math.sin(a) * r * 0.55;
        c.beginPath();
        c.arc(px, py, r * (0.45 + 0.1 * Math.sin(frame * 0.1 + i)), 0, TAU);
        c.fillStyle = "#9CCB4A";
        c.fill();
      }
      c.globalAlpha = Math.min(1, amt);
      c.strokeStyle = "#5E8A1E";
      c.lineWidth = 2.2;
      c.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const bx = -r + i * (r * 0.66);
        const t = (frame * 0.04 + i * 0.3) % 1;
        c.beginPath();
        for (let k = 0; k <= 10; k++) {
          const yy = -r * 1.6 - k * 4 - t * 20;
          const xx = bx + Math.sin(k * 0.9 + frame * 0.15 + i) * 3;
          if (k === 0) c.moveTo(xx, yy);
          else c.lineTo(xx, yy);
        }
        c.stroke();
      }
      c.restore();
    },
  };
}

// crime-scene evidence marker (numbered yellow tent)
export function evidenceCard(x: number, z: number, n: number, pop: number): Card {
  return {
    x, z, w: 0.14, h: 0.14, shadow: 0.5,
    draw: (c) => {
      if (pop <= 0.01) return;
      c.save();
      c.scale(pop, pop);
      inked(c, (p) => {
        p.moveTo(-7, 0);
        p.lineTo(7, 0);
        p.lineTo(4, -12);
        p.lineTo(-4, -12);
        p.closePath();
      }, "#F2C14E", 0.6);
      c.fillStyle = INK;
      c.font = "800 7px Kanit";
      c.textAlign = "center";
      c.fillText(String(n), 0, -3);
      c.restore();
    },
  };
}

// ---------- the lobby (outside view of the doors) ----------
export function lobbyCards(frame: number, open: number): Card[] {
  const cards: Card[] = [];
  // wall with the elevator opening; doors slide by `open`
  cards.push({
    x: 0, z: 3.0, w: 7, h: 3.2, noHaze: true,
    draw: (c) => {
      c.fillStyle = "#D9D2C3";
      c.beginPath();
      c.rect(-350, -320, 700, 320);
      c.rect(90, -220, -180, 220); // hole for the car (counter-clockwise → cut out)
      c.fill("evenodd");
      c.fillStyle = "rgba(0,0,0,0.05)";
      for (let x = -350; x < 350; x += 70) c.fillRect(x, -320, 2, 320);
      // steel frame
      c.strokeStyle = "#8F98A1";
      c.lineWidth = 8;
      c.strokeRect(-94, -224, 188, 224);
      c.strokeStyle = INK;
      c.lineWidth = 1.2;
      c.strokeRect(-98, -228, 196, 228);
      // sliding doors
      const half = 90 * (1 - open);
      const door = (sx: number, w: number) => {
        const g = c.createLinearGradient(sx, 0, sx + w, 0);
        g.addColorStop(0, "#B5BDC4");
        g.addColorStop(1, "#D9DEE2");
        c.fillStyle = g;
        c.fillRect(sx, -220, w, 220);
        c.strokeStyle = INK;
        c.lineWidth = 0.8;
        c.strokeRect(sx, -220, w, 220);
      };
      if (half > 0.5) {
        door(-90, half);
        door(90 - half, half);
      }
      // floor display + call buttons
      c.fillStyle = "#111418";
      roundRect(c, -30, -262, 60, 26, 3);
      c.fill();
      c.fillStyle = "#FF6B3D";
      c.font = "800 18px Kanit";
      c.textAlign = "center";
      c.fillText("G", 0, -242);
      c.fillStyle = "#C3CAD1";
      roundRect(c, 118, -130, 18, 36, 3);
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 0.7;
      c.stroke();
      for (const by of [-120, -104]) {
        c.beginPath();
        c.arc(127, by, 4, 0, TAU);
        c.fillStyle = "#E9EDF0";
        c.fill();
        c.stroke();
      }
      // floor sign
      c.fillStyle = "#2F4A6B";
      roundRect(c, -300, -270, 120, 46, 6);
      c.fill();
      c.fillStyle = "#FFFFFF";
      c.font = "800 22px Kanit";
      c.fillText("ล็อบบี้", -240, -239);
    },
  });
  // plant + bench
  cards.push({
    x: -2.4, z: 2.4, w: 0.7, h: 1.4, shadow: 0.6,
    draw: (c) => {
      inked(c, (p) => {
        p.moveTo(-20, -40);
        p.lineTo(20, -40);
        p.lineTo(15, 0);
        p.lineTo(-15, 0);
        p.closePath();
      }, "#C76B5A", 0.8);
      for (const [a, l] of [[-0.5, 80], [-0.15, 100], [0.2, 95], [0.55, 70]] as [number, number][]) {
        c.save();
        c.translate(0, -40);
        c.rotate(a + Math.sin(frame * 0.03) * 0.02);
        inked(c, (p) => {
          p.moveTo(0, 0);
          p.quadraticCurveTo(18, -l / 2, 0, -l);
          p.quadraticCurveTo(-18, -l / 2, 0, 0);
        }, "#4C9A6A", 0.7, false);
        c.restore();
      }
    },
  });
  cards.push({
    x: 2.3, z: 2.4, w: 1.4, h: 0.45, shadow: 0.6, box: { d: 0.45, side: "#6E5038", top: "#9C7A57" },
    draw: (c) => inked(c, (p) => p.rect(-70, -45, 140, 45), "#8E6B4B", 0.8, false),
  });
  return cards;
}

export function drawLobbyFloor(ctx: CanvasRenderingContext2D, cam: Cam) {
  const P = (x: number, z: number) => project(cam, x, 0, z);
  const zN = Math.max(-3, cam.z + 0.3);
  const pts = [P(-6, 3), P(6, 3), P(6, zN), P(-6, zN)];
  if (pts.some((v) => !v)) return;
  ctx.fillStyle = "#E6E1D6";
  ctx.beginPath();
  pts.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
  ctx.closePath();
  ctx.fill();
  // diamond marble tiles
  ctx.strokeStyle = "rgba(120,110,95,0.25)";
  ctx.lineWidth = 2;
  for (let k = -12; k <= 12; k++) {
    const a = P(k * 0.6 - 3, zN);
    const b = P(k * 0.6 + 3, 3);
    const c2 = P(k * 0.6 + 3, zN);
    const d = P(k * 0.6 - 3, 3);
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
    if (c2 && d) {
      ctx.beginPath();
      ctx.moveTo(c2.sx, c2.sy);
      ctx.lineTo(d.sx, d.sy);
      ctx.stroke();
    }
  }
  // car floor visible through the open doors
  const car = [P(-0.9, 4.5), P(0.9, 4.5), P(0.9, 3.0), P(-0.9, 3.0)];
  if (car.every((v) => v)) {
    ctx.fillStyle = "#5C5550";
    ctx.beginPath();
    car.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
    ctx.closePath();
    ctx.fill();
  }
}

// interior back wall seen from the lobby when the doors open
export function lobbyCarBack(): Card {
  return {
    x: 0, z: 4.5, w: 1.8, h: 2.4, noHaze: true,
    draw: (c) => {
      c.fillStyle = "#C9D0D6";
      c.fillRect(-90, -240, 180, 240);
      c.fillStyle = "#C6D9E6";
      c.fillRect(-80, -205, 160, 95);
      c.fillStyle = "#7E8790";
      c.fillRect(-85, -94, 170, 5);
    },
  };
}
