/**
 * Source de données produit (CMS léger).
 *
 * Les caractéristiques proviennent du dossier de développement
 * « FARON_VEIL_techpack_developpement_v05 » (23/10/2026) et de la grille
 * « FARON_VEIL_grille_mesures_v05 ». Les informations commerciales non décidées
 * (prix, stock, livraison) restent à `null` : aucune valeur n'est inventée.
 */

export type SizeCode = "S" | "M" | "L" | "XL";

/** prelaunch : vitrine uniquement, commande impossible. available : vente ouverte. */
export type ProductStatus = "prelaunch" | "available" | "soldout";

export type MediaItem = {
  src: string | null;
  alt: string;
  label: string;
  /** Visuel de concept (non contractuel) — à remplacer par une photo du produit réel. */
  concept?: boolean;
  /** Dimensions natives (px) : la galerie respecte le format et n'agrandit pas l'image au-delà du raisonnable. */
  width?: number;
  height?: number;
};

export type Measurement = {
  label: string;
  values: Record<SizeCode, number>;
};

export const SIZES: SizeCode[] = ["S", "M", "L", "XL"];

export const veil = {
  id: "project-001-veil",
  slug: "project-001-veil",
  name: "PROJECT 001 — VEIL",
  collection: "PROJECT 001",
  type: "T-shirt",
  tagline: "Une silhouette. Une présence.",

  status: "prelaunch" as ProductStatus,

  /** Prix TTC en centimes d'euro. `null` = non défini (aucun prix affiché). */
  priceCents: null as number | null,
  /** Optionnel : identifiant de prix Stripe (price_…) si le prix est géré dans Stripe. */
  stripePriceId: null as string | null,

  /** Stock par taille. `null` = non communiqué. 0 = épuisé. */
  stock: { S: null, M: null, L: null, XL: null } as Record<SizeCode, number | null>,
  /** Limite d'unités par taille dans un panier (garde-fou d'interface). */
  maxQuantity: 10,

  description: [
    "Premier chapitre de FARØN. Un T-shirt masculin en jersey de coton noir lourd, à la main dense et à la surface mate.",
    "Silhouette carrée et structurée, légèrement raccourcie, pensée pour recouvrir la ceinture du pantalon. Épaules peu tombantes, manches de longueur normale, proches du biceps.",
    "La signature tient dans les détails : un Ø-éclipse brodé fil argent mat sur la poitrine, deux panneaux latéraux en maille aérée qui s'ouvrent de l'aisselle à l'ourlet, ornés de compositions géométriques originales d'inspiration Sak Yant, et une étiquette tissée repliée sur l'ourlet de manche. Au dos, un grand Ø en métal brossé et le nom FARØN, discret, sous le col.",
  ],

  specs: [
    { label: "Matière principale", value: "Jersey de coton noir — 280 g/m² (cible)" },
    { label: "Panneaux latéraux", value: "Insert triangulaire en micro-mesh noire mate, largeur cible de conception 12 cm sur le modèle 3D, visible de face et orné de compositions géométriques originales d'inspiration Sak Yant — cote à confirmer sur prototype" },
    { label: "Dos", value: "Grand Ø centré, ~26 cm de large (cible visuelle 25–28 cm en M, à valider sur la surface imprimable), à environ un tiers de la hauteur depuis l'encolure, et FARØN ~5,5 cm sous le col, métal brossé satiné" },
    { label: "Col", value: "Bord-côte 1×1 ton sur ton, bande finie 20 mm" },
    { label: "Coupe", value: "Boxy, légèrement raccourcie, couvre la ceinture" },
    { label: "Épaules & manches", value: "Épaules peu tombantes, manches semi-ajustées" },
    { label: "Broderie", value: "Ø-éclipse ≈ 20 mm, fil gris argent mat" },
    { label: "Étiquettes", value: "Étiquette tissée pliée en manche, étiquette FARØN au bas" },
  ],

  /** Composition réglementaire (étiquette en français) — À COMPLÉTER après mesure du produit final. */
  composition: null as string | null,
  /** Notice d'entretien — À COMPLÉTER après tests de lavage. */
  care: null as string | null,
  /** Pays de fabrication — À COMPLÉTER (aucune mention de fabrication inventée). */
  madeIn: null as string | null,

  /** Mesures du vêtement fini, à plat, en cm. Provisoires — essayage requis. */
  measurementsStatus: "Provisoires — susceptibles d'évoluer après essayage des prototypes.",
  measurements: [
    { label: "Poitrine, 2 cm sous emmanchure", values: { S: 55, M: 58, L: 61, XL: 64 } },
    { label: "Longueur HPS → bas", values: { S: 63, M: 65, L: 67, XL: 69 } },
    { label: "Largeur épaules, couture à couture", values: { S: 46, M: 48, L: 50, XL: 52 } },
    { label: "Longueur manche, couture épaule → ourlet", values: { S: 20, M: 21, L: 22, XL: 23 } },
    { label: "Ouverture manche à plat", values: { S: 16, M: 17, L: 18, XL: 19 } },
    { label: "Largeur bas finie à plat", values: { S: 55, M: 58, L: 61, XL: 64 } },
    { label: "Panneau latéral fini, largeur", values: { S: 8, M: 8, L: 8, XL: 8 } },
  ] as Measurement[],

  /**
   * Photos produit. `src: null` = emplacement réservé pour la photo définitive.
   * Les visuels `concept` proviennent du lookbook de concept FARØN (non contractuels).
   */
  media: {
    front: { src: "/media/lookbook/concept-front.jpg", alt: "T-shirt VEIL noir, vue de face à plat", label: "Vue de face", concept: true, width: 442, height: 450 },
    back: { src: "/media/lookbook/concept-back.jpg", alt: "T-shirt VEIL noir, vue de dos à plat", label: "Vue de dos", concept: true, width: 406, height: 450 },
    details: [
      { src: "/media/lookbook/concept-chest-emblem.jpg", alt: "Broderie Ø-éclipse sur la poitrine", label: "Broderie poitrine", concept: true, width: 300, height: 170 },
      { src: "/media/lookbook/concept-sleeve-label.jpg", alt: "Étiquette tissée pliée sur l'ourlet de manche", label: "Étiquette manche", concept: true, width: 300, height: 120 },
      { src: "/media/lookbook/concept-hem-label.jpg", alt: "Étiquette FARØN près de l'ourlet", label: "Étiquette bas", concept: true, width: 300, height: 103 },
      { src: "/media/lookbook/concept-side-panel.jpg", alt: "Panneau latéral en micro-mesh", label: "Panneau latéral", concept: true, width: 300, height: 270 },
    ] as MediaItem[],
    worn: [
      { src: "/media/lookbook/concept-portrait.jpg", alt: "Silhouette portant le T-shirt VEIL", label: "Porté", concept: true, width: 370, height: 505 },
      { src: "/media/lookbook/concept-full-body.jpg", alt: "Silhouette complète, T-shirt VEIL et pantalon noir", label: "Silhouette", concept: true, width: 222, height: 516 },
    ] as MediaItem[],
    /** Recadrages complémentaires du lookbook FARØN fourni, et planche complète. */
    extra: [
      { src: "/media/lookbook/concept-collar.jpg", alt: "Col en bord-côte du T-shirt VEIL, porté", label: "Col", concept: true, width: 264, height: 516 },
      { src: "/media/lookbook/concept-sleeve.jpg", alt: "Manche et étiquette du T-shirt VEIL, porté", label: "Manche portée", concept: true, width: 224, height: 516 },
      { src: "/media/lookbook/concept-panel-worn.jpg", alt: "Panneau latéral du T-shirt VEIL, porté", label: "Panneau porté", concept: true, width: 286, height: 516 },
      { src: "/media/lookbook/concept-hem.jpg", alt: "Ourlet et étiquette FARØN du T-shirt VEIL, porté", label: "Ourlet porté", concept: true, width: 218, height: 516 },
      { src: "/media/lookbook/lookbook-board.jpg", alt: "Planche lookbook FARØN : T-shirt VEIL porté, à plat et en détails", label: "Planche lookbook", concept: true, width: 1536, height: 1024 },
      { src: "/brand/faron-emblem.png", alt: "Emblème Ø FARØN en métal argenté", label: "Emblème Ø", width: 1024, height: 1024 },
    ] as MediaItem[],
    /** Photos haute définition du produit réel — à fournir après l'échantillon B. */
    pending: [
      { src: null, alt: "", label: "Photo studio — face" },
      { src: null, alt: "", label: "Photo studio — dos" },
      { src: null, alt: "", label: "Macro matière" },
    ] as MediaItem[],
  },
};

