import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

/**
 * Textures du GLB, générées de façon déterministe (aucune image inventée) :
 * mailles et fils sont procéduraux ; broderie et étiquettes reprennent à l'identique
 * les fichiers officiels FARØN (emblème Ø et mot-symbole).
 */

export type Img = { w: number; h: number; data: Uint8Array };

export const encode = (img: Img) => {
  const png = new PNG({ width: img.w, height: img.h });
  png.data = Buffer.from(img.data);
  return new Uint8Array(PNG.sync.write(png, { colorType: 6 }));
};

function create(w: number, h: number): Img {
  return { w, h, data: new Uint8Array(w * h * 4) };
}

function load(path: string): Img {
  const png = PNG.sync.read(readFileSync(path));
  return { w: png.width, h: png.height, data: new Uint8Array(png.data) };
}

/** Échantillonnage bilinéaire RGBA (0..1). */
function sample(img: Img, u: number, v: number) {
  const x = Math.min(img.w - 1.001, Math.max(0, u * img.w - 0.5));
  const y = Math.min(img.h - 1.001, Math.max(0, v * img.h - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const px = (xx: number, yy: number, k: number) => img.data[(yy * img.w + xx) * 4 + k] / 255;
  return [0, 1, 2, 3].map(
    (k) =>
      px(x0, y0, k) * (1 - fx) * (1 - fy) + px(x0 + 1, y0, k) * fx * (1 - fy) + px(x0, y0 + 1, k) * (1 - fx) * fy + px(x0 + 1, y0 + 1, k) * fx * fy,
  );
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Bruit de valeur périodique (période px × py cellules). */
function periodicNoise(u: number, v: number, px: number, py: number) {
  const x = u * px;
  const y = v * py;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const h = (a: number, b: number) => hash(((a % px) + px) % px, ((b % py) + py) % py);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return (h(xi, yi) * (1 - sx) + h(xi + 1, yi) * sx) * (1 - sy) + (h(xi, yi + 1) * (1 - sx) + h(xi + 1, yi + 1) * sx) * sy;
}

/** Carte de normales (espace tangent glTF, +Y vers le haut de l'image inversé) depuis une hauteur. */
function normalFromHeight(w: number, h: number, height: Float32Array, strength: number, wrap = true): Img {
  const img = create(w, h);
  const H = (x: number, y: number) => {
    if (wrap) return height[((y + h) % h) * w + ((x + w) % w)];
    return height[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
      const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(((-dx / l) * 0.5 + 0.5) * 255);
      img.data[i + 1] = Math.round(((dy / l) * 0.5 + 0.5) * 255);
      img.data[i + 2] = Math.round(((1 / l) * 0.5 + 0.5) * 255);
      img.data[i + 3] = 255;
    }
  }
  return img;
}

function grey(w: number, h: number, f: (u: number, v: number) => number, alpha?: (u: number, v: number) => number): Img {
  const img = create(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = (x + 0.5) / w;
      const v = (y + 0.5) / h;
      const g = Math.round(Math.min(1, Math.max(0, f(u, v))) * 255);
      const i = (y * w + x) * 4;
      img.data.set([g, g, g, alpha ? Math.round(Math.min(1, Math.max(0, alpha(u, v))) * 255) : 255], i);
    }
  }
  return img;
}

function heightField(w: number, h: number, f: (u: number, v: number) => number) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = f((x + 0.5) / w, (y + 0.5) / h);
  return out;
}

// ——— Jersey 280 g/m² : mailles endroit en V ———————————————————————————————

const WALES = 24;
const COURSES = 36;

function jerseyHeight(u: number, v: number) {
  const cu = u * WALES;
  const cv = v * COURSES;
  const iu = Math.floor(cu);
  const iv = Math.floor(cv);
  let hgt = 0;
  // Chaque maille = deux jambes inclinées formant un V ; on teste les cellules voisines (débords).
  for (let dv = -1; dv <= 1; dv++) {
    for (const leg of [-1, 1]) {
      const cx = iu + 0.5 + leg * 0.2;
      const cy = iv + dv + 0.5;
      const lu = cu - cx;
      const lv = (cv - cy) * 0.75;
      const a = leg * 0.42;
      const x = lu * Math.cos(a) - lv * Math.sin(a);
      const y = lu * Math.sin(a) + lv * Math.cos(a);
      const r = (x / 0.22) ** 2 + (y / 0.6) ** 2;
      if (r < 1) {
        const jitter = 0.85 + 0.3 * hash((iu + WALES) % WALES, (iv + dv + COURSES) % COURSES);
        const twist = 0.92 + 0.08 * Math.sin((y + x * 0.4) * 22);
        hgt = Math.max(hgt, Math.sqrt(1 - r) * jitter * twist);
      }
    }
  }
  const fibre = periodicNoise(u, v, 96, 96) * 0.12;
  return hgt + fibre;
}

// ——— Bord-côte 1×1 ——————————————————————————————————————————————————————

function ribHeight(u: number, v: number) {
  const wales = 6; // 6 côtes par tuile de 1 cm
  const x = u * wales * 2;
  const k = Math.floor(x);
  const f = x - k;
  const knit = k % 2 === 0;
  const prof = knit ? Math.sin(f * Math.PI) ** 0.7 : 0.25 * Math.sin(f * Math.PI);
  const loops = knit ? 0.88 + 0.12 * Math.abs(Math.sin(v * 18 * Math.PI)) : 1;
  return prof * loops + periodicNoise(u, v, 64, 64) * 0.06;
}

// ——— Micro-mesh des panneaux ————————————————————————————————————————————

export function meshHole(u: number, v: number) {
  const n = 8;
  const x = u * n;
  const y = v * n * 1.15;
  const row = Math.floor(y);
  const xs = x + (row % 2) * 0.5;
  const fx = xs - Math.floor(xs) - 0.5;
  const fy = y - row - 0.5;
  const d = Math.hypot(fx, fy * 0.9);
  return 1 - Math.min(1, Math.max(0, (d - 0.2) / 0.12));
}

// ——— Fil de surpiqûre ———————————————————————————————————————————————————

/** Un point de surpiqûre par tuile (u), fil bombé et torsadé (v en travers). */
function threadShape(u: number, v: number) {
  const len = 0.74;
  const along = u / len;
  if (along > 1) return 0;
  const end = Math.min(along, 1 - along) / 0.18;
  const across = 1 - ((v - 0.5) / 0.45) ** 2;
  return Math.max(0, Math.min(1, end)) * Math.max(0, across);
}

// ——— Broderie et étiquettes (fichiers officiels) ————————————————————————

function embroidery(emblemPath: string) {
  const src = load(emblemPath);
  const S = 256;
  const alphaAt = (u: number, v: number) => {
    const [r, g, b, a] = sample(src, u, v);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return { a: a * Math.min(1, Math.max(0, (lum - 0.05) / 0.15)), lum };
  };
  // Point lancé (satin) orienté à 45°, fil gris argent mat — sans effet chrome (tech pack).
  const satin = (u: number, v: number) => 0.86 + 0.14 * Math.sin((u * 0.7 + v) * 210);
  const color = create(S, S);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const v = (y + 0.5) / S;
      const { a, lum } = alphaAt(u, v);
      const tone = (0.5 + 0.5 * lum) * satin(u, v);
      const i = (y * S + x) * 4;
      color.data.set([Math.round(164 * tone), Math.round(166 * tone), Math.round(172 * tone), Math.round(a * 255)], i);
      hgt[y * S + x] = a * (0.8 + 0.2 * satin(u, v));
    }
  }
  // Relief : hauteur adoucie (le fil bombe au-dessus du jersey).
  const blurred = blur(hgt, S, S, 2);
  return { color: encode(color), normal: encode(normalFromHeight(S, S, blurred, 4, false)) };
}

