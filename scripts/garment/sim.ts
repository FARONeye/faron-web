import { bodySdf } from "./body";
import { dihedralAngle } from "./dihedral";
import { armFrame, initialPosition, meshPieces, PIECES, SEAMS, type PieceMesh } from "./pattern";
import { PATTERN, SIM } from "./spec";

/** Déplacement maximal (m) qu'une charnière de flexion peut imposer en une projection. */
const MAX_HINGE_MOVE = 0.0008;

/**
 * Simulation de tissu XPBD (« small steps » : une itération par sous-pas, beaucoup de sous-pas).
 *  1. couture  — pièces enroulées autour du mannequin, coutures resserrées sans gravité ;
 *  2. soudure  — chaque paire de points cousus devient une seule particule ;
 *  3. drapé    — gravité, raideur d'un jersey 280 g/m², frottement sur le corps ;
 *  4. pose     — le vêtement reste au repos après son drapé, sans animation de tissu.
 */

export type SimResult = {
  count: number;
  tris: Uint32Array;
  triPiece: Uint8Array;
  /** Images de la boucle (F × count × 3). */
  frames: Float32Array[];
  pieces: PieceMesh[];
  /** Particule correspondant à chaque point 2D de chaque pièce. */
  pieceToParticle: Int32Array[];
  seamParticle: Uint8Array;
  log: string[];
};

const G = 9.81;

type Constraints = { i: Int32Array; j: Int32Array; rest: Float64Array; comp: Float64Array };
/** Flexion dièdre : arête (a → b), sommets opposés c et d, angle de repos, compliance. */
type Hinges = { a: Int32Array; b: Int32Array; c: Int32Array; d: Int32Array; rest: Float64Array; comp: Float64Array };
type Hinge = [number, number, number, number, number, number];

function toHinges(list: Hinge[]): Hinges {
  const n = list.length;
  const h = { a: new Int32Array(n), b: new Int32Array(n), c: new Int32Array(n), d: new Int32Array(n), rest: new Float64Array(n), comp: new Float64Array(n) };
  list.forEach(([a, b, c, d, r, k], q) => {
    h.a[q] = a;
    h.b[q] = b;
    h.c[q] = c;
    h.d[q] = d;
    h.rest[q] = r;
    h.comp[q] = k;
  });
  return h;
}

/** Charnières d'un maillage orienté : chaque arête intérieure (a → b) avec ses deux sommets opposés. */
function hingesOf(tris: ArrayLike<number>) {
  const opposite = new Map<number, number>();
  for (let t = 0; t < tris.length; t += 3)
    for (let e = 0; e < 3; e++) opposite.set(tris[t + e] * 1e6 + tris[t + ((e + 1) % 3)], tris[t + ((e + 2) % 3)]);
  const out: [number, number, number, number][] = [];
  for (const [key, c] of opposite) {
    const a = Math.floor(key / 1e6);
    const b = key - a * 1e6;
    if (a > b) continue;
    const d = opposite.get(b * 1e6 + a);
    if (d !== undefined) out.push([a, b, c, d]);
  }
  return out;
}

function toConstraints(list: [number, number, number, number][]): Constraints {
  const n = list.length;
  const c = { i: new Int32Array(n), j: new Int32Array(n), rest: new Float64Array(n), comp: new Float64Array(n) };
  list.forEach(([a, b, r, k], q) => {
    c.i[q] = a;
    c.j[q] = b;
    c.rest[q] = r;
    c.comp[q] = k;
  });
  return c;
}

class Cloth {
  n: number;
  x: Float64Array;
  prev: Float64Array;
  v: Float64Array;
  w: Float64Array;
  /** 0 buste, 1 manche, 2 bord-côte. */
  group: Uint8Array;
  acc: Float64Array;
  stretch!: Constraints;
  bend!: Hinges;
  /** Flexion « courte » (distance entre sommets opposés), souple : stabilise le maillage. */
  bendDist!: Constraints;
  sew: Constraints | null = null;
  tris: Uint32Array;
  triPiece: Uint8Array;
  hingeGrad = new Float64Array(12);
  /** Multiplicateur de compliance en flexion (couture : très souple ; drapé : montée progressive). */
  bendScale = 1;

