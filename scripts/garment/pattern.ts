import Delaunator from "delaunator";
import { BODY, HPS_Y, PATTERN, SIM } from "./spec";

/**
 * Patron du T-shirt VEIL en pièces 2D (cm) : devant, dos, 2 manches, 2 panneaux latéraux, bord-côte.
 * Chaque pièce est un contour fermé de segments nommés ; les coutures associent deux segments,
 * échantillonnés avec le même nombre de points (l'embu est réparti uniformément).
 */

export type Vec2 = [number, number];
export type PieceName = "front" | "back" | "sleeveL" | "sleeveR" | "panelL" | "panelR" | "rib";
export type Segment = { name: string; pts: Vec2[] };
export type Piece = { name: PieceName; segments: Segment[]; spacing: number; material: "jersey" | "panel" | "rib" };
export type SeamRef = { piece: PieceName; segment: string };
export type Seam = { a: SeamRef; b: SeamRef; reverse: boolean; kind: "seam" | "rib" };

// ——— Géométrie 2D ——————————————————————————————————————————————————————

function bezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, n = 64): Vec2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  });
}
const line = (a: Vec2, b: Vec2): Vec2[] => [a, b];
const rev = (pts: Vec2[]) => [...pts].reverse();
const mirror = (pts: Vec2[]) => pts.map(([u, v]) => [-u, v] as Vec2);

