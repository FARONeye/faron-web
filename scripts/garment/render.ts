import { BRANDING, FABRIC, PATTERN, STITCH } from "./spec";
import { HEM_HALF_BACK, HEM_HALF_FRONT, SIDE_CURVE_BACK, SIDE_CURVE_FRONT, type PieceMesh, type PieceName, type Vec2 } from "./pattern";
import { PRINT, PRINT_ATLAS } from "./motif";
import type { SimResult } from "./sim";

/** Emprise du Ø dans `faron-emblem-512.png` (boîte englobante mesurée, en fraction de l'image carrée). */
const EMBLEM_FILL = { w: 0.797, h: 0.781 };

/**
 * Passage de la simulation au maillage de rendu, image par image :
 * tissu (UV par pièce), ourlets roulottés, surpiqûres, broderie et étiquettes attachées au tissu
 * en coordonnées patron (barycentriques), occlusion ambiante.
 */

export const MATERIALS = ["jersey", "rib", "panel", "panelPrint", "thread", "embroidery", "metalEmblem", "metalWordmark", "labelHem", "labelSleeve"] as const;
export type MaterialName = (typeof MATERIALS)[number];

export type RenderMesh = {
  count: number;
  uv: Float32Array;
  ao: Float32Array;
  tris: { a: number; b: number; c: number; m: MaterialName }[];
  frames: Float32Array[];
  normals: Float32Array[];
  /** Points remarquables (position, normale) sur la pose moyenne, pour cadrer les gros plans. */
  landmarks: Record<string, { p: [number, number, number]; n: [number, number, number] }>;
};

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// ——— Lissage et normales du tissu ———————————————————————————————————————

function adjacency(count: number, tris: Uint32Array) {
  const sets = Array.from({ length: count }, () => new Set<number>());
  for (let t = 0; t < tris.length; t += 3)
    for (let e = 0; e < 3; e++) {
      sets[tris[t + e]].add(tris[t + ((e + 1) % 3)]);
      sets[tris[t + ((e + 1) % 3)]].add(tris[t + e]);
    }
  return sets.map((s) => Int32Array.from(s));
}

/** Lissage de Taubin : retire l'ondulation à l'échelle des particules sans faire fondre les plis. */
function taubin(pos: Float32Array, adj: Int32Array[], boundary: Uint8Array, iterations = 2) {
  const tmp = new Float32Array(pos.length);
  for (let it = 0; it < iterations * 2; it++) {
    const f = it % 2 === 0 ? 0.5 : -0.53;
    for (let i = 0; i < adj.length; i++) {
      const nb = adj[i];
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let n = 0;
      for (const j of nb) {
        if (boundary[i] && !boundary[j]) continue;
        sx += pos[j * 3];
        sy += pos[j * 3 + 1];
        sz += pos[j * 3 + 2];
        n++;
      }
      const k = i * 3;
      if (!n) {
        tmp.set(pos.subarray(k, k + 3), k);
        continue;
      }
      tmp[k] = pos[k] + f * (sx / n - pos[k]);
      tmp[k + 1] = pos[k + 1] + f * (sy / n - pos[k + 1]);
      tmp[k + 2] = pos[k + 2] + f * (sz / n - pos[k + 2]);
    }
    pos.set(tmp);
  }
}

/** Lissage 1D le long d'un bord (bord-côte tendu, ourlets nets). */
function smoothLoop(pos: Float32Array, loop: number[], iterations: number) {
  const L = loop.length;
  const tmp = new Float32Array(L * 3);
  for (let it = 0; it < iterations * 2; it++) {
    const f = it % 2 === 0 ? 0.5 : -0.53;
    for (let k = 0; k < L; k++) {
      const a = loop[(k - 1 + L) % L] * 3;
      const b = loop[k] * 3;
      const c = loop[(k + 1) % L] * 3;
      for (let j = 0; j < 3; j++) tmp[k * 3 + j] = pos[b + j] + f * ((pos[a + j] + pos[c + j]) / 2 - pos[b + j]);
    }
    for (let k = 0; k < L; k++) for (let j = 0; j < 3; j++) pos[loop[k] * 3 + j] = tmp[k * 3 + j];
  }
}

