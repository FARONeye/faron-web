/**
 * Configuration globale du site FARØN.
 *
 * Toute valeur `null` ou marquée « À COMPLÉTER » est un emplacement réservé :
 * elle s'affiche comme placeholder visible tant qu'elle n'est pas renseignée.
 */

export const siteConfig = {
  name: "FARØN",
  tagline: "BEYOND THE VISIBLE",
  description:
    "FARØN — maison de streetwear avant-gardiste française. PROJECT 001 — VEIL : un T-shirt boxy en jersey de coton noir lourd.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "fr_FR",

  nav: [
    { label: "ACCUEIL", href: "/" },
    { label: "COLLECTION", href: "/collection" },
    { label: "UNIVERS", href: "/univers" },
  ],

  footerNav: [
    { label: "FAQ / Livraison / Retours", href: "/aide" },
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "Confidentialité", href: "/confidentialite" },
    { label: "CGV", href: "/cgv" },
  ],

  contact: {
    email: null as string | null, // À COMPLÉTER — adresse du service client
    instagram: null as string | null, // À COMPLÉTER — URL du compte officiel
  },

  /**
   * Emplacements réservés visibles (bordure pointillée + mention « À DÉFINIR »).
   * À passer à `false` uniquement quand toutes les valeurs ont été validées.
   */
  showPlaceholders: true,

  /** Médias externes optionnels — voir ASSETS.md. */
  assets: {
    /**
     * Modèle 3D du T-shirt (GLB, Meshopt). Générés par `npm run build:garment` d'après la photo
     * de référence et le tech pack ; un export CLO3D/Marvelous peut les remplacer à l'identique.
     */
    shirtModel: { high: "/models/faron-veil.glb", lite: "/models/faron-veil-lite.glb" },
    /**
     * Boucle héro de 6 s rendue depuis le GLB (WebM VP8) : affichée à la place de la scène 3D sur
     * les appareils sans WebGL. Un MP4 H.264 peut être ajouté pour les anciens navigateurs.
     */
    heroVideo: {
      webm: "/media/faron-veil-loop.webm",
      webmPortrait: "/media/faron-veil-loop-portrait.webm",
      mp4: null as string | null,
      poster: "/media/faron-veil-loop-poster.jpg",
    },
  },
} as const;

/** Mentions légales — À COMPLÉTER avant toute mise en ligne commerciale. */
export const legalEntity = {
  companyName: null as string | null, // Raison sociale / nom de l'entrepreneur
  legalForm: null as string | null, // SAS, SASU, EI, micro-entreprise…
  shareCapital: null as string | null,
  address: null as string | null,
  siret: null as string | null,
  rcs: null as string | null,
  vatNumber: null as string | null,
  publicationDirector: null as string | null,
  email: null as string | null,
  phone: null as string | null,
  host: {
    name: null as string | null, // Hébergeur (ex. prestataire cloud) — nom, adresse, téléphone
    address: null as string | null,
    phone: null as string | null,
  },
  mediator: null as string | null, // Médiateur de la consommation
  lastUpdated: null as string | null,
};
