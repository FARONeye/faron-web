import { PATTERN } from "./spec";
import { panelWidthAt } from "./pattern";
import { encode, meshHole, type Img } from "./textures";

/**
 * Ornements géométriques originaux, inspirés des compositions yantra et de la symétrie des Sak Yant.
 * Aucun texte ni symbole sacré n'est reproduit : les panneaux portent des axes, cercles, losanges et arcs.
 */
const TOP = PATTERN.underarmY;
const HEM = PATTERN.length;
const HALF = PATTERN.panel.hemWidth / 2;
const K = 56;
export const PRINT = { width: Math.round(HALF * 2 * K), height: Math.round((HEM - TOP) * K), uMin: -HALF, vMin: TOP, uSpan: HALF * 2, vSpan: HEM - TOP };
export const PRINT_ATLAS = 2;

class Canvas {
  w = PRINT.width;
  h = PRINT.height;
  a = new Float32Array(this.w * this.h);

  capsule(p: P2, q: P2, halfW: number) {
    const x0 = (p[0] - PRINT.uMin) * K;
    const y0 = (p[1] - PRINT.vMin) * K;
    const x1 = (q[0] - PRINT.uMin) * K;
    const y1 = (q[1] - PRINT.vMin) * K;
    const r = halfW * K;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r - 2));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(x0, x1) + r + 2));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r - 2));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(y0, y1) + r + 2));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const l2 = dx * dx + dy * dy || 1e-9;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / l2));
      const d = Math.hypot(x + 0.5 - x0 - t * dx, y + 0.5 - y0 - t * dy);
      const cov = Math.min(1, Math.max(0, r + 0.6 - d));
      const i = y * this.w + x;
      if (cov > this.a[i]) this.a[i] = cov;
    }
  }

  dot(c: P2, r: number) { this.capsule(c, c, r); }
}

type P2 = [number, number];
const W1 = 0.075;
const W2 = 0.05;
const W3 = 0.035;
const line = (cv: Canvas, pts: P2[], width = W2) => {
  for (let i = 1; i < pts.length; i++) cv.capsule(pts[i - 1], pts[i], width);
};
const mirror = (pts: P2[]): P2[] => pts.map(([u, v]) => [-u, v]);

function circle(cv: Canvas, c: P2, r: number, width = W2) {
  const pts: P2[] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
  }
  line(cv, pts, width);
}

function diamond(cv: Canvas, c: P2, rx: number, ry: number, width = W2) {
  line(cv, [[c[0], c[1] - ry], [c[0] + rx, c[1]], [c[0], c[1] + ry], [c[0] - rx, c[1]], [c[0], c[1] - ry]], width);
}

function arcPair(cv: Canvas, c: P2, rx: number, ry: number, start: number, end: number, width = W3) {
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = start + ((end - start) * i) / 24;
    pts.push([c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)]);
  }
  line(cv, pts, width);
  line(cv, mirror(pts), width);
}

function curve(cv: Canvas, a: P2, b: P2, c: P2, d: P2, width = W3) {
  const pts: P2[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48, s = 1 - t;
    pts.push([
      s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0],
      s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1],
    ]);
  }
  line(cv, pts, width);
}

/** Nœud vertical ouvragé : losanges allongés, anneaux et fins rameaux latéraux. */
function yantraMedallion(cv: Canvas, v: number, scale: number, phase: number) {
  const r = scale;
  // Cartouche en amande et œil central : plus vertical que les anciens anneaux concentriques.
  diamond(cv, [0, v], r * 0.58, r * 1.12, W1);
  diamond(cv, [0, v], r * 0.35, r * 0.72, W3);
  circle(cv, [0, v], r * 0.23, W2);
  circle(cv, [0, v], r * 0.10, W3);
  cv.dot([0, v], 0.045);

  // Petits anneaux de tête et de pied, reliés par une colonne fine.
  cv.capsule([0, v - r * 1.48], [0, v + r * 1.48], W3);
  for (const d of [-1.25, 1.25]) {
    circle(cv, [0, v + d * r], r * 0.13, W2);
    cv.dot([0, v + d * r], 0.035);
  }

  // Paires de boucles latérales et de perles, comme les ligatures du panneau de référence.
  for (const sign of [-1, 1]) {
    const a = phase + sign * 0.06;
    const c: P2 = [sign * r * 0.72, v + Math.sin(a) * r * 0.1];
    circle(cv, c, r * 0.15, W3);
    line(cv, [[sign * r * 0.48, v - r * 0.32], c, [sign * r * 0.48, v + r * 0.32]], W3);
    cv.dot([sign * r * 1.02, v], 0.04);
  }
  arcPair(cv, [0, v], r * 1.16, r * 0.48, 0.2, Math.PI - 0.2, W3);
  arcPair(cv, [0, v], r * 1.16, r * 0.48, Math.PI + 0.2, 2 * Math.PI - 0.2, W3);
  // Courbes entrelacées qui élargissent chaque motif au-delà du petit symbole central.
  for (const s of [-1, 1]) {
    curve(cv, [0, v - 1.3 * r], [s * 1.45 * r, v - 0.8 * r], [s * 1.45 * r, v + 0.1 * r], [0, v + 0.8 * r], W3);
    curve(cv, [0, v - 0.65 * r], [s * 1.25 * r, v - 0.05 * r], [s * 0.95 * r, v + 1.05 * r], [0, v + 1.32 * r], W3);
    circle(cv, [s * 1.22 * r, v + 0.05 * r], 0.11 * r, W3);
    cv.dot([s * 1.5 * r, v + 0.45 * r], 0.045);
  }
}

