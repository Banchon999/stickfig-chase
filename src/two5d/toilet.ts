// Sets + props for "THE TOILET SURVIVAL GUIDE — คู่มือเอาตัวรอดจากมรดกตกทอดในห้องน้ำค่ายทหาร".
// One barracks toilet hall (6.4 m wide, back wall z = 4.2, 2.8 m high) with three stalls; the
// close-ups are the same set with the camera moved inside stall 2. Hero props are inked.
import { roundRect } from "../draw";
import { Cam, Card, paper, project } from "./engine";
import { INK, inked } from "./elevator";

const TAU = Math.PI * 2;
export const STALL_X = [-1.1, 0, 1.1];
export const STALL_Z = 2.8; // front face of the stalls
export const TOILET_Z = 3.85;

export type HallState = {
  frame: number;
  doors: [number, number, number]; // 0 closed .. 1 open
  lid: number; // stall-2 lid 0 closed .. 1 open
  mess: number; // the "masterpiece" in stall 2 (0..1)
  water: number; // stall-2 overflow 0..1
  flush: number; // 0..1 swirl
  lever: number; // 0..1 lever pressed
  gloom: number; // 0..1 lights dim + flicker
  broken?: boolean; // "ชำรุด" sign on stall 2
  plaque?: number; // museum plaque pop 0..1
  tape?: number; // crime tape 0..1
  company?: number; // "บริษัทรับฝาก" sign 0..1
  wanted?: number; // wanted poster 0..1
  hazard?: number; // danger ring strength 0..1
  hazardOn?: "knob" | "hose";
  locked?: [boolean, boolean, boolean];
  inside?: boolean; // camera inside stall 2: partitions/fronts are drawn by drawStallWalls instead
};

export const hallDefault = (frame: number): HallState => ({ frame, doors: [0, 0, 0], lid: 0, mess: 1, water: 0, flush: 0, lever: 0, gloom: 0 });

function tiles(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, size: number, fill: string, grout: string) {
  c.fillStyle = fill;
  c.fillRect(x0, y0, w, h);
  c.strokeStyle = grout;
  c.lineWidth = 0.6;
  for (let x = x0; x <= x0 + w + 0.01; x += size) {
    c.beginPath();
    c.moveTo(x, y0);
    c.lineTo(x, y0 + h);
    c.stroke();
  }
  for (let y = y0; y <= y0 + h + 0.01; y += size) {
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x0 + w, y);
    c.stroke();
  }
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, col: string) {
  c.fillStyle = col;
  c.font = `800 ${size}px Kanit`;
  c.textAlign = "center";
  c.fillText(text, x, y);
}