function blur(src: Float32Array, w: number, h: number, r: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        s += src[y * w + xx];
        n++;
      }
      tmp[y * w + x] = s / n;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let k = -r; k <= r; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        s += tmp[yy * w + x];
        n++;
      }
      out[y * w + x] = s / n;
    }
  return out;
}

/** Fond tissé noir commun aux étiquettes. */
const weave = (u: number, v: number, w: number, h: number) => 0.05 + 0.015 * (Math.floor(v * h / 3) % 2) + 0.01 * periodicNoise(u, v, w / 4, h / 4);

function stamp(dst: Img, src: Img, cx: number, cy: number, width: number, rgb: [number, number, number], opacity = 1) {
  const height = (width * src.h) / src.w;
  const x0 = Math.round(cx - width / 2);
  const y0 = Math.round(cy - height / 2);
  for (let y = 0; y < Math.round(height); y++) {
    for (let x = 0; x < Math.round(width); x++) {
      const [, , , a] = sample(src, (x + 0.5) / width, (y + 0.5) / height);
      const i = ((y0 + y) * dst.w + (x0 + x)) * 4;
      if (i < 0 || i >= dst.data.length || a <= 0) continue;
      for (let k = 0; k < 3; k++) dst.data[i + k] = Math.round(dst.data[i + k] * (1 - a * opacity) + rgb[k] * a * opacity);
    }
  }
}