function connector(cv: Canvas, v0: number, v1: number, side: number) {
  cv.capsule([0, v0], [0, v1], W3);
  for (let v = v0 + 0.24; v < v1; v += 0.34) {
    cv.dot([0, v], 0.044);
    cv.dot([side * 0.15, v], 0.026);
  }
  // Arcs latéraux discrets, en miroir, pour faire écho aux courbes du col et aux coutures.
  for (const v of [v0 + 0.2, v1 - 0.2]) {
    const p: P2[] = [[0, v], [side * 0.22, v + 0.14], [side * 0.38, v + 0.3], [side * 0.44, v + 0.46]];
    line(cv, p, W3);
    line(cv, mirror(p), W3);
  }
}

function seamDots(cv: Canvas) {
  for (const side of [-1, 1]) {
    let acc = 0;
    let prev: P2 | null = null;
    for (let v = TOP + 2.4; v < HEM - 2.8; v += 0.02) {
      const p: P2 = [side * (panelWidthAt(v) / 2 - 0.48), v];
      if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      prev = p;
      if (acc >= 0.34) {
        cv.dot(p, 0.04);
        acc = 0;
      }
    }
  }
}

function panel(cv: Canvas, side: number) {
  seamDots(cv);
  connector(cv, 28.8, 63.2, side);
  // Trois cartouches de taille croissante forment une seule composition verticale.
  yantraMedallion(cv, 34.6, 0.9, side * 0.12);
  yantraMedallion(cv, 44.1, 1.35, side * 0.08);
  yantraMedallion(cv, 55.3, 1.72, side * 0.04);
  // Chaînes latérales de perles et de boucles : elles suivent l'ouverture du coin de mesh.
  for (const s of [-1, 1]) {
    const x = (v: number) => s * Math.min(panelWidthAt(v) * 0.29, 3.3);
    for (let v = 37; v < 63; v += 0.3) {
      if (Math.floor(v * 10) % 13 < 9) cv.capsule([x(v), v], [x(v + 0.23), v + 0.23], W3);
    }
    for (const v of [38.4, 47.3, 59.6]) {
      circle(cv, [x(v), v], 0.2, W2);
      cv.dot([x(v), v], 0.055);
    }
    curve(cv, [0, 47.4], [s * 2.5, 49.6], [s * 3.5, 51.0], [x(53), 53], W3);
    curve(cv, [0, 58.8], [s * 2.2, 59.6], [s * 3.2, 61.4], [x(63), 63], W3);
  }
  // Petites attaches en amande relient les cartouches au lieu d'icônes séparées.
  for (const v of [39.4, 49.9, 62.0]) {
    diamond(cv, [0, v], 0.18, 0.35, W3);
    circle(cv, [0, v], 0.07, W3);
  }
}

const INK = [150, 133, 112];

export function bakePanelPrint() {
  const panels = [new Canvas(), new Canvas()];
  panel(panels[0], -1);
  panel(panels[1], 1);
  const W = PRINT.width * PRINT_ATLAS;
  const img: Img = { w: W, h: PRINT.height, data: new Uint8Array(W * PRINT.height * 4) };
  panels.forEach((cv, pi) => {
    for (let y = 0; y < cv.h; y++) {
      const v = PRINT.vMin + ((y + 0.5) / cv.h) * PRINT.vSpan;
      const half = panelWidthAt(v) / 2 - 0.28;
      for (let x = 0; x < cv.w; x++) {
        const u = PRINT.uMin + ((x + 0.5) / cv.w) * PRINT.uSpan;
        const inside = Math.min(1, Math.max(0, (half - Math.abs(u)) * 10));
        const ink = 0.82 + 0.18 * (1 - meshHole(u / 0.8, v / 0.8));
        const a = cv.a[y * cv.w + x] * inside * ink;
        img.data.set([INK[0], INK[1], INK[2], Math.round(Math.min(1, a * 1.15) * 255)], (y * W + pi * cv.w + x) * 4);
      }
    }
  });
  return encode(img);
}