// ---------- the toilet (front view, 40 cm wide, seat 42 cm, tank top 82 cm) ----------
export function toiletCard(x: number, z: number, s: { lid: number; mess: number; water: number; flush: number; lever: number; frame: number }): Card {
  return {
    x, z, w: 0.5, h: 0.85, shadow: 0.8,
    draw: (c) => {
      const f = s.frame;
      // tank
      inked(c, (p) => roundRect(p, -21, -80, 42, 34, 3), "#F4F6F7", 0.9);
      inked(c, (p) => roundRect(p, -23, -84, 46, 6, 2), "#FFFFFF", 0.9);
      c.fillStyle = "rgba(120,140,160,0.18)";
      c.fillRect(8, -78, 11, 30);
      // flush lever (chrome) on the front-left of the tank
      c.save();
      c.translate(-21, -74);
      c.rotate(-s.lever * 0.6);
      inked(c, (p) => roundRect(p, -15, -2.4, 16, 4.8, 2.2), "#C9D2DA", 0.7);
      c.restore();
      inked(c, (p) => p.arc(-21, -74, 3.4, 0, TAU), "#AEB8C2", 0.7);
      // pedestal
      inked(c, (p) => {
        p.moveTo(-12, 0);
        p.lineTo(12, 0);
        p.quadraticCurveTo(14, -24, 19, -36);
        p.lineTo(-19, -36);
        p.quadraticCurveTo(-14, -24, -12, 0);
        p.closePath();
      }, "#EEF1F3", 0.9);
      c.fillStyle = "rgba(120,140,160,0.18)";
      c.fillRect(5, -34, 8, 32);
      const HINGE = -51;
      const front = -33 + (-89 + 33) * s.lid; // lid front edge
      const drawLid = () => {
        if (Math.abs(front - HINGE) < 1.2) {
          c.strokeStyle = INK;
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(-20, HINGE);
          c.lineTo(20, HINGE);
          c.stroke();
          return;
        }
        const cy = (front + HINGE) / 2;
        const ry = Math.abs(front - HINGE) / 2;
        inked(c, (p) => p.ellipse(0, cy, 20, ry, 0, 0, TAU), front < HINGE ? "#E3E8EC" : "#FFFFFF", 0.9);
        if (front < HINGE) {
          // underside: seat ring outline
          c.strokeStyle = "rgba(29,27,26,0.35)";
          c.lineWidth = 0.6;
          c.beginPath();
          c.ellipse(0, cy, 14, ry * 0.7, 0, 0, TAU);
          c.stroke();
        }
      };
      if (front < HINGE) drawLid();
      // seat ring + bowl opening
      inked(c, (p) => p.ellipse(0, -42, 20, 9, 0, 0, TAU), "#FFFFFF", 0.9);
      const wl = Math.min(1, s.water);
      c.fillStyle = wl > 0.6 ? "#8FB8C9" : "#A9D4E4";
      c.beginPath();
      c.ellipse(0, -42, 14 + wl * 4, 6 + wl * 2, 0, 0, TAU);
      c.fill();
      c.strokeStyle = "rgba(29,27,26,0.5)";
      c.lineWidth = 0.6;
      c.stroke();
      // flush swirl
      if (s.flush > 0.01) {
        c.strokeStyle = `rgba(255,255,255,${0.9 * Math.sin(Math.PI * Math.min(1, s.flush))})`;
        c.lineWidth = 0.9;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(0, -42, 4 + k * 3.5, 1.8 + k * 1.4, 0, f * 0.5 + k, f * 0.5 + k + 3.6);
          c.stroke();
        }
      }
      // the censored masterpiece
      if (s.mess > 0.01 && s.lid > 0.4) {
        const m = s.mess * Math.min(1, (s.lid - 0.4) / 0.3);
        mosaic(c, 0, -44, 9 * m, 4.5 * m, 1.6, f);
      }
      // overflow: water spills over the rim and down the bowl
      if (s.water > 1) {
        const o = Math.min(1, s.water - 1);
        c.fillStyle = "rgba(143,184,201,0.85)";
        for (const dx of [-15, -6, 4, 13]) {
          const len = o * (30 + ((dx * 7) % 9));
          roundRect(c, dx - 1.6, -40, 3.2, len, 1.6);
          c.fill();
        }
      }
      if (s.lid < 0.5) drawLid();
    },
  };
}

// pixel mosaic "censored" block (cm). w/h half-size
export function mosaic(c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, cell: number, f: number) {
  if (w < 0.5) return;
  const cols = ["#7A4B25", "#8E5A2E", "#5E3818", "#A0693A", "#6B4220"];
  let k = 0;
  for (let y = cy - h; y < cy + h; y += cell)
    for (let x = cx - w; x < cx + w; x += cell) {
      const dx = (x + cell / 2 - cx) / w;
      const dy = (y + cell / 2 - cy) / h;
      if (dx * dx + dy * dy > 1.15) continue;
      c.fillStyle = cols[(k++ * 7 + Math.floor(f / 6)) % cols.length];
      c.fillRect(x, y, cell + 0.05, cell + 0.05);
    }
}

