import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Webhook Stripe (signature vérifiée). Point d'ancrage pour le traitement des commandes payées :
 * décrément du stock, notification de l'atelier, e-mail de confirmation.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return new Response("Webhook non configuré", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Signature manquante", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Signature invalide", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status === "paid") {
        // À BRANCHER : enregistrer la commande, décrémenter le stock (session.metadata.cart),
        // prévenir l'atelier et envoyer la confirmation au client.
        console.info("[stripe] Commande payée", session.id, session.metadata?.cart);
      }
      break;
    }
    case "checkout.session.async_payment_failed":
      console.warn("[stripe] Paiement différé échoué", event.data.object.id);
      break;
  }

  return Response.json({ received: true });
}
