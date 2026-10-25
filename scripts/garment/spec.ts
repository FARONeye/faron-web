/**
 * PROJECT 001 — VEIL (taille M) : patron, mannequin invisible et paramètres de simulation.
 *
 * Les cotes du patron suivent le tech pack v0.5, avec panneaux latéraux élargis pour la direction actuelle
 * (cible de conception 12 cm, à confirmer au prototype) : c'est la direction validée
 * — épaules à peine tombées, manches ajustées au biceps. La photo de référence sert au contrôle visuel.
 */

export const TECH_PACK = {
  length: 65,
  chestFlat: 58,
  hemFlat: 58,
  shoulder: 48,
  sleeveLength: 21,
  sleeveOpeningFlat: 17,
  panelWidth: 12,
  ribHeight: 2,
  emblemHeight: 2,
  hemLabel: { w: 4, h: 1.2 },
  sleeveLabelVisible: 1.4,
};

/** Taille M issue de la grille v0.5. Les cotes sont provisoires et restent à confirmer sur prototype physique. */
export const PROTOTYPE_3D = {
  length: TECH_PACK.length,
  chestFlat: TECH_PACK.chestFlat,
  shoulder: TECH_PACK.shoulder,
};

/** Repère 3D : mètres, devant vers +Z, côté gauche porté vers +X, HPS à y = 0,23. */
export const HPS_Y = 0.23;
export const HEM_Y = HPS_Y - PROTOTYPE_3D.length / 100;

/** Patron (cm, u vers la gauche portée, v vers le bas depuis le HPS). */
export const PATTERN = {
  /** Longueur HPS → ourlet (cm). */
  length: PROTOTYPE_3D.length,
  /**
   * Demi-largeur des pièces devant/dos sous l'emmanchure. Les panneaux latéraux (planche lookbook) sont
   * des coins : nuls sous le bras, larges à l'ourlet ; devant et dos se resserrent d'autant vers le bas
   * pour garder un tour constant jusque dans l'ourlet (coupe droite, sans évasement).
   */
  chestHalf: PROTOTYPE_3D.chestFlat / 2,
  neckHalfWidth: 9,
  frontNeckDrop: 9.5,
  /**
   * Encolure dos : 3,0 cm pour libérer la nuque et éviter que le bord-côte ne tire le dos vers le cou.
   */
  backNeckDrop: 3.0,
  shoulderX: PROTOTYPE_3D.shoulder / 2,
  shoulderDrop: 4.4,
  underarmY: 22,
  sleeve: {
    length: TECH_PACK.sleeveLength,
    capHeight: 8.5,
    bicepHalf: 18.5,
    // La cote « ouverture à plat » correspond à la demi-largeur du patron tubulaire avant couture.
    openingHalf: TECH_PACK.sleeveOpeningFlat,
  },
  rib: { height: TECH_PACK.ribHeight, stretch: 1.0 },
  /**
   * Coin latéral : insert triangulaire de 12 cm à l'ourlet, avancé vers le devant pour qu'il reste lisible
   * de face. Le patron conserve une circonférence constante jusque dans l'ourlet.
   */
  panel: { hemWidth: TECH_PACK.panelWidth, exponent: 0.58, forward: 6 },
  /**
   * Forme de départ du buste avant couture (superellipses, demi-axes en m pour un tour de 116 cm, exposant < 1 = pans
   * plus plats), interpolée entre `top` et `bottom` sur la hauteur `blend` (v en cm). Sans support sous la poitrine,
   * le drapé garde en partie cette forme : très plate partout (0,62), le buste restait une coque rigide ; ronde
   * (≥ 0,75), il s'affaissait et perdait sa carrure ; plate jusqu'à l'aisselle, tout le buste revenait en coque.
   * Seule l'encolure garde la forme plate (le bord-côte s'y coud sans pli à l'épaule) ; dès v ≈ 14 cm, 0,68 laisse
   * le buste et le bas se détendre tout en gardant la carrure boxy à la poitrine.
   */
  wrap: {
    top: { a: 0.225, b: 0.11, exponent: 0.62 },
    bottom: { a: 0.223, b: 0.119, exponent: 0.68 },
    blend: [5, 14] as [number, number],
  },
};

/**
 * Mannequin invisible, homme taille M : tour de poitrine ~92 cm, taille ~80 cm, cou ~38 cm,
 * carrure ~44 cm. Bras relâchés en A, légèrement asymétriques pour un tombé naturel.
 */