function labels(wordmarkPath: string, emblemPath: string) {
  const wordmark = load(wordmarkPath);
  const emblem = load(emblemPath);
  // Étiquette de bas 40 × 12 mm.
  const hem = grey(640, 192, (u, v) => weave(u, v, 640, 192));
  for (let y = 0; y < 192; y++)
    for (let x = 0; x < 640; x++) {
      const edge = Math.min(x, 639 - x, y, 191 - y);
      if (edge < 8) hem.data.fill(Math.round(255 * (0.075 - edge * 0.002)), (y * 640 + x) * 4, (y * 640 + x) * 4 + 3);
    }
  stamp(hem, wordmark, 320, 96, 400, [142, 144, 150]);
  // Étiquette de manche : 15 mm dehors (Ø), pli, 9 mm dedans.
  const sleeve = grey(224, 448, (u, v) => weave(u, v, 224, 448));
  stamp(sleeve, emblem, 112, 112, 150, [154, 156, 162]);
  const labelNormal = normalFromHeight(
    128,
    128,
    heightField(128, 128, (u, v) => 0.5 + 0.5 * Math.sin(v * 128 * Math.PI * 0.66) * 0.4 + periodicNoise(u, v, 32, 32) * 0.2),
    1.5,
  );
  return { hem: encode(hem), sleeve: encode(sleeve), normal: encode(labelNormal) };
}

/**
 * Logos de dos en métal brossé (fichiers officiels) : stries horizontales fines, léger relief du bord.
 * Aucun effet chrome : la finition satinée vient du matériau (métallique 0,88, rugosité ~0,4).
 * `shading` conserve une part du modelé de l'image source (croissant de l'emblème Ø).
 */
function brushedMetal(path: string, W: number, shading: number) {
  const src = load(path);
  const H = Math.round((W * src.h) / src.w);
  const color = create(W, H);
  const height = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    // Brossage horizontal : une valeur par rangée, à peine modulée le long de x (compresse bien).
    const row = hash(y * 1.7, 3.1);
    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;
      const v = (y + 0.5) / H;
      const [r, g, b, a0] = sample(src, u, v);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const a = shading > 0 ? a0 * Math.min(1, Math.max(0, (lum - 0.05) / 0.15)) : a0;
      const streak = 0.75 * row + 0.25 * periodicNoise(u * 2, v, 6, H);
      height[y * W + x] = a * (0.9 + 0.1 * streak);
      const tone = (0.86 + 0.14 * streak) * (1 - shading + shading * (0.55 + 0.45 * lum));
      color.data.set([Math.round(208 * tone), Math.round(211 * tone), Math.round(218 * tone), Math.round(a * 255)], (y * W + x) * 4);
    }
  }
  const relief = blur(height, W, H, 2);
  for (let i = 0; i < relief.length; i++) relief[i] = relief[i] * 0.85 + height[i] * 0.15;
  return { color: encode(color), normal: encode(normalFromHeight(W, H, relief, 3.2, false)) };
}

export function bakeTextures(emblemPath: string, wordmarkPath: string) {
  const J = 256;
  const jersey = heightField(J, J, jerseyHeight);
  const R = 256;
  const rib = heightField(R, R, ribHeight);
  const M = 256;
  const mesh = heightField(M, M, (u, v) => 1 - meshHole(u, v) + periodicNoise(u, v, 48, 48) * 0.08);
  const T = { w: 128, h: 32 };
  const thread = heightField(T.w, T.h, (u, v) => threadShape(u, v) * (0.85 + 0.15 * Math.sin((u * 14 + v * 3) * Math.PI)));

  return {
    jerseyColor: encode(grey(J, J, (u, v) => 0.86 + 0.14 * periodicNoise(u, v, 12, 18) + 0.06 * (jerseyHeight(u, v) - 0.5))),
    jerseyNormal: encode(normalFromHeight(J, J, jersey, 2.2)),
    ribNormal: encode(normalFromHeight(R, R, rib, 3)),
    panelColor: encode(grey(M, M, (u, v) => 1 - 0.7 * meshHole(u, v), (u, v) => 1 - 0.28 * meshHole(u, v))),
    panelNormal: encode(normalFromHeight(M, M, mesh, 2.5)),
    threadColor: encode(grey(T.w, T.h, (u, v) => 0.75 + 0.25 * Math.sin((u * 14 + v * 3) * Math.PI) ** 2, (u, v) => (threadShape(u, v) > 0.08 ? 1 : 0))),
    threadNormal: encode(normalFromHeight(T.w, T.h, thread, 2, false)),
    ...(() => {
      const e = embroidery(emblemPath);
      return { embroideryColor: e.color, embroideryNormal: e.normal };
    })(),
    ...(() => {
      const e = brushedMetal(emblemPath, 1024, 0.5);
      const w = brushedMetal(wordmarkPath, 768, 0);
      return { backEmblemColor: e.color, backEmblemNormal: e.normal, backWordmarkColor: w.color, backWordmarkNormal: w.normal };
    })(),
    ...(() => {
      const l = labels(wordmarkPath, emblemPath);
      return { labelHem: l.hem, labelSleeve: l.sleeve, labelNormal: l.normal };
    })(),
  };
}
