import { BODY } from "./spec";
import { armFrame } from "./pattern";

/**
 * Mannequin invisible (champ de distance signée, gradient analytique) : buste en sections
 * elliptiques, pectoraux, omoplates, cou, trapèzes, deltoïdes et bras en A.
 * Le T-shirt est cousu puis drapé dessus : c'est lui qui donne la présence du corps.
 */

type Hit = { d: number; gx: number; gy: number; gz: number };
const out: Hit = { d: 0, gx: 0, gy: 1, gz: 0 };

function capsule(px: number, py: number, pz: number, a: number[], b: number[], ra: number, rb: number, o: Hit) {
  const bx = b[0] - a[0];
  const by = b[1] - a[1];
  const bz = b[2] - a[2];
  const qx = px - a[0];
  const qy = py - a[1];
  const qz = pz - a[2];
  const t = Math.max(0, Math.min(1, (qx * bx + qy * by + qz * bz) / (bx * bx + by * by + bz * bz)));
  const cx = qx - bx * t;
  const cy = qy - by * t;
  const cz = qz - bz * t;
  const l = Math.hypot(cx, cy, cz) || 1e-9;
  o.d = l - (ra + (rb - ra) * t);
  o.gx = cx / l;
  o.gy = cy / l;
  o.gz = cz / l;
}

function sphere(px: number, py: number, pz: number, c: number[], r: number, o: Hit) {
  const x = px - c[0];
  const y = py - c[1];
  const z = pz - c[2];
  const l = Math.hypot(x, y, z) || 1e-9;
  o.d = l - r;
  o.gx = x / l;
  o.gy = y / l;
  o.gz = z / l;
}

const T = BODY.torso;
function torso(px: number, py: number, pz: number, o: Hit) {
  if (py > T[0].y + 0.02) {
    o.d = py - T[0].y;
    o.gx = 0;
    o.gy = 1;
    o.gz = 0;
    return;
  }
  let i = 0;
  while (i < T.length - 2 && py < T[i + 1].y) i++;
  const s0 = T[i];
  const s1 = T[i + 1];
  const f = Math.max(0, Math.min(1, (s0.y - py) / (s0.y - s1.y)));
  const k = f * f * (3 - 2 * f);
  const a = s0.a + (s1.a - s0.a) * k;
  // Profondeur différente devant (poitrine plate) et dos (haut du dos arrondi).
  const back = pz - (s0.c + (s1.c - s0.c) * k) < 0;
  const b = back ? s0.bb + (s1.bb - s0.bb) * k : s0.b + (s1.b - s0.b) * k;
  const c = s0.c + (s1.c - s0.c) * k;
  // Superellipse : poitrine et dos plus plats qu'une ellipse, comme un torse masculin.
  // q est homogène de degré 1 : distance ≈ (q − 1) / |∇q|.
  const n = BODY.torsoBoxiness;
  const x = Math.abs(px) / a;
  const z = Math.abs(pz - c) / b;
  const q = Math.pow(Math.pow(x, n) + Math.pow(z, n), 1 / n) || 1e-9;
  const s = Math.pow(q, 1 - n);
  const gx = (Math.sign(px) * Math.pow(x, n - 1) * s) / a;
  const gz = (Math.sign(pz - c) * Math.pow(z, n - 1) * s) / b;
  const gl = Math.hypot(gx, gz) || 1e-9;
  const radial = (q - 1) / gl;
  const bottomCap = T[T.length - 1].y - py;
  // Fermeture du buste sous les côtes : le support s'arrête au haut du ventre au lieu de
  // continuer jusqu'à l'ourlet et de bloquer le tissu libre. Intersection avec un fond plat.
  if (bottomCap > radial) {
    o.d = bottomCap;
    o.gx = 0;
    o.gy = -1;
    o.gz = 0;
  } else {
    o.d = radial;
    o.gx = gx / gl;
    o.gy = 0;
    o.gz = gz / gl;
  }
}

/** Union lisse (polynomiale) avec mélange des gradients. */
function smin(acc: Hit, h: Hit, k: number) {
  const t = Math.max(0, Math.min(1, 0.5 + (0.5 * (h.d - acc.d)) / k));
  // t = 1 → acc domine ; t = 0 → h domine.
  acc.d = h.d * (1 - t) + acc.d * t - k * t * (1 - t);
  acc.gx = h.gx * (1 - t) + acc.gx * t;
  acc.gy = h.gy * (1 - t) + acc.gy * t;
  acc.gz = h.gz * (1 - t) + acc.gz * t;
}

const L = armFrame("L");
const R = armFrame("R");
const armEnd = (f: ReturnType<typeof armFrame>) => f.root.map((v, i) => v + f.dir[i] * BODY.arm.length);
const ARMS = [
  { a: L.root, b: armEnd(L) },
  { a: R.root, b: armEnd(R) },
];
const mirrorX = (p: number[]) => [-p[0], p[1], p[2]];
const tmp: Hit = { d: 0, gx: 0, gy: 0, gz: 0 };

/**
 * Distance au corps. `torsoOffset` gonfle le buste seul (les manches reposent ainsi
 * sur le tissu du buste au lieu de le traverser sous les bras).
 */
export function bodySdf(px: number, py: number, pz: number, torsoOffset = 0): Hit {
  const k = BODY.smooth;
  torso(px, py, pz, out);
  out.d -= torsoOffset;
  for (const sx of [1, -1]) {
    const sc = sx > 0 ? BODY.scapula.c : mirrorX(BODY.scapula.c);
    sphere(px, py, pz, sc, BODY.scapula.r, tmp);
    tmp.d -= torsoOffset;
    smin(out, tmp, k);
    const ta = sx > 0 ? BODY.trapezius.a : mirrorX(BODY.trapezius.a);
    const tb = sx > 0 ? BODY.trapezius.b : mirrorX(BODY.trapezius.b);
    capsule(px, py, pz, ta, tb, BODY.trapezius.r, BODY.trapezius.r, tmp);
    smin(out, tmp, k);
    const dc = sx > 0 ? BODY.deltoid.c : mirrorX(BODY.deltoid.c);
    sphere(px, py, pz, dc, BODY.deltoid.r, tmp);
    smin(out, tmp, k);
  }
  capsule(px, py, pz, BODY.neck.a, BODY.neck.b, BODY.neck.r, BODY.neck.r * 0.92, tmp);
  smin(out, tmp, k);
  for (const arm of ARMS) {
    capsule(px, py, pz, arm.a, arm.b, BODY.arm.rRoot, BODY.arm.rTip, tmp);
    smin(out, tmp, k * 0.8);
  }
  const gl = Math.hypot(out.gx, out.gy, out.gz) || 1;
  out.gx /= gl;
  out.gy /= gl;
  out.gz /= gl;
  return out;
}
