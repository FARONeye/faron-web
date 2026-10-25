"use client";

import { useState } from "react";
import Link from "next/link";
import { isOrderable, getProduct } from "@/config/product";
import { useCart } from "@/lib/cart-store";

type Props = {
  /** Stripe est configuré côté serveur (STRIPE_SECRET_KEY). */
  checkoutReady: boolean;
};

/**
 * Acceptation des CGV puis redirection vers Stripe Checkout.
 * Aucun paiement n'est simulé : sans Stripe configuré, la commande est impossible.
 */
export function CheckoutForm({ checkoutReady }: Props) {
  const lines = useCart((s) => s.lines);
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderable = lines.length > 0 && lines.every((l) => {
    const p = getProduct(l.productId);
    return p !== undefined && isOrderable(p);
  });
  const blocked = !orderable
    ? "Les commandes ouvriront au lancement de PROJECT 001 — VEIL."
    : !checkoutReady
      ? "Le paiement en ligne n'est pas encore activé."
      : null;

  async function submit() {
    setError(null);
    if (!accepted) {
      setError("Veuillez accepter les conditions générales de vente pour continuer.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, acceptTerms: true }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Le paiement n'a pas pu être initialisé.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le paiement n'a pas pu être initialisé.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-3 text-sm text-bone/75">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-silver"
          disabled={Boolean(blocked)}
        />
        <span>
          J&apos;ai lu et j&apos;accepte les{" "}
          <Link href="/cgv" className="underline underline-offset-4 hover:text-bone">
            conditions générales de vente
          </Link>
          .
        </span>
      </label>
      <button type="button" className="btn btn-primary w-full" onClick={submit} disabled={Boolean(blocked) || pending}>
        {pending ? "Redirection…" : "Commander"}
      </button>
      {blocked && <p className="text-sm text-mist">{blocked}</p>}
      {error && (
        <p role="alert" className="text-sm text-[#e3b3b3]">
          {error}
        </p>
      )}
      <p className="label text-mist/70">Paiement sécurisé par Stripe</p>
    </div>
  );
}