const centroidY = (pos: Float32Array, loop: number[]) => loop.reduce((s, i) => s + pos[i * 3 + 1], 0) / loop.length;

function vertexNormals(pos: Float32Array, tris: Uint32Array) {
  const n = new Float32Array(pos.length);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3;
    const b = tris[t + 1] * 3;
    const c = tris[t + 2] * 3;
    const u: V3 = [pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]];
    const v: V3 = [pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]];
    const f = cross(u, v);
    for (const p of [a, b, c]) {
      n[p] += f[0];
      n[p + 1] += f[1];
      n[p + 2] += f[2];
    }
  }
  for (let k = 0; k < n.length; k += 3) {
    const l = Math.hypot(n[k], n[k + 1], n[k + 2]) || 1;
    n[k] /= l;
    n[k + 1] /= l;
    n[k + 2] /= l;
  }
  return n;
}

/** Boucles de bord (ourlet, ouvertures de manches, haut du bord-côte), dans l'ordre. */
function boundaryLoops(count: number, tris: Uint32Array) {
  const edges = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let t = 0; t < tris.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const k = key(tris[t + e], tris[t + ((e + 1) % 3)]);
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  const nb = new Map<number, number[]>();
  for (const [k, c] of edges) {
    if (c !== 1) continue;
    const [a, b] = k.split("_").map(Number);
    nb.set(a, [...(nb.get(a) ?? []), b]);
    nb.set(b, [...(nb.get(b) ?? []), a]);
  }
  const boundary = new Uint8Array(count);
  for (const v of nb.keys()) boundary[v] = 1;
  const seen = new Set<number>();
  const loops: number[][] = [];
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const loop = [start];
    seen.add(start);
    let prev = -1;
    let cur = start;
    for (;;) {
      const next = (nb.get(cur) ?? []).find((v) => v !== prev && !seen.has(v));
      if (next === undefined) break;
      loop.push(next);
      seen.add(next);
      prev = cur;
      cur = next;
    }
    if (loop.length > 8) loops.push(loop);
  }
  return { loops, boundary };
}

// ——— Ancrage barycentrique en coordonnées patron ————————————————————————

type Anchor = { p: [number, number, number]; w: [number, number, number] };

function makeLocator(pm: PieceMesh, toParticle: Int32Array) {
  return (u: number, v: number): Anchor => {
    let best: Anchor | null = null;
    let bestScore = -Infinity;
    for (let t = 0; t < pm.tris.length; t += 3) {
      const [a, b, c] = [pm.tris[t], pm.tris[t + 1], pm.tris[t + 2]];
      const [ax, ay] = pm.pts[a];
      const [bx, by] = pm.pts[b];
      const [cx, cy] = pm.pts[c];
      const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(det) < 1e-12) continue;
      const l1 = ((by - cy) * (u - cx) + (cx - bx) * (v - cy)) / det;
      const l2 = ((cy - ay) * (u - cx) + (ax - cx) * (v - cy)) / det;
      const l3 = 1 - l1 - l2;
      const score = Math.min(l1, l2, l3);
      if (score > bestScore) {
        bestScore = score;
        best = { p: [toParticle[a], toParticle[b], toParticle[c]], w: [l1, l2, l3] };
        if (score >= 0) break;
      }
    }
    return best!;
  };
}

const evalAnchor = (A: Anchor, P: Float32Array, N: Float32Array): { p: V3; n: V3 } => {
  const p: V3 = [0, 0, 0];
  const n: V3 = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const i = A.p[k] * 3;
    for (let j = 0; j < 3; j++) {
      p[j] += P[i + j] * A.w[k];
      n[j] += N[i + j] * A.w[k];
    }
  }
  return { p, n: norm(n) };
};

// ——— Construction ———————————————————————————————————————————————————————

type Generator = (P: Float32Array, N: Float32Array, outP: Float32Array, outN: Float32Array) => void;