// little cartoon flies circling a point (cm)
export function flies(c: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, f: number, size = 1) {
  for (let i = 0; i < n; i++) {
    const a = f * 0.13 * (i % 2 ? 1 : -1.2) + (i * TAU) / n;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a * 1.3) * r * 0.5;
    c.fillStyle = INK;
    c.beginPath();
    c.arc(x, y, 1.1 * size, 0, TAU);
    c.fill();
    c.fillStyle = "rgba(220,235,255,0.85)";
    const flap = Math.sin(f * 1.7 + i) * 0.4;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(x + s * 1.1 * size, y - 1.1 * size, 1.3 * size, 0.7 * size, s * (0.6 + flap), 0, TAU);
      c.fill();
    }
  }
}

// green wavy stink lines (cm)
export function stink(c: CanvasRenderingContext2D, cx: number, cy: number, amt: number, f: number, spread = 14, height = 30) {
  if (amt <= 0.01) return;
  c.save();
  c.globalAlpha = Math.min(1, amt);
  c.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const bx = cx + (i - 1) * spread;
    const t = (f * 0.03 + i * 0.33) % 1;
    c.beginPath();
    for (let k = 0; k <= 12; k++) {
      const yy = cy - k * (height / 12) - t * 6;
      const xx = bx + Math.sin(k * 0.8 + f * 0.15 + i) * 2.4;
      if (k === 0) c.moveTo(xx, yy);
      else c.lineTo(xx, yy);
    }
    c.strokeStyle = INK;
    c.lineWidth = 2.6;
    c.stroke();
    c.strokeStyle = "#9CCB4A";
    c.lineWidth = 1.4;
    c.stroke();
  }
  c.restore();
}

// hazard ring (cm), pulsing
function hazardRing(c: CanvasRenderingContext2D, x: number, y: number, r: number, amt: number, f: number) {
  if (amt <= 0.01) return;
  c.save();
  c.globalAlpha = amt;
  c.strokeStyle = "#E23B2E";
  c.lineWidth = 1.8;
  c.setLineDash([3, 2]);
  c.beginPath();
  c.arc(x, y, r * (1 + 0.06 * Math.sin(f * 0.4)), 0, TAU);
  c.stroke();
  c.restore();
}

