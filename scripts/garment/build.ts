/**
 * Génère public/models/faron-veil.glb (+ -lite) et faron-veil.report.json.
 *   npm run build:garment          (la simulation est mise en cache dans scripts/garment/.cache)
 *   npm run build:garment -- --resim
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Document, NodeIO, type Material, type Texture } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRMaterialsSheen, KHRMaterialsSpecular } from "@gltf-transform/extensions";
import { meshopt, prune } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import { meshPieces, RIB_LENGTH, neckLengths } from "./pattern";
import { buildRenderMesh, MATERIALS, type MaterialName, type RenderMesh } from "./render";
import { simulate, type SimResult } from "./sim";
import { BODY, HEM_Y, LODS, PATTERN, SIM, TECH_PACK, type Lod } from "./spec";
import { bakeTextures } from "./textures";
import { bakePanelPrint } from "./motif";

const ROOT = process.cwd();
const OUT = join(ROOT, "public", "models");
const CACHE = join(ROOT, "scripts", "garment", ".cache");

// ——— Cache de simulation ——————————————————————————————————————————————

function simHash() {
  const h = createHash("sha1");
  h.update(JSON.stringify({ PATTERN, BODY, SIM, TECH_PACK }));
  for (const f of ["sim.ts", "pattern.ts", "body.ts"]) h.update(readFileSync(join(ROOT, "scripts", "garment", f)));
  return h.digest("hex").slice(0, 12);
}

function loadOrSimulate(force: boolean): SimResult {
  const hash = simHash();
  const meta = join(CACHE, `sim-${hash}.json`);
  const bin = join(CACHE, `sim-${hash}.bin`);
  if (!force && existsSync(meta) && existsSync(bin)) {
    const m = JSON.parse(readFileSync(meta, "utf8"));
    const buf = readFileSync(bin);
    const data = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    const frames = Array.from({ length: m.frames }, (_, f) => data.slice(f * m.count * 3, (f + 1) * m.count * 3));
    console.log(`Simulation en cache (${hash}) : ${m.count} particules, ${m.frames} images`);
    return {
      count: m.count,
      tris: Uint32Array.from(m.tris),
      triPiece: Uint8Array.from(m.triPiece),
      frames,
      pieces: meshPiecesOriented(m.pieceTris),
      pieceToParticle: m.pieceToParticle.map((a: number[]) => Int32Array.from(a)),
      seamParticle: Uint8Array.from(m.seamParticle),
      log: m.log,
    };
  }
  const r = simulate((msg) => console.log("  " + msg));
  // Une simulation instable ne doit jamais produire de GLB (ni être mise en cache).
  if (r.frames.some((f) => f.some((v) => !Number.isFinite(v)))) throw new Error("Simulation instable : positions non finies, GLB non exporté.");
  mkdirSync(CACHE, { recursive: true });
  const all = new Float32Array(r.frames.length * r.count * 3);
  r.frames.forEach((f, i) => all.set(f, i * r.count * 3));
  writeFileSync(bin, Buffer.from(all.buffer));
  writeFileSync(
    meta,
    JSON.stringify({
      count: r.count,
      frames: r.frames.length,
      tris: Array.from(r.tris),
      triPiece: Array.from(r.triPiece),
      pieceTris: r.pieces.map((p) => p.tris),
      pieceToParticle: r.pieceToParticle.map((a) => Array.from(a)),
      seamParticle: Array.from(r.seamParticle),
      log: r.log,
    }),
  );
  return r;
}

/** Les pièces sont déterministes ; seule l'orientation des triangles vient de la simulation. */
function meshPiecesOriented(pieceTris: number[][]) {
  return meshPieces().map((pm, i) => ({ ...pm, tris: pieceTris[i] }));
}

// ——— Compression de l'animation (ACP) ————————————————————————————————————

/** Valeurs/vecteurs propres d'une matrice symétrique (Jacobi cyclique). */
function jacobi(A: Float64Array, n: number) {
  const V = new Float64Array(n * n);
  for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p * n + q] ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++)
      for (let q = p + 1; q < n; q++) {
        const apq = A[p * n + q];
        if (Math.abs(apq) < 1e-30) continue;
        const theta = (A[q * n + q] - A[p * n + p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k * n + p];
          const akq = A[k * n + q];
          A[k * n + p] = c * akp - s * akq;
          A[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p * n + k];
          const aqk = A[q * n + k];
          A[p * n + k] = c * apk - s * aqk;
          A[q * n + k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k * n + p];
          const vkq = V[k * n + q];
          V[k * n + p] = c * vkp - s * vkq;
          V[k * n + q] = s * vkp + c * vkq;
        }
      }
  }
  const vals = Array.from({ length: n }, (_, i) => A[i * n + i]);
  return { vals, V };
}

