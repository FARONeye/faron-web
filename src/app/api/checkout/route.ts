import type Stripe from "stripe";
import { commerce } from "@/config/commerce";
import { SIZES, getProduct, isOrderable } from "@/config/product";
import { getStripe } from "@/lib/stripe";

type IncomingLine = { productId?: unknown; size?: unknown; quantity?: unknown };

const fail = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Crée une session Stripe Checkout. Prix, disponibilité et stock sont relus depuis la
 * configuration serveur : le contenu envoyé par le navigateur n'est jamais pris pour argent comptant.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return fail("Le paiement en ligne n'est pas encore activé.", 503);

  let body: { lines?: unknown; acceptTerms?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail("Requête invalide.", 400);
  }
  if (body.acceptTerms !== true) return fail("Les conditions générales de vente doivent être acceptées.", 400);
  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 20) return fail("Panier invalide.", 400);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const summary: string[] = [];
  for (const raw of body.lines as IncomingLine[]) {
    const product = typeof raw.productId === "string" ? getProduct(raw.productId) : undefined;
    const size = SIZES.find((s) => s === raw.size);
    const quantity = Number(raw.quantity);
    if (!product || !size || !Number.isInteger(quantity) || quantity < 1 || quantity > product.maxQuantity) {
      return fail("Panier invalide.", 400);
    }
    if (!isOrderable(product) || product.priceCents === null) {
      return fail(`${product.name} n'est pas encore disponible à la commande.`, 409);
    }
    const stock = product.stock[size];
    if (stock !== null && stock < quantity) return fail(`Stock insuffisant en taille ${size}.`, 409);

    lineItems.push(
      product.stripePriceId
        ? { price: product.stripePriceId, quantity }
        : {
            quantity,
            price_data: {
              currency: "eur",
              unit_amount: product.priceCents,
              product_data: { name: `${product.name} — Taille ${size}`, metadata: { productId: product.id, size } },
            },
          },
    );
    summary.push(`${product.id}:${size}:${quantity}`);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      line_items: lineItems,
      success_url: `${origin}/commande/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/panier`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: commerce.shippingCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
      },
      ...(commerce.stripeShippingRateIds.length > 0 && {
        shipping_options: commerce.stripeShippingRateIds.map((id) => ({ shipping_rate: id })),
      }),
      metadata: { cart: summary.join(",").slice(0, 500) },
    });
    if (!session.url) throw new Error("Session sans URL");
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("[checkout] Stripe:", e);
    return fail("Le paiement n'a pas pu être initialisé. Veuillez réessayer.", 502);
  }
}