// ---------- the hall ----------
export function hallCards(s: HallState): Card[] {
  const f = s.frame;
  const cards: Card[] = [];
  // back wall (tiles to 1.5 m, paint above, high windows, sign, poster)
  cards.push({
    x: 0, z: 4.2, w: 6.6, h: 2.8, noHaze: true,
    draw: (c) => {
      c.fillStyle = "#C7CFC4";
      c.fillRect(-330, -280, 660, 280);
      tiles(c, -330, -150, 660, 150, 15, "#E4ECE8", "rgba(80,110,100,0.35)");
      c.fillStyle = "rgba(110,120,60,0.22)";
      c.fillRect(-330, -14, 660, 14);
      for (const wx of [-260, -60, 140]) {
        paper(c, (p) => p.rect(wx, -270, 120, 34), "#BFE3F2", "rgba(0,0,0,0.25)", 2);
        c.strokeStyle = "#8C9A9E";
        c.lineWidth = 1.2;
        for (let k = 1; k < 4; k++) {
          c.beginPath();
          c.moveTo(wx + k * 30, -270);
          c.lineTo(wx + k * 30, -236);
          c.stroke();
        }
      }
      // sign above the stalls
      inked(c, (p) => roundRect(p, -95, -232, 190, 32, 4), "#3F5B2E", 1);
      label(c, "ห้องน้ำรวม กองร้อย 2", 0, -209, 19, "#F2EBD3");
      // poster on the right: always flush
      inked(c, (p) => p.rect(215, -225, 70, 90), "#FFFDF8", 0.9);
      label(c, "กด", 250, -195, 20, "#C0392B");
      label(c, "ชักโครก", 250, -173, 15, INK);
      label(c, "ทุกครั้ง!", 250, -153, 15, INK);
    },
  });
  // stall interiors: toilets (only stall 2 is the detailed one)
  STALL_X.forEach((sx, i) => {
    if (i === 1) cards.push(toiletCard(sx, TOILET_Z, { lid: s.lid, mess: s.mess, water: s.water, flush: s.flush, lever: s.lever, frame: f }));
    else cards.push(toiletCard(sx, TOILET_Z, { lid: 0, mess: 0, water: 0, flush: 0, lever: 0, frame: f }));
  });
  // museum plaque beside the masterpiece
  if ((s.plaque ?? 0) > 0.01) {
    const k = s.plaque!;
    cards.push({
      x: -0.34, z: 3.75, w: 0.3, h: 0.9, shadow: 0.6, noHaze: true,
      draw: (c) => {
        c.save();
        c.scale(1, k);
        inked(c, (p) => p.rect(-1.2, -60, 2.4, 60), "#8C6A3E", 0.5);
        inked(c, (p) => p.rect(-7, -2, 14, 2), "#8C6A3E", 0.5);
        inked(c, (p) => roundRect(p, -13, -76, 26, 17, 2), "#D4AF37", 0.7);
        label(c, "ผลงานชิ้นเอก", 0, -68.5, 4.2, INK);
        label(c, "ศิลปิน: ไม่ประสงค์ออกนาม", 0, -62.5, 2.5, INK);
        c.restore();
      },
    });
  }
  // bidet hose on the right partition of stall 2 (inside)
  cards.push({
    x: 0.36, y: 0.55, z: 4.15, w: 0.2, h: 0.4, noHaze: true,
    draw: (c) => {
      inked(c, (p) => roundRect(p, -3, -30, 6, 8, 1.5), "#AEB8C2", 0.6); // holder
      c.strokeStyle = INK;
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(0, -24);
      c.bezierCurveTo(-8, -6, 8, 2, 0, 8);
      c.stroke();
      c.strokeStyle = "#D7DEE4";
      c.lineWidth = 1.4;
      c.stroke();
      inked(c, (p) => roundRect(p, -2.6, -36, 5.2, 13, 2), "#E9EEF2", 0.6); // spray head
      hazardRing(c, 0, -24, 15, s.hazardOn === "hose" ? s.hazard ?? 0 : 0, f);
    },
  });
  // toilet paper on the left partition of stall 2
  cards.push({
    x: -0.36, y: 0.62, z: 4.15, w: 0.2, h: 0.2, noHaze: true,
    draw: (c) => {
      inked(c, (p) => p.rect(-7, -12, 14, 2), "#AEB8C2", 0.5);
      inked(c, (p) => roundRect(p, -6, -10, 12, 10, 3), "#FFFFFF", 0.6);
      inked(c, (p) => p.rect(-5, 0, 10, 9), "#FFFFFF", 0.5);
    },
  });
  // partitions (boxes running back from the stall fronts)
  if (!s.inside) for (const px of [-1.65, -0.55, 0.55, 1.65]) {
    cards.push({
      x: px, z: STALL_Z, w: 0.05, h: 1.95, y: 0.12, box: { d: 1.4, side: "#4E7A8C", top: "#6E98A8" },
      draw: (c) => paper(c, (p) => p.rect(-2.5, -195, 5, 195), "#5D8798", "rgba(0,0,0,0)", 0),
    });
  }
  // stall fronts + doors
  if (!s.inside) STALL_X.forEach((sx, i) => {
    const open = s.doors[i];
    const locked = s.locked?.[i] ?? false;
    cards.push({
      x: sx, z: STALL_Z - 0.01, w: 1.1, h: 2.1, shadow: 0, noHaze: false,
      draw: (c) => {
        // header rail
        inked(c, (p) => p.rect(-55, -207, 110, 8), "#5D8798", 0.8);
        // side fillers
        for (const s2 of [-1, 1]) paper(c, (p) => p.rect(s2 > 0 ? 37 : -53, -199, 16, 187), "#6E98A8", "rgba(0,0,0,0.15)", 1);
        // dark doorway
        c.fillStyle = "rgba(20,30,35,0.18)";
        c.fillRect(-37, -199, 74, 187);
        // door hinged at the left edge, swinging inward
        const dw = 74 * Math.cos(open * 1.35);
        if (dw > 1.5) {
          inked(c, (p) => p.rect(-37, -199, dw, 187), open > 0.05 ? "#6390A3" : "#7BA7B8", 0.9);
          const k = dw / 74;
          // number plate + lock indicator
          inked(c, (p) => p.rect(-37 + 30 * k, -180, 14 * k, 14), "#FFFDF8", 0.5, false);
          c.save();
          c.translate(-37 + 37 * k, -168);
          c.scale(k, 1);
          label(c, String(i + 1), 0, -1.5, 11, INK);
          c.restore();
          inked(c, (p) => p.rect(-37 + 52 * k, -112, 14 * k, 6), locked ? "#C0392B" : "#3E9B5C", 0.5, false);
          // knob
          inked(c, (p) => p.arc(-37 + 64 * k, -95, 3, 0, TAU), "#C9D2DA", 0.6);
          if (i === 1) hazardRing(c, -37 + 64 * k, -95, 10, s.hazardOn === "knob" ? s.hazard ?? 0 : 0, f);
          if (i === 1 && s.broken) {
            c.save();
            c.translate(-37 + 37 * k, -135);
            c.rotate(-0.08);
            c.scale(k, 1);
            inked(c, (p) => p.rect(-26, -12, 52, 22), "#F2C14E", 0.8);
            label(c, "ชำรุด!", 0, 5, 14, "#C0392B");
            c.restore();
          }
        }
        // crime tape across stall 2
        if (i === 1 && (s.tape ?? 0) > 0.01) {
          const t = s.tape!;
          for (const [y, a] of [[-120, -0.12], [-80, 0.1]] as [number, number][]) {
            c.save();
            c.translate(0, y);
            c.rotate(a);
            c.beginPath();
            c.rect(-60 * t, -6, 120 * t, 12);
            c.fillStyle = "#F2C14E";
            c.fill();
            c.strokeStyle = INK;
            c.lineWidth = 0.7;
            c.stroke();
            c.save();
            c.clip();
            label(c, "ห้ามเข้า · เขตอาชญากรรมสุขอนามัย · ห้ามเข้า", 0, 3.6, 7, INK);
            c.restore();
            c.restore();
          }
        }
      },
    });
  });
  if ((s.company ?? 0) > 0.01) {
    cards.push({
      x: 0, z: STALL_Z - 0.06, w: 1.8, h: 2.6, noHaze: true,
      draw: (c) => {
        c.save();
        c.translate(0, -150);
        c.rotate(-0.03);
        c.scale(s.company!, s.company!);
        inked(c, (p) => roundRect(p, -80, -34, 160, 64, 5), "#FFFDF8", 1.4);
        label(c, "บริษัทรับฝาก", 0, -8, 19, "#2F4A6B");
        label(c, "อุจจาระ จำกัด", 0, 18, 19, "#2F4A6B");
        c.restore();
      },
    });
  }
  // left: long trough sink with three taps (freestanding, barracks style)
  cards.push({
    x: -2.25, z: 1.25, w: 1.6, h: 0.85, shadow: 0.7, box: { d: 0.45, side: "#9AA7AD", top: "#D9E2E6" },
    draw: (c) => {
      inked(c, (p) => p.rect(-80, -85, 160, 85), "#B7C3C8", 0.9);
      tiles(c, -78, -70, 156, 68, 10, "#C9D4D8", "rgba(60,80,90,0.3)");
      inked(c, (p) => p.rect(-80, -88, 160, 6), "#E3EAED", 0.8);
      for (const tx of [-50, 0, 50]) {
        inked(c, (p) => {
          p.moveTo(tx - 2, -88);
          p.lineTo(tx - 2, -104);
          p.lineTo(tx + 8, -104);
          p.lineTo(tx + 8, -99);
          p.lineTo(tx + 2, -99);
          p.lineTo(tx + 2, -88);
          p.closePath();
        }, "#C9D2DA", 0.6);
      }
      // soap dish
      inked(c, (p) => roundRect(p, 18, -94, 16, 5, 2), "#F2C14E", 0.6);
    },
  });
  // right: mop bucket + bin + wet-floor sign
  cards.push({
    x: 2.6, z: 2.2, w: 0.5, h: 1.2, shadow: 0.6,
    draw: (c) => {
      inked(c, (p) => {
        p.moveTo(-18, -34);
        p.lineTo(18, -34);
        p.lineTo(14, 0);
        p.lineTo(-14, 0);
        p.closePath();
      }, "#E8B23A", 0.8);
      inked(c, (p) => p.rect(2, -120, 4, 92), "#9C7A57", 0.6);
      inked(c, (p) => roundRect(p, -8, -40, 24, 10, 3), "#DDE3E6", 0.6);
    },
  });
  cards.push({
    x: 1.95, z: 1.6, w: 0.35, h: 0.65, shadow: 0.5,
    draw: (c) => {
      inked(c, (p) => {
        p.moveTo(-15, 0);
        p.lineTo(-4, -62);
        p.lineTo(4, -62);
        p.lineTo(15, 0);
        p.closePath();
      }, "#F2C14E", 0.8);
      label(c, "พื้นเปียก", 0, -28, 5.2, INK);
      inked(c, (p) => {
        p.moveTo(0, -50);
        p.lineTo(5, -40);
        p.lineTo(-5, -40);
        p.closePath();
      }, INK, 0.3, false);
    },
  });
  // wanted poster on the left wall area, near the trough
  if ((s.wanted ?? 0) > 0.01) {
    const k = s.wanted!;
    cards.push({
      x: -1.25, y: 1.25, z: 2.75, w: 0.6, h: 0.8, noHaze: true,
      draw: (c) => {
        c.save();
        c.translate(0, -40);
        c.scale(k * 1.5, k * 1.5);
        c.rotate(-0.04);
        inked(c, (p) => p.rect(-30, -40, 60, 80), "#EBD9A8", 1);
        label(c, "ประกาศจับ", 0, -29, 10, "#8C2A1E");
        c.beginPath();
        c.arc(0, -6, 14, 0, TAU);
        c.fillStyle = "#3A3A3A";
        c.fill();
        c.fillRect(-16, 8, 32, 12);
        label(c, "?", 0, -1, 15, "#EBD9A8");
        label(c, "ผู้ไม่กดชักโครก", 0, 30, 6.5, INK);
        c.restore();
      },
    });
  }
  // fluorescent tubes (flicker when gloomy)
  for (const lz of [0.6, 2.2]) {
    cards.push({
      x: 0, y: 2.72, z: lz, w: 1.3, h: 0.08, noHaze: true,
      draw: (c) => {
        const on = s.gloom > 0.3 && Math.sin(f * 1.9 + lz) > 0.6 ? 0.35 : 1;
        c.fillStyle = on > 0.5 ? "#F7FBFF" : "#9AA4AA";
        c.shadowColor = "rgba(230,245,255,0.9)";
        c.shadowBlur = 18 * on;
        roundRect(c, -60, -5, 120, 5, 2.5);
        c.fill();
        c.shadowBlur = 0;
      },
    });
  }
  return cards;
}

