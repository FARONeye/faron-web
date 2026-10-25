import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Client Stripe côté serveur, ou `null` si STRIPE_SECRET_KEY n'est pas configurée. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key);
  return client;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