  constructor(n: number, tris: Uint32Array, triPiece: Uint8Array) {
    this.n = n;
    this.x = new Float64Array(n * 3);
    this.prev = new Float64Array(n * 3);
    this.v = new Float64Array(n * 3);
    this.w = new Float64Array(n);
    this.group = new Uint8Array(n);
    this.acc = new Float64Array(n * 3);
    this.tris = tris;
    this.triPiece = triPiece;
  }

  project(c: Constraints, alphaScale: number) {
    const { x, w } = this;
    for (let q = 0; q < c.i.length; q++) {
      const a = c.i[q] * 3;
      const b = c.j[q] * 3;
      const wa = w[c.i[q]];
      const wb = w[c.j[q]];
      const dx = x[a] - x[b];
      const dy = x[a + 1] - x[b + 1];
      const dz = x[a + 2] - x[b + 2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const C = d - c.rest[q];
      const denom = wa + wb + c.comp[q] * alphaScale;
      if (denom === 0 || d < 1e-12) continue;
      const s = -C / denom / d;
      x[a] += wa * s * dx;
      x[a + 1] += wa * s * dy;
      x[a + 2] += wa * s * dz;
      x[b] -= wb * s * dx;
      x[b + 1] -= wb * s * dy;
      x[b + 2] -= wb * s * dz;
    }
  }

  /** Flexion dièdre XPBD (petits pas) : Δλ = −C / (Σ w|∇C|² + α/Δt²). */
  bendHinges(h: Hinges, alphaScale: number) {
    const { x, w } = this;
    const g = this.hingeGrad;
    for (let q = 0; q < h.a.length; q++) {
      const ids = [h.a[q], h.b[q], h.c[q], h.d[q]];
      const theta = dihedralAngle(x, ids[0], ids[1], ids[2], ids[3], g);
      if (!Number.isFinite(theta)) continue;
      let C = theta - h.rest[q];
      if (C > Math.PI) C -= 2 * Math.PI;
      else if (C < -Math.PI) C += 2 * Math.PI;
      let denom = h.comp[q] * alphaScale;
      for (let k = 0; k < 4; k++) denom += w[ids[k]] * (g[k * 3] ** 2 + g[k * 3 + 1] ** 2 + g[k * 3 + 2] ** 2);
      if (denom < 1e-12) continue;
      let dl = -C / denom;
      // Correction plafonnée : sur un triangle presque dégénéré le gradient (∝ |e|/|n|²) explose et une
      // flexion raide dépasserait sa cible, ce qui faisait diverger le drapé.
      let move = 0;
      for (let k = 0; k < 4; k++) move = Math.max(move, w[ids[k]] * Math.abs(dl) * Math.hypot(g[k * 3], g[k * 3 + 1], g[k * 3 + 2]));
      if (move > MAX_HINGE_MOVE) dl *= MAX_HINGE_MOVE / move;
      for (let k = 0; k < 4; k++) {
        const s = w[ids[k]] * dl;
        const o = ids[k] * 3;
        x[o] += s * g[k * 3];
        x[o + 1] += s * g[k * 3 + 1];
        x[o + 2] += s * g[k * 3 + 2];
      }
    }
  }

  collide() {
    const { x, prev, group } = this;
    const th = SIM.thickness;
    for (let i = 0; i < this.n; i++) {
      const k = i * 3;
      const h = bodySdf(x[k], x[k + 1], x[k + 2], group[i] === 1 ? SIM.sleeveTorsoGap : 0);
      if (h.d >= th) continue;
      const push = th - h.d;
      x[k] += h.gx * push;
      x[k + 1] += h.gy * push;
      x[k + 2] += h.gz * push;
      // Frottement de Coulomb (PBD) : adhérence totale si le glissement du sous-pas est inférieur à
      // μs × correction de contact, sinon frottement cinétique. Sans cela le tissu « rampe » sur le corps.
      const mx = x[k] - prev[k];
      const my = x[k + 1] - prev[k + 1];
      const mz = x[k + 2] - prev[k + 2];
      const mn = mx * h.gx + my * h.gy + mz * h.gz;
      const tx = mx - mn * h.gx;
      const ty = my - mn * h.gy;
      const tz = mz - mn * h.gz;
      const tl = Math.sqrt(tx * tx + ty * ty + tz * tz);
      const f = tl < SIM.staticFriction * push ? 1 : Math.min(1, (SIM.friction * push) / (tl || 1));
      x[k] -= tx * f;
      x[k + 1] -= ty * f;
      x[k + 2] -= tz * f;
    }
  }

  step(dt: number, gravity: number, damping: number, sewComp: number) {
    const { x, prev, v, w, acc } = this;
    const N = this.n * 3;
    for (let k = 0; k < N; k += 3) {
      const i = k / 3;
      prev[k] = x[k];
      prev[k + 1] = x[k + 1];
      prev[k + 2] = x[k + 2];
      if (w[i] === 0) continue;
      v[k] = (v[k] + acc[k] * dt) * damping;
      v[k + 1] = (v[k + 1] + (acc[k + 1] - gravity * G) * dt) * damping;
      v[k + 2] = (v[k + 2] + acc[k + 2] * dt) * damping;
      x[k] += v[k] * dt;
      x[k + 1] += v[k + 1] * dt;
      x[k + 2] += v[k + 2] * dt;
    }
    const inv = 1 / (dt * dt);
    this.project(this.stretch, inv);
    this.project(this.bendDist, inv);
    this.bendHinges(this.bend, inv * this.bendScale);
    if (this.sew) {
      this.sew.comp.fill(sewComp);
      this.project(this.sew, inv);
    }
    this.collide();
    for (let k = 0; k < N; k++) v[k] = (x[k] - prev[k]) / dt;
  }

  normals(out = new Float64Array(this.n * 3)) {
    out.fill(0);
    const { x, tris } = this;
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3;
      const b = tris[t + 1] * 3;
      const c = tris[t + 2] * 3;
      const ux = x[b] - x[a];
      const uy = x[b + 1] - x[a + 1];
      const uz = x[b + 2] - x[a + 2];
      const vx = x[c] - x[a];
      const vy = x[c + 1] - x[a + 1];
      const vz = x[c + 2] - x[a + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const p of [a, b, c]) {
        out[p] += nx;
        out[p + 1] += ny;
        out[p + 2] += nz;
      }
    }
    for (let k = 0; k < out.length; k += 3) {
      const l = Math.hypot(out[k], out[k + 1], out[k + 2]) || 1;
      out[k] /= l;
      out[k + 1] /= l;
      out[k + 2] /= l;
    }
    return out;
  }
}

