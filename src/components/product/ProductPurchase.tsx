"use client";

import { useRef, useState } from "react";
import { SIZES, stockFor, stockLabel, type Product, type SizeCode } from "@/config/product";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { Placeholder } from "@/components/ui/Placeholder";
import { SizeGuide } from "./SizeGuide";

type Props = {
  product: Product;
  /** Version condensée (section produit de l'accueil). */
  compact?: boolean;
};

export function ProductPurchase({ product, compact = false }: Props) {
  const [size, setSize] = useState<SizeCode | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [guideOpen, setGuideOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const sizeGroup = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);

  const soldOut = product.status === "soldout";
  const sizeAvailable = (s: SizeCode) => !soldOut && stockFor(product, s) !== 0;
  const maxQty = Math.min(product.maxQuantity, size ? (stockFor(product, size) ?? product.maxQuantity) : product.maxQuantity);
  const price = formatPrice(product.priceCents);

  function primaryAction() {
    if (!size) {
      setHint(true);
      sizeGroup.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      return;
    }
    add({ productId: product.id, size, quantity }, product.maxQuantity);
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-xl tabular-nums tracking-wide text-bone">
          {price ?? (
            <Placeholder fallback="Prix communiqué au lancement">prix TTC</Placeholder>
          )}
        </p>
        <p className="label text-right text-mist">{stockLabel(product, size)}</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <legend className="label text-silver">Taille</legend>
          <button type="button" onClick={() => setGuideOpen(true)} className="label link-underline text-mist hover:text-bone">
            Guide des tailles
          </button>
        </div>
        <div ref={sizeGroup} id="taille" role="radiogroup" aria-label="Taille" className="grid grid-cols-4 gap-2">
          {SIZES.map((s) => {
            const available = sizeAvailable(s);
            const selected = size === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!available}
                onClick={() => {
                  setSize(s);
                  setHint(false);
                  setQuantity(1);
                }}
                className={`h-12 border text-sm tracking-[0.18em] transition-colors duration-500 disabled:cursor-not-allowed disabled:text-mist/40 disabled:line-through ${
                  selected ? "border-bone bg-bone text-void" : "border-white/15 text-bone hover:border-silver"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {hint && (
          <p role="alert" className="text-sm text-silver">
            Choisissez une taille pour continuer.
          </p>
        )}
      </fieldset>

      {!compact && (
        <div className="flex items-center justify-between">
          <span className="label text-silver" id="qty-label">
            Quantité
          </span>
          <div className="flex items-center border border-white/15" role="group" aria-labelledby="qty-label">
            <button
              type="button"
              className="size-11 text-silver hover:text-bone disabled:opacity-30"
              aria-label="Diminuer la quantité"
              disabled={quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <output className="w-10 text-center text-sm tabular-nums" aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              className="size-11 text-silver hover:text-bone disabled:opacity-30"
              aria-label="Augmenter la quantité"
              disabled={quantity >= maxQty}
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary w-full" onClick={primaryAction} disabled={soldOut}>
        {soldOut ? "Épuisé" : size ? "Ajouter au panier" : "Choisir ma taille"}
      </button>

      {product.status === "prelaunch" && (
        <p className="text-sm leading-relaxed text-mist">
          Pièce en développement. Le panier est ouvert ; la commande sera possible au lancement officiel.
        </p>
      )}

      <SizeGuide product={product} open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
