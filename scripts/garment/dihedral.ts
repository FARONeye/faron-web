/**
 * Contrainte de flexion dièdre (angle entre deux triangles adjacents), gradients de Bridson et al. 2003.
 * Contrairement à une contrainte de distance entre sommets opposés, elle n'agit pas dans le plan du tissu :
 * pas de « verrouillage » avec l'étirement, donc une raideur de jersey lourd reste stable.
 *
 * Arête partagée (i0 → i1) ; i2 sommet opposé du triangle (i0, i1, i2), i3 sommet opposé du triangle
 * (i1, i0, i3) — les deux triangles orientés de façon cohérente. θ = 0 quand le tissu est plat.
 */
export function dihedralAngle(x: ArrayLike<number>, i0: number, i1: number, i2: number, i3: number, g?: Float64Array) {
  const a = i0 * 3;
  const b = i1 * 3;
  const c = i2 * 3;
  const d = i3 * 3;
  const ex = x[b] - x[a];
  const ey = x[b + 1] - x[a + 1];
  const ez = x[b + 2] - x[a + 2];
  const el = Math.sqrt(ex * ex + ey * ey + ez * ez);
  // Triangle dégénéré : pas d'angle défini (NaN), la contrainte est ignorée.
  if (el < 1e-12) return NaN;
  // n1 = e0 × (x2 − x0), n2 = (x3 − x0) × e0
  const ux = x[c] - x[a];
  const uy = x[c + 1] - x[a + 1];
  const uz = x[c + 2] - x[a + 2];
  const vx = x[d] - x[a];
  const vy = x[d + 1] - x[a + 1];
  const vz = x[d + 2] - x[a + 2];
  const n1x = ey * uz - ez * uy;
  const n1y = ez * ux - ex * uz;
  const n1z = ex * uy - ey * ux;
  const n2x = vy * ez - vz * ey;
  const n2y = vz * ex - vx * ez;
  const n2z = vx * ey - vy * ex;
  const l1 = n1x * n1x + n1y * n1y + n1z * n1z;
  const l2 = n2x * n2x + n2y * n2y + n2z * n2z;
  if (l1 < 1e-14 || l2 < 1e-14) return NaN;
  const r1 = Math.sqrt(l1);
  const r2 = Math.sqrt(l2);
  const cos = (n1x * n2x + n1y * n2y + n1z * n2z) / (r1 * r2);
  // sin θ = ((n̂1 × n̂2) · ê)
  const cx = n1y * n2z - n1z * n2y;
  const cy = n1z * n2x - n1x * n2z;
  const cz = n1x * n2y - n1y * n2x;
  const sin = (cx * ex + cy * ey + cz * ez) / (r1 * r2 * el);
  const theta = Math.atan2(sin, cos);
  if (g) {
    // Sommets opposés : n̂ / hauteur ; sommets de l'arête : répartition selon la projection sur l'arête.
    const s2 = -el / l1;
    const s3 = -el / l2;
    const g2 = [n1x * s2, n1y * s2, n1z * s2];
    const g3 = [n2x * s3, n2y * s3, n2z * s3];
    const al2 = (ux * ex + uy * ey + uz * ez) / (el * el);
    const al3 = (vx * ex + vy * ey + vz * ez) / (el * el);
    for (let k = 0; k < 3; k++) {
      g[6 + k] = g2[k];
      g[9 + k] = g3[k];
      g[k] = -(1 - al2) * g2[k] - (1 - al3) * g3[k];
      g[3 + k] = -al2 * g2[k] - al3 * g3[k];
    }
  }
  return theta;
}