export const BODY = {
  /**
   * Sections du buste : demi-largeur a, demi-profondeur devant b et dos bb, décalage c (z du centre).
   * Profil d'un torse masculin relâché : haut du dos en courbe continue (cyphose douce, point le plus en arrière
   * au niveau des omoplates), creux lombaire léger à la taille, poitrine plate, dorsaux larges sans excès.
   * Le bas du buste reste plus étroit que le vêtement : la coupe boxy tombe librement sous la poitrine.
   */
  torso: [
    { y: 0.215, a: 0.06, b: 0.045, bb: 0.05, c: -0.024 },
    { y: 0.19, a: 0.127, b: 0.064, bb: 0.075, c: -0.02 },
    { y: 0.15, a: 0.155, b: 0.082, bb: 0.088, c: -0.014 },
    { y: 0.09, a: 0.163, b: 0.089, bb: 0.094, c: -0.01 },
    { y: 0.02, a: 0.165, b: 0.093, bb: 0.094, c: -0.008 },
    { y: -0.07, a: 0.158, b: 0.089, bb: 0.089, c: -0.005 },
    { y: -0.105, a: 0.149, b: 0.082, bb: 0.08, c: -0.004 },
    { y: -0.12, a: 0.135, b: 0.072, bb: 0.07, c: -0.004 },
  ],
  /** Exposant des sections : > 2 = buste plus carré (torse masculin, poitrine sans projection). */
  torsoBoxiness: 2.4,
  /** Cou presque droit (légère inclinaison avant) : l'arrière du cou ne repousse pas le col dos. */
  neck: { a: [0, 0.19, -0.026], b: [0, 0.36, -0.012], r: 0.06 },
  /** Trapèzes : pente d'épaule naturelle (~18°) du cou à l'acromion. */
  trapezius: { a: [0.045, 0.2, -0.026], b: [0.182, 0.153, -0.016], r: 0.029 },
  deltoid: { c: [0.187, 0.12, -0.006], r: 0.045 },
  /**
   * Omoplates : sphères larges et peu saillantes (~4 mm au-delà du dos), qui laissent un léger sillon vertébral.
   * (Les anciennes, petites et saillantes de 14 mm, formaient une bosse au haut du dos.)
   */
  scapula: { c: [0.07, 0.075, -0.012], r: 0.091 },
  arm: {
    root: [0.185, 0.13, -0.004],
    length: 0.13,
    rRoot: 0.046,
    rTip: 0.027,
    /**
     * Angle sous l'horizontale (°) : gauche, droite. Bras relâchés en légère pose A; les ouvertures restent ajustées.
     */
    angle: { L: 72, R: 73 },
    forward: { L: 0.1, R: 0.06 },
  },
  smooth: 0.014,
};

export const SIM = {
  /** Espacement des particules (cm) : corps/manches, bord-côte. */
  spacing: 1.05,
  ribSpacing: 0.4,
  substepsPerFrame: 20,
  fps: 60,
  /** Masse surfacique : 280 g/m². */
  gsm: 0.28,
  thickness: 0.0045,
  sleeveTorsoGap: 0.004,
  /** Compliances XPBD (m/N), à l'échelle de particules de ~28 mg (1 cm² de jersey 280 g/m²). */
  stretchCompliance: 1e-7,
  ribStretchCompliance: 0.0015,
  /**
   * Flexion dièdre d'un jersey 280 g/m² (compliance par radian) : assez de tenue pour une coupe structurée,
   * assez de souplesse pour que le buste et le bas tombent naturellement au lieu de former une coque.
   */
  bendCompliance: 4.5,
  seamBendCompliance: 200,
  /** Flexion de distance, souple (stabilise le maillage à petite échelle ; plus raide, elle « broute »). */
  distBendCompliance: 0.075,
  /**
   * Ourlets repliés (double couche, surpiqués) et bord-côte : plus raides que le jersey simple. À 0,08, l'ourlet
   * formait un cerceau rigide ; à 0,16 il garde sa tenue mais suit le tombé du bas.
   */
  hemBendFactor: 0.16,
  ribBendFactor: 0.4,
  /** Coefficients de frottement coton sur peau (statique, cinétique). */
  staticFriction: 1.5,
  friction: 1,
  sewSeconds: 2.2,
  drapeSeconds: 6,
};

export const BRANDING = {
  /** Ø brodé : côté gauche porté, 18 cm sous le HPS, 10 cm du milieu devant (coordonnées patron). */
  emblem: { u: 10, v: 18, height: TECH_PACK.emblemHeight },
  hemLabel: { u: 13, vAboveHem: 3.4, w: TECH_PACK.hemLabel.w, h: TECH_PACK.hemLabel.h },
  /**
   * Dos (coordonnées patron) : grand Ø métal brossé, 26 cm de large (cible visuelle 25–28 cm en M, à valider
   * sur la surface imprimable réelle), centré à un tiers de la hauteur depuis l'encolure dos (encolure v≈2,8,
   * ourlet v=59 : un tiers ≈ v 21,5, milieu ≈ v 31), donc au-dessus du milieu ; petit FARØN sous le col.
   */
  backEmblem: { u: 0, v: 21.5, width: 26 },
  backWordmark: { u: 0, v: 5.8, width: 5.5 },
  sleeveLabel: { u: 7, w: TECH_PACK.sleeveLabelVisible, outside: 1.5, inside: 0.9 },
};

export const STITCH = {
  width: 0.0007,
  pitch: 0.003,
  hemRows: [2.0, 2.65],
  cuffRows: [1.8, 2.45],
  neckRows: [0.5, 0.92],
  shoulderRows: [0.3, 0.7],
  armholeRow: 0.6,
  sideRow: 0.25,
};

export const FABRIC = {
  /** Épaisseur visible aux bords : ourlets repliés (double couche) et bord-côte plié. */
  hemThickness: 0.0026,
  ribThickness: 0.0042,
  hemAllowance: 0.022,
};

export const LODS = {
  high: { simplify: 1 },
  lite: { simplify: 0.38 },
} as const;
export type Lod = keyof typeof LODS;