/** Ordre de la galerie produit (après la vue 3D) : ensemble, porté, puis détails de près. */
export function galleryOf(product: Product): MediaItem[] {
  const m = product.media;
  const [chest, sleeveLabel, hemLabel, sidePanel] = m.details;
  const [collar, sleeve, panelWorn, hem, board, emblem] = m.extra;
  return [m.front, m.back, ...m.worn, chest, collar, sleeveLabel, sleeve, sidePanel, panelWorn, hemLabel, hem, board, emblem].filter((x) => x?.src);
}

export type Product = typeof veil;

export const products: Product[] = [veil];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Le produit peut-il être commandé (indépendamment de la configuration Stripe) ? */
export function isOrderable(product: Product): boolean {
  return product.status === "available" && product.priceCents !== null;
}

export function stockFor(product: Product, size: SizeCode): number | null {
  return product.stock[size];
}

export function stockLabel(product: Product, size: SizeCode | null): string {
  if (product.status === "prelaunch") return "Disponibilité communiquée au lancement";
  if (product.status === "soldout") return "Épuisé";
  if (!size) return "Sélectionnez une taille";
  const stock = stockFor(product, size);
  if (stock === null) return "Disponible";
  return stock > 0 ? "En stock" : "Épuisé dans cette taille";
}