function compress(rm: RenderMesh) {
  const F = rm.frames.length;
  const D = rm.count * 3;
  if (F === 1) {
    return { mean: rm.frames[0], meanN: rm.normals[0], targets: [], normalTargets: [], weights: [], K: 0, energy: 1, maxErr: 0, frames: 1 };
  }
  const mean = new Float32Array(D);
  for (const f of rm.frames) for (let k = 0; k < D; k++) mean[k] += f[k] / F;
  const X = rm.frames.map((f) => {
    const x = new Float64Array(D);
    for (let k = 0; k < D; k++) x[k] = f[k] - mean[k];
    return x;
  });
  const Gm = new Float64Array(F * F);
  for (let i = 0; i < F; i++)
    for (let j = i; j < F; j++) {
      let s = 0;
      const a = X[i];
      const b = X[j];
      for (let k = 0; k < D; k++) s += a[k] * b[k];
      Gm[i * F + j] = s;
      Gm[j * F + i] = s;
    }
  const { vals, V } = jacobi(Gm, F);
  const order = vals.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const total = vals.reduce((a, b) => a + Math.max(0, b), 0);
  let acc = 0;
  let K = 0;
  for (const [v] of order) {
    if (K >= 12 || acc / total > 0.9985) break;
    acc += v;
    K++;
  }
  const targets: Float32Array[] = [];
  const weights: Float32Array[] = [];
  for (let k = 0; k < K; k++) {
    const [lam, idx] = order[k];
    const sig = Math.sqrt(lam);
    const u = Array.from({ length: F }, (_, f) => V[f * F + idx]);
    const basis = new Float64Array(D);
    for (let f = 0; f < F; f++) for (let d = 0; d < D; d++) basis[d] += (X[f][d] * u[f]) / sig;
    const w = u.map((x) => x * sig);
    const s = Math.max(...w.map(Math.abs));
    targets.push(Float32Array.from(basis, (x) => x * s));
    weights.push(Float32Array.from(w, (x) => x / s));
  }
  // Erreur de reconstruction.
  let maxErr = 0;
  for (let f = 0; f < F; f++)
    for (let d = 0; d < D; d += 3) {
      let ex = X[f][d];
      let ey = X[f][d + 1];
      let ez = X[f][d + 2];
      for (let k = 0; k < K; k++) {
        ex -= weights[k][f] * targets[k][d];
        ey -= weights[k][f] * targets[k][d + 1];
        ez -= weights[k][f] * targets[k][d + 2];
      }
      maxErr = Math.max(maxErr, Math.hypot(ex, ey, ez));
    }
  // Normales : base moyenne + régression linéaire sur les mêmes poids.
  const meanN = new Float32Array(D);
  for (const n of rm.normals) for (let k = 0; k < D; k++) meanN[k] += n[k] / F;
  for (let k = 0; k < D; k += 3) {
    const l = Math.hypot(meanN[k], meanN[k + 1], meanN[k + 2]) || 1;
    meanN[k] /= l;
    meanN[k + 1] /= l;
    meanN[k + 2] /= l;
  }
  const WtW = new Float64Array(K * K);
  for (let a = 0; a < K; a++) for (let b = 0; b < K; b++) for (let f = 0; f < F; f++) WtW[a * K + b] += weights[a][f] * weights[b][f];
  const inv = invert(WtW, K);
  const normalTargets = Array.from({ length: K }, () => new Float32Array(D));
  for (let f = 0; f < F; f++) {
    const coef = Array.from({ length: K }, (_, a) => {
      let s = 0;
      for (let b = 0; b < K; b++) s += inv[a * K + b] * weights[b][f];
      return s;
    });
    const n = rm.normals[f];
    for (let d = 0; d < D; d++) {
      const delta = n[d] - meanN[d];
      for (let a = 0; a < K; a++) normalTargets[a][d] += coef[a] * delta;
    }
  }
  return { mean, meanN, targets, normalTargets, weights, K, energy: acc / total, maxErr, frames: F };
}