export function polyLength(pts: Vec2[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

/** Rééchantillonne une polyligne en n points équidistants (extrémités comprises). */
export function resample(pts: Vec2[], n: number): Vec2[] {
  const L = polyLength(pts);
  const out: Vec2[] = [pts[0]];
  let seg = 1;
  let acc = 0;
  for (let k = 1; k < n - 1; k++) {
    const target = (L * k) / (n - 1);
    while (seg < pts.length - 1 && acc + Math.hypot(pts[seg][0] - pts[seg - 1][0], pts[seg][1] - pts[seg - 1][1]) < target) {
      acc += Math.hypot(pts[seg][0] - pts[seg - 1][0], pts[seg][1] - pts[seg - 1][1]);
      seg++;
    }
    const a = pts[seg - 1];
    const b = pts[seg];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const f = (target - acc) / l;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Courbe d'encolure : quart d'ellipse du milieu (0, drop) au HPS (w, 0). */
function neckCurve(w: number, drop: number, n = 48): Vec2[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * (Math.PI / 2);
    return [w * Math.sin(a), drop * Math.cos(a)];
  });
}

// ——— Pièces ————————————————————————————————————————————————————————————

const P = PATTERN;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Largeur du panneau latéral à la hauteur v (cm) : coin qui s'ouvre de l'aisselle à l'ourlet. */
export const panelWidthAt = (v: number) => P.panel.hemWidth * Math.pow(clamp01((v - P.underarmY) / (P.length - P.underarmY)), P.panel.exponent);
/** Avancée du panneau vers le devant à la hauteur v (cm), proportionnelle à son ouverture. */
const panelShiftAt = (v: number) => (P.panel.forward * panelWidthAt(v)) / P.panel.hemWidth;
/** Demi-largeurs à l'ourlet : devant plus étroit, dos plus large (tour constant). */
export const HEM_HALF_FRONT = P.chestHalf - P.panel.forward - P.panel.hemWidth / 2;
export const HEM_HALF_BACK = P.chestHalf + P.panel.forward - P.panel.hemWidth / 2;
const sideCurve = (sign: number): Vec2[] =>
  Array.from({ length: 48 }, (_, i) => {
    const v = P.underarmY + ((P.length - P.underarmY) * i) / 47;
    return [P.chestHalf + sign * panelShiftAt(v) - panelWidthAt(v) / 2, v];
  });
/** Coutures de côté (de l'aisselle à l'ourlet) : le panneau mord davantage sur le devant. */
export const SIDE_CURVE_FRONT = sideCurve(-1);
export const SIDE_CURVE_BACK = sideCurve(1);

const S: Vec2 = [P.shoulderX, P.shoulderDrop];
const HPS: Vec2 = [P.neckHalfWidth, 0];
const U: Vec2 = [P.chestHalf, P.underarmY];

function bodyPiece(name: "front" | "back", neckDrop: number, armhole: Vec2[]): Piece {
  const side = name === "front" ? SIDE_CURVE_FRONT : SIDE_CURVE_BACK;
  const hemHalf = name === "front" ? HEM_HALF_FRONT : HEM_HALF_BACK;
  const neck = neckCurve(P.neckHalfWidth, neckDrop); // milieu → HPS gauche
  const segments: Segment[] =
    name === "front"
      ? [{ name: "neck", pts: [...rev(neck), ...mirror(neck).slice(1)] }] // HPS_L → milieu → HPS_R
      : [{ name: "neck", pts: [...rev(neck), ...mirror(neck).slice(1)] }]; // HPS_L → milieu dos → HPS_R
  segments.push(
    { name: "shoulderR", pts: mirror(line(HPS, S)) },
    { name: "armholeR", pts: mirror(armhole) },
    { name: "sideR", pts: mirror(side) },
    { name: "hem", pts: line([-hemHalf, P.length], [hemHalf, P.length]) },
    { name: "sideL", pts: rev(side) },
    { name: "armholeL", pts: rev(armhole) },
    { name: "shoulderL", pts: line(S, HPS) },
  );
  return { name, segments, spacing: SIM.spacing, material: "jersey" };
}

// Emmanchures : du point d'épaule au dessous de bras ; le devant est plus creusé que le dos.
const frontArmhole = bezier(S, [S[0] + 0.3, 12], [S[0] + 0.9, P.underarmY - 3.2], U);
const backArmhole = bezier(S, [S[0] + 0.25, 12], [S[0] + 1.7, P.underarmY - 3.6], U);

function sleevePiece(name: "sleeveL" | "sleeveR"): Piece {
  const s = P.sleeve;
  const K: Vec2 = [s.bicepHalf, s.capHeight];
  const Q: Vec2 = [s.openingHalf, s.length];
  // Tête de manche : bombée en haut, creusée vers le dessous de bras.
  const cap = bezier([0, 0], [7.5, 0], [13.5, s.capHeight - 1.2], K);
  return {
    name,
    material: "jersey",
    spacing: SIM.spacing,
    segments: [
      { name: "capPos", pts: cap },
      { name: "underPos", pts: line(K, Q) },
      { name: "hem", pts: line(Q, [-Q[0], Q[1]]) },
      { name: "underNeg", pts: line([-Q[0], Q[1]], [-K[0], K[1]]) },
      { name: "capNeg", pts: rev(mirror(cap)) },
    ],
  };
}

function panelPiece(name: "panelL" | "panelR"): Piece {
  const edge: Vec2[] = Array.from({ length: 48 }, (_, i) => {
    const v = P.underarmY + ((P.length - P.underarmY) * i) / 47;
    return [panelWidthAt(v) / 2, v];
  });
  const hw = P.panel.hemWidth / 2;
  return {
    name,
    material: "panel",
    spacing: SIM.spacing * 0.8,
    segments: [
      { name: "edgePos", pts: edge },
      { name: "hem", pts: line([hw, P.length], [-hw, P.length]) },
      { name: "edgeNeg", pts: rev(mirror(edge)) },
    ],
  };
}

const front = bodyPiece("front", P.frontNeckDrop, frontArmhole);
const back = bodyPiece("back", P.backNeckDrop, backArmhole);

export const neckLengths = {
  front: polyLength(front.segments[0].pts),
  backHalf: polyLength(back.segments[0].pts) / 2,
};
export const RIB_LENGTH = (neckLengths.front + 2 * neckLengths.backHalf) * P.rib.stretch;

function ribPiece(): Piece {
  const L = RIB_LENGTH;
  const h = P.rib.height;
  const k = P.rib.stretch;
  const la = neckLengths.backHalf * k;
  return {
    name: "rib",
    material: "rib",
    spacing: SIM.ribSpacing,
    segments: [
      { name: "top", pts: line([0, 0], [L, 0]) },
      { name: "endR", pts: line([L, 0], [L, h]) },
      { name: "bottomB", pts: line([L, h], [2 * la, h]) },
      { name: "bottomA", pts: line([2 * la, h], [0, h]) },
      { name: "endL", pts: line([0, h], [0, 0]) },
    ],
  };
}

export const PIECES: Piece[] = [front, back, sleevePiece("sleeveL"), sleevePiece("sleeveR"), panelPiece("panelL"), panelPiece("panelR"), ribPiece()];

const seam = (pa: PieceName, sa: string, pb: PieceName, sb: string, reverse: boolean, kind: Seam["kind"] = "seam"): Seam => ({
  a: { piece: pa, segment: sa },
  b: { piece: pb, segment: sb },
  reverse,
  kind,
});

export const SEAMS: Seam[] = [
  // Épaules.
  seam("front", "shoulderL", "back", "shoulderL", false),
  seam("front", "shoulderR", "back", "shoulderR", false),
  // Emmanchures (u > 0 de la manche = devant, pour les deux manches).
  seam("front", "armholeL", "sleeveL", "capPos", true),
  seam("back", "armholeL", "sleeveL", "capNeg", false),
  seam("front", "armholeR", "sleeveR", "capPos", false),
  seam("back", "armholeR", "sleeveR", "capNeg", true),
  // Côtés : panneaux insérés (bord −u vers le devant).
  seam("front", "sideL", "panelL", "edgeNeg", false),
  seam("back", "sideL", "panelL", "edgePos", true),
  seam("front", "sideR", "panelR", "edgeNeg", true),
  seam("back", "sideR", "panelR", "edgePos", false),
  // Dessous de manches.
  seam("sleeveL", "underPos", "sleeveL", "underNeg", true),
  seam("sleeveR", "underPos", "sleeveR", "underNeg", true),
  // Bord-côte (légèrement plus court que l'encolure : il tient le col).
  // Le raccord fermé du bord-côte est placé sur l'épaule, loin du marquage et du milieu dos.
  seam("rib", "bottomA", "back", "neck", true, "rib"),
  seam("rib", "bottomB", "front", "neck", false, "rib"),
  seam("rib", "endR", "rib", "endL", true, "rib"),
];

// ——— Échantillonnage et triangulation ——————————————————————————————————

export type PieceMesh = {
  piece: Piece;
  /** Points 2D (cm) ; les premiers `boundaryCount` forment le contour, dans l'ordre. */
  pts: Vec2[];
  boundaryCount: number;
  tris: number[];
  /** Indices de bord de chaque segment (extrémités incluses). */
  segmentIdx: Record<string, number[]>;
};

function segmentCounts() {
  const counts = new Map<string, number>();
  const key = (r: SeamRef) => `${r.piece}:${r.segment}`;
  const seg = (r: SeamRef) => PIECES.find((p) => p.name === r.piece)!.segments.find((s) => s.name === r.segment)!;
  const spacing = (r: SeamRef) => PIECES.find((p) => p.name === r.piece)!.spacing;
  for (const s of SEAMS) {
    const L = Math.max(polyLength(seg(s.a).pts), polyLength(seg(s.b).pts));
    const n = Math.max(2, Math.round(L / Math.min(spacing(s.a), spacing(s.b))) + 1);
    counts.set(key(s.a), n);
    counts.set(key(s.b), n);
  }
  return { counts, key };
}

function insidePolygon(poly: Vec2[], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToPolygon(poly: Vec2[], x: number, y: number) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return d;
}

export function meshPieces(): PieceMesh[] {
  const { counts, key } = segmentCounts();
  return PIECES.map((piece) => {
    const boundary: Vec2[] = [];
    const segmentIdx: Record<string, number[]> = {};
    for (const s of piece.segments) {
      const n = counts.get(key({ piece: piece.name, segment: s.name })) ?? Math.max(2, Math.round(polyLength(s.pts) / piece.spacing) + 1);
      const pts = resample(s.pts, n);
      const start = boundary.length;
      boundary.push(...pts.slice(0, -1));
      segmentIdx[s.name] = Array.from({ length: n }, (_, i) => start + i);
    }
    // Le dernier point de chaque segment est le premier du suivant : on referme les index.
    const B = boundary.length;
    for (const s of piece.segments) segmentIdx[s.name] = segmentIdx[s.name].map((i) => i % B);

    // Points intérieurs : réseau hexagonal à distance du bord.
    const h = piece.spacing;
    const xs = boundary.map((p) => p[0]);
    const ys = boundary.map((p) => p[1]);
    const pts: Vec2[] = [...boundary];
    const rowH = (h * Math.sqrt(3)) / 2;
    let row = 0;
    for (let y = Math.min(...ys) + rowH / 2; y < Math.max(...ys); y += rowH, row++) {
      for (let x = Math.min(...xs) + (row % 2 ? h / 2 : 0); x < Math.max(...xs); x += h) {
        if (insidePolygon(boundary, x, y) && distToPolygon(boundary, x, y) > 0.62 * h) pts.push([x, y]);
      }
    }
    const d = new Delaunator(pts.flat());
    const tris: number[] = [];
    for (let t = 0; t < d.triangles.length; t += 3) {
      const [a, b, c] = [d.triangles[t], d.triangles[t + 1], d.triangles[t + 2]];
      const cx = (pts[a][0] + pts[b][0] + pts[c][0]) / 3;
      const cy = (pts[a][1] + pts[b][1] + pts[c][1]) / 3;
      const area = Math.abs((pts[b][0] - pts[a][0]) * (pts[c][1] - pts[a][1]) - (pts[c][0] - pts[a][0]) * (pts[b][1] - pts[a][1]));
      if (area > 1e-6 && insidePolygon(boundary, cx, cy)) tris.push(a, b, c);
    }
    return { piece, pts, boundaryCount: B, tris, segmentIdx };
  });
}

// ——— Placement initial autour du mannequin ——————————————————————————————

/** Tour du buste (cm) : devant + dos + panneaux, constant de l'aisselle à l'ourlet. */
const GIRTH = 4 * P.chestHalf;
type WrapShape = { a: number; b: number; exponent: number };

/** Superellipse de périmètre ≈ GIRTH, paramétrée par l'abscisse curviligne s (cm depuis le milieu devant). */
function makeWrap(shape: WrapShape) {
  const A = shape.a * (GIRTH / 116);
  const B = shape.b * (GIRTH / 116);
  const point = (t: number): [number, number] => {
    const sn = Math.sin(t);
    const c = Math.cos(t);
    return [A * Math.sign(sn) * Math.abs(sn) ** shape.exponent, B * Math.sign(c) * Math.abs(c) ** shape.exponent];
  };
  const N = 2048;
  const S: number[] = [0];
  const th: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const p = point((i / N) * Math.PI * 2);
    const q = point(((i - 1) / N) * Math.PI * 2);
    S.push(S[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1]) * 100);
    th.push((i / N) * Math.PI * 2);
  }
  const perimeter = S[N];
  return (scm: number): [number, number] => {
    const s = (((scm / GIRTH) * perimeter) % perimeter + perimeter) % perimeter;
    let lo = 0;
    let hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] < s) lo = mid;
      else hi = mid;
    }
    const f = (s - S[lo]) / (S[hi] - S[lo] || 1);
    return point(th[lo] + f * (th[hi] - th[lo]));
  };
}

