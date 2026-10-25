"use client";

import Image from "next/image";
import Link from "next/link";
import { commerce } from "@/config/commerce";
import { getProduct, veil } from "@/config/product";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { Placeholder } from "@/components/ui/Placeholder";
import { CheckoutForm } from "./CheckoutForm";

type Props = {
  checkoutReady: boolean;
  onNavigate?: () => void;
};

export function CartContents({ checkoutReady, onNavigate }: Props) {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  const items = lines.flatMap((line) => {
    const product = getProduct(line.productId);
    return product ? [{ line, product }] : [];
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-start justify-center gap-6 py-16">
        <p className="display text-3xl text-silver">Votre panier est vide.</p>
        <Link href={`/collection/${veil.slug}`} onClick={onNavigate} className="btn btn-ghost">
          Découvrir la pièce
        </Link>
      </div>
    );
  }

  const priced = items.every((i) => i.product.priceCents !== null);
  const subtotal = priced ? items.reduce((sum, i) => sum + (i.product.priceCents ?? 0) * i.line.quantity, 0) : null;

  return (
    <div className="flex flex-1 flex-col">
      <ul className="flex flex-col divide-y divide-white/[0.07]">
        {items.map(({ line, product }) => (
          <li key={`${line.productId}-${line.size}`} className="flex gap-4 py-5">
            <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden bg-charcoal">
              <Image src={product.media.front.src!} alt={product.media.front.alt} fill sizes="80px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/collection/${product.slug}`} onClick={onNavigate} className="text-sm tracking-[0.12em] text-bone">
                    {product.name}
                  </Link>
                  <p className="label mt-1 text-mist">Taille {line.size}</p>
                </div>
                <p className="text-sm tabular-nums text-silver">
                  {product.priceCents !== null ? formatPrice(product.priceCents * line.quantity) : <Placeholder>prix</Placeholder>}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center border border-white/15" role="group" aria-label={`Quantité, taille ${line.size}`}>
                  <button
                    type="button"
                    className="size-8 text-silver hover:text-bone disabled:opacity-30"
                    aria-label="Retirer une unité"
                    disabled={line.quantity <= 1}
                    onClick={() => setQuantity(line.productId, line.size, line.quantity - 1, product.maxQuantity)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    className="size-8 text-silver hover:text-bone disabled:opacity-30"
                    aria-label="Ajouter une unité"
                    disabled={line.quantity >= product.maxQuantity}
                    onClick={() => setQuantity(line.productId, line.size, line.quantity + 1, product.maxQuantity)}
                  >
                    +
                  </button>
                </div>
                <button type="button" onClick={() => remove(line.productId, line.size)} className="label link-underline text-mist hover:text-bone">
                  Retirer
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-4 flex flex-col gap-3 border-t border-white/[0.07] pt-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-bone/70">Sous-total TTC</dt>
          <dd className="tabular-nums text-bone">{subtotal !== null ? formatPrice(subtotal) : <Placeholder>prix</Placeholder>}</dd>
        </div>
        <div className="flex justify-between gap-6">
          <dt className="text-bone/70">Livraison</dt>
          <dd className="text-right text-bone/80">
            <Placeholder value={commerce.shipping.costs} fallback="Calculée à l'étape suivante">
              frais de livraison
            </Placeholder>
          </dd>
        </div>
      </dl>

      <div className="mt-6">
        <CheckoutForm checkoutReady={checkoutReady} />
      </div>
    </div>
  );
}