function invert(M: Float64Array, n: number) {
  const A = Float64Array.from(M);
  const I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r * n + c]) > Math.abs(A[p * n + c])) p = r;
    for (let k = 0; k < n; k++) {
      [A[c * n + k], A[p * n + k]] = [A[p * n + k], A[c * n + k]];
      [I[c * n + k], I[p * n + k]] = [I[p * n + k], I[c * n + k]];
    }
    const d = A[c * n + c] || 1e-12;
    for (let k = 0; k < n; k++) {
      A[c * n + k] /= d;
      I[c * n + k] /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r * n + c];
      for (let k = 0; k < n; k++) {
        A[r * n + k] -= f * A[c * n + k];
        I[r * n + k] -= f * I[c * n + k];
      }
    }
  }
  return I;
}

// ——— Matériaux ————————————————————————————————————————————————————————

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hex = (h: string): [number, number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [srgbToLinear(((n >> 16) & 255) / 255), srgbToLinear(((n >> 8) & 255) / 255), srgbToLinear((n & 255) / 255), 1];
};

type Textures = ReturnType<typeof bakeTextures> & { panelPrint: Uint8Array };

function makeMaterials(doc: Document, tex: Textures) {
  const sheenExt = doc.createExtension(KHRMaterialsSheen);
  const specExt = doc.createExtension(KHRMaterialsSpecular);
  const texture = (name: string, data: Uint8Array): Texture => doc.createTexture(name).setImage(data).setMimeType("image/png");
  const t = Object.fromEntries(Object.entries(tex).map(([k, v]) => [k, texture(k, v)])) as Record<keyof typeof tex, Texture>;

  const fabric = (name: string, color: string, o: { sheen: string; sheenRough: number; rough: number; spec: number; doubleSided?: boolean }) => {
    const m = doc.createMaterial(name).setBaseColorFactor(hex(color)).setRoughnessFactor(o.rough).setMetallicFactor(0).setDoubleSided(o.doubleSided ?? false);
    m.setExtension("KHR_materials_sheen", sheenExt.createSheen().setSheenColorFactor(hex(o.sheen).slice(0, 3) as [number, number, number]).setSheenRoughnessFactor(o.sheenRough));
    m.setExtension("KHR_materials_specular", specExt.createSpecular().setSpecularFactor(o.spec));
    return m;
  };

  const mats: Record<MaterialName, Material> = {
    // Jersey 280 g/m² noir mat, non métallique : duvet (sheen) sombre et diffus, spéculaire minimal. Un sheen plus clair
    // voilait de gris les faces vues en incidence rasante (profils, dos en contre-jour).
    jersey: fabric("Jersey coton 280 g/m²", "#141416", { sheen: "#393a40", sheenRough: 0.8, rough: 0.97, spec: 0.12 })
      .setBaseColorTexture(t.jerseyColor)
      .setNormalTexture(t.jerseyNormal)
      .setNormalScale(1.0),
    rib: fabric("Bord-côte 1x1", "#141416", { sheen: "#3c3d43", sheenRough: 0.72, rough: 0.94, spec: 0.15 }).setNormalTexture(t.ribNormal).setNormalScale(1.35),
    panel: fabric("Micro-mesh panneau", "#242428", { sheen: "#42434a", sheenRough: 0.78, rough: 0.94, spec: 0.12 })
      .setBaseColorTexture(t.panelColor)
      .setNormalTexture(t.panelNormal)
      .setNormalScale(1.12)
      .setAlphaMode("BLEND"),
    // Ornements géométriques des panneaux : encre gris argent légèrement bronzée, satinée plutôt que chrome.
    panelPrint: doc
      .createMaterial("Impression panneau métallisée")
      .setBaseColorFactor([1, 1, 1, 1])
      .setBaseColorTexture(t.panelPrint)
      .setMetallicFactor(0.12)
      .setRoughnessFactor(0.72)
      .setAlphaMode("BLEND"),
    // Dos : métal brossé satiné (ni miroir ni chrome).
    metalEmblem: doc
      .createMaterial("Ø dos métal brossé")
      .setBaseColorFactor([0.8, 0.81, 0.84, 1])
      .setBaseColorTexture(t.backEmblemColor)
      .setNormalTexture(t.backEmblemNormal)
      .setNormalScale(0.7)
      .setMetallicFactor(0.88)
      .setRoughnessFactor(0.42)
      .setAlphaMode("BLEND"),
    metalWordmark: doc
      .createMaterial("FARØN col dos métal brossé")
      .setBaseColorFactor([0.8, 0.81, 0.84, 1])
      .setBaseColorTexture(t.backWordmarkColor)
      .setNormalTexture(t.backWordmarkNormal)
      .setNormalScale(0.5)
      .setMetallicFactor(0.85)
      .setRoughnessFactor(0.45)
      .setAlphaMode("BLEND"),
    thread: fabric("Fil de surpiqûre", "#36363c", { sheen: "#64656e", sheenRough: 0.45, rough: 0.62, spec: 0.35 })
      .setBaseColorTexture(t.threadColor)
      .setNormalTexture(t.threadNormal)
      .setAlphaMode("MASK")
      .setAlphaCutoff(0.5),
    embroidery: fabric("Broderie Ø argent mat", "#ffffff", { sheen: "#9a9ca4", sheenRough: 0.4, rough: 0.55, spec: 0.35 })
      .setBaseColorTexture(t.embroideryColor)
      .setNormalTexture(t.embroideryNormal)
      .setAlphaMode("MASK")
      .setAlphaCutoff(0.4),
    labelHem: fabric("Étiquette FARØN", "#ffffff", { sheen: "#4a4b54", sheenRough: 0.6, rough: 0.8, spec: 0.3 })
      .setBaseColorTexture(t.labelHem)
      .setNormalTexture(t.labelNormal)
      .setNormalScale(0.4),
    labelSleeve: fabric("Étiquette manche Ø", "#ffffff", { sheen: "#4a4b54", sheenRough: 0.6, rough: 0.8, spec: 0.3, doubleSided: true })
      .setBaseColorTexture(t.labelSleeve)
      .setNormalTexture(t.labelNormal)
      .setNormalScale(0.4),
  };
  return mats;
}