function edgeKey(a: number, b: number) {
  return a < b ? a * 1e6 + b : b * 1e6 + a;
}

/** Paires de sommets opposés de chaque arête intérieure (flexion de distance). */
function oppositePairs(tris: ArrayLike<number>) {
  return hingesOf(tris).map(([, , c, d]) => [c, d] as [number, number]);
}

/**
 * Les pièces sont enroulées avec des symétries différentes (devant, dos, manches) : on retourne
 * les triangles de chaque pièce pour que toutes les normales pointent vers l'extérieur du corps.
 */
function orientPieces(pieces: PieceMesh[]) {
  for (const pm of pieces) {
    const name = pm.piece.name;
    const pos = pm.pts.map(([u, v]) => initialPosition(name, u, v));
    const arm = name === "sleeveL" ? armFrame("L") : name === "sleeveR" ? armFrame("R") : null;
    let vote = 0;
    for (let t = 0; t < pm.tris.length; t += 3) {
      const [a, b, c] = [pos[pm.tris[t]], pos[pm.tris[t + 1]], pos[pm.tris[t + 2]]];
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      let o: number[];
      if (arm) {
        const q = [a[0] - arm.root[0], a[1] - arm.root[1], a[2] - arm.root[2]];
        const along = q[0] * arm.dir[0] + q[1] * arm.dir[1] + q[2] * arm.dir[2];
        o = q.map((x, k) => x - along * arm.dir[k]);
      } else {
        o = [a[0], 0, a[2] + (name === "rib" ? 0.024 : 0)];
      }
      vote += Math.sign(n[0] * o[0] + n[1] * o[1] + n[2] * o[2]);
    }
    if (vote < 0) for (let t = 0; t < pm.tris.length; t += 3) [pm.tris[t + 1], pm.tris[t + 2]] = [pm.tris[t + 2], pm.tris[t + 1]];
  }
}

