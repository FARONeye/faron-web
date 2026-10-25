import { VIEWPOINTS } from "@/components/three/shirt/dimensions";

/**
 * État de mise en scène de l'accueil. GSAP ScrollTrigger écrit ces valeurs,
 * la boucle de rendu les lit et les amortit (caméra, rotation, lumières, fond).
 */
export type HomeRig = {
  camX: number;
  camY: number;
  camZ: number;
  tgtX: number;
  tgtY: number;
  tgtZ: number;
  rotY: number;
  posX: number;
  /** Apparition initiale (animation d'entrée). */
  intro: number;
  /** Lumière principale (sort la pièce de l'ombre). */
  reveal: number;
  /** Contre-jours argentés qui dessinent la silhouette. */
  rim: number;
  /** 0 = espace profond, 1 = studio. */
  studio: number;
};

type Keyframe = Partial<HomeRig>;

const view = (key: keyof typeof VIEWPOINTS): Keyframe => {
  const v = VIEWPOINTS[key];
  return { camX: v.position[0], camY: v.position[1], camZ: v.position[2], tgtX: v.target[0], tgtY: v.target[1], tgtZ: v.target[2] };
};

export const KEYFRAMES = {
  arrival: { camX: 0, camY: -0.02, camZ: 3.7, tgtX: 0, tgtY: -0.04, tgtZ: 0, rotY: -0.45, posX: 0, reveal: 0.75, rim: 1.25, studio: 0 },
  reveal: { camX: -0.5, camY: 0.05, camZ: 2.1, tgtX: -0.22, tgtY: -0.06, tgtZ: 0, rotY: 0.4, reveal: 1 },
  collar: { ...view("collar"), rotY: 0.08 },
  emblem: { ...view("emblem"), rotY: 0 },
  sleeve: { ...view("sleeve"), rotY: 0 },
  panel: { ...view("panel"), rotY: 0 },
  back: { camX: 0, camY: -0.02, camZ: 2.3, tgtX: 0, tgtY: -0.06, tgtZ: 0, rotY: -Math.PI },
  product: { camX: 0, camY: -0.03, camZ: 2.5, tgtX: 0, tgtY: -0.06, tgtZ: 0, rotY: -2 * Math.PI + 0.45, posX: -0.42, studio: 1 },
} satisfies Record<string, Keyframe>;

export function createRig(): HomeRig {
  return { ...KEYFRAMES.arrival, intro: 0 };
}

/**
 * Hauteurs des chapitres (vh) — la chorégraphie est exprimée dans cette unité,
 * elle reste donc identique quelle que soit la taille d'écran.
 */
export const CHAPTERS = { arrival: 100, reveal: 140, material: 260, identity: 220 } as const;