// ——— Export ————————————————————————————————————————————————————————————

const CLOTH: MaterialName[] = ["jersey", "panel", "rib"];

async function exportLod(lod: Lod, rm: RenderMesh, c: ReturnType<typeof compress>, tex: Textures) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = "FARØN garment builder — PROJECT 001 VEIL (cloth simulation)";
  const buffer = doc.createBuffer();
  const mats = makeMaterials(doc, tex);
  const mesh = doc.createMesh("VEIL").setWeights(new Array(c.K).fill(0));
  const acc = (name: string, type: "VEC3" | "VEC2" | "SCALAR", array: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer>) =>
    doc.createAccessor(name).setType(type).setArray(array).setBuffer(buffer);

  await MeshoptSimplifier.ready;
  let triangles = 0;
  for (const name of MATERIALS) {
    let idx = rm.tris.filter((t) => t.m === name).flatMap((t) => [t.a, t.b, t.c]);
    if (!idx.length) continue;
    if (lod !== "high" && CLOTH.includes(name)) {
      const [simple] = MeshoptSimplifier.simplify(Uint32Array.from(idx), c.mean, 3, Math.floor((idx.length * LODS[lod].simplify) / 3) * 3, 0.004, ["LockBorder"]);
      idx = Array.from(simple);
    }
    const remap = new Map<number, number>();
    const order: number[] = [];
    const local = idx.map((i) => {
      if (!remap.has(i)) {
        remap.set(i, order.length);
        order.push(i);
      }
      return remap.get(i)!;
    });
    triangles += local.length / 3;
    const pick = (src: ArrayLike<number>, size: number) => {
      const o = new Float32Array(order.length * size);
      order.forEach((i, k) => {
        for (let j = 0; j < size; j++) o[k * size + j] = src[i * size + j];
      });
      return o;
    };
    const color = new Float32Array(order.length * 3);
    order.forEach((i, k) => color.fill(rm.ao[i], k * 3, k * 3 + 3));
    const prim = doc
      .createPrimitive()
      .setMaterial(mats[name])
      .setIndices(acc(`${name}_idx`, "SCALAR", order.length > 65535 ? Uint32Array.from(local) : Uint16Array.from(local)))
      .setAttribute("POSITION", acc(`${name}_pos`, "VEC3", pick(c.mean, 3)))
      .setAttribute("NORMAL", acc(`${name}_nrm`, "VEC3", pick(c.meanN, 3)))
      .setAttribute("TEXCOORD_0", acc(`${name}_uv`, "VEC2", pick(rm.uv, 2)))
      .setAttribute("COLOR_0", acc(`${name}_ao`, "VEC3", color));
    mesh.addPrimitive(prim);
  }
  const node = doc.createNode("FARON_VEIL").setMesh(mesh);
  doc.createScene("Scene").addChild(node);

  await MeshoptEncoder.ready;
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium" }));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const file = join(OUT, lod === "high" ? "faron-veil.glb" : "faron-veil-lite.glb");
  writeFileSync(file, await io.writeBinary(doc));
  return { lod, file: file.split("/public/")[1], kb: Math.round(statSync(file).size / 1024), triangles };
}