export function simulate(onProgress: (msg: string) => void = () => {}): SimResult {
  const log: string[] = [];
  const say = (m: string) => {
    log.push(m);
    onProgress(m);
  };
  const pieces = meshPieces();
  orientPieces(pieces);
  const offsets: number[] = [];
  let total = 0;
  for (const pm of pieces) {
    offsets.push(total);
    total += pm.pts.length;
  }
  const triList: number[] = [];
  const triPieceList: number[] = [];
  pieces.forEach((pm, pi) => {
    for (const i of pm.tris) triList.push(offsets[pi] + i);
    for (let t = 0; t < pm.tris.length / 3; t++) triPieceList.push(pi);
  });
  const cloth = new Cloth(total, new Uint32Array(triList), new Uint8Array(triPieceList));
  say(`Patron : ${total} particules, ${triList.length / 3} triangles, ${pieces.length} pièces`);

  // Positions initiales, masses (280 g/m²), groupes.
  const mass = new Float64Array(total);
  const stretch: [number, number, number, number][] = [];
  const bend: Hinge[] = [];
  const bendDist: [number, number, number, number][] = [];
  pieces.forEach((pm, pi) => {
    const o = offsets[pi];
    const grp = pm.piece.name.startsWith("sleeve") ? 1 : pm.piece.name === "rib" ? 2 : 0;
    pm.pts.forEach(([u, v], i) => {
      const p = initialPosition(pm.piece.name, u, v);
      cloth.x.set(p, (o + i) * 3);
      cloth.group[o + i] = grp;
    });
    const seen = new Set<number>();
    const comp = pm.piece.material === "rib" ? SIM.ribStretchCompliance : SIM.stretchCompliance;
    for (let t = 0; t < pm.tris.length; t += 3) {
      const [a, b, c] = [pm.tris[t], pm.tris[t + 1], pm.tris[t + 2]];
      const area = Math.abs((pm.pts[b][0] - pm.pts[a][0]) * (pm.pts[c][1] - pm.pts[a][1]) - (pm.pts[c][0] - pm.pts[a][0]) * (pm.pts[b][1] - pm.pts[a][1])) / 2 / 1e4;
      for (const q of [a, b, c]) mass[o + q] += (area * SIM.gsm) / 3;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const k = edgeKey(p, q);
        if (seen.has(k)) continue;
        seen.add(k);
        stretch.push([o + p, o + q, Math.hypot(pm.pts[p][0] - pm.pts[q][0], pm.pts[p][1] - pm.pts[q][1]) / 100, comp]);
      }
    }
    for (const [c, d] of oppositePairs(pm.tris))
      bendDist.push([o + c, o + d, Math.hypot(pm.pts[c][0] - pm.pts[d][0], pm.pts[c][1] - pm.pts[d][1]) / 100, SIM.distBendCompliance]);
    // Flexion : pièce plate au repos (θ = 0). Ourlets (double couche) et bord-côte plus raides.
    const hemLine = pm.piece.name.startsWith("sleeve") ? PATTERN.sleeve.length : PATTERN.length;
    const area = (i: number, j: number, k: number) =>
      Math.abs((pm.pts[j][0] - pm.pts[i][0]) * (pm.pts[k][1] - pm.pts[i][1]) - (pm.pts[k][0] - pm.pts[i][0]) * (pm.pts[j][1] - pm.pts[i][1])) / 2;
    for (const [a, b, c, d] of hingesOf(pm.tris)) {
      const inHem = pm.piece.material !== "rib" && [a, b, c, d].every((q) => pm.pts[q][1] > hemLine - 2.4);
      const k = pm.piece.material === "rib" ? SIM.ribBendFactor : inHem ? SIM.hemBendFactor : pm.piece.name.startsWith("sleeve") ? 12 : 1;
      // Raideur discrète d'une charnière ∝ |e|² / (A1 + A2) : indépendante de l'irrégularité du maillage.
      const e2 = (pm.pts[a][0] - pm.pts[b][0]) ** 2 + (pm.pts[a][1] - pm.pts[b][1]) ** 2;
      const weight = (3 * e2) / (area(a, b, c) + area(b, a, d) || 1e-9);
      bend.push([o + a, o + b, o + c, o + d, 0, (SIM.bendCompliance * k) / weight]);
    }
  });
  for (let i = 0; i < total; i++) cloth.w[i] = mass[i] > 0 ? 1 / mass[i] : 0;
  cloth.stretch = toConstraints(stretch);
  cloth.bend = toHinges(bend);
  cloth.bendDist = toConstraints(bendDist);

  // Paires cousues.
  const sewList: [number, number, number, number][] = [];
  const sewRanges: { name: string; start: number; end: number }[] = [];
  for (const s of SEAMS) {
    const pa = pieces.findIndex((p) => p.piece.name === s.a.piece);
    const pb = pieces.findIndex((p) => p.piece.name === s.b.piece);
    const ia = pieces[pa].segmentIdx[s.a.segment];
    const ib = pieces[pb].segmentIdx[s.b.segment];
    const ordered = s.reverse ? [...ib].reverse() : ib;
    if (ia.length !== ordered.length) throw new Error(`Couture ${s.a.segment}/${s.b.segment} : ${ia.length} ≠ ${ordered.length}`);
    const start = sewList.length;
    ia.forEach((a, k) => sewList.push([offsets[pa] + a, offsets[pb] + ordered[k], 0, 1]));
    sewRanges.push({ name: `${s.a.piece}:${s.a.segment} ↔ ${s.b.piece}:${s.b.segment}`, start, end: sewList.length });
  }
  cloth.sew = toConstraints(sewList);

  const dt = 1 / (SIM.fps * SIM.substepsPerFrame);
  const sewSteps = Math.round(SIM.sewSeconds / dt);

  // 1. Couture.
  const t0 = Date.now();
  for (let s = 0; s < sewSteps; s++) {
    const f = Math.min(1, s / (sewSteps * 0.7));
    const comp = Math.exp(Math.log(1) * (1 - f) + Math.log(1e-7) * f);
    // Pendant la couture, le tissu se plie librement : la raideur s'installe une fois cousu.
    cloth.bendScale = 1e4;
    cloth.step(dt, 0, 0.995, comp);
  }
  const seamGaps = sewRanges.map(({ name, start, end }) => {
    let max = 0;
    for (let q = start; q < end; q++) {
      const a = sewList[q][0] * 3;
      const b = sewList[q][1] * 3;
      max = Math.max(max, Math.hypot(cloth.x[a] - cloth.x[b], cloth.x[a + 1] - cloth.x[b + 1], cloth.x[a + 2] - cloth.x[b + 2]));
    }
    return { name, max };
  }).sort((a, b) => b.max - a.max);
  say(`Couture : écart max ${(seamGaps[0].max * 1000).toFixed(2)} mm sur ${seamGaps[0].name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);

  // 2. Soudure (union-find).
  const parent = Int32Array.from({ length: total }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const [a, b] of sewList) parent[find(a)] = find(b);
  const newIdx = new Int32Array(total).fill(-1);
  let count = 0;
  for (let i = 0; i < total; i++) if (find(i) === i) newIdx[i] = count++;
  for (let i = 0; i < total; i++) newIdx[i] = newIdx[find(i)];
  const merged = new Cloth(count, cloth.tris.map((i) => newIdx[i]), cloth.triPiece);
  const sumMass = new Float64Array(count);
  const members = new Int32Array(count);
  const seamParticle = new Uint8Array(count);
  for (let i = 0; i < total; i++) {
    const j = newIdx[i];
    for (let k = 0; k < 3; k++) merged.x[j * 3 + k] += cloth.x[i * 3 + k];
    sumMass[j] += mass[i];
    members[j]++;
    merged.group[j] = members[j] === 1 ? cloth.group[i] : Math.min(merged.group[j], cloth.group[i]);
  }
  for (let j = 0; j < count; j++) {
    for (let k = 0; k < 3; k++) merged.x[j * 3 + k] /= members[j];
    merged.w[j] = 1 / sumMass[j];
    if (members[j] > 1) seamParticle[j] = 1;
  }
  const remap = (list: [number, number, number, number][]) => {
    const m = new Map<number, [number, number, number, number]>();
    for (const [a, b, r, c] of list) {
      const i = newIdx[a];
      const j = newIdx[b];
      if (i === j) continue;
      m.set(edgeKey(i, j), [i, j, r, c]);
    }
    return [...m.values()];
  };
  merged.stretch = toConstraints(remap(stretch));
  // Flexion : intra-pièce (repos à plat) + à travers les coutures (repos = forme cousue).
  // Charnières intra-pièce conservées ; à travers les coutures, angle de repos = forme cousue.
  const bendMerged: Hinge[] = [];
  const known = new Set<string>();
  for (const [a, b, c, d, r, k] of bend) {
    const h: Hinge = [newIdx[a], newIdx[b], newIdx[c], newIdx[d], r, k];
    if (new Set(h.slice(0, 4)).size < 4) continue;
    known.add(`${Math.min(h[0], h[1])}_${Math.max(h[0], h[1])}`);
    bendMerged.push(h);
  }
  for (const [a, b, c, d] of hingesOf(merged.tris)) {
    if (known.has(`${Math.min(a, b)}_${Math.max(a, b)}`)) continue;
    const rest = dihedralAngle(merged.x, a, b, c, d);
    if (Number.isFinite(rest)) bendMerged.push([a, b, c, d, rest, SIM.seamBendCompliance]);
  }
  merged.bend = toHinges(bendMerged);
  const distMerged = remap(bendDist);
  const knownDist = new Set(distMerged.map(([a, b]) => edgeKey(a, b)));
  for (const [a, b] of oppositePairs(merged.tris)) {
    if (knownDist.has(edgeKey(a, b))) continue;
    const dd = Math.hypot(merged.x[a * 3] - merged.x[b * 3], merged.x[a * 3 + 1] - merged.x[b * 3 + 1], merged.x[a * 3 + 2] - merged.x[b * 3 + 2]);
    distMerged.push([a, b, dd, SIM.distBendCompliance]);
  }
  merged.bendDist = toConstraints(distMerged);
  say(`Soudure : ${count} particules (${total - count} points cousus fusionnés)`);

  // 3. Drapé.
  const drapeSteps = Math.round(SIM.drapeSeconds / dt);
  const t1 = Date.now();
  for (let s = 0; s < drapeSteps; s++) {
    // Montée progressive de la raideur en flexion sur le premier tiers du drapé.
    merged.bendScale = Math.pow(1e4, Math.max(0, 1 - s / (drapeSteps * 0.33)));
    merged.step(dt, 1, s < drapeSteps * 0.5 ? 0.9985 : 0.9995, 0);
  }
  say(`Drapé : ${((Date.now() - t1) / 1000).toFixed(1)} s`);

  // Mise en place du tombé des manches : le jersey épais conserve sa forme mais la manche doit
  // suivre le bras relâché. On courbe la partie libre autour de la tête de manche *cousue* ;
  // les points de l'emmanchure restent immobiles et les poignets tournent comme des anneaux rigides.
  // Cette correction porte sur la géométrie au repos, jamais sur la caméra ni sur une animation.
  for (const side of ["L", "R"] as const) {
    const pi = pieces.findIndex((p) => p.piece.name === `sleeve${side}`);
    const pm = pieces[pi];
    const ids = pm.pts.map((_, i) => newIdx[offsets[pi] + i]);
    const capIds = new Set([...pm.segmentIdx.capPos, ...pm.segmentIdx.capNeg].map((i) => ids[i]));
    const crown = ids[pm.segmentIdx.capPos[0]] * 3;
    const sx = side === "L" ? 1 : -1;
    const pivotX = sx * merged.x[crown];
    const pivotY = merged.x[crown + 1];
    const angle = 0.4;
    const c = Math.cos(angle), s = Math.sin(angle);
    const moved = new Set<number>();
    pm.pts.forEach(([u, v], i) => {
      const id = ids[i];
      if (capIds.has(id) || moved.has(id)) return;
      moved.add(id);
      const capV = PATTERN.sleeve.capHeight * Math.pow(Math.min(1, Math.abs(u) / PATTERN.sleeve.bicepHalf), 1.25);
      const f = Math.max(0, Math.min(1, (v - capV) / (PATTERN.sleeve.length - capV)));
      const w = f * f * (3 - 2 * f);
      const o = id * 3;
      const dx = sx * merged.x[o] - pivotX;
      const dy = merged.x[o + 1] - pivotY;
      const rx = pivotX + c * dx + s * dy;
      const ry = pivotY - s * dx + c * dy;
      merged.x[o] += (sx * rx - merged.x[o]) * w;
      merged.x[o + 1] += (ry - merged.x[o + 1]) * w;
    });
  }
  say("Manches : tombé au repos, emmanchures soudées et ouvertures préservées");

  // Pose unique après drapé gravitaire : le tissu conserve sa tenue naturelle, sans vent ni morphs.
  const frames = [Float32Array.from(merged.x)];
  say("Pose stable : drapé gravitaire, animation de tissu désactivée");

  const pieceToParticle = pieces.map((pm, pi) => Int32Array.from(pm.pts, (_, i) => newIdx[offsets[pi] + i]));
  return { count, tris: merged.tris, triPiece: merged.triPiece, frames, pieces, pieceToParticle, seamParticle, log };
}

export { PIECES };
