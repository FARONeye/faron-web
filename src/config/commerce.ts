/**
 * Paramètres commerciaux — À COMPLÉTER. Aucun délai, tarif ou condition de livraison
 * n'est inventé : tant qu'une valeur est `null`, elle s'affiche comme placeholder.
 */
export const commerce = {
  /** Pays de livraison proposés dans Stripe Checkout (codes ISO). À CONFIRMER. */
  shippingCountries: ["FR"] as string[],
  /** Identifiants de tarifs de livraison Stripe (shr_…). Vide = aucun tarif proposé. */
  stripeShippingRateIds: [] as string[],

  shipping: {
    carriers: null as string | null,
    delays: null as string | null,
    costs: null as string | null,
    international: null as string | null,
  },
  returns: {
    /** Le délai légal de rétractation (14 jours) est un minimum ; la politique FARØN reste à fixer. */
    policy: null as string | null,
    returnCosts: null as string | null,
    procedure: null as string | null,
  },
};
