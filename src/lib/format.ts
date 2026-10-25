const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function formatPrice(cents: number | null): string | null {
  return cents === null ? null : eur.format(cents / 100);
}