/**
 * Forme de départ avant couture (cf. `PATTERN.wrap`) : pans plats à l'encolure, où le bord-côte se coud sans pli,
 * puis forme plus détendue pour que le buste et le bas tombent librement.
 */
const wrapTop = makeWrap(P.wrap.top);
const wrapBottom = makeWrap(P.wrap.bottom);
function wrapAt(scm: number, v: number): [number, number] {
  const t = Math.max(0, Math.min(1, (v - P.wrap.blend[0]) / (P.wrap.blend[1] - P.wrap.blend[0])));
  const k = t * t * (3 - 2 * t);
  const [x0, z0] = wrapTop(scm);
  const [x1, z1] = wrapBottom(scm);
  return [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k];
}

export function armFrame(side: "L" | "R") {
  const sx = side === "L" ? 1 : -1;
  const ang = (BODY.arm.angle[side] * Math.PI) / 180;
  const fw = BODY.arm.forward[side];
  const d = [Math.cos(ang) * sx, -Math.sin(ang), fw];
  const l = Math.hypot(d[0], d[1], d[2]);
  const dir = d.map((v) => v / l) as [number, number, number];
  const root = [BODY.arm.root[0] * sx, BODY.arm.root[1], BODY.arm.root[2]] as [number, number, number];
  // Repère perpendiculaire : « up » au-dessus du bras, « fwd » vers l'avant.
  const upRaw = [Math.sin(ang) * sx, Math.cos(ang), 0];
  const dot = upRaw[0] * dir[0] + upRaw[1] * dir[1] + upRaw[2] * dir[2];
  const up0 = upRaw.map((v, i) => v - dot * dir[i]);
  const ul = Math.hypot(up0[0], up0[1], up0[2]);
  const up = up0.map((v) => v / ul) as [number, number, number];
  const fwd = [dir[1] * up[2] - dir[2] * up[1], dir[2] * up[0] - dir[0] * up[2], dir[0] * up[1] - dir[1] * up[0]];
  if (fwd[2] < 0) fwd.forEach((_, i) => (fwd[i] = -fwd[i]));
  return { root, dir, up, fwd: fwd as [number, number, number] };
}