/** Décalage de l'envers du tissu (m). */
const INNER_OFFSET = 0.0008;

export function buildRenderMesh(sim: SimResult): RenderMesh {
  const { count, tris } = sim;
  const adj = adjacency(count, tris);
  const { loops, boundary } = boundaryLoops(count, tris);

  // Images lissées et normales du tissu.
  const P = sim.frames.map((f) => {
    const c = Float32Array.from(f);
    taubin(c, adj, boundary);
    // Le bord libre du col est la seule boucle haute: ce lissage de contour retire les petites
    // cassures dues à la jonction et à la discrétisation du patron, sans déplacer les coutures.
    for (const loop of loops) smoothLoop(c, loop, centroidY(c, loop) > 0.15 ? 32 : 3);
    return c;
  });
  const N = P.map((p) => vertexNormals(p, tris));
  const F = P.length;
  const mean = new Float32Array(count * 3);
  for (const p of P) for (let k = 0; k < mean.length; k++) mean[k] += p[k] / F;
  const meanN = vertexNormals(mean, tris);

  const uv: number[] = [];
  const ao: number[] = [];
  const out: RenderMesh["tris"] = [];
  const generators: { start: number; n: number; gen: Generator }[] = [];
  let vcount = 0;
  const addVerts = (n: number, uvs: number[], aos: number[], gen: Generator) => {
    const start = vcount;
    vcount += n;
    uv.push(...uvs);
    ao.push(...aos);
    generators.push({ start, n, gen });
    return start;
  };
  const tri = (a: number, b: number, c: number, m: MaterialName) => out.push({ a, b, c, m });

  // Occlusion du tissu : creux des plis, coutures légèrement marquées.
  const clothAO = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const j of adj[i]) {
      sx += mean[j * 3];
      sy += mean[j * 3 + 1];
      sz += mean[j * 3 + 2];
    }
    const n = adj[i].length || 1;
    const d: V3 = [mean[i * 3] - sx / n, mean[i * 3 + 1] - sy / n, mean[i * 3 + 2] - sz / n];
    const cav = dot(d, [meanN[i * 3], meanN[i * 3 + 1], meanN[i * 3 + 2]]);
    let a = Math.min(1.05, Math.max(0.68, 1 + cav * 140));
    // Chiné très léger du coton teint : variation basse fréquence de ±3,5 %.
    const [mx, my, mz] = [mean[i * 3], mean[i * 3 + 1], mean[i * 3 + 2]];
    a *= 1 + 0.035 * (0.5 * Math.sin(mx * 31 + my * 17) + 0.3 * Math.sin(my * 43 - mz * 29 + 1.7) + 0.2 * Math.sin(mz * 57 + mx * 23 + 0.4));
    if (sim.seamParticle[i]) a *= 0.8;
    else if (adj[i].some((j) => sim.seamParticle[j])) a *= 0.93;
    clothAO[i] = a;
  }

  // 1. Tissu : une copie des sommets par pièce (UV propres à chaque pièce).
  const TILE: Record<string, number> = { jersey: 2, panel: 0.8, rib: 1 };
  sim.pieces.forEach((pm, pi) => {
    const map = sim.pieceToParticle[pi];
    const tile = TILE[pm.piece.material];
    const start = addVerts(
      pm.pts.length,
      pm.pts.flatMap(([u, v]) => [u / tile, v / tile]),
      Array.from(map, (p) => clothAO[p]),
      (Pp, Nn, oP, oN) => {
        for (let i = 0; i < map.length; i++) {
          oP.set(Pp.subarray(map[i] * 3, map[i] * 3 + 3), i * 3);
          oN.set(Nn.subarray(map[i] * 3, map[i] * 3 + 3), i * 3);
        }
      },
    );
    for (let t = 0; t < pm.tris.length; t += 3) tri(start + pm.tris[t], start + pm.tris[t + 1], start + pm.tris[t + 2], pm.piece.material);
    // Envers du tissu : surface intérieure sombre (épaisseur ~0,8 mm), triangles retournés.
    const inner = addVerts(
      pm.pts.length,
      pm.pts.flatMap(([u, v]) => [u / tile, v / tile]),
      Array.from(map, (p) => 0.36 * clothAO[p]),
      (Pp, Nn, oP, oN) => {
        for (let i = 0; i < map.length; i++) {
          const k = map[i] * 3;
          oP[i * 3] = Pp[k] - Nn[k] * INNER_OFFSET;
          oP[i * 3 + 1] = Pp[k + 1] - Nn[k + 1] * INNER_OFFSET;
          oP[i * 3 + 2] = Pp[k + 2] - Nn[k + 2] * INNER_OFFSET;
          oN[i * 3] = -Nn[k];
          oN[i * 3 + 1] = -Nn[k + 1];
          oN[i * 3 + 2] = -Nn[k + 2];
        }
      },
    );
    for (let t = 0; t < pm.tris.length; t += 3) tri(inner + pm.tris[t], inner + pm.tris[t + 2], inner + pm.tris[t + 1], pm.piece.material);
    // Panneaux latéraux : motifs imprimés, calque à 0,25 mm au-dessus de la maille.
    if (pm.piece.material === "panel") {
      const print = addVerts(
        pm.pts.length,
        // Atlas : panneau gauche porté dans la moitié gauche, droit dans la moitié droite.
        pm.pts.flatMap(([u, v]) => [((u - PRINT.uMin) / PRINT.uSpan + (pm.piece.name === "panelR" ? 1 : 0)) / PRINT_ATLAS, (v - PRINT.vMin) / PRINT.vSpan]),
        Array.from(map, (p) => clothAO[p]),
        (Pp, Nn, oP, oN) => {
          for (let i = 0; i < map.length; i++) {
            const k = map[i] * 3;
            for (let j = 0; j < 3; j++) {
              oP[i * 3 + j] = Pp[k + j] + Nn[k + j] * 0.00025;
              oN[i * 3 + j] = Nn[k + j];
            }
          }
        },
      );
      for (let t = 0; t < pm.tris.length; t += 3) tri(print + pm.tris[t], print + pm.tris[t + 1], print + pm.tris[t + 2], "panelPrint");
    }
  });

  // 2. Bords roulottés (épaisseur réelle visible) : ourlet, manches, bord-côte plié.
  const centroidOf = (loop: number[]) => {
    const c: V3 = [0, 0, 0];
    for (const i of loop) for (let k = 0; k < 3; k++) c[k] += mean[i * 3 + k] / loop.length;
    return c;
  };
  const isRibLoop = (loop: number[]) => centroidOf(loop)[1] > 0.15;
  const K = 6;
  for (const loop of loops) {
    const rib = isRibLoop(loop);
    const t = rib ? FABRIC.ribThickness : FABRIC.hemThickness;
    const inner = rib ? PATTERN.rib.height / 100 - 0.003 : FABRIC.hemAllowance;
    const L = loop.length;
    // Sens « hors du tissu » de chaque sommet de bord, fixé sur la pose moyenne.
    const sign = loop.map((i, k) => {
      const prev = loop[(k - 1 + L) % L];
      const next = loop[(k + 1) % L];
      const T = sub(vec(mean, next), vec(mean, prev));
      const e = cross(T, vec(meanN, i));
      const inward = adj[i].filter((j) => !boundary[j]);
      const ref = inward.length ? inward.reduce((acc, j) => add(acc, vec(mean, j)), [0, 0, 0] as V3).map((x) => x / inward.length) as V3 : vec(mean, i);
      return dot(e, sub(vec(mean, i), ref)) >= 0 ? 1 : -1;
    });
    let arc = 0;
    const uvs: number[] = [];
    for (let k = 0; k < L; k++) {
      if (k > 0) arc += Math.hypot(...sub(vec(mean, loop[k]), vec(mean, loop[k - 1])));
      for (let s = 0; s <= K + 1; s++) uvs.push((arc * 100) / 2, s * 0.08);
    }
    const start = addVerts(L * (K + 2), uvs, new Array(L * (K + 2)).fill(0).map((_, q) => { const s = q % (K + 2); return s === K + 1 ? 0.3 : 0.86 - 0.5 * (s / K); }), (Pp, Nn, oP, oN) => {
      for (let k = 0; k < L; k++) {
        const i = loop[k];
        const p = vec(Pp, i);
        const n = vec(Nn, i);
        const T = sub(vec(Pp, loop[(k + 1) % L]), vec(Pp, loop[(k - 1 + L) % L]));
        const e = mul(norm(cross(T, n)), sign[k]);
        for (let s = 0; s <= K; s++) {
          const psi = (s / K) * Math.PI;
          const q = add(sub(p, mul(n, (t / 2) * (1 - Math.cos(psi)))), mul(e, (t / 2) * Math.sin(psi)));
          const nn = norm(add(mul(n, Math.cos(psi)), mul(e, Math.sin(psi))));
          oP.set(q, (k * (K + 2) + s) * 3);
          oN.set(nn, (k * (K + 2) + s) * 3);
        }
        oP.set(sub(sub(p, mul(n, t)), mul(e, inner)), (k * (K + 2) + K + 1) * 3);
        oN.set(mul(n, -1), (k * (K + 2) + K + 1) * 3);
      }
    });
    const m: MaterialName = rib ? "rib" : "jersey";
    for (let k = 0; k < L; k++) {
      const a = start + k * (K + 2);
      const b = start + ((k + 1) % L) * (K + 2);
      for (let s = 0; s <= K; s++) {
        tri(a + s, b + s, a + s + 1, m);
        tri(b + s, b + s + 1, a + s + 1, m);
      }
    }
  }

  // 3. Surpiqûres (fil bombé), définies en coordonnées patron.
  const locators = new Map<PieceName, (u: number, v: number) => Anchor>();
  sim.pieces.forEach((pm, pi) => locators.set(pm.piece.name, makeLocator(pm, sim.pieceToParticle[pi])));
  const stitch = (piece: PieceName, poly: Vec2[]) => {
    const pts = densify(poly, 0.4);
    const anchors = pts.map(([u, v]) => locators.get(piece)!(u, v));
    const n = anchors.length;
    let len = 0;
    const uvs: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) / 100;
      const u = len / STITCH.pitch;
      uvs.push(u, 0, u, 0.5, u, 1);
    }
    const start = addVerts(n * 3, uvs, new Array(n * 3).fill(1), (Pp, Nn, oP, oN) => {
      const S = anchors.map((A) => evalAnchor(A, Pp, Nn));
      for (let i = 0; i < n; i++) {
        const T = norm(sub(S[Math.min(n - 1, i + 1)].p, S[Math.max(0, i - 1)].p));
        const side = mul(norm(cross(S[i].n, T)), STITCH.width / 2);
        const base = add(S[i].p, mul(S[i].n, 0.00025));
        oP.set(sub(base, side), i * 9);
        oP.set(add(base, mul(S[i].n, 0.00035)), i * 9 + 3);
        oP.set(add(base, side), i * 9 + 6);
        const tilt = norm(side);
        oN.set(norm(sub(S[i].n, mul(tilt, 0.6))), i * 9);
        oN.set(S[i].n, i * 9 + 3);
        oN.set(norm(add(S[i].n, mul(tilt, 0.6))), i * 9 + 6);
      }
    });
    for (let i = 0; i < n - 1; i++) {
      const a = start + i * 3;
      const b = a + 3;
      for (let s = 0; s < 2; s++) {
        tri(a + s, b + s, a + s + 1, "thread");
        tri(b + s, b + s + 1, a + s + 1, "thread");
      }
    }
  };

  const hw = PATTERN.panel.hemWidth / 2;
  for (const r of STITCH.hemRows) {
    stitch("front", [[-HEM_HALF_FRONT + 0.3, PATTERN.length - r], [HEM_HALF_FRONT - 0.3, PATTERN.length - r]]);
    stitch("back", [[-HEM_HALF_BACK + 0.3, PATTERN.length - r], [HEM_HALF_BACK - 0.3, PATTERN.length - r]]);
    for (const piece of ["panelL", "panelR"] as const) stitch(piece, [[-hw + 0.35, PATTERN.length - r], [hw - 0.35, PATTERN.length - r]]);
  }
  const sl = PATTERN.sleeve;
  const sleeveEdge = (v: number) => sl.bicepHalf + ((sl.openingHalf - sl.bicepHalf) * (v - sl.capHeight)) / (sl.length - sl.capHeight);
  for (const r of STITCH.cuffRows)
    for (const piece of ["sleeveL", "sleeveR"] as const) {
      const v = sl.length - r;
      stitch(piece, [[-sleeveEdge(v) + 0.3, v], [sleeveEdge(v) - 0.3, v]]);
    }
  for (const r of STITCH.neckRows) {
    stitch("front", offsetNeck(PATTERN.neckHalfWidth, PATTERN.frontNeckDrop, r));
    stitch("back", offsetNeck(PATTERN.neckHalfWidth, PATTERN.backNeckDrop, r));
  }
  for (const r of STITCH.shoulderRows)
    for (const sx of [1, -1]) {
      const a: Vec2 = [PATTERN.neckHalfWidth * sx, 0];
      const b: Vec2 = [PATTERN.shoulderX * sx, PATTERN.shoulderDrop];
      stitch("back", offsetLine(a, b, r, 0.4));
    }
  for (const piece of ["sleeveL", "sleeveR"] as const) {
    const idx = sim.pieces.findIndex((p) => p.piece.name === piece);
    const pm = sim.pieces[idx];
    const cap = [...pm.piece.segments.find((s) => s.name === "capNeg")!.pts, ...pm.piece.segments.find((s) => s.name === "capPos")!.pts.slice(1)];
    stitch(piece, offsetPoly(cap, STITCH.armholeRow));
  }
  for (const piece of ["front", "back"] as const)
    for (const sx of [1, -1])
      stitch(
        piece,
        (piece === "front" ? SIDE_CURVE_FRONT : SIDE_CURVE_BACK)
          .filter(([, v]) => v > PATTERN.underarmY + 1.2 && v < PATTERN.length - 3)
          .map(([u, v]) => [(u - STITCH.sideRow) * sx, v] as Vec2),
      );

  // 4. Broderie Ø (fichier officiel) et étiquettes.
  const decal = (piece: PieceName, cu: number, cv: number, w: number, h: number, cols: number, rows: number, offset: number, m: MaterialName) => {
    const loc = locators.get(piece)!;
    const anchors: Anchor[] = [];
    const uvs: number[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        anchors.push(loc(cu + (c / (cols - 1) - 0.5) * w, cv + (r / (rows - 1) - 0.5) * h));
        uvs.push(c / (cols - 1), r / (rows - 1));
      }
    flipIfMirrored(anchors, uvs, cols, rows);
    const start = addVerts(anchors.length, uvs, new Array(anchors.length).fill(1), (Pp, Nn, oP, oN) => {
      anchors.forEach((A, i) => {
        const s = evalAnchor(A, Pp, Nn);
        oP.set(add(s.p, mul(s.n, offset)), i * 3);
        oN.set(s.n, i * 3);
      });
    });
    gridTris(start, cols, rows, m, anchors);
  };
  const flipIfMirrored = (anchors: Anchor[], uvs: number[], cols: number, rows: number) => {
    const s0 = evalAnchor(anchors[0], mean, meanN);
    const du = sub(evalAnchor(anchors[cols - 1], mean, meanN).p, s0.p);
    const dv = sub(evalAnchor(anchors[(rows - 1) * cols], mean, meanN).p, s0.p);
    // Image à l'endroit vue de l'extérieur : (droite) × (bas) doit entrer dans le tissu.
    if (dot(cross(du, dv), s0.n) > 0) for (let i = 0; i < uvs.length; i += 2) uvs[i] = 1 - uvs[i];
  };
  /** Triangule une grille de décalque, orientée vers l'extérieur du tissu (faces simples). */
  const gridTris = (start: number, cols: number, rows: number, m: MaterialName, anchors: Anchor[]) => {
    const s0 = evalAnchor(anchors[0], mean, meanN);
    const sRight = evalAnchor(anchors[1], mean, meanN);
    const sDown = evalAnchor(anchors[cols], mean, meanN);
    const flip = dot(cross(sub(sDown.p, s0.p), sub(sRight.p, s0.p)), s0.n) < 0;
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        const a = start + r * cols + c;
        const b = a + 1;
        const d = a + cols;
        const e = d + 1;
        if (flip) {
          tri(a, b, d, m);
          tri(b, e, d, m);
        } else {
          tri(a, d, b, m);
          tri(b, d, e, m);
        }
      }
  };
  const E = BRANDING.emblem;
  decal("front", E.u, E.v, E.height / EMBLEM_FILL.h, E.height / EMBLEM_FILL.h, 14, 14, 0.0004, "embroidery");
  const Lh = BRANDING.hemLabel;
  decal("front", Lh.u, PATTERN.length - Lh.vAboveHem, Lh.w, Lh.h, 12, 5, 0.0005, "labelHem");
  // Dos : grand Ø métal brossé au centre, dimensionné par sa largeur réelle (sans déformation : image carrée),
  // petit FARØN sous le col (proportions du mot-symbole officiel : 2040 × 480).
  const Be = BRANDING.backEmblem;
  decal("back", Be.u, Be.v, Be.width / EMBLEM_FILL.w, Be.width / EMBLEM_FILL.w, 40, 40, 0.00035, "metalEmblem");
  const Bw = BRANDING.backWordmark;
  decal("back", Bw.u, Bw.v, Bw.width, (Bw.width * 480) / 2040, 16, 6, 0.0003, "metalWordmark");

  // Étiquette pliée sur l'ourlet de la manche gauche portée : dehors, pli, dedans.
  {
    const Sl = BRANDING.sleeveLabel;
    const loc = locators.get("sleeveL")!;
    const cols = 6;
    const outRows = 7;
    const foldRows = 6;
    const inRows = 5;
    const vEdge = sl.length - 0.001;
    const columns = Array.from({ length: cols }, (_, c) => Sl.u + (c / (cols - 1) - 0.5) * Sl.w);
    const outA = Array.from({ length: outRows }, (_, r) => columns.map((u) => loc(u, vEdge - Sl.outside * (1 - r / (outRows - 1)))));
    const inA = Array.from({ length: inRows }, (_, r) => columns.map((u) => loc(u, vEdge - Sl.inside * (r / (inRows - 1)))));
    const backA = columns.map((u) => loc(u, vEdge - 0.4));
    const rows = outRows + foldRows - 1 + inRows;
    const uvs: number[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) uvs.push(c / (cols - 1), r / (rows - 1));
    const flat: Anchor[] = outA.flat();
    flipIfMirrored(flat, uvs, cols, outRows);
    const t = FABRIC.hemThickness + 0.0008;
    const start = addVerts(rows * cols, uvs, new Array(rows * cols).fill(1), (Pp, Nn, oP, oN) => {
      let row = 0;
      const put = (p: V3, n: V3, c: number) => {
        oP.set(p, (row * cols + c) * 3);
        oN.set(n, (row * cols + c) * 3);
      };
      for (const line of outA) {
        line.forEach((A, c) => {
          const s = evalAnchor(A, Pp, Nn);
          put(add(s.p, mul(s.n, 0.0004)), s.n, c);
        });
        row++;
      }
      const edge = outA[outA.length - 1].map((A) => evalAnchor(A, Pp, Nn));
      const dirs = backA.map((A, c) => norm(sub(edge[c].p, evalAnchor(A, Pp, Nn).p)));
      for (let k = 1; k < foldRows; k++) {
        const psi = (k / foldRows) * Math.PI;
        edge.forEach((s, c) => {
          const p = add(add(s.p, mul(s.n, 0.0004 - (t / 2) * (1 - Math.cos(psi)))), mul(dirs[c], (t / 2) * Math.sin(psi)));
          put(p, norm(add(mul(s.n, Math.cos(psi)), mul(dirs[c], Math.sin(psi)))), c);
        });
        row++;
      }
      for (const line of inA) {
        line.forEach((A, c) => {
          const s = evalAnchor(A, Pp, Nn);
          put(sub(s.p, mul(s.n, t - 0.0004)), mul(s.n, -1), c);
        });
        row++;
      }
    });
    gridTris(start, cols, rows, "labelSleeve", flat);
  }

  // Évaluation de toutes les images.
  const frames: Float32Array[] = [];
  const normals: Float32Array[] = [];
  for (let f = 0; f < F; f++) {
    const fp = new Float32Array(vcount * 3);
    const fn = new Float32Array(vcount * 3);
    for (const g of generators) g.gen(P[f], N[f], fp.subarray(g.start * 3, (g.start + g.n) * 3), fn.subarray(g.start * 3, (g.start + g.n) * 3));
    frames.push(fp);
    normals.push(fn);
  }
  const mark = (piece: PieceName, u: number, v: number) => {
    const s = evalAnchor(locators.get(piece)!(u, v), mean, meanN);
    return { p: s.p.map((x) => Math.round(x * 1000) / 1000) as V3, n: s.n.map((x) => Math.round(x * 1000) / 1000) as V3 };
  };
  const landmarks = {
    collar: mark("front", 0, PATTERN.frontNeckDrop + 1.5),
    emblem: mark("front", E.u, E.v),
    sleeve: mark("sleeveL", 4, sl.length - 4),
    cuff: mark("sleeveL", BRANDING.sleeveLabel.u, sl.length - 0.8),
    panel: mark("panelL", 0, 48),
    hem: mark("front", Lh.u, PATTERN.length - Lh.vAboveHem),
    chest: mark("front", 0, 22),
    backNeck: mark("back", 0, 8),
    backLogo: mark("back", BRANDING.backEmblem.u, BRANDING.backEmblem.v),
    backNeckLogo: mark("back", BRANDING.backWordmark.u, BRANDING.backWordmark.v),
  };
  return { count: vcount, uv: new Float32Array(uv), ao: new Float32Array(ao), tris: out, frames, normals, landmarks };
}

