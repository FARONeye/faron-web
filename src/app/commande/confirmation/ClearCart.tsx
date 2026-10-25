"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart-store";

/** Vide le panier une fois le paiement confirmé par Stripe. */
export function ClearCart() {
  useEffect(() => {
    const clear = () => useCart.getState().clear();
    if (useCart.persist.hasHydrated()) clear();
    else return useCart.persist.onFinishHydration(clear);
  }, []);
  return null;
}