/** Position 3D initiale (m) d'un point du patron, avant couture. */
export function initialPosition(piece: PieceName, u: number, v: number): [number, number, number] {
  const y = HPS_Y - v / 100;
  const onWrap = (scm: number, grow = 1): [number, number, number] => {
    const [x, z] = wrapAt(scm, v);
    return [x * grow, y, z * grow];
  };
  switch (piece) {
    case "front":
      return onWrap(u);
    case "back":
      return onWrap(2 * P.chestHalf - u);
    case "panelL":
      return onWrap(P.chestHalf - (P.panel.forward * panelWidthAt(v)) / P.panel.hemWidth + u);
    case "panelR":
      return onWrap(3 * P.chestHalf + (P.panel.forward * panelWidthAt(v)) / P.panel.hemWidth - u);
    case "sleeveL":
    case "sleeveR": {
      const f = armFrame(piece === "sleeveL" ? "L" : "R");
      // Le support invisible suit le cône de la manche : rayon du biceps à la tête, rayon de l'ouverture au poignet.
      // Garder le rayon du biceps sur toute la longueur laissait les bords de poignet séparés après la couture.
      const taper = Math.max(0, Math.min(1, (v - PATTERN.sleeve.capHeight) / (PATTERN.sleeve.length - PATTERN.sleeve.capHeight)));
      const halfCircumference = PATTERN.sleeve.bicepHalf + (PATTERN.sleeve.openingHalf - PATTERN.sleeve.bicepHalf) * taper;
      // Le demi-tour du patron détermine exactement le rayon du tube; l'aisance est déjà
      // portée par sleeveTorsoGap. Un surplus radial ici empêchait les bords sous-bras de se rejoindre.
      const r0 = halfCircumference / Math.PI / 100;
      const phi = u / 100 / r0;
      // Une manche coupée sur un corps boxy a un capuchon d'épaule qui rejoint l'aisselle latérale.
      // Un cylindre centré sur l'humérus plaçait son dessous 6–8 cm *dans* le buste ; la couture
      // le tirait ensuite vers dehors et formait une poche noire sous l'emmanchure.
      const cap = PATTERN.sleeve.capHeight;
      const capProgress = Math.min(1, Math.max(Math.abs(u) / PATTERN.sleeve.bicepHalf, v / cap));
      const t = (v + Math.min(v, cap) * 0.25 - Math.max(v - cap, 0) * 0.2) / 100;
      const cuffProgress = Math.min(1, Math.max(0, (v - cap) / (PATTERN.sleeve.length - cap)));
      const lateral = (0.06 - 0.04 * cuffProgress) * capProgress;
      const crownLift = 0.03 * (1 - capProgress);
      // Section souple légèrement ovale ; le bras court ne soutient pas le poignet.
      return [0, 1, 2].map((k) => f.root[k] + f.dir[k] * t + r0 * (0.84 * f.up[k] * Math.cos(phi) + 1.12 * f.fwd[k] * Math.sin(phi)) + (k === 0 ? Math.sign(f.root[0]) * lateral : k === 1 ? crownLift : 0)) as [number, number, number];
    }
    case "rib": {
      // Anneau qui épouse déjà l'encolure portée (basse devant, haute aux épaules, proche du cou au dos) :
      // la couture n'a presque pas à déplacer la bande. Un anneau horizontal devait glisser de plusieurs
      // centimètres vers l'encolure devant et repliait son bord haut près d'une épaule.
      const la = neckLengths.backHalf * P.rib.stretch;
      const lf = neckLengths.front * P.rib.stretch;
      const hps = (95 * Math.PI) / 180;
      // Origine et fermeture sur l'épaule gauche; le dos passe en continu derrière la nuque.
      const phi = u <= 2 * la ? hps * (1 - u / la) : -hps - ((u - 2 * la) / lf) * (2 * Math.PI - 2 * hps);
      const f = (1 - Math.cos(phi)) / 2; // 0 au milieu dos, 1 au milieu devant
      // Hauteur au milieu dos calée sur l'encolure dos du patron ; devant inchangé (0,175 m).
      const yBack = HPS_Y - P.backNeckDrop / 100 + 0.004;
      // Profil monotone du milieu dos aux épaules puis au creux devant, calé sur les deux courbes d'encolure.
      // Une parabole unique dépassait les HPS et créait une bosse au bord arrière du col.
      const yFront = HPS_Y - P.frontNeckDrop / 100;
      const fHps = (1 - Math.cos(hps)) / 2;
      const smooth = (t: number) => {
        const q = Math.max(0, Math.min(1, t));
        return q * q * (3 - 2 * q);
      };
      const yBottom =
        f <= fHps
          ? yBack + (HPS_Y - yBack) * smooth(f / fHps)
          : HPS_Y + (yFront - HPS_Y) * smooth((f - fHps) / (1 - fHps));
      // Au dos, la bande démarre hors du cou (rayon 6,1 cm + épaisseur) pour ne pas en être expulsée d'un coup.
      const rBottom = 0.072 + 0.053 * f - 0.022 * f * f;
      const up = (P.rib.height - v) / 100;
      // Le bord haut rentre de 4 mm sur 20 mm de hauteur; l'ancien retrait de 30 mm
      // traversait le cou et pinçait le milieu dos.
      const r = rBottom - 0.2 * up;
      return [r * Math.sin(phi), yBottom + 0.95 * up, -0.03 - r * Math.cos(phi)];
    }
  }
}