function vec(a: Float32Array, i: number): V3 {
  return [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]];
}

function densify(poly: Vec2[], step: number): Vec2[] {
  const out: Vec2[] = [poly[0]];
  for (let i = 1; i < poly.length; i++) {
    const [ax, ay] = poly[i - 1];
    const [bx, by] = poly[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
  }
  return out;
}

/** Courbe d'encolure décalée de r vers l'intérieur de la pièce (loin du col). */
function offsetNeck(w: number, d: number, r: number): Vec2[] {
  return Array.from({ length: 81 }, (_, i) => {
    const a = -Math.PI / 2 + (i / 80) * Math.PI;
    const x = w * Math.sin(a);
    const y = d * Math.cos(a);
    const g = norm([x / (w * w), y / (d * d), 0]);
    return [x + g[0] * r, y + g[1] * r] as Vec2;
  });
}

function offsetLine(a: Vec2, b: Vec2, r: number, trim: number): Vec2[] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy);
  let nx = -dy / l;
  let ny = dx / l;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const t0 = trim / l;
  const t1 = 1 - trim / l;
  return [
    [a[0] + dx * t0 + nx * r, a[1] + dy * t0 + ny * r],
    [a[0] + dx * t1 + nx * r, a[1] + dy * t1 + ny * r],
  ];
}

/** Polyligne décalée de r vers les v croissants (intérieur de la manche sous la tête). */
function offsetPoly(pts: Vec2[], r: number): Vec2[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l;
    let ny = dx / l;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    return [p[0] + nx * r, p[1] + ny * r] as Vec2;
  });
}