/** Mesures sur la pose moyenne drapée. */
function measure(sim: SimResult, mean: Float32Array) {
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < sim.count; i++) {
    const y = sim.frames[0][i * 3 + 1];
    yMin = Math.min(yMin, y);
    yMax = Math.max(yMax, y);
  }
  void mean;
  return {
    "Ourlet porté (y, m)": Math.round(yMin * 1000) / 1000,
    "Remontée de l'ourlet sur le corps (cm)": Math.round((yMin - HEM_Y) * 1000) / 10,
    "Haut du bord-côte (y, m)": Math.round(yMax * 1000) / 1000,
    "Encolure devant + dos (cm)": Math.round((neckLengths.front + 2 * neckLengths.backHalf) * 10) / 10,
    "Bord-côte (cm, 100 % de l'encolure)": Math.round(RIB_LENGTH * 10) / 10,
  };
}

/** Points de vue de la visionneuse, calculés sur le vêtement drapé (src/components/three/shirt). */
function writeViewpoints(L: RenderMesh["landmarks"]) {
  const r3 = (v: number[]) => v.map((x) => Math.round(x * 1000) / 1000);
  const shot = (name: keyof typeof L, dist: number, lift = 0.04, side = 0) => {
    const { p, n } = L[name];
    return { target: r3(p), position: r3([p[0] + n[0] * dist + side, p[1] + n[1] * dist + lift, p[2] + n[2] * dist]) };
  };
  const center = [0, (L.collar.p[1] + L.hem.p[1]) / 2, 0];
  const views = {
    front: { target: r3(center), position: r3([0, center[1] + 0.03, 2.0]) },
    back: { target: r3(center), position: r3([0, center[1] + 0.03, -2.0]) },
    collar: shot("collar", 0.42, 0.2),
    emblem: shot("emblem", 0.24, 0.02),
    sleeve: shot("sleeve", 0.55, 0.05, 0.08),
    cuff: shot("cuff", 0.28, 0.02),
    panel: shot("panel", 0.5, 0.03),
    hem: shot("hem", 0.34, 0.05),
    backLogo: shot("backLogo", 0.7, 0.05),
    backNeckLogo: shot("backNeckLogo", 0.26, 0.04),
  };
  writeFileSync(join(ROOT, "src/components/three/shirt/viewpoints.json"), JSON.stringify(views, null, 2) + "\n");
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const sim = loadOrSimulate(process.argv.includes("--resim"));
  console.log("Maillage de rendu…");
  const rm = buildRenderMesh(sim);
  console.log(`  ${rm.count} sommets, ${rm.tris.length} triangles, ${rm.frames.length} images`);
  const c = compress(rm);
  console.log(`  ACP : ${c.K} composantes, ${(c.energy * 100).toFixed(2)} % du mouvement, erreur max ${(c.maxErr * 1000).toFixed(2)} mm`);
  const tex = { ...bakeTextures(join(ROOT, "public/brand/faron-emblem-512.png"), join(ROOT, "public/brand/faron-wordmark.png")), panelPrint: bakePanelPrint() };
  const files = [];
  for (const lod of Object.keys(LODS) as Lod[]) files.push(await exportLod(lod, rm, c, tex));
  const report = {
    method: "Patron 2D (tech pack v0.5) cousu et drapé par simulation XPBD sur mannequin invisible; pose statique",
    pattern: PATTERN,
    simulation: sim.log,
    motion: { mode: "static", morphTargets: 0 },
    model: measure(sim, c.mean),
    files,
  };
  writeFileSync(join(OUT, "faron-veil.report.json"), JSON.stringify(report, null, 2));
  writeViewpoints(rm.landmarks);
  console.log(JSON.stringify(report.model, null, 1));
  console.table(files);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
