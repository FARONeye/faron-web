import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getStripe } from "@/lib/stripe";
import { formatPrice } from "@/lib/format";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = {
  title: "Confirmation de commande",
  robots: { index: false },
};

export default function ConfirmationPage({ searchParams }: PageProps<"/commande/confirmation">) {
  return (
    <div className="mx-auto flex min-h-[80svh] max-w-2xl flex-col justify-center gap-8 px-4 pb-24 pt-[calc(var(--header-h)+6vh)] sm:px-8">
      <p className="label text-mist">Commande</p>
      <Suspense fallback={<p className="text-bone/70">Vérification du paiement…</p>}>
        <OrderStatus searchParams={searchParams} />
      </Suspense>
      <Link href="/" className="btn btn-ghost self-start">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

/** Le statut est lu auprès de Stripe : seule une session réellement payée est confirmée. */
async function OrderStatus({ searchParams }: { searchParams: PageProps<"/commande/confirmation">["searchParams"] }) {
  const { session_id } = await searchParams;
  const id = typeof session_id === "string" && session_id.startsWith("cs_") ? session_id : null;
  const stripe = getStripe();

  if (!id || !stripe) {
    return <h1 className="display text-metal text-5xl">Aucune commande à confirmer.</h1>;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(id);
  } catch {
    return (
      <>
        <h1 className="display text-metal text-5xl">Commande introuvable.</h1>
        <p className="text-bone/70">Si vous avez été débité, contactez le service client en précisant l&apos;heure de votre paiement.</p>
      </>
    );
  }

  const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
  if (!paid) {
    return (
      <>
        <h1 className="display text-metal text-5xl">Paiement en attente.</h1>
        <p className="text-bone/70">Votre paiement n&apos;est pas encore confirmé. Vous recevrez un e-mail dès sa validation.</p>
      </>
    );
  }

  return (
    <>
      <ClearCart />
      <h1 className="display text-metal text-[clamp(2.6rem,6vw,4.6rem)]">Merci. Votre commande est confirmée.</h1>
      <dl className="grid gap-3 border-t border-white/[0.07] pt-6 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-bone/60">Référence</dt>
          <dd className="font-mono text-xs text-bone">{session.id.slice(-12).toUpperCase()}</dd>
        </div>
        {session.customer_details?.email && (
          <div className="flex justify-between gap-6">
            <dt className="text-bone/60">Confirmation envoyée à</dt>
            <dd className="text-bone">{session.customer_details.email}</dd>
          </div>
        )}
        {session.amount_total !== null && (
          <div className="flex justify-between gap-6">
            <dt className="text-bone/60">Total payé</dt>
            <dd className="tabular-nums text-bone">{formatPrice(session.amount_total)}</dd>
          </div>
        )}
      </dl>
    </>
  );
}