// the floor: tiles, puddles, footprints; slab front face when the camera is outside
export function drawHallFloor(ctx: CanvasRenderingContext2D, cam: Cam, s: { puddle: number; prints: number; hazard?: number; frame: number }) {
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
  const zN = Math.max(-1.5, cam.z + 0.12);
  poly([[-3.15, 4.2], [3.15, 4.2], [3.15, zN], [-3.15, zN]], "#A9B6A6");
  ctx.strokeStyle = "rgba(60,80,70,0.25)";
  ctx.lineWidth = 1.5;
  for (let x = -3.0; x <= 3.01; x += 0.3) {
    const a = P(x, zN);
    const b = P(x, 4.2);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  for (let z = Math.ceil(zN / 0.3) * 0.3; z <= 4.2; z += 0.3) {
    const a = P(-3.15, z);
    const b = P(3.15, z);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  const blobPts = (cx: number, cz: number, rx: number, rz: number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * TAU;
      pts.push([cx + Math.cos(a) * rx * (1 + 0.15 * Math.sin(a * 3)), cz + Math.sin(a) * rz]);
    }
    return pts;
  };
  poly(blobPts(-1.9, 1.9, 0.5, 0.25), "rgba(205,230,240,0.45)");
  if (s.puddle > 0.01) {
    poly(blobPts(0.05, 3.2, 0.25 + 0.55 * s.puddle, 0.12 + 0.35 * s.puddle), `rgba(120,175,200,${0.7 + 0.2 * s.puddle})`);
    poly(blobPts(-0.05, 3.1, 0.1 + 0.2 * s.puddle, 0.04 + 0.1 * s.puddle), "rgba(255,255,255,0.45)");
    const c = P(0.05, 3.2);
    if (c && (s.hazard ?? 0) > 0.01) {
      ctx.save();
      ctx.globalAlpha = s.hazard!;
      ctx.strokeStyle = "#E23B2E";
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 10]);
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy, 0.5 * c.s * (1 + 0.05 * Math.sin(s.frame * 0.4)), 0.17 * c.s, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  // muddy boot prints walking out of stall 2
  if (s.prints > 0.01) {
    for (let i = 0; i < 6; i++) {
      const z = 2.65 - i * 0.32;
      const x = 0.05 + (i % 2 ? 0.1 : -0.1) + i * 0.05;
      const col = `rgba(70,74,78,${0.6 * s.prints})`;
      poly([[x - 0.045, z + 0.06], [x + 0.045, z + 0.06], [x + 0.04, z - 0.03], [x - 0.04, z - 0.03]], col); // sole
      poly([[x - 0.04, z - 0.06], [x + 0.04, z - 0.06], [x + 0.04, z - 0.11], [x - 0.04, z - 0.11]], col); // heel
    }
  }
  if (zN <= -1.5) {
    const fr = [project(cam, -3.45, 0, -1.5), project(cam, 3.45, 0, -1.5), project(cam, 3.45, -0.3, -1.5), project(cam, -3.45, -0.3, -1.5)];
    if (fr.every((v) => v)) {
      ctx.fillStyle = "#5E6E62";
      ctx.beginPath();
      fr.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
      ctx.closePath();
      ctx.fill();
    }
  }
}

// ---------- small hand props (cm, origin at the hand centre) ----------
export function plunger(c: CanvasRenderingContext2D) {
  inked(c, (p) => p.rect(-1.6, -48, 3.2, 52), "#B07A4F", 0.6);
  inked(c, (p) => {
    p.moveTo(-11, 14);
    p.quadraticCurveTo(-10, 2, 0, 2);
    p.quadraticCurveTo(10, 2, 11, 14);
    p.closePath();
  }, "#C0392B", 0.8);
}
export function brush(c: CanvasRenderingContext2D) {
  inked(c, (p) => p.rect(-1.2, -30, 2.4, 30), "#3E9B5C", 0.5);
  inked(c, (p) => p.ellipse(0, 4, 5, 6, 0, 0, TAU), "#DDE3E6", 0.6);
}
export function sprayBottle(c: CanvasRenderingContext2D) {
  inked(c, (p) => roundRect(p, -6, -14, 12, 22, 3), "#4F8FC0", 0.6);
  inked(c, (p) => p.rect(-3, -20, 9, 6), "#F4F6F7", 0.5);
  inked(c, (p) => p.rect(5, -20, 5, 3), "#F4F6F7", 0.4);
}
export function glove(c: CanvasRenderingContext2D) {
  inked(c, (p) => p.ellipse(0, 0, 9, 8.5, 0, 0, TAU), "#F2D33B", 0.8);
  inked(c, (p) => roundRect(p, -6, 6, 12, 7, 2), "#F2D33B", 0.6);
}
// toothbrush + toilet brush sharing a cup (the "don't mix" gag)
export function cupCard(x: number, y: number, z: number, mix: number): Card {
  return {
    x, y, z, w: 0.3, h: 0.35, noHaze: true, shadow: 0.4,
    draw: (c) => {
      // toothbrush
      c.save();
      c.translate(-3, -10);
      c.rotate(-0.25);
      inked(c, (p) => roundRect(p, -1.3, -22, 2.6, 22, 1.2), "#4FB3D9", 0.5);
      inked(c, (p) => p.rect(-2.2, -27, 4.4, 6), "#FFFFFF", 0.4);
      c.restore();
      // toilet brush slides in
      if (mix > 0.01) {
        c.save();
        c.translate(4, -10 - (1 - mix) * 40);
        c.rotate(0.2);
        inked(c, (p) => p.rect(-1.4, -30, 2.8, 30), "#3E9B5C", 0.5);
        inked(c, (p) => roundRect(p, -5, -42, 10, 13, 4), "#E8E8E8", 0.5);
        c.strokeStyle = "rgba(29,27,26,0.55)";
        c.lineWidth = 0.4;
        for (let k = -4; k <= 4; k += 2) {
          c.beginPath();
          c.moveTo(k, -41);
          c.lineTo(k * 1.2, -44);
          c.stroke();
        }
        c.restore();
      }
      inked(c, (p) => roundRect(p, -8, -14, 16, 14, 2), "#F2EBD3", 0.7);
    },
  };
}

function quad(ctx: CanvasRenderingContext2D, cam: Cam, pts: [number, number, number][], fill: string) {
  const q = pts.map(([x, y, z]) => project(cam, x, y, z));
  if (q.some((v) => !v)) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  q.forEach((v, i) => (i ? ctx.lineTo(v!.sx, v!.sy) : ctx.moveTo(v!.sx, v!.sy)));
  ctx.closePath();
  ctx.fill();
}

// ceiling slab over the hall (2.8 m) with a soft falloff
export function drawHallCeiling(ctx: CanvasRenderingContext2D, cam: Cam) {
  const zN = Math.max(-1.5, cam.z + 0.7);
  // side walls (tiles to 1.5 m, paint above), near edge clipped at the camera
  for (const x of [-3.15, 3.15]) {
    quad(ctx, cam, [[x, 0, 4.2], [x, 2.8, 4.2], [x, 2.8, zN], [x, 0, zN]], "#BCC6BB");
    quad(ctx, cam, [[x, 0, 4.2], [x, 1.5, 4.2], [x, 1.5, zN], [x, 0, zN]], "#D9E3DE");
    ctx.strokeStyle = "rgba(80,110,100,0.25)";
    ctx.lineWidth = 2;
    for (let z = Math.ceil(zN / 0.3) * 0.3; z <= 4.2; z += 0.3) {
      const a = project(cam, x, 0, z);
      const b = project(cam, x, 1.5, z);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  }
  quad(ctx, cam, [[-3.15, 2.8, 4.2], [3.15, 2.8, 4.2], [3.15, 2.8, zN], [-3.15, 2.8, zN]], "#D5DCD3");
  for (let z = 0; z <= 4.2; z += 0.6) {
    const a = project(cam, -3.15, 2.8, Math.max(z, zN));
    const b = project(cam, 3.15, 2.8, Math.max(z, zN));
    if (!a || !b) continue;
    ctx.strokeStyle = "rgba(60,70,60,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
}

// stall-2 side partitions seen from inside (near edge clipped at the camera)
export function drawStallWalls(ctx: CanvasRenderingContext2D, cam: Cam) {
  const z0 = Math.max(STALL_Z, cam.z + 0.18);
  for (const x of [-0.55, 0.55]) {
    quad(ctx, cam, [[x, 0.12, z0], [x, 2.07, z0], [x, 2.07, 4.2], [x, 0.12, 4.2]], x < 0 ? "#5D8798" : "#527D8E");
    // top edge highlight
    const a = project(cam, x, 2.07, z0);
    const b = project(cam, x, 2.07, 4.2);
    if (a && b) {
      ctx.strokeStyle = "#86AEBD";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  }
}
